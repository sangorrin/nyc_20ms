# NYC Yellow Taxi Outliers Detector

**Goal**: Detect outlier trips in the [NYC Yellow Taxi Trips dataset](https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page) with extreme performance requirements. Process a 30MB parquet file stored on an HTTP server in under 20ms total time—including download, filtering, and output. This challenge explores the bottlenecks of network latency, I/O throughput, connection overhead, and CPU processing when working with real-world taxi trip data.

## 🎯 Challenge

Process a 30MB optimized parquet file stored on an HTTP server in 20ms total:
- Download first partition from Tigris S3
- Apply physics-based filters to detect outliers
- Return top 10 outliers with metrics

## 🏗️ Architecture

### Frontend (React + TailwindCSS)
- Beautiful drag & drop file upload interface
- Real-time progress indicators
- Performance metrics with color-coded success indicators:
  - 🎯 Green: < 20ms (Success!)
  - ⚡ Yellow: < 100ms (Not bad!)
  - ❌ Red: > 100ms (Too slow)
- Responsive design (mobile-friendly, max-width limited)
- Purple-themed edges beyond max width

### Backend (FastAPI + PyArrow)
- **Upload Endpoint** (`/api/upload_parquet`):
  - Receives optimized parquet file (~30MB)
  - Partitions into 10 row groups
  - Uploads to Tigris S3 storage (if not already there)
  - Returns file metadata

- **Detection Endpoint** (`/api/detect_outliers`):
  - Downloads ONLY first partition (top 10% by distance)
  - Applies physics-based outlier filters
  - Returns top 10 outliers with timing breakdown

### Storage (Tigris S3)
- Keep-alive connections for minimal handshake overhead
- Files stored as: `nyc_parquets/{filename}/part{0-9}.parquet`
- Co-located with compute for low latency

## 🚀 Quick Start

See [QUICKSTART.md](QUICKSTART.md) for setup instructions.

## 📊 Optimization Strategy

### Why This Approach is Fast

1. **Pre-sorted Data**: Parquet files optimized with distance DESC
2. **Partition Strategy**: Only download first partition (top 10%)
3. **Keep-Alive Connections**: Persistent S3 connections avoid handshake overhead
4. **Efficient Filtering**: PyArrow vectorized compute operations
5. **Co-location**: VM and S3 storage in same region
6. **Powerful Hardware**: 4 CPUs, 8GB RAM to avoid CPU bottleneck

### Key Bottlenecks

1. **Network Latency**: Distance between compute and storage
   - Solution: Co-locate Fly.io app and Tigris in same region

2. **Connection Overhead**: TCP/TLS handshake for each request
   - Solution: Connection pooling with keep-alive

3. **I/O Time**: Downloading entire 30MB file
   - Solution: Download only first partition (~3MB)

4. **CPU Processing**: Filtering and computing outliers
   - Solution: High-performance VM + PyArrow vectorization

## 📈 API Reference

See [API.md](API.md) for complete API documentation.

## 🧪 Testing

See [TESTING.md](TESTING.md) for testing guide.

## 🎨 Frontend Features

- Drag & drop file upload with visual feedback
- File validation (.parquet only)
- Upload progress indicator
- File metadata display
- One-click outlier detection
- Performance metrics with visual indicators
- Scrollable outliers table
- Responsive design for mobile/desktop

## 📝 Project Structure

```
nyc_20ms/
├── backend/
│   ├── main.py              # FastAPI application
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # Main app component
│   │   ├── main.jsx        # Entry point
│   │   ├── index.css       # Global styles
│   │   └── components/
│   │       ├── UploadPage.jsx    # File upload UI
│   │       └── ResultsPage.jsx   # Results display
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
├── Dockerfile              # Multi-stage build
├── fly.toml               # Fly.io configuration
├── .env.example           # Environment template
└── README.md             # This file
```

## 🔒 Security Notes

- Never commit `.env` file with real credentials
- Use Fly.io secrets for production credentials
- Limit CORS origins in production
- Validate file uploads (size, type)
- Implement rate limiting for API endpoints

## 🎯 Performance Tuning Tips

1. **Region Selection**: Choose Fly.io region closest to Tigris
2. **VM Size**: Scale up CPUs for CPU-bound workloads
3. **Compression**: Use snappy compression for parquet (fast decode)
4. **Batch Processing**: Process multiple files in parallel if needed
5. **Caching**: Consider caching first partition results

## 📚 Resources

- [NYC TLC Trip Record Data](https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page)
- [PyArrow Documentation](https://arrow.apache.org/docs/python/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Fly.io Documentation](https://fly.io/docs/)
- [Tigris Storage](https://www.tigrisdata.com/)

## 📄 License

See parent project license.

## 🙏 Acknowledgments

Built upon the NYC taxi performance optimization work in `nyc_perf_questions`.
