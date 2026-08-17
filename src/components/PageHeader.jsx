import React, { useState } from 'react'

export default function PageHeader({ title, description, children }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="lm-phead">
      <h1>
        {title}
        {description ? (
          <button
            type="button"
            className="lm-pmore"
            aria-expanded={open}
            aria-label="Show what this page is for"
            onClick={() => setOpen((v) => !v)}
          />
        ) : null}
      </h1>
      {description ? (
        <div className={`lm-pdesc ${open ? 'open' : ''}`}>
          <p>{description}</p>
        </div>
      ) : null}
      {children}
    </div>
  )
}
