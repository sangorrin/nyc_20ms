import React, { useState, useRef } from 'react'
import axios from 'axios'

const API_URL = 'http://localhost:8000'

function UploadPage({ onUploadSuccess }) {
  const [file, setFile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const handleDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.name.endsWith('.parquet')) {
      setFile(droppedFile)
      setError(null)
    } else {
      setError('Please drop a .parquet file')
    }
  }

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile && selectedFile.name.endsWith('.parquet')) {
      setFile(selectedFile)
      setError(null)
    } else {
      setError('Please select a .parquet file')
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await axios.post(`${API_URL}/api/upload_parquet`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      onUploadSuccess(response.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed. Please try again.')
      setIsUploading(false)
    }
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            NYC Yellow Taxi Outliers Detector
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Upload an optimized NYC taxi parquet file (~30MB) to detect outlier trips
            in the top 0.9 percentile. Our goal: complete analysis in under 20ms.
          </p>
        </div>

        {/* Upload Area */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div
            className={`border-3 border-dashed rounded-lg p-12 text-center transition-colors ${
              isDragging
                ? 'border-purple-brand bg-purple-50'
                : 'border-gray-300 bg-gray-50'
            }`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <svg
              className="mx-auto h-16 w-16 text-gray-400 mb-4"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            {file ? (
              <div className="mb-4">
                <p className="text-lg font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <p className="text-lg text-gray-600 mb-4">
                Drag and drop your optimized parquet file here
              </p>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".parquet"
              onChange={handleFileSelect}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-purple-brand bg-purple-100 hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-brand transition-colors"
            >
              Select File
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {file && !isUploading && (
            <button
              onClick={handleUpload}
              className="mt-6 w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-purple-brand hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-brand transition-colors"
            >
              Upload & Partition File
            </button>
          )}

          {isUploading && (
            <div className="mt-6">
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-brand"></div>
                <span className="text-gray-700">Uploading and partitioning...</span>
              </div>
              <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-brand h-2 rounded-full animate-pulse" style={{ width: '70%' }}></div>
              </div>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            File Requirements
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Optimized parquet file (~30MB)</li>
            <li>• Pre-sorted by trip distance (descending)</li>
            <li>• Contains 10 row groups for efficient partitioning</li>
            <li>• Generated using scripts/optimize_parquets.py</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default UploadPage
