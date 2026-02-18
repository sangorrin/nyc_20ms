# API Reference

Complete API documentation for the NYC Yellow Taxi Outliers Detector.

**Base URL (Local):** `http://localhost:8080`
**Base URL (Production):** `https://nyc-outliers-detector.fly.dev`

## Endpoints

### Health Check

#### GET `/`

Check if the API is running.

**Response:**
```json
{
  "status": "ok",
  "service": "NYC Yellow Taxi Outliers Detector"
}
```

---

## File Upload

### POST `/api/upload_parquet`

Upload and partition an optimized parquet file for outlier detection.

#### Request

**Content-Type:** `multipart/form-data`

**Parameters:**
- `file` (required): Parquet file to upload (~30MB, pre-optimized)

**Example (curl):**
```bash
curl -X POST http://localhost:8080/api/upload_parquet \
  -F "file=@yellow_tripdata_2023-01.parquet"
```

**Example (Python):**
```python
import requests

with open('yellow_tripdata_2023-01.parquet', 'rb') as f:
    files = {'file': ('yellow_tripdata_2023-01.parquet', f, 'application/octet-stream')}
    response = requests.post('http://localhost:8080/api/upload_parquet', files=files)
    print(response.json())
```

#### Response

**Status:** `200 OK`

**Body:**
```json
{
  "filename": "yellow_tripdata_2023-01.parquet",
  "total_rows": 3066766,
  "total_size_bytes": 31457280,
  "num_partitions": 10,
  "columns": [
    "VendorID",
    "tpep_pickup_datetime",
    "tpep_dropoff_datetime",
    "passenger_count",
    "trip_distance",
    "RatecodeID",
    "store_and_fwd_flag",
    "PULocationID",
    "DOLocationID",
    "payment_type",
    "fare_amount",
    "extra",
    "mta_tax",
    "tip_amount",
    "tolls_amount",
    "improvement_surcharge",
    "total_amount"
  ],
  "upload_time_ms": 1234.56
}
```

**Response Fields:**
- `filename` (string): Name of the uploaded file
- `total_rows` (integer): Total number of rows in the file
- `total_size_bytes` (integer): File size in bytes
- `num_partitions` (integer): Number of partitions created (always 10)
- `columns` (array): List of column names in the parquet file
- `upload_time_ms` (float): Time taken to upload and partition (milliseconds)

#### Error Responses

**400 Bad Request** - Invalid file type:
```json
{
  "detail": "File must be a .parquet file"
}
```

**500 Internal Server Error** - Processing error:
```json
{
  "detail": "Error processing file: <error message>"
}
```

---

## Outlier Detection

### GET `/api/detect_outliers`

Detect outliers in a previously uploaded parquet file.

#### Request

**Parameters:**
- `filename` (required, query): Name of the uploaded parquet file

**Example (curl):**
```bash
curl "http://localhost:8080/api/detect_outliers?filename=yellow_tripdata_2023-01.parquet"
```

**Example (Python):**
```python
import requests

response = requests.get(
    'http://localhost:8080/api/detect_outliers',
    params={'filename': 'yellow_tripdata_2023-01.parquet'}
)
print(response.json())
```

#### Response

**Status:** `200 OK`

**Body:**
```json
{
  "filename": "yellow_tripdata_2023-01.parquet",
  "outliers": [
    {
      "VendorID": 2,
      "tpep_pickup_datetime": "2023-01-01 00:00:00",
      "tpep_dropoff_datetime": "2023-01-01 00:00:36",
      "passenger_count": 1,
      "trip_distance": 189745.37,
      "RatecodeID": 5,
      "store_and_fwd_flag": "N",
      "PULocationID": 132,
      "DOLocationID": 26,
      "payment_type": 2,
      "fare_amount": 52.0,
      "extra": 0.0,
      "mta_tax": 0.0,
      "tip_amount": 0.0,
      "tolls_amount": 0.0,
      "improvement_surcharge": 0.3,
      "total_amount": 52.3,
      "trip_duration_hours": 0.01,
      "avg_speed_mph": 18974537.0
    }
  ],
  "download_time_ms": 12.34,
  "processing_time_ms": 5.67,
  "total_time_ms": 18.01,
  "success": true,
  "message": "🎯 Amazing! Under 20ms!"
}
```

**Response Fields:**
- `filename` (string): Name of the processed file
- `outliers` (array): List of outlier trip records (max 10)
  - All original parquet columns
  - `trip_duration_hours` (float): Computed trip duration
  - `avg_speed_mph` (float): Computed average speed
- `download_time_ms` (float): Time to download first partition from S3
- `processing_time_ms` (float): Time to process and detect outliers
- `total_time_ms` (float): Total time (download + processing)
- `success` (boolean): Whether timing was acceptable (<100ms)
- `message` (string): Performance feedback message

**Performance Messages:**
- `"🎯 Amazing! Under 20ms!"` - total_time_ms < 20
- `"⚡ Not bad! Under 100ms"` - 20 ≤ total_time_ms < 100
- `"❌ Too slow, needs optimization"` - total_time_ms ≥ 100

#### Error Responses

**500 Internal Server Error** - Detection error:
```json
{
  "detail": "Error detecting outliers: <error message>"
}
```

Common causes:
- File not found in S3 (upload it first)
- Invalid S3 credentials
- Network connectivity issues

---

## Outlier Detection Criteria

A trip is classified as an outlier if it violates ANY of these constraints:

### Distance Constraints
- **Minimum:** 0.1 miles (below suggests stationary meter)
- **Maximum:** 800 miles (exceeds theoretical max: 10h @ 80mph)

### Duration Constraints
- **Minimum:** > 0 hours (negative/zero indicates timestamp errors)
- **Maximum:** ≤ 10 hours (NYC TLC fatigued driving prevention rules)

### Speed Constraints
- **Minimum:** 2.5 mph (below suggests parked with meter running)
- **Maximum:** 80 mph (exceeds realistic highway speeds)

**Note:** Only trips in the top 10% by distance are analyzed (pre-filtered via partitioning).

---

## Interactive API Documentation

FastAPI provides interactive API documentation:

- **Swagger UI:** http://localhost:8080/docs
- **ReDoc:** http://localhost:8080/redoc

These interfaces allow you to:
- Test endpoints directly in the browser
- See detailed request/response schemas
- Download OpenAPI specification

---

## Rate Limiting

**Current Status:** No rate limiting implemented

**Recommendations for Production:**
- Implement rate limiting (e.g., 10 requests/minute per IP)
- Add authentication for write operations
- Set file size limits (max 50MB)
- Monitor S3 bandwidth usage

---

## CORS Configuration

**Current Status:** All origins allowed (`*`)

**Recommendations for Production:**
```python
# In backend/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],  # Restrict to your domain
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
```

---

## Testing

### Using curl

```bash
# Upload
curl -X POST http://localhost:8080/api/upload_parquet \
  -F "file=@test.parquet"

# Detect
curl "http://localhost:8080/api/detect_outliers?filename=test.parquet"
```

### Using Python Requests

```python
import requests

# Upload
with open('test.parquet', 'rb') as f:
    files = {'file': f}
    resp = requests.post('http://localhost:8080/api/upload_parquet', files=files)
    print(resp.json())

# Detect
resp = requests.get(
    'http://localhost:8080/api/detect_outliers',
    params={'filename': 'test.parquet'}
)
print(resp.json())
```

### Using the Test Script

```bash
python test_api.py path/to/test.parquet
```

---

## Performance Benchmarks

Expected performance on high-performance VM (4 CPUs, 8GB RAM):

| Operation | Time (ms) | Notes |
|-----------|-----------|-------|
| S3 Download (3MB) | 8-12 | Network latency dependent |
| Parquet Decode | 2-3 | Snappy decompression |
| Filter Operations | 2-3 | PyArrow vectorized ops |
| Result Formatting | 1-2 | JSON serialization |
| **Total** | **13-20** | **Target: <20ms** |

Factors affecting performance:
- Network latency between VM and S3
- VM CPU performance
- S3 connection pool status
- File size and compression

---

## Error Handling

All endpoints return standard HTTP status codes:

- `200 OK` - Request successful
- `400 Bad Request` - Invalid input
- `500 Internal Server Error` - Server-side error

Error responses include a detail message:
```json
{
  "detail": "Descriptive error message"
}
```

---

## See Also

- [QUICKSTART.md](QUICKSTART.md) - Setup instructions
- [README.md](README.md) - Architecture overview
- [DEPLOYMENT.md](DEPLOYMENT.md) - Production deployment guide
