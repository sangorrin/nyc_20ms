# Testing Guide

Complete testing guide for the NYC Yellow Taxi Outliers Detector.

## Generate Test Data

First, generate optimized parquet files from the parent project:

```bash
cd ../nyc_perf_questions
python scripts/optimize_parquets.py --samples 1
```

This creates optimized files in `parquets_optimized/` with:
- Pre-sorted data (distance descending)
- 10 row groups for partitioning
- Standardized column names

## Local Testing

### 1. Start the Application

```bash
cd ../nyc_20ms
./dev.sh  # Runs on http://localhost:8080
```

### 2. Test via Web Interface

```bash
open http://localhost:8080
```

Then:
1. Drag & drop or select an optimized parquet file
2. Wait for upload to complete
3. Click "Detect Outliers" button
4. Review performance metrics and outliers

### 3. Test via API (curl)

**Upload file:**
```bash
curl -X POST http://localhost:8080/api/upload_parquet \
  -F "file=@../nyc_perf_questions/parquets_optimized/yellow_tripdata_2023-01.parquet"
```

**Detect outliers:**
```bash
curl "http://localhost:8080/api/detect_outliers?filename=yellow_tripdata_2023-01.parquet"
```

### 4. Test via Python Script

Use the included test script:

```bash
python test_api.py ../nyc_perf_questions/parquets_optimized/yellow_tripdata_2023-01.parquet
```

This will:
- Test the health endpoint
- Upload the file
- Detect outliers
- Display timing metrics

## Production Testing

### Test Deployed App

```bash
# Open in browser
fly open

# Or test via curl
curl -X POST https://nyc-outliers-detector.fly.dev/api/upload_parquet \
  -F "file=@yellow_tripdata_2023-01.parquet"

curl "https://nyc-outliers-detector.fly.dev/api/detect_outliers?filename=yellow_tripdata_2023-01.parquet"
```

### Monitor Performance

```bash
# View real-time logs
fly logs

# Check for timing metrics
fly logs | grep "total_time_ms"

# Monitor download times
fly logs | grep "download_time_ms"
```

## Performance Validation

### Expected Results

On a high-performance VM (4 CPUs, 8GB RAM):

| Metric | Target | Acceptable |
|--------|--------|------------|
| Download Time | < 12ms | < 20ms |
| Processing Time | < 5ms | < 10ms |
| **Total Time** | **< 20ms** | **< 100ms** |

### Success Indicators

- 🎯 **Green (< 20ms):** Amazing! Challenge achieved
- ⚡ **Yellow (< 100ms):** Not bad! Acceptable performance
- ❌ **Red (> 100ms):** Too slow, needs optimization

### Debugging Slow Performance

If total time > 20ms, check:

1. **Network latency:**
   ```bash
   fly ssh console
   curl -w "@curl-format.txt" -o /dev/null -s https://fly.storage.tigris.dev
   ```

2. **Region mismatch:**
   ```bash
   fly regions list
   # Ensure app and Tigris are in same region
   ```

3. **VM resources:**
   ```bash
   fly status
   # Should show: performance-4x, 8GB RAM
   ```

4. **S3 connection pooling:**
   ```bash
   fly logs | grep "S3 client initialized"
   ```

## Test Multiple Files

Test with various file sizes and dates:

```bash
cd ../nyc_perf_questions
python scripts/optimize_parquets.py --samples 10

cd ../nyc_20ms
for file in ../nyc_perf_questions/parquets_optimized/*.parquet; do
    echo "Testing: $file"
    python test_api.py "$file"
done
```

## Load Testing

### Simple Load Test (bash)

```bash
# Test 10 sequential requests
for i in {1..10}; do
    echo "Request $i"
    time curl "http://localhost:8080/api/detect_outliers?filename=test.parquet"
done
```

### Advanced Load Test (Python)

```python
import concurrent.futures
import requests
import time

def test_detect():
    start = time.time()
    resp = requests.get(
        'http://localhost:8080/api/detect_outliers',
        params={'filename': 'test.parquet'}
    )
    duration = (time.time() - start) * 1000
    return resp.status_code, duration

# Run 50 concurrent requests
with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
    futures = [executor.submit(test_detect) for _ in range(50)]
    results = [f.result() for f in futures]

# Analyze results
times = [r[1] for r in results]
print(f"Mean: {sum(times)/len(times):.2f}ms")
print(f"Min: {min(times):.2f}ms")
print(f"Max: {max(times):.2f}ms")
```

## Integration Tests

### Test Upload Flow

```python
import requests

def test_full_flow():
    # 1. Upload
    with open('test.parquet', 'rb') as f:
        resp = requests.post(
            'http://localhost:8080/api/upload_parquet',
            files={'file': f}
        )
    assert resp.status_code == 200
    metadata = resp.json()
    print(f"✓ Upload: {metadata['upload_time_ms']:.2f}ms")

    # 2. Detect
    resp = requests.get(
        'http://localhost:8080/api/detect_outliers',
        params={'filename': 'test.parquet'}
    )
    assert resp.status_code == 200
    result = resp.json()
    print(f"✓ Detection: {result['total_time_ms']:.2f}ms")
    print(f"✓ Outliers found: {len(result['outliers'])}")

    return result

if __name__ == '__main__':
    result = test_full_flow()
    assert result['total_time_ms'] < 100, "Too slow!"
    print("✓ All tests passed!")
```

## Validation Tests

### Verify Outlier Detection

```python
import pyarrow.parquet as pq

# Read the original file
table = pq.read_table('test.parquet')

# Get outliers from API
outliers = api_response['outliers']

# Verify outlier criteria
for outlier in outliers:
    distance = outlier['trip_distance']
    speed = outlier['avg_speed_mph']
    duration = outlier['trip_duration_hours']

    # Check if truly an outlier
    assert (
        distance < 0.1 or distance > 800 or
        speed < 2.5 or speed > 80 or
        duration <= 0 or duration > 10
    ), f"Not an outlier: {outlier}"

print("✓ All returned trips are valid outliers")
```

## Troubleshooting

### Test Script Fails

**Connection refused:**
```bash
# Check if app is running
curl http://localhost:8080/
```

**File not found:**
```bash
# Check file path
ls -lh ../nyc_perf_questions/parquets_optimized/
```

### API Returns Errors

**500 Error on detect:**
```bash
# Upload file first
curl -X POST http://localhost:8080/api/upload_parquet \
  -F "file=@test.parquet"
```

**S3 credentials error:**
```bash
# Check .env file
cat .env | grep AWS
```

### Performance Issues

**Slow downloads:**
```bash
# Check S3 connectivity
fly ssh console
time aws s3 ls s3://nyc-parquets-optimized --endpoint-url https://fly.storage.tigris.dev
```

**High processing time:**
```bash
# Check CPU usage
fly metrics
```

## Continuous Testing

### Pre-deployment Checks

```bash
#!/bin/bash
# test-before-deploy.sh

set -e

echo "Running pre-deployment tests..."

# Test local build
docker build -t nyc-outliers:test .

# Test container
docker run -d --name test-container -p 8081:8080 --env-file .env nyc-outliers:test
sleep 5

# Run tests
python test_api.py test.parquet

# Cleanup
docker stop test-container
docker rm test-container

echo "✓ All tests passed! Ready to deploy."
```

## See Also

- [API.md](API.md) - API documentation
- [QUICKSTART.md](QUICKSTART.md) - Setup guide
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guide
