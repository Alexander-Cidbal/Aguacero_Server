import { useEffect, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import './App.css'

type SearchResult = {
  name: string
  path: string
  size: number
  type: 'file' | 'folder'
  isImage: boolean
  thumbnailUrl?: string | null
}

const BACKEND_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '')

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB']
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** unitIndex

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

function useDebouncedValue(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedValue(value), delay)
    return () => window.clearTimeout(timeoutId)
  }, [value, delay])

  return debouncedValue
}

function App() {
  const [query, setQuery] = useState('zapato')
  const debouncedQuery = useDebouncedValue(query, 180)
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [columnCount, setColumnCount] = useState(3)
  const parentRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const element = parentRef.current
    if (!element) return

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0
      const nextColumns = Math.max(2, Math.min(4, Math.floor(width / 180)))
      setColumnCount(nextColumns)
    })

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const trimmedQuery = debouncedQuery.trim()

    if (!trimmedQuery) {
      setResults([])
      setIsLoading(false)
      setError('')
      return
    }

    const controller = new AbortController()

    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true)
      setError('')

      try {
        const response = await fetch(
          `${BACKEND_URL}/api/search?q=${encodeURIComponent(trimmedQuery)}&count=200`,
          { signal: controller.signal },
        )

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }

        const payload = (await response.json()) as { results?: SearchResult[] }
        setResults(payload.results ?? [])
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Unable to fetch results.')
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, 150)

    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [debouncedQuery])

  const rowCount = Math.ceil(results.length / columnCount)
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 220,
    overscan: 4,
  })

  const virtualRows = virtualizer.getVirtualItems()

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Everything Mobile UI</p>
          <h1>Aguacero Search</h1>
        </div>
        <div className="search-box">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar archivos..."
            aria-label="Buscar archivos"
          />
          <button type="button" onClick={() => setQuery('')}>
            Limpiar
          </button>
        </div>
      </header>

      <section className="status-row">
        <span>{isLoading ? 'Buscando…' : `${results.length} resultados`}</span>
        {error ? <span className="error-pill">{error}</span> : null}
      </section>

      <div ref={parentRef} className="results-panel" role="list" aria-live="polite">
        {!results.length && !isLoading ? (
          <div className="empty-state">
            <span>Escribe una consulta para buscar archivos locales.</span>
          </div>
        ) : (
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {virtualRows.map((virtualRow) => {
              const start = virtualRow.index * columnCount
              const rowItems = results.slice(start, start + columnCount)

              return (
                <div
                  key={virtualRow.key}
                  className="grid-row"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                    gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                  }}
                >
                  {rowItems.map((item) => (
                    <article key={item.path} className="result-card" role="listitem">
                      <div className="thumb-wrap">
                        {item.isImage && item.thumbnailUrl ? (
                          <img src={`${BACKEND_URL}${item.thumbnailUrl}`} alt={item.name} loading="lazy" />
                        ) : (
                          <div className="file-placeholder">
                            {item.type === 'folder'
                              ? 'FOLDER'
                              : item.name.split('.').pop()?.toUpperCase() || 'FILE'}
                          </div>
                        )}
                      </div>

                      <div className="meta">
                        <strong title={item.name}>{item.name}</strong>
                        <span>{formatBytes(item.size)}</span>
                      </div>
                    </article>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}

export default App
