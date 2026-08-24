<#
.SYNOPSIS
  Stops the Aguacero backend and Cloudflare Quick Tunnel started by start-all.ps1.
#>

$ErrorActionPreference = 'SilentlyContinue'

Write-Host 'Stopping backend (port 3000)...'
Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
  Write-Host "  Stopping PID $($_.OwningProcess)"
  Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
}

Write-Host 'Stopping cloudflared tunnel processes...'
Get-Process -Name 'cloudflared' -ErrorAction SilentlyContinue | ForEach-Object {
  Write-Host "  Stopping PID $($_.Id)"
  Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}

Write-Host 'Done.'
