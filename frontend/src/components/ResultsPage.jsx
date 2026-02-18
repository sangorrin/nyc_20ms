import React, { useState } from 'react'
import axios from 'axios'

const API_URL = 'http://localhost:8080'

function ResultsPage({ metadata, onBack }) {
  const [isDetecting, setIsDetecting] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)

  const handleDetectOutliers = async () => {
    setIsDetecting(true)
    setError(null)

    try {
      const response = await axios.get(`${API_URL}/api/detect_outliers`, {
        params: { filename: metadata.filename }
      })

      setResults(response.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Detection failed. Please try again.')
    } finally {
      setIsDetecting(false)
    }
  }

  const getPerformanceIndicator = () => {
    if (!results) return null

    const time = results.total_time_ms

    if (time < 20) {
      return (
        <div className="flex items-center space-x-2 text-green-600">
          <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-2xl font-bold">Success! Under 20ms 🎯</span>
        </div>
      )
    } else if (time < 100) {
      return (
        <div className="flex items-center space-x-2 text-yellow-600">
          <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-2xl font-bold">Not bad! Under 100ms ⚡</span>
        </div>
      )
    } else {
      return (
        <div className="flex items-center space-x-2 text-red-600">
          <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span className="text-2xl font-bold">Too slow ❌ ({time.toFixed(2)}ms)</span>
        </div>
      )
    }
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            NYC Yellow Taxi Outliers Detector
          </h1>
          <button
            onClick={onBack}
            className="text-purple-brand hover:text-purple-700 font-medium"
          >
            ← Upload Another File
          </button>
        </div>

        {/* File Metadata Card */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <svg className="h-12 w-12 text-purple-brand" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                {metadata.filename}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Rows:</span>
                  <span className="ml-2 font-medium">{metadata.total_rows.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-500">Size:</span>
                  <span className="ml-2 font-medium">{(metadata.total_size_bytes / 1024 / 1024).toFixed(2)} MB</span>
                </div>
                <div>
                  <span className="text-gray-500">Partitions:</span>
                  <span className="ml-2 font-medium">{metadata.num_partitions}</span>
                </div>
                <div>
                  <span className="text-gray-500">Upload Time:</span>
                  <span className="ml-2 font-medium">{metadata.upload_time_ms.toFixed(2)} ms</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detect Button */}
        {!results && !isDetecting && (
          <div className="text-center">
            <button
              onClick={handleDetectOutliers}
              className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-md shadow-lg text-white bg-purple-brand hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-brand transition-transform transform hover:scale-105"
            >
              <svg className="h-6 w-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Detect Outliers
            </button>
          </div>
        )}

        {/* Processing Indicator */}
        {isDetecting && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-brand"></div>
              <span className="text-xl text-gray-700">Processing outliers...</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="bg-purple-brand h-3 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Results Display */}
        {results && (
          <div className="space-y-6">
            {/* Performance Metrics */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Performance Metrics
              </h3>

              <div className="mb-6">
                {getPerformanceIndicator()}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-sm text-blue-600 font-medium">Download Time</div>
                  <div className="text-2xl font-bold text-blue-900">
                    {results.download_time_ms.toFixed(2)} ms
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-sm text-green-600 font-medium">Processing Time</div>
                  <div className="text-2xl font-bold text-green-900">
                    {results.processing_time_ms.toFixed(2)} ms
                  </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-sm text-purple-600 font-medium">Total Time</div>
                  <div className="text-2xl font-bold text-purple-900">
                    {results.total_time_ms.toFixed(2)} ms
                  </div>
                </div>
              </div>
            </div>

            {/* Outliers Table */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Top Outliers ({results.outliers.length} found)
              </h3>

              {results.outliers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No outliers found in the top percentile.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          Distance (mi)
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          Duration (hrs)
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          Avg Speed (mph)
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          Pickup Time
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          Dropoff Time
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {results.outliers.map((outlier, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {outlier.trip_distance?.toFixed(2) || 'N/A'}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-700">
                            {outlier.trip_duration_hours?.toFixed(2) || 'N/A'}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-700">
                            {outlier.avg_speed_mph?.toFixed(2) || 'N/A'}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-700">
                            {outlier.tpep_pickup_datetime?.replace('T', ' ').substring(0, 19) || 'N/A'}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-700">
                            {outlier.tpep_dropoff_datetime?.replace('T', ' ').substring(0, 19) || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ResultsPage
