// Configuración centralizada de filtros de búsqueda para la UI.
// Para agregar un nuevo filtro de tipo de archivo, agrega una entrada a
// FILE_TYPE_FILTERS con un id único, una etiqueta visible y la lista de
// extensiones (sin el punto) que Everything debe buscar. `extensions: null`
// significa "sin filtro" (todos los archivos).
export type FileTypeFilter = {
  id: string
  label: string
  extensions: string[] | null
}

export const FILE_TYPE_FILTERS: FileTypeFilter[] = [
  { id: 'all', label: 'Todos los archivos', extensions: null },
  {
    id: 'images',
    label: 'Imágenes',
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff', 'svg', 'heic'],
  },
  {
    id: 'photoshop',
    label: 'Photoshop',
    extensions: ['psd'],
  },
  {
    id: 'videos',
    label: 'Videos',
    extensions: ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v'],
  },
  {
    id: 'audio',
    label: 'Audio',
    extensions: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a'],
  },
  {
    id: 'documents',
    label: 'Documentos',
    extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'odt', 'csv'],
  },
  {
    id: 'archives',
    label: 'Archivos comprimidos',
    extensions: ['zip', 'rar', '7z', 'tar', 'gz', 'iso'],
  },
  {
    id: 'code',
    label: 'Código',
    extensions: [
      'js', 'ts', 'tsx', 'jsx', 'py', 'java', 'c', 'cpp', 'cs', 'go', 'rs',
      'json', 'html', 'css', 'php', 'rb',
    ],
  },
  // Ejemplo de cómo agregar un filtro custom más adelante:
  // { id: 'ebooks', label: 'Libros electrónicos', extensions: ['epub', 'mobi', 'azw3'] },
]

// Opciones de orden expuestas al usuario. Cada opción mapea a los parámetros
// "sort" y "ascending" que soporta el servidor HTTP de Everything.
// Ver: References/EverythingHTTP_INFO.md (sección "URL query string").
export type EverythingSortField = 'name' | 'path' | 'date_modified' | 'size'

export type SortOption = {
  id: string
  label: string
  sort: EverythingSortField
  ascending: boolean
}

export const SORT_OPTIONS: SortOption[] = [
  { id: 'name-asc', label: 'Nombre (A-Z)', sort: 'name', ascending: true },
  { id: 'name-desc', label: 'Nombre (Z-A)', sort: 'name', ascending: false },
  { id: 'size-desc', label: 'Tamaño (mayor a menor)', sort: 'size', ascending: false },
  { id: 'size-asc', label: 'Tamaño (menor a mayor)', sort: 'size', ascending: true },
  { id: 'date-desc', label: 'Fecha de modificación (recientes primero)', sort: 'date_modified', ascending: false },
  { id: 'date-asc', label: 'Fecha de modificación (antiguos primero)', sort: 'date_modified', ascending: true },
  { id: 'path-asc', label: 'Ruta (A-Z)', sort: 'path', ascending: true },
  { id: 'path-desc', label: 'Ruta (Z-A)', sort: 'path', ascending: false },
]

export const DEFAULT_FILE_TYPE_FILTER_ID = 'all'
export const DEFAULT_SORT_OPTION_ID = 'name-asc'
