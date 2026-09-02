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
  previewUrl?: string | null
  downloadUrl?: string | null
}

const BACKEND_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '')

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB']
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** unitIndex

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

function getFileExtensionLabel(item: SearchResult) {
  if (item.type === 'folder') return 'Carpeta'
  const extension = item.name.split('.').pop()
  return extension && extension !== item.name ? extension.toUpperCase() : 'Archivo'
}

// Triggers a browser download without navigating away from the current
// page. The backend sets a `Content-Disposition: attachment` header, so a
// programmatic anchor click is enough even for cross-origin URLs.
function triggerDownload(url: string) {
  const link = document.createElement('a')
  link.href = url
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

function DownloadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18px" width="18px">
      <path
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeWidth="2"
        stroke="currentColor"
        d="M6 21H18M12 3V17M12 17L17 12M12 17L7 12"
      />
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18px" width="18px">
      <path
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeWidth="2"
        stroke="currentColor"
        d="M4 4V9H4.582M20 20V15H19.419M4.582 9C5.83 6.39 8.446 4.5 11.5 4.5C15.09 4.5 18.056 6.947 18.87 10.25M19.419 15C18.171 17.61 15.554 19.5 12.5 19.5C8.91 19.5 5.944 17.053 5.13 13.75"
      />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="20px" width="20px">
      <path
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeWidth="2"
        stroke="currentColor"
        d="M6 6L18 18M18 6L6 18"
      />
    </svg>
  )
}

type ThumbnailImageProps = {
  item: SearchResult
  refreshToken: number
  isZoomable: boolean
  onPreview: (item: SearchResult) => void
}

function ThumbnailImage({ item, refreshToken, isZoomable, onPreview }: ThumbnailImageProps) {
  const [hasLoaded, setHasLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  // Reset loading/error state if path or refresh token changes
  useEffect(() => {
    setHasLoaded(false)
    setHasError(false)
  }, [item.path, refreshToken])

  const extensionLabel =
    item.type === 'folder'
      ? 'FOLDER'
      : `.${item.name.split('.').pop()?.toUpperCase() || 'FILE'}`

  const shouldRenderImage = item.isImage && Boolean(item.thumbnailUrl) && !hasError

  return (
    <div className={`thumb-wrap${isZoomable ? ' thumb-wrap--zoomable' : ''}`}>
      {item.type === 'file' && item.downloadUrl ? (
        <button
          type="button"
          className="download-btn"
          title="Download"
          aria-label={`Descargar ${item.name}`}
          onClick={(event) => {
            event.stopPropagation()
            triggerDownload(`${BACKEND_URL}${item.downloadUrl}`)
          }}
        >
          <DownloadIcon />
        </button>
      ) : null}

      <div
        className={`thumb-placeholder${
          shouldRenderImage && !hasLoaded ? ' thumb-placeholder--loading' : ''
        }`}
      >
        <span>{extensionLabel}</span>
      </div>

      {shouldRenderImage ? (
        <img
          className={`thumb-image${hasLoaded ? ' thumb-image--loaded' : ''}`}
          src={`${BACKEND_URL}${item.thumbnailUrl}&v=${refreshToken}`}
          alt={item.name}
          loading="lazy"
          onLoad={() => setHasLoaded(true)}
          onError={() => setHasError(true)}
          onClick={() => {
            if (isZoomable) onPreview(item)
          }}
        />
      ) : null}
    </div>
  )
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
  const [previewItem, setPreviewItem] = useState<SearchResult | null>(null)
  const [isRefreshingThumbnails, setIsRefreshingThumbnails] = useState(false)
  const [thumbnailRefreshToken, setThumbnailRefreshToken] = useState(0)
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
    if (!previewItem) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewItem(null)
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [previewItem])

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
  }, [debouncedQuery, fileTypeFilterId, sortOptionId, thumbnailRefreshToken])

  // Asks the backend to delete every cached thumbnail file, then re-runs the
  // current search so results (and their thumbnails) are regenerated fresh.
  const handleRefreshThumbnails = async () => {
    setIsRefreshingThumbnails(true)
    setError('')

    try {
      const response = await fetch(`${BACKEND_URL}/api/thumbnails`, { method: 'DELETE' })

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      // Bumping this token re-triggers the search effect and busts the
      // browser's image cache so freshly generated thumbnails are shown.
      setThumbnailRefreshToken((value) => value + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo limpiar la caché de miniaturas.')
    } finally {
      setIsRefreshingThumbnails(false)
    }
  }

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
          <button
            type="button"
            className="refresh-thumbs-btn"
            onClick={handleRefreshThumbnails}
            disabled={isRefreshingThumbnails}
            title="Regenerar miniaturas"
            aria-label="Regenerar miniaturas"
          >
            <RefreshIcon />
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
                  {rowItems.map((item) => {
                    const isZoomable = item.isImage && Boolean(item.previewUrl)

                    return (
                      <article key={item.path} className="result-card" role="listitem">
                        <ThumbnailImage
                          item={item}
                          refreshToken={thumbnailRefreshToken}
                          isZoomable={isZoomable}
                          onPreview={setPreviewItem}
                        />

                        <div className="card-body">
                          <h3 className="card-title" title={item.name}>
                            {item.name}
                          </h3>
                          <div className="card-info">
                            <span>{formatBytes(item.size)}</span>
                            <span>{getFileExtensionLabel(item)}</span>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {previewItem && previewItem.previewUrl ? (
        <div
          className="preview-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={`Vista previa de ${previewItem.name}`}
          onClick={() => setPreviewItem(null)}
        >
          <div className="preview-panel" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="preview-close"
              title="Cerrar"
              aria-label="Cerrar"
              onClick={() => setPreviewItem(null)}
            >
              <CloseIcon />
            </button>
            <img
              className="preview-image"
              src={`${BACKEND_URL}${previewItem.previewUrl}`}
              alt={previewItem.name}
            />
            <p className="preview-caption" title={previewItem.name}>
              {previewItem.name}
            </p>
          </div>
        </div>
      ) : null}
    </main>
  )
}

export default App
