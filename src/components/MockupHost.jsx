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
  const pendingSaveRef = useRef(null)
  const hydratedRef = useRef(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [authTab, setAuthTab] = useState('login')
  const src = mockupSrc(page)

  const api = () => iframeRef.current?.contentWindow?.__LIFEMAP__

  const hydrate = useCallback(async (userId) => {
    const bridge = api()
    if (!bridge) return
    const id = userId || user?.id
    if (!id) {
      hydratedRef.current = true
      return
    }
    try {
      const state = await loadMockupState(page, id)
      if (state) bridge.setState(state)
      bridge.setAccount(user?.name || user?.email || 'Account')
      hydratedRef.current = true
    } catch (error) {
      hydratedRef.current = true
      console.error('Failed to hydrate mockup from API', error)
    }
  }, [page, user?.id, user?.name, user?.email])

  const persist = useCallback(async (state, quiet, userId) => {
    const snapshot = state || api()?.getState()
    const id = userId || user?.id
    if (!id) {
      pendingSaveRef.current = snapshot
      setAuthTab('register')
      setAuthOpen(true)
      return
    }
    if (!hydratedRef.current) {
      if (!quiet) toast.message('Still loading your plan')
      return
    }
    try {
      await saveMockupState(page, id, snapshot)
      const bridge = api()
      if (bridge && snapshot) bridge.setState(snapshot)
      if (bridge) bridge.setAccount(user?.name || user?.email || 'Account')
      if (!quiet) toast.success('Plan saved')
    } catch (error) {
      console.error('Failed to save mockup', error)
      toast.error(error.message || 'Could not save your plan')
    }
  }, [page, user?.id, user?.name, user?.email])

  useEffect(() => {
    hydratedRef.current = false
  }, [page, user?.id])

  useEffect(() => {
    if (authOpen) return
    if (pendingSaveRef.current) return
    if (isAuthenticated && user?.id) hydrate(user.id)
  }, [authOpen, hydrate, isAuthenticated, user?.id])

  const onAuthenticated = useCallback(async ({ mode, user: authed } = {}) => {
    const id = authed?.id
    const pending = pendingSaveRef.current
    if (mode === 'register' && pending && id) {
      try {
        await saveMockupState(page, id, pending)
        pendingSaveRef.current = null
        hydratedRef.current = true
        setAuthOpen(false)
        const bridge = api()
        if (bridge && pending) bridge.setState(pending)
        if (bridge) bridge.setAccount(authed?.name || authed?.email || 'Account')
        toast.success('Plan saved')
      } catch (error) {
        pendingSaveRef.current = null
        setAuthOpen(false)
        console.error('Failed to save mockup after register', error)
        toast.error(error.message || 'Could not save your plan')
      }
      return
    }
    pendingSaveRef.current = null
    setAuthOpen(false)
    if (id) await hydrate(id)
  }, [hydrate, page])

  useEffect(() => {
    const onMessage = (event) => {
      const data = event.data
      if (!data || data.source !== 'lifemap-mockup') return
      if (data.page && data.page !== page) return

      if (data.type === 'ready') {
        if (!pendingSaveRef.current) hydrate()
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
        onLoad={() => {
          if (!pendingSaveRef.current) hydrate()
        }}
      />
      <AuthModal
        isOpen={authOpen}
        onClose={() => {
          setAuthOpen(false)
          pendingSaveRef.current = null
        }}
        defaultTab={authTab}
        onAuthenticated={onAuthenticated}
      />
    </div>
  )
}
