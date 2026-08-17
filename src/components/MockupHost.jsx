import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import AuthModal from './AuthModal'
import { useAuth } from '../contexts/AuthContext'
import { loadMockupState, mockupSrc, saveMockupState } from '../lib/mockupSync'

export default function MockupHost({ page }) {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const iframeRef = useRef(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [authTab, setAuthTab] = useState('login')
  const src = mockupSrc(page)

  const api = () => iframeRef.current?.contentWindow?.__LIFEMAP__

  const hydrate = useCallback(async () => {
    const bridge = api()
    if (!bridge) return
    if (isAuthenticated && user?.id) {
      try {
        const state = await loadMockupState(page, user.id)
        if (state) bridge.setState(state)
        bridge.setAccount(user.name || user.email || 'Account')
      } catch (error) {
        console.error('Failed to hydrate mockup from API', error)
      }
    }
  }, [isAuthenticated, page, user])

  const persist = useCallback(async (state, quiet) => {
    if (!isAuthenticated || !user?.id) {
      setAuthTab('register')
      setAuthOpen(true)
      return
    }
    try {
      const snapshot = state || api()?.getState()
      await saveMockupState(page, user.id, snapshot)
      if (!quiet) toast.success('Plan saved')
    } catch (error) {
      console.error('Failed to save mockup', error)
      toast.error(error.message || 'Could not save your plan')
    }
  }, [isAuthenticated, page, user])

  useEffect(() => {
    if (isAuthenticated && user?.id) hydrate()
  }, [hydrate, isAuthenticated, user])

  useEffect(() => {
    const onMessage = (event) => {
      const data = event.data
      if (!data || data.source !== 'lifemap-mockup') return
      if (data.page && data.page !== page) return

      if (data.type === 'ready') {
        hydrate()
        return
      }
      if (data.type === 'navigate' && data.payload?.path) {
        navigate(data.payload.path)
        return
      }
      if (data.type === 'auth') {
        if (isAuthenticated) {
          navigate('/profile')
          return
        }
        setAuthTab('login')
        setAuthOpen(true)
        return
      }
      if (data.type === 'save') {
        persist(data.payload, false)
        return
      }
      if (data.type === 'row-save' || data.type === 'row-delete') {
        persist(data.payload, true)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [hydrate, isAuthenticated, navigate, page, persist])

  return (
    <div className="lm-mockup-host">
      <iframe
        key={src}
        ref={iframeRef}
        className="lm-mockup-frame"
        title="LifeMap"
        src={src}
        onLoad={hydrate}
      />
      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        defaultTab={authTab}
      />
    </div>
  )
}
