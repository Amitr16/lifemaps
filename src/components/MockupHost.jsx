import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import AuthModal from './AuthModal'
import { useAuth } from '../contexts/AuthContext'
import { loadMockupState, mockupSrc, saveMockupState } from '../lib/mockupSync'

export default function MockupHost({ page }) {
  const navigate = useNavigate()
  const { user, isAuthenticated, logout, loading: authLoading } = useAuth()
  const iframeRef = useRef(null)
  const pendingSaveRef = useRef(null)
  const hydratedRef = useRef(false)
  const appliedRef = useRef(false)
  const statePromiseRef = useRef(null)
  const hydrateGenRef = useRef(0)
  const persistChainRef = useRef(Promise.resolve())
  const pageRef = useRef(page)
  const [authOpen, setAuthOpen] = useState(false)
  const [authTab, setAuthTab] = useState('login')
  const [planReady, setPlanReady] = useState(false)
  const baseSrc = mockupSrc(page)
  const src = isAuthenticated ? `${baseSrc}?owned=1` : baseSrc
  pageRef.current = page

  const api = () => iframeRef.current?.contentWindow?.__LIFEMAP__

  const hydrate = useCallback(async (userId) => {
    const bridge = api()
    if (!bridge) return
    const id = userId || user?.id
    const gen = hydrateGenRef.current
    if (!id) {
      hydratedRef.current = true
      appliedRef.current = true
      if (gen === hydrateGenRef.current) setPlanReady(true)
      return
    }
    if (appliedRef.current) return
    appliedRef.current = true
    try {
      const pending = statePromiseRef.current
      const state = pending ? await pending : await loadMockupState(page, id)
      if (gen !== hydrateGenRef.current) {
        appliedRef.current = false
        return
      }
      if (state) bridge.setState(state)
      bridge.setAccount(user?.name || user?.email || 'Account')
      hydratedRef.current = true
      setPlanReady(true)
    } catch (error) {
      appliedRef.current = false
      if (gen !== hydrateGenRef.current) return
      hydratedRef.current = true
      setPlanReady(true)
      console.error('Failed to hydrate mockup from API', error)
    }
  }, [page, user?.id, user?.name, user?.email])

  const persist = useCallback((state, quiet, userId) => {
    const pageAtCall = pageRef.current
    const job = persistChainRef.current.then(async () => {
      if (pageRef.current !== pageAtCall) return
      const snapshot = api()?.getState() || state
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
        await saveMockupState(pageAtCall, id, snapshot)
        const bridge = api()
        if (bridge) bridge.setAccount(user?.name || user?.email || 'Account')
        if (!quiet) toast.success('Plan saved')
      } catch (error) {
        console.error('Failed to save mockup', error)
        toast.error(error.message || 'Could not save your plan')
      }
    })
    persistChainRef.current = job.catch(() => {})
    return job
  }, [user?.id, user?.name, user?.email])

  useEffect(() => {
    hydrateGenRef.current += 1
    hydratedRef.current = false
    appliedRef.current = false
    persistChainRef.current = Promise.resolve()
    setPlanReady(false)
    if (user?.id) {
      statePromiseRef.current = loadMockupState(page, user.id)
    } else {
      statePromiseRef.current = null
      if (!authLoading) setPlanReady(true)
    }
  }, [page, user?.id, authLoading])

  useEffect(() => {
    if (!isAuthenticated) api()?.setAccount(null)
  }, [isAuthenticated])

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
        appliedRef.current = true
        setAuthOpen(false)
        const bridge = api()
        if (bridge && pending) bridge.setState(pending)
        if (bridge) bridge.setAccount(authed?.name || authed?.email || 'Account')
        setPlanReady(true)
        toast.success('Plan saved')
      } catch (error) {
        pendingSaveRef.current = null
        setAuthOpen(false)
        setPlanReady(true)
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
        const go = () => navigate(data.payload.path)
        if (isAuthenticated && hydratedRef.current) {
          persist(null, true).finally(go)
        } else {
          go()
        }
        return
      }
      if (data.type === 'logout') {
        logout().finally(() => {
          api()?.setAccount(null)
          window.location.assign('/')
        })
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
        persist(null, true)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [hydrate, isAuthenticated, logout, navigate, page, persist])

  return (
    <div className="lm-mockup-host">
      <iframe
        key={src}
        ref={iframeRef}
        className="lm-mockup-frame"
        title="LifeMap"
        src={src}
        style={{ visibility: planReady ? 'visible' : 'hidden' }}
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
