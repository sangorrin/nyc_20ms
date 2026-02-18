import React, { useState } from 'react'
import UploadPage from './components/UploadPage'
import ResultsPage from './components/ResultsPage'

function App() {
  const [currentPage, setCurrentPage] = useState('upload')
  const [fileMetadata, setFileMetadata] = useState(null)

  const handleUploadSuccess = (metadata) => {
    setFileMetadata(metadata)
    setCurrentPage('results')
  }

  const handleBack = () => {
    setCurrentPage('upload')
    setFileMetadata(null)
  }

  return (
    <div className="min-h-screen">
      {currentPage === 'upload' ? (
        <UploadPage onUploadSuccess={handleUploadSuccess} />
      ) : (
        <ResultsPage metadata={fileMetadata} onBack={handleBack} />
      )}
    </div>
  )
}

export default App
