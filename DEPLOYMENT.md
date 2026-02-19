# NYC Outliers Detector - Deployment Guide

## 🚢 Deploying to Fly.io

### Prerequisites
- Fly.io account created
- Optimized parquet files (https://github.com/sangorrin/nyc_trips_questions.git)

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
# - App name: nyc-outliers-detector
# - Region: iad (US East - Ashburn) for best Tigris latency
```

#### 4. Create Tigris Storage Bucket

```bash
# Create a new Tigris storage (requires app to exist first)
fly storage create

# Select options:
# - Name: nyc-parquets-optimized
# - Region: Choose same as your app (e.g., iad for US East)

# Save the credentials shown in .env
cp .env.example .env
AWS_ACCESS_KEY_ID=tid_xxxxxxxxx
AWS_SECRET_ACCESS_KEY=tsec_xxxxxxxxxxx
TIGRIS_BUCKET=nyc-parquets-optimized
TIGRIS_ENDPOINT_URL=https://fly.storage.tigris.dev
AWS_REGION=auto
```

#### 5. Set Environment Secrets

```bash
# Set Tigris credentials
fly secrets import < .env

# Verify secrets are set
fly secrets list
```

#### 6. Deploy Application

```bash
# First deployment
fly deploy
fly scale count 1

# Monitor deployment
fly logs

# Check status
fly status
```

#### 7. Verify Deployment

```bash
# Open in browser
fly open
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

### 📚 Additional Resources

- [Fly.io Documentation](https://fly.io/docs/)
- [Tigris Storage Guide](https://www.tigrisdata.com/docs/storage/)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
- [Fly.io Pricing](https://fly.io/docs/about/pricing/)
