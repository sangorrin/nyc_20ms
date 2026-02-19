"""
Test script for local development and API validation
"""
import requests
import argparse
from pathlib import Path

def test_health(api_base):
    """Test health endpoint"""
    print("Testing health endpoint...")
    response = requests.get(f"{api_base}/")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    assert response.status_code == 200
    print("✅ Health check passed\n")

def test_upload(file_path: str, api_base):
    """Test file upload"""
    print(f"Testing upload with {file_path}...")

    with open(file_path, 'rb') as f:
        files = {'file': (Path(file_path).name, f, 'application/octet-stream')}
        response = requests.post(f"{api_base}/api/upload_parquet", files=files)

    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Filename: {data['filename']}")
        print(f"Total rows: {data['total_rows']:,}")
        print(f"Size: {data['total_size_bytes'] / 1024 / 1024:.2f} MB")
        print(f"Partitions: {data['num_partitions']}")
        print(f"Upload time: {data['upload_time_ms']:.2f} ms")
        print("✅ Upload test passed\n")
        return data['filename']
    else:
        print(f"❌ Upload failed: {response.text}\n")
        return None

def test_detection(filename: str, api_base):
    """Test outlier detection"""
    print(f"Testing detection for {filename}...")

    response = requests.get(f"{api_base}/api/detect_outliers", params={'filename': filename})

    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Download time: {data['download_time_ms']:.2f} ms")
        print(f"Processing time: {data['processing_time_ms']:.2f} ms")
        print(f"Total time: {data['total_time_ms']:.2f} ms")
        print(f"Success: {data['success']}")
        print(f"Message: {data['message']}")
        print(f"Outliers found: {len(data['outliers'])}")

        if data['outliers']:
            print("\nTop outlier:")
            outlier = data['outliers'][0]
            print(f"  Distance: {outlier['trip_distance']:.2f} miles")
            print(f"  Duration: {outlier['trip_duration_hours']:.2f} hours")
            print(f"  Speed: {outlier['avg_speed_mph']:.2f} mph")

        print("✅ Detection test passed\n")
    else:
        print(f"❌ Detection failed: {response.text}\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description='Test script for NYC Outliers Detector API',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''Examples:
  # Test locally
  python test_api.py parquets_optimized/yellow_tripdata_2023-01.parquet

  # Test on production
  python test_api.py --api-base https://your-app.fly.dev parquets_optimized/yellow_tripdata_2023-01.parquet
'''
    )
    parser.add_argument('file_path', help='Path to the parquet file to test')
    parser.add_argument(
        '--api-base',
        default='http://localhost:8080',
        help='Base URL of the API (default: http://localhost:8080)'
    )

    args = parser.parse_args()

    if not Path(args.file_path).exists():
        print(f"❌ File not found: {args.file_path}")
        parser.exit(1)

    print("=" * 60)
    print("NYC Outliers Detector - API Tests")
    print(f"API Base: {args.api_base}")
    print("=" * 60 + "\n")

    # Run tests
    test_health(args.api_base)
    filename = test_upload(args.file_path, args.api_base)

    if filename:
        test_detection(filename, args.api_base)

    print("=" * 60)
    print("All tests completed!")
    print("=" * 60)
