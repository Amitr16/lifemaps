import React, { useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import NotionStyleAssetRegister from '@/components/NotionStyleAssetRegister.jsx'
import ErrorBoundary from '@/components/ErrorBoundary.jsx'
import UnifiedChart from '@/components/UnifiedChart.jsx'
import PageHeader from '@/components/PageHeader.jsx'
import PagePager from '@/components/PagePager.jsx'
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
      <div className="lm-body">
        <PageHeader
          title="What you own"
          description="Every holding, in one register. The mix and the growth path below rebuild themselves as you add rows — and choosing a category fills in a historical return you can then override."
        />
        {assetsCount === 0 && (
          <div className="lm-alert">
            <AlertTriangle className="h-4 w-4" />
            <span>
              Start adding your first asset in the asset register below. You may add as
              many assets as you want and sort as per tags.
            </span>
          </div>
        )}

        <div id="sec-mix">
          <div id="sec-growth" className="lm-card" style={{ padding: '18px 20px 14px', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, marginBottom: 10 }}>How that grows</h3>
            <UnifiedChart defaultEnabled={['assets']} />
          </div>
        </div>

        <div id="sec-register">
          <NotionStyleAssetRegister />
        </div>
        <PagePager />
      </div>
    </ErrorBoundary>
  )
}