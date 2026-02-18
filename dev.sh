#!/bin/bash
# Development startup script using Docker

set -e

echo "🚀 Starting NYC Outliers Detector Development Environment"

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating from .env.example..."
    cp .env.example .env
    echo "📝 Please edit .env with your Tigris credentials"
    exit 1
fi

# Stop any existing container
echo "🧹 Cleaning up existing containers..."
docker stop nyc-outliers-dev 2>/dev/null || true
docker rm nyc-outliers-dev 2>/dev/null || true

# Build the Docker image
echo "🔨 Building Docker image..."
docker build -t nyc-outliers:dev .

# Run the container
echo "🐳 Starting Docker container..."
echo ""
echo "🎉 Application will be available at:"
echo "   http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""

docker run --rm -it \
  --name nyc-outliers-dev \
  -p 8000:8000 \
  --env-file .env \
  nyc-outliers:dev

