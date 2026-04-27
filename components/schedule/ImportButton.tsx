'use client'

import { useState } from 'react'

interface ImportResult {
  created: number
  updated: number
  cancelled: number
  errors: string[]
}

export function ImportButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleImport() {
    setLoading(true)
    setResult(null)
    setError(null)

    try {
      const res = await fetch('/api/schedule/import-starboard', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Import failed')
      } else {
        setResult(data as ImportResult)
      }
    } catch {
      setError('Network error — check your connection and try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={handleImport}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-full bg-brand-brass-400 px-6 py-3 text-sm font-semibold text-brand-moss-800 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12" cy="12" r="10"
                stroke="currentColor" strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Importing…
          </>
        ) : (
          'Sync from Starboard Suite'
        )}
      </button>

      {result && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-900/20 px-4 py-3 text-sm">
          <p className="font-semibold text-emerald-300">Sync complete</p>
          <p className="mt-1 text-emerald-400/80">
            Created <strong className="text-emerald-200">{result.created}</strong>,
            updated <strong className="text-emerald-200">{result.updated}</strong>,
            cancelled <strong className="text-emerald-200">{result.cancelled}</strong>
          </p>
          {result.errors.length > 0 && (
            <div className="mt-2 space-y-1">
              <p className="font-medium text-red-300">Errors ({result.errors.length}):</p>
              {result.errors.map((e, i) => (
                <p key={i} className="text-xs text-red-400">{e}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-900/20 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}
    </div>
  )
}
