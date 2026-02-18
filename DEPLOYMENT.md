# NYC Outliers Detector - Deployment Guide

## 🚢 Deploying to Fly.io

### Prerequisites
- [ ] Fly.io account created
- [ ] Fly.io CLI installed
- [ ] Tigris S3 credentials obtained
- [ ] Optimized parquet files ready for testing

### Step-by-Step Deployment

#### 1. Install Fly.io CLI

```bash
# macOS
brew install flyctl

# Linux/WSL
curl -L https://fly.io/install.sh | sh

# Verify installation
flyctl version
```

#### 2. Login to Fly.io

```bash
fly auth login
```

#### 3. Initialize Fly.io App

```bash
cd nyc_20ms

# Create the app (fly.toml already configured)
fly launch --no-deploy

# Choose:
# - App name: nyc-outliers-detector (or your preferred name)
# - Region: iad (US East - Ashburn) for best Tigris latency
# - PostgreSQL: No
# - Redis: No
```

#### 4. Create Tigris Storage Bucket

```bash
# Create a new Tigris storage (requires app to exist first)
fly storage create

# Select options:
# - Name: nyc-parquets
# - Region: Choose same as your app (e.g., iad for US East)

# Save the credentials shown:
# - Access Key ID (starts with tid_)
# - Secret Access Key (starts with tsec_)
# - Endpoint URL (https://fly.storage.tigris.dev)
```

#### 5. Set Environment Secrets

```bash
# Set Tigris credentials
fly secrets set \
  AWS_ACCESS_KEY_ID="tid_your_access_key_here" \
  AWS_SECRET_ACCESS_KEY="tsec_your_secret_key_here" \
  TIGRIS_BUCKET="nyc-parquets" \
  TIGRIS_ENDPOINT_URL="https://fly.storage.tigris.dev"

# Verify secrets are set
fly secrets list
```

#### 6. Deploy Application

```bash
# First deployment
fly deploy

# Monitor deployment
fly logs

# Check status
fly status
```

#### 7. Verify Deployment

```bash
# Open in browser
fly open

# Check health
curl https://nyc-outliers-detector.fly.dev/

# View API docs
open https://nyc-outliers-detector.fly.dev/docs
```

#### 8. Scale for Performance

```bash
# Already configured in fly.toml:
# - 4 CPUs
# - 8GB RAM
# - Performance CPU type

# To change VM size:
fly scale vm performance-4x  # 4 CPUs, 8GB RAM
fly scale vm performance-8x  # 8 CPUs, 16GB RAM (for <20ms)

# Scale number of instances (optional)
fly scale count 2  # Run 2 instances for redundancy
```

### 🧪 Testing Deployment

1. **Upload a test file**:
```bash
# Using the web interface
open https://nyc-outliers-detector.fly.dev

# Or via API
curl -X POST https://nyc-outliers-detector.fly.dev/api/upload_parquet \
  -F "file=@../nyc_perf_questions/parquets_optimized/yellow_tripdata_2023-01.parquet"
```

2. **Detect outliers**:
```bash
curl "https://nyc-outliers-detector.fly.dev/api/detect_outliers?filename=yellow_tripdata_2023-01.parquet"
```

3. **Check timing**:
   - Goal: `total_time_ms < 20`
   - If not, check logs and consider:
     - Upgrading VM size
     - Moving to region closer to Tigris
     - Optimizing parquet compression

### 🔍 Monitoring & Debugging

```bash
# View real-time logs
fly logs

# SSH into machine
fly ssh console

# Check machine metrics
fly dashboard

# Restart app
fly apps restart nyc-outliers-detector
```

### 📊 Performance Optimization

#### If latency > 20ms:

1. **Check region alignment**:
```bash
# Ensure app and Tigris are in same region
fly regions list
fly regions set iad  # US East
```

2. **Increase VM resources**:
```bash
fly scale vm performance-8x
```

3. **Enable regional caching** (if using multiple regions):
```bash
fly regions add lhr ord  # Add London, Chicago
```

4. **Monitor S3 latency**:
```bash
# Check logs for download_time_ms
fly logs | grep download_time_ms
```

### 🔄 Updating the App

```bash
# Pull latest changes
git pull

# Deploy updates
fly deploy

# Zero-downtime deployment (if scaled to 2+ instances)
fly deploy --strategy rolling
```

### 💰 Cost Optimization

```bash
# Auto-stop when idle
fly scale count 1
# Configure in fly.toml:
#   auto_stop_machines = true
#   auto_start_machines = true

# View current monthly estimate
fly dashboard
```

### 🔒 Security Checklist

- [x] Secrets stored in Fly.io (not in code)
- [ ] CORS origins restricted to your domain
- [ ] Rate limiting added to API endpoints
- [ ] File size limits enforced (max 50MB)
- [ ] HTTPS enforced (done by default)
- [ ] Tigris bucket access restricted to Fly.io IPs

### 🚨 Troubleshooting

#### App won't start
```bash
fly logs
# Check for:
# - Missing secrets
# - Python dependency errors
# - Port binding issues
```

#### Slow performance
```bash
# Check VM metrics
fly dashboard

# Increase resources
fly scale vm performance-8x
fly scale memory 16384
```

#### S3 connection errors
```bash
# Verify secrets
fly secrets list

# Test S3 connection
fly ssh console
python3 -c "import boto3; print(boto3.client('s3', endpoint_url='https://fly.storage.tigris.dev').list_buckets())"
```

#### Build failures
```bash
# Check Dockerfile syntax
docker build -t test .

# View build logs
fly logs --build
```

### 📝 Post-Deployment

1. **Set up custom domain** (optional):
```bash
fly certs add www.yourdomain.com
fly certs show www.yourdomain.com
```

2. **Enable metrics**:
```bash
fly dashboard  # View metrics in web UI
```

3. **Configure alerts**:
   - Set up in Fly.io dashboard
   - Alert on: high CPU, memory, errors

4. **Document your deployment**:
   - Save app name: `nyc-outliers-detector`
   - Note region: `iad`
   - Record URL: `https://nyc-outliers-detector.fly.dev`

### 🎯 Success Criteria

- [ ] App accessible at Fly.io URL
- [ ] File upload works
- [ ] Outlier detection completes
- [ ] Total time < 20ms (goal) or < 100ms (acceptable)
- [ ] No errors in logs
- [ ] Health check passing

### 📚 Additional Resources

- [Fly.io Documentation](https://fly.io/docs/)
- [Tigris Storage Guide](https://www.tigrisdata.com/docs/storage/)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
- [Fly.io Pricing](https://fly.io/docs/about/pricing/)

---

**Need help?** Check Fly.io community forum or the project README.
