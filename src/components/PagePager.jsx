import React from 'react'
import { Link, useLocation } from 'react-router-dom'

const FLOW = [
  { path: '/', label: 'FP Calculator' },
  { path: '/assets', label: 'Assets' },
  { path: '/work-assets', label: 'Work Assets' },
  { path: '/goals', label: 'Goals' },
  { path: '/loans', label: 'Loans' },
  { path: '/expenses', label: 'Expenses' },
  { path: '/insurance', label: 'Insurance' },
]

export default function PagePager() {
  const { pathname } = useLocation()
  const index = FLOW.findIndex((item) => item.path === pathname)
  if (index < 0) return null

  const prev = FLOW[index - 1]
  const next = FLOW[index + 1]

  return (
    <div className="lm-pager">
      {prev ? (
        <Link className="lm-btn-nav" to={prev.path}>← {prev.label}</Link>
      ) : <span />}
      {next ? (
        <Link className="lm-btn-nav sp" to={next.path}>{next.label} →</Link>
      ) : null}
    </div>
  )
}
