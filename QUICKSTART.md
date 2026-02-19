# Quick Start Guide - Local Development

Get the NYC Yellow Taxi Outliers Detector running locally in minutes.

## Prerequisites

**Required:**
- Docker (recommended)
- parquets_optimized/ (https://github.com/sangorrin/nyc_trips_questions.git)
- TIGRIS storage (follow DEPLOYMENT.md until )

**Optional (only if running without Docker):**
- Python 3.14+
- Node.js 20+
- Tigris S3 credentials (or local S3-compatible storage)

## 🚀 Local Development

### Option 1: Run with Docker (Recommended)

```bash
# Create environment file (if using S3 storage)
cp .env.example .env
# Edit .env with your credentials (optional for local testing)

# Simple: Use the dev script
./dev.sh

# Or manually with docker
docker build -t nyc-outliers:dev .
docker run --rm -it -p 8080:8080 --env-file .env nyc-outliers:dev
```

**Access the app:**
- Web Interface: http://localhost:8080
- API Docs: http://localhost:8080/docs
- Health Check: http://localhost:8080/

### Option 2: Run without Docker

If you prefer to run services separately:

```bash
# Terminal 1 - Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py  # Starts on port 8000

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev  # Starts on port 3000

# Access frontend at http://localhost:3000
open http://localhost:3000
```

## 🚢 Deploying to Production

This guide covers local development only. For production deployment to Fly.io:

👉 See [DEPLOYMENT.md](DEPLOYMENT.md) for complete production deployment instructions.

## 📚 References

- Review [README.md](README.md) for architecture details
- Check [API.md](API.md) for API documentation
- Read [SOLUTION.md](SOLUTION.md) for technical approach
- Run [TESTING.md](TESTING.md) for comprehensive testing
