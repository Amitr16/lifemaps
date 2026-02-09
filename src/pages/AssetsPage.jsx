import React, { useState, useEffect } from 'react'
import { AlertTriangle, PiggyBank } from 'lucide-react'
import NotionStyleAssetRegister from '@/components/NotionStyleAssetRegister.jsx'
import ErrorBoundary from '@/components/ErrorBoundary.jsx'
import UnifiedChart from '@/components/UnifiedChart.jsx'
import { useAuth } from '../contexts/AuthContext'
import { useAdminUser } from '../contexts/AdminUserContext'
import ApiService from '../services/api'

export default function AssetsPage() {
  const { user, isAuthenticated } = useAuth()
  const adminUser = useAdminUser()
  const [assetsCount, setAssetsCount] = useState(0)
  
  const isAdminMode = !!adminUser?.userId
  const effectiveUserId = isAdminMode ? adminUser.userId : (user?.id || null)
  const effectiveIsAuthenticated = isAdminMode || isAuthenticated

  // Load assets count to determine if alert should show
  useEffect(() => {
    if (effectiveIsAuthenticated && effectiveUserId) {
      loadAssetsCount()
    }
    
    // Listen for asset updates from NotionStyleAssetRegister
    const handleAssetsUpdated = (event) => {
      if (event.detail?.assets) {
        setAssetsCount(event.detail.assets.length)
      }
    }
    
    window.addEventListener('assetsUpdated', handleAssetsUpdated)
    return () => window.removeEventListener('assetsUpdated', handleAssetsUpdated)
  }, [effectiveIsAuthenticated, effectiveUserId])

  const loadAssetsCount = async () => {
    try {
      const response = isAdminMode
        ? await ApiService.getFinancialAssetsForUser(effectiveUserId)
        : await ApiService.getFinancialAssets(effectiveUserId)
      setAssetsCount((response.assets || []).length)
    } catch (error) {
      console.error('Error loading assets count:', error)
    }
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="lifemap-page-header">
          <div>
            <h1 className="lifemap-page-title">Assets</h1>
            <p className="lifemap-page-subtitle flex items-center gap-2">
              <PiggyBank className="h-4 w-4 text-slate-400" />
              Add or edit your assets
            </p>
          </div>
          {assetsCount === 0 && (
            <div className="lifemap-alert">
              <AlertTriangle className="h-4 w-4" />
              <span>
                Start adding your first asset in the asset register below. You may add as
                many assets as you want and sort as per tags.
              </span>
            </div>
          )}
        </div>

        <UnifiedChart defaultEnabled={['assets']} />
        <NotionStyleAssetRegister />
      </div>
    </ErrorBoundary>
  )
}