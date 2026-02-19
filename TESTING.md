# Testing Guide

Complete testing guide for the NYC Yellow Taxi Outliers Detector.
Requires optimized parquet files (https://github.com/sangorrin/nyc_trips_questions.git)

## Local Testing

### 1. Start the Application

```bash
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


### 3. Test via Python Script

Use the included test script:

```bash
python test_api.py parquets_optimized/yellow_tripdata_2023-01.parquet
```

This will:
- Test the health endpoint
- Upload the file
- Detect outliers
- Display timing metrics

## Production Testing

### Via Web Interface
```bash
# Open deployed app in browser
fly open
```

### Via Python Script
```bash
# Test on production
python test_api.py --api-base https://nyc-outliers-detector.fly.dev/ parquets_optimized/yellow_tripdata_2023-01.parquet
```

## See Also

- [API.md](API.md) - API documentation
- [QUICKSTART.md](QUICKSTART.md) - Setup guide
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guide
