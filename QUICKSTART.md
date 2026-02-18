# Quick Start Guide

Get the NYC Yellow Taxi Outliers Detector running in minutes.

## Prerequisites

- Docker
- Fly.io CLI (for deployment)
- Tigris account (S3-compatible storage)

*Optional (only if running without Docker):*
- Python 3.14+
- Node.js 20+

## 🔬 File Requirements

Prepare **optimized parquet files** generated using the optimization script:

```bash
cd ../nyc_perf_questions
python scripts/optimize_parquets.py --samples 20
```

Optimized files have:
- Standardized column names
- Distance sorted descending
- Exactly 10 row groups (each ~10% of data)
- Fixed datetime types

## Local Development

### 1. Clone and Setup

```bash
cd /Users/dsl/Desktop/NYC_TAXI/nyc_20ms
cp .env.example .env
# Edit .env with your Tigris credentials
```

### 2. Run with Docker

```bash
# Simple: Use the dev script
./dev.sh

# Or manually with docker
docker build -t nyc-outliers:dev .
docker run --rm -it -p 8080:8080 --env-file .env nyc-outliers:dev

# Application runs at http://localhost:8080
# API Docs at http://localhost:8080/docs
```

### 3. Alternative: Run without Docker (if needed)

```bash
# Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py &  # Port 8000

# Frontend
cd ../frontend
npm install
npm run dev  # Port 3000
```

## Production Deployment on Fly.io

### 1. Install Fly.io CLI

```bash
brew install flyctl  # macOS
# or: curl -L https://fly.io/install.sh | sh
```

### 2. Login to Fly.io

```bash
fly auth login
```

### 3. Create Fly.io App

```bash
cd /Users/dsl/Desktop/NYC_TAXI/nyc_20ms
fly launch --no-deploy

# Choose:
# - App name: nyc-outliers-detector (or your preferred name)
# - Region: iad (US East - Ashburn) for best Tigris latency
# - PostgreSQL: No
# - Redis: No
```

### 4. Create Tigris S3 Bucket

```bash
fly storage create

# Follow prompts:
# - Name: nyc-parquets
# - Region: Same as your app (e.g., iad for US East)

# Save the credentials shown:
# - Access Key ID (starts with tid_)
# - Secret Access Key (starts with tsec_)
# - Endpoint URL (https://fly.storage.tigris.dev)
```

### 5. Set Secrets

```bash
fly secrets set AWS_ACCESS_KEY_ID="your_tigris_key"
fly secrets set AWS_SECRET_ACCESS_KEY="your_tigris_secret"
fly secrets set TIGRIS_BUCKET="nyc-parquets"
fly secrets set TIGRIS_ENDPOINT_URL="https://fly.storage.tigris.dev"
```

### 6. Deploy

```bash
fly deploy
# App will be available at https://nyc-outliers-detector.fly.dev
```

### 7. Scale for Performance

```bash
# Ensure high-performance VM is configured (already in fly.toml)
fly scale vm performance-4x  # 4 CPUs, 8GB RAM
```

## Testing Your Deployment

### Generate Test File

```bash
cd ../nyc_perf_questions
python scripts/optimize_parquets.py --samples 1
```

### Test Locally

```bash
cd ../nyc_20ms
./dev.sh  # Runs on http://localhost:8080

# Open in browser
open http://localhost:8080

# Or test via API
python test_api.py ../nyc_perf_questions/parquets_optimized/yellow_tripdata_2023-01.parquet
```

### Test Production

```bash
# Open deployed app
fly open

# Or test via curl
curl -X POST https://nyc-outliers-detector.fly.dev/api/upload_parquet \
  -F "file=@../nyc_perf_questions/parquets_optimized/yellow_tripdata_2023-01.parquet"
```

## Troubleshooting

### Docker Issues

```bash
# Check Docker is running
docker ps

# Rebuild if needed
docker build --no-cache -t nyc-outliers:dev .
```

### Fly.io Issues

```bash
# Check logs
fly logs

# Check status
fly status

# SSH into machine
fly ssh console
```

### Common Problems

**Port already in use:**
```bash
# Find and kill process using port 8080
lsof -ti:8080 | xargs kill -9
```

**Environment variables not set:**
```bash
# Verify .env file exists
cat .env

# For Fly.io, check secrets
fly secrets list
```

**Tigris connection errors:**
```bash
# Verify credentials in secrets
fly secrets list

# Test connection
fly ssh console
python3 -c "import boto3; print(boto3.client('s3', endpoint_url='https://fly.storage.tigris.dev').list_buckets())"
```

## Next Steps

- Read the [full README](README.md) for architecture details
- Check [DEPLOYMENT.md](DEPLOYMENT.md) for advanced deployment options
- Review [SOLUTION.md](SOLUTION.md) for technical approach

---

**Need help?** Check the [Fly.io documentation](https://fly.io/docs/) or open an issue.
