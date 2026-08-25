import { useEffect, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import './App.css'
import {
  DEFAULT_FILE_TYPE_FILTER_ID,
  DEFAULT_SORT_OPTION_ID,
  FILE_TYPE_FILTERS,
  SORT_OPTIONS,
} from './searchFilters'

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
  const [fileTypeFilterId, setFileTypeFilterId] = useState(DEFAULT_FILE_TYPE_FILTER_ID)
  const [sortOptionId, setSortOptionId] = useState(DEFAULT_SORT_OPTION_ID)
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
        const fileTypeFilter = FILE_TYPE_FILTERS.find((filter) => filter.id === fileTypeFilterId)
        const sortOption = SORT_OPTIONS.find((option) => option.id === sortOptionId) ?? SORT_OPTIONS[0]

        const params = new URLSearchParams({
          q: trimmedQuery,
          count: '200',
          sort: sortOption.sort,
          ascending: sortOption.ascending ? '1' : '0',
        })

        if (fileTypeFilter?.extensions?.length) {
          params.set('ext', fileTypeFilter.extensions.join(','))
        }

        const response = await fetch(`${BACKEND_URL}/api/search?${params.toString()}`, {
          signal: controller.signal,
        })

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
  }, [debouncedQuery, fileTypeFilterId, sortOptionId])

  const rowCount = Math.ceil(results.length / columnCount)
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    // Initial guess only: real row height (thumbnail + text + row spacing)
    // is measured dynamically via `measureElement` below, since result
    // cards can wrap to different heights depending on file name length.
    estimateSize: () => 238,
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

      <section className="filters-row">
        <label className="filter-field">
          <span>Tipo de archivo</span>
          <select
            value={fileTypeFilterId}
            onChange={(event) => setFileTypeFilterId(event.target.value)}
            aria-label="Filtrar por tipo de archivo"
          >
            {FILE_TYPE_FILTERS.map((filter) => (
              <option key={filter.id} value={filter.id}>
                {filter.label}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-field">
          <span>Ordenar por</span>
          <select
            value={sortOptionId}
            onChange={(event) => setSortOptionId(event.target.value)}
            aria-label="Ordenar resultados"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </section>

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
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
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
