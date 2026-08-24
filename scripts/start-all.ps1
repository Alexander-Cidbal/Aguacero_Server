<#
.SYNOPSIS
  Starts the Aguacero backend and a Cloudflare Quick Tunnel, then updates and
  redeploys the frontend (GitHub Pages) so it always points at the current
  public tunnel URL.

.DESCRIPTION
  Cloudflare "Quick Tunnels" (cloudflared tunnel --url ...) are free and require
  no domain/login, but they hand out a NEW random *.trycloudflare.com URL every
  time they start. Since the frontend is a static site on GitHub Pages, it has
  the backend URL baked in at build time. This script closes that loop:

    1. Starts the backend (apps/backend) in the background.
    2. Starts a Cloudflare Quick Tunnel pointing at http://localhost:3000.
    3. Parses the new public URL from the tunnel's log output.
    4. Writes that URL into apps/frontend/.env.production.
    5. Rebuilds the frontend and redeploys it to the gh-pages branch.

  Run this script every time you start your PC (or register it as a Windows
  Scheduled Task at logon) and no manual edits are required.

.PARAMETER SkipDeploy
  Only start backend + tunnel; do not rebuild/redeploy the frontend.
#>
param(
  [switch]$SkipDeploy
)

$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent $PSScriptRoot
$BackendDir = Join-Path $RepoRoot 'apps\backend'
$FrontendDir = Join-Path $RepoRoot 'apps\frontend'
$LogDir = Join-Path $RepoRoot '.cache\logs'
$CloudflaredExe = 'C:\Users\Ryzen5\AppData\Local\cloudflared\cloudflared.exe'

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Stop-ExistingProcess {
  param([int]$Port)

  $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  foreach ($conn in $connections) {
    Write-Host "Stopping existing process on port $Port (PID $($conn.OwningProcess))..."
    Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
  }
}

Write-Host '== Aguacero startup =='

# 1. Make sure nothing stale is already bound to the backend port.
Stop-ExistingProcess -Port 3000

# 2. Start the backend in the background (production mode, no --watch).
Write-Host 'Starting backend...'
$backendOut = Join-Path $LogDir 'backend.out.log'
$backendErr = Join-Path $LogDir 'backend.err.log'
$backend = Start-Process -FilePath 'node' -ArgumentList 'src/server.js' `
  -WorkingDirectory $BackendDir -WindowStyle Hidden -PassThru `
  -RedirectStandardOutput $backendOut -RedirectStandardError $backendErr

Start-Sleep -Seconds 3
if ($backend.HasExited) {
  throw "Backend process exited immediately. Check $backendErr for details."
}
Write-Host "Backend running (PID $($backend.Id)). Logs: $backendOut"

# 3. Start a Cloudflare Quick Tunnel pointing at the backend.
# cloudflared logs its startup banner (including the public URL) to stderr.
Write-Host 'Starting Cloudflare Quick Tunnel...'
$tunnelLog = Join-Path $LogDir 'tunnel.log'
$tunnelOut = Join-Path $LogDir 'tunnel.out.log'
Remove-Item $tunnelLog, $tunnelOut -Force -ErrorAction SilentlyContinue
$tunnel = Start-Process -FilePath $CloudflaredExe `
  -ArgumentList 'tunnel', '--url', 'http://localhost:3000' `
  -WindowStyle Hidden -PassThru `
  -RedirectStandardOutput $tunnelOut -RedirectStandardError $tunnelLog

# 4. Wait for the public URL to show up in the tunnel log.
$publicUrl = $null
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 2
  if (Test-Path $tunnelLog) {
    $content = Get-Content $tunnelLog -Raw
    if ($content -match 'https://[a-zA-Z0-9\-]+\.trycloudflare\.com') {
      $publicUrl = $Matches[0]
      break
    }
  }
}

if (-not $publicUrl) {
  throw "Could not determine the public tunnel URL. Check $tunnelLog for details."
}

Write-Host "Public tunnel URL: $publicUrl"
Write-Host "Backend PID: $($backend.Id) | Tunnel PID: $($tunnel.Id)"

# 5. Rebuild + redeploy the frontend so GitHub Pages points at the new URL.
if (-not $SkipDeploy) {
  Write-Host 'Updating frontend production URL and redeploying to GitHub Pages...'
  Set-Content -Path (Join-Path $FrontendDir '.env.production') -Value "VITE_API_URL=$publicUrl"

  Push-Location $FrontendDir
  try {
    npm run build
    npx gh-pages -d dist -m "Update backend tunnel URL to $publicUrl"
  } finally {
    Pop-Location
  }

  Write-Host 'Frontend redeployed successfully.'
} else {
  Write-Host 'Skipped frontend rebuild/redeploy (-SkipDeploy).'
}

Write-Host '== Done =='
Write-Host "Backend:  http://localhost:3000 (PID $($backend.Id))"
Write-Host "Tunnel:   $publicUrl (PID $($tunnel.Id))"
Write-Host 'Keep this PowerShell session open, or note the PIDs above to stop them later with Stop-Process.'
