import { useRef, useCallback } from 'react'

export const useDebounce = (callback, delay = 300) => {
  const timeoutRef = useRef()
  
  return useCallback((...args) => {
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => callback(...args), delay)
  }, [callback, delay])
}
