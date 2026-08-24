# Documento de Arquitectura de Software "Aguacero_Server": Everything Mobile UI & Proxy Sidecar

Este documento detalla la arquitectura, flujos de datos y especificaciones técnicas para implementar una solución de búsqueda y previsualización ultra rápida de archivos locales desde dispositivos móviles fuera y dentro de la red local.

---

## 1. Visión General del Sistema

El sistema permite consultar el índice local de **Everything (Voidtools)** en una PC con Windows desde un dispositivo móvil con fluidez nativa (60 FPS, búsqueda instantánea y renderizado de miniaturas ultraligeras), utilizando tecnologías 100% gratuitas y de código abierto.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          DISPOSITIVO MÓVIL                             │
│  [ React 18 + TS + Vite Client ] (Web App / PWA)                        │
│  - Virtualized Grid (@tanstack/react-virtual)                          │
│  - Debounced Input (150ms) + AbortController                           │
│  - Lazy loading de miniaturas                                          │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │ HTTPS (TLS 1.3)
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        CLOUDFLARE EDGE NETWORK                         │
│  - SSL/TLS Termination Gratis                                          │
│  - Cloudflare Tunnel (Zero Trust / Access Control Opcional)            │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │ Túnel Cifrado (cloudflared daemon)
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                             PC LOCAL (WINDOWS)                         │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Node.js Middleware / Sidecar (Puerto Interno 3000)               │  │
│  │  - Express REST API                                              │  │
│  │  - Sharp Image Resizer (Transformación a WebP ~150px)            │  │
│  │  - LRU / Disk Thumbnail Cache System                             │  │
│  │  - Everything API Client (fetch loopback)                        │  │
│  └──────────────────────────────┬───────────────────────────────────┘  │
│                                 │ HTTP Loopback (127.0.0.1:8080)       │
│                                 ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Everything HTTP Server                                           │  │
│  │  - Listening on 127.0.0.1 ONLY                                   │  │
│  │  - Access to local file system                                   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘

```

---

## 2. Componentes de la Arquitectura

### 2.1 Backend: Node.js / Express Middleware Sidecar

Actúa como capa intermedia (Gateway/Proxy) entre la interfaz web móvil y la API nativa de Everything.

* **Responsabilidades:**
* **Intercepción de Búsquedas:** Recibe peticiones `/api/search?q=...` desde el cliente web y consulta a `[http://127.0.0.1:8080/?search=...&json=1](http://127.0.0.1:8080/?search=...&json=1)`.
* **Generación al Vuelo de Miniaturas (`/api/thumbnail`):** Lee la imagen original del sistema de archivos mediante su ruta local (`path`), la redimensiona a `150x150 px` o `250x250 px` usando `sharp` con formato `WebP` (calidad 75-80%) y la envía al cliente.
* **Caché en Disco/Memoria:** Guarda la miniatura procesada en una carpeta temporal (`.cache/thumbs`) identificada mediante el hash MD5/SHA256 de la ruta del archivo. Si la miniatura existe, se entrega en <5 ms sin reprocesar.
* **Seguridad:** Aísla el servidor HTTP de Everything para que nunca quede expuesto directamente a la red ni a internet.



### 2.2 Túnel de Red: Cloudflare Tunnel (`cloudflared`)

Proporciona exposición HTTPS segura hacia internet de forma gratuita sin necesidad de abrir puertos en el router (Port Forwarding) ni contratar IPs públicas fijas.

* **Configuración:**
* El demonio `cloudflared` ejecuta en segundo plano en la PC local.
* Enruta el tráfico entrante desde un subdominio gratuito de Cloudflare (o dominio propio) directamente hacia `http://localhost:3000` (el Middleware de Node.js).
* Opcionalmente se puede activar **Cloudflare Zero Trust Access** para exigir login con Google/Email antes de ingresar a la app.



### 2.3 Frontend: React + TypeScript + Vite (Client App)

Interfaz de usuario web móvil optimizada para alto rendimiento.

* **Patrones de Rendimiento:**
* **Virtual Scrolling:** Uso de `@tanstack/react-virtual` para renderizar únicamente los elementos visibles en la pantalla (10-15 ítems del DOM) aunque la búsqueda devuelva miles de archivos.
* **Debounce y Cancelling:** Implementación de `useDebounce` (150 ms) en la barra de búsqueda junto con `AbortController` para cancelar peticiones en vuelo al teclear rápido.
* **Lazy Loading Progresivo:** Las miniaturas usan la propiedad `loading="lazy"` o `IntersectionObserver` para no realizar peticiones al backend hasta que la tarjeta entra en el viewport.



---

## 3. Especificación de Endpoints de la API (Node.js Sidecar)

### `GET /api/search`

* **Parámetros:** `q` (string, término de búsqueda), `offset` (number, opcional), `count` (number, opcional).
* **Respuesta JSON:**

```json
{
  "totalResults": 142,
  "results": [
    {
      "name": "PRODUCTO_A_001.jpg",
      "path": "C:/Fotos/Productos/PRODUCTO_A_001.jpg",
      "size": 4521004,
      "isImage": true,
      "thumbnailUrl": "/api/thumbnail?path=C%3A%2FFotos%2FProductos%2FPRODUCTO_A_001.jpg"
    }
  ]
}

```

### `GET /api/thumbnail`

* **Parámetros:** `path` (string codificado en URL), `w` (ancho opcional, default 200).
* **Respuesta:** Stream directo del archivo procesado (`Content-Type: image/webp`).

---

## 4. Flujo de Datos

```
[Usuario teclea "zapato"]
        │
        ▼ (Debounce 150ms)
[React App] ──── GET /api/search?q=zapato ────> [Cloudflare Tunnel]
                                                       │
                                                       ▼
[Everything HTTP] <── GET /?search=zapato&json=1 ── [Node.js Middleware]
        │                                              │
        └──── Devuelve arreglo JSON original ──────────┘
                                                       │
                                        (Transforma datos y añade thumbnailUrl)
                                                       │
[React App] <──── Respuestas JSON con URLs ────────────┘
        │
        ▼ (Virtual List asigna los ítems visibles)
[Renderiza Grid HTML]
        │
        ▼ (Navegador solicita miniaturas visibles)
[React App] ──── GET /api/thumbnail?path=... ──> [Node.js Middleware]
                                                       │
                                        (¿Existe en cache .cache/thumbs?)
                                           ├── SÍ ──> Lee de disco y responde WebP (5ms)
                                           └── NO ──> Lee imagen original, pasa por Sharp,
                                                      guarda en caché y responde WebP (~30ms)

```

---

## 5. Matriz de Requisitos y Stack Tecnológico

| Capa | Tecnología Seleccionada | Justificación |
| --- | --- | --- |
| **Buscador Core** | Everything (Voidtools) HTTP API | Indexación instantánea nativa en Windows kernel. |
| **Runtime Backend** | Node.js (v18+) + Express | Liviano, manejo eficiente de I/O asíncrono y streams. |
| **Procesador de Imágenes** | `sharp` | La librería más rápida en C++ para resize/WebP en Node.js. |
| **Túnel de Red** | Cloudflare Tunnel (`cloudflared`) | Gratuito, cifrado SSL automático, no requiere IP pública. |
| **Framework Frontend** | React 18 + TypeScript + Vite | Desarrollo modular, seguro en tipos y build liviano. |
| **Virtualización UI** | `@tanstack/react-virtual` | Manejo de listas de miles de elementos a 60 FPS estables. |
| **Estilos** | Tailwind CSS / DaisyUI | Diseño responsivo orientado a móviles sin sobrecarga. |

---

## 6. Instrucciones de Despliegue e Instalación para el Agente

1. **Configurar Everything:** Habilitar el servidor HTTP nativo en `Tools -> Options -> HTTP Server`, asignado exclusivamente a `127.0.0.1` en el puerto `8080`.
2. **Desarrollar Middleware Node.js:**
* Instalar `express`, `sharp`, `axios` (o `fetch` nativo) y `cors`.
* Crear lógica de verificación de extensión de imagen (`.jpg`, `.png`, `.webp`, `.bmp`).
* Implementar hash MD5 de rutas para nombrar archivos en el directorio de caché local `.cache/thumbs/`.


3. **Desarrollar Cliente React:**
* Crear proyecto Vite con TypeScript.
* Implementar componente de lista/grid virtualizada.
* Configurar `AbortController` en el hook de búsqueda.


4. **Desplegar Túnel:**
* Descargar `cloudflared.exe`.
* Autenticar y crear túnel apuntando a `