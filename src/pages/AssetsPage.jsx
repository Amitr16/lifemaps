import React from 'react'
import NotionStyleAssetRegister from '@/components/NotionStyleAssetRegister.jsx'
import ErrorBoundary from '@/components/ErrorBoundary.jsx'

export default function AssetsPage() {
  return (
    <ErrorBoundary>
      <NotionStyleAssetRegister />
    </ErrorBoundary>
  )
}