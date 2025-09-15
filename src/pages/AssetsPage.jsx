import React from 'react'
import NotionStyleAssetRegister from '@/components/NotionStyleAssetRegister.jsx'
import ErrorBoundary from '@/components/ErrorBoundary.jsx'
import UnifiedChart from '@/components/UnifiedChart.jsx'

export default function AssetsPage() {
  return (
    <ErrorBoundary>
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        <UnifiedChart defaultEnabled={['assets']} />
        <NotionStyleAssetRegister />
      </div>
    </ErrorBoundary>
  )
}