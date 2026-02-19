"""
NYC Yellow Taxi Outliers Detector - FastAPI Backend

Optimized for <20ms outlier detection:
1. Upload endpoint partitions parquet into 10 row groups and uploads to Tigris S3
2. Detect endpoint downloads only first partition (top 10% by distance)
3. Applies physics-based filters to find outliers in top percentile
4. Returns top 10 outliers with timing metrics
"""

import io
import os
import time
from contextlib import asynccontextmanager
from typing import List

import boto3
import pyarrow as pa
import pyarrow.compute as pc
import pyarrow.parquet as pq
from botocore.config import Config
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from pathlib import Path


# ============================================================================
# CONFIGURATION
# ============================================================================

TIGRIS_BUCKET = os.getenv("TIGRIS_BUCKET", "nyc-parquets-optimized")
TIGRIS_ENDPOINT_URL = os.getenv("TIGRIS_ENDPOINT_URL", "https://fly.storage.tigris.dev")

# S3 client with keep-alive connection pool
s3_client = None


# ============================================================================
# MODELS
# ============================================================================

class FileMetadata(BaseModel):
    """Metadata returned after successful parquet upload"""
    filename: str
    total_rows: int
    total_size_bytes: int
    num_partitions: int
    columns: List[str]
    upload_time_ms: float
    already_exists: bool = False


class OutlierResult(BaseModel):
    """Result from outlier detection"""
    filename: str
    outliers: List[dict]
    download_time_ms: float
    processing_time_ms: float
    total_time_ms: float
    success: bool
    message: str


# ============================================================================
# LIFESPAN MANAGEMENT
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and cleanup resources with keep-alive connections"""
    global s3_client

    # Initialize S3 client with connection pooling and keep-alive
    s3_client = boto3.client(
        "s3",
        endpoint_url=TIGRIS_ENDPOINT_URL,
        config=Config(
            max_pool_connections=50,
            tcp_keepalive=True,
            retries={'max_attempts': 3, 'mode': 'standard'}
        )
    )

    print(f"✓ S3 client initialized with keep-alive to {TIGRIS_ENDPOINT_URL}")

    yield

    # Cleanup
    s3_client = None


# ============================================================================
# APP INITIALIZATION
# ============================================================================

app = FastAPI(
    title="NYC Yellow Taxi Outliers Detector",
    description="Detect outliers in NYC taxi trips in <20ms",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def resolve_column_names(schema: pa.Schema) -> dict:
    """Resolve column name variations across different parquet files"""
    col_map = {}
    col_names_lower = {col.lower(): col for col in schema.names}

    # Distance column
    for variant in ['trip_distance', 'Trip_Distance']:
        if variant.lower() in col_names_lower:
            col_map['distance'] = col_names_lower[variant.lower()]
            break

    # Pickup datetime column
    for variant in ['tpep_pickup_datetime', 'Trip_Pickup_DateTime', 'pickup_datetime']:
        if variant.lower() in col_names_lower:
            col_map['pickup'] = col_names_lower[variant.lower()]
            break

    # Dropoff datetime column
    for variant in ['tpep_dropoff_datetime', 'Trip_Dropoff_DateTime', 'dropoff_datetime']:
        if variant.lower() in col_names_lower:
            col_map['dropoff'] = col_names_lower[variant.lower()]
            break

    if not all(k in col_map for k in ['distance', 'pickup', 'dropoff']):
        raise ValueError(f"Missing required columns. Available: {schema.names}")

    return col_map


def file_exists_in_s3(key: str) -> bool:
    """Check if a file exists in S3 without downloading it"""
    try:
        s3_client.head_object(Bucket=TIGRIS_BUCKET, Key=key)
        return True
    except s3_client.exceptions.NoSuchKey:
        return False
    except Exception:
        # On any other error, assume file doesn't exist to allow upload
        return False


def upload_partitions_to_s3(filename: str, table: pa.Table, num_partitions: int = 10, skip_if_exists: bool = True) -> bool:
    """
    Partition table by row groups and upload to S3.
    Assumes table is already sorted by distance DESC.

    Args:
        filename: Name of the parquet file
        table: PyArrow table to partition and upload
        num_partitions: Number of partitions to create
        skip_if_exists: If True, skip upload if first partition already exists

    Returns:
        True if files were uploaded, False if skipped (already exist)
    """
    # Check if file already exists (use part0 as marker)
    first_partition_key = f"nyc_parquets/{filename}/part0.parquet"
    if skip_if_exists and file_exists_in_s3(first_partition_key):
        return False  # Files already exist, skip upload

    rows_per_partition = len(table) // num_partitions

    for i in range(num_partitions):
        start_idx = i * rows_per_partition
        end_idx = start_idx + rows_per_partition if i < num_partitions - 1 else len(table)
        partition_table = table.slice(start_idx, end_idx - start_idx)

        # Write partition to bytes
        buffer = io.BytesIO()
        pq.write_table(partition_table, buffer, compression='snappy')
        buffer.seek(0)

        # Upload to S3
        key = f"nyc_parquets/{filename}/part{i}.parquet"
        s3_client.upload_fileobj(buffer, TIGRIS_BUCKET, key)

    return True  # Files were uploaded


def download_first_partition(filename: str) -> pa.Table:
    """Download only the first partition (top 10% by distance)"""
    key = f"nyc_parquets/{filename}/part0.parquet"

    buffer = io.BytesIO()
    s3_client.download_fileobj(TIGRIS_BUCKET, key, buffer)
    buffer.seek(0)

    return pq.read_table(buffer)


def detect_outliers_in_partition(table: pa.Table) -> pa.Table:
    """
    Apply physics-based filters to detect outliers.
    Assumes table contains already-filtered top 10% by distance.
    """
    # Resolve column names
    col_map = resolve_column_names(table.schema)

    # Rename to standard names
    rename_map = {
        col_map['distance']: 'trip_distance',
        col_map['pickup']: 'tpep_pickup_datetime',
        col_map['dropoff']: 'tpep_dropoff_datetime'
    }
    new_names = [rename_map.get(name, name) for name in table.column_names]
    table = table.rename_columns(new_names)

    # Extract columns
    distance = table['trip_distance']
    pickup = table['tpep_pickup_datetime']
    dropoff = table['tpep_dropoff_datetime']

    # Handle datetime columns that might be stored as strings
    if pa.types.is_string(pickup.type) or pa.types.is_large_string(pickup.type):
        pickup = pc.strptime(pickup, format='%Y-%m-%d %H:%M:%S', unit='us')
    if pa.types.is_string(dropoff.type) or pa.types.is_large_string(dropoff.type):
        dropoff = pc.strptime(dropoff, format='%Y-%m-%d %H:%M:%S', unit='us')

    # Calculate trip duration in hours
    duration = pc.subtract(dropoff, pickup)
    duration_us = pc.cast(duration, pa.int64())
    duration_hours = pc.divide(
        pc.cast(duration_us, pa.float64()),
        3600.0 * 1_000_000.0
    )

    # Calculate average speed
    avg_speed_mph = pc.divide(distance, duration_hours)

    # Add computed columns
    table = table.append_column('trip_duration_hours', duration_hours)
    table = table.append_column('avg_speed_mph', avg_speed_mph)

    # Build filter for VALID trips
    valid_mask = pc.and_(
        pc.and_(
            pc.greater(duration_hours, 0),
            pc.less_equal(duration_hours, 10)  # Max 10 hours
        ),
        pc.and_(
            pc.and_(
                pc.greater_equal(avg_speed_mph, 2.5),  # Min speed
                pc.less_equal(avg_speed_mph, 80)  # Max speed
            ),
            pc.and_(
                pc.greater_equal(distance, 0.1),  # Min distance
                pc.less_equal(distance, 800)  # Max distance
            )
        )
    )

    # INVERT to get OUTLIERS
    outlier_mask = pc.invert(valid_mask)
    outliers = pc.filter(table, outlier_mask)

    # Sort by distance descending and take top 10
    outliers = outliers.sort_by([('trip_distance', 'descending')])
    if len(outliers) > 10:
        outliers = outliers.slice(0, 10)

    return outliers


# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.get("/health")
async def health():
    """Health check endpoint for monitoring"""
    return {"status": "ok", "service": "NYC Yellow Taxi Outliers Detector"}


@app.post("/api/upload_parquet", response_model=FileMetadata)
async def upload_parquet(file: UploadFile = File(...)):
    """
    Upload and partition an optimized parquet file.

    Expected: Pre-sorted parquet with 10 row groups (distance DESC).

    Returns file metadata including upload time.
    """
    if not file.filename.endswith('.parquet'):
        raise HTTPException(status_code=400, detail="File must be a .parquet file")

    try:
        start_time = time.perf_counter()

        # Read uploaded file
        contents = await file.read()
        buffer = io.BytesIO(contents)

        # Read parquet file
        table = pq.read_table(buffer)

        filename = file.filename
        num_partitions = 10

        # Upload partitions to S3 (skip if already exists to preserve CDN cache)
        was_uploaded = upload_partitions_to_s3(filename, table, num_partitions, skip_if_exists=True)

        if was_uploaded:
            print(f"✓ Uploaded {num_partitions} partitions for {filename}")
        else:
            print(f"⊘ Skipped upload for {filename} (already exists in Tigris)")

        upload_time = (time.perf_counter() - start_time) * 1000

        return FileMetadata(
            filename=filename,
            total_rows=len(table),
            total_size_bytes=len(contents),
            num_partitions=num_partitions,
            columns=table.column_names,
            upload_time_ms=round(upload_time, 2),
            already_exists=not was_uploaded
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


@app.get("/api/detect_outliers", response_model=OutlierResult)
async def detect_outliers(filename: str):
    """
    Detect outliers by downloading only first partition (top 10% by distance).

    Returns top 10 outliers with timing metrics.
    """
    try:
        total_start = time.perf_counter()

        # Download first partition
        download_start = time.perf_counter()
        table = download_first_partition(filename)
        download_time = (time.perf_counter() - download_start) * 1000

        # Detect outliers
        processing_start = time.perf_counter()
        outliers_table = detect_outliers_in_partition(table)
        processing_time = (time.perf_counter() - processing_start) * 1000

        total_time = (time.perf_counter() - total_start) * 1000

        # Convert outliers to list of dicts
        outliers_list = []
        if len(outliers_table) > 0:
            outliers_dict = outliers_table.to_pydict()
            for i in range(len(outliers_table)):
                row = {col: outliers_dict[col][i] for col in outliers_table.column_names}
                # Convert timestamps to strings for JSON serialization
                for key, val in row.items():
                    if isinstance(val, pa.TimestampScalar):
                        row[key] = str(val.as_py())
                    elif hasattr(val, 'as_py'):
                        row[key] = val.as_py()
                outliers_list.append(row)

        # Determine success level
        success = total_time < 100
        if total_time < 20:
            message = "🎯 Amazing! Under 20ms!"
        elif total_time < 100:
            message = "⚡ Not bad! Under 100ms"
        else:
            message = "❌ Too slow, needs optimization"

        return OutlierResult(
            filename=filename,
            outliers=outliers_list,
            download_time_ms=round(download_time, 2),
            processing_time_ms=round(processing_time, 2),
            total_time_ms=round(total_time, 2),
            success=success,
            message=message
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error detecting outliers: {str(e)}")


# ============================================================================
# STATIC FILES (Must be LAST after all API routes)
# ============================================================================

# Serve static frontend files (for production)
frontend_path = Path(__file__).parent.parent / "frontend" / "dist"
if frontend_path.exists():
    # Mount assets directory separately
    app.mount("/assets", StaticFiles(directory=str(frontend_path / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        """Serve frontend for all non-API routes"""
        # If it's an API or health route, this won't match (already defined above)
        # Try to serve the requested file
        file_path = frontend_path / full_path
        if file_path.is_file():
            return FileResponse(file_path)

        # Otherwise serve index.html (SPA fallback)
        return FileResponse(frontend_path / "index.html")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


