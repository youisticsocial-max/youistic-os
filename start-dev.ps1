# Youistic OS — Dev Server Launcher
# Run this from: E:\Projects\Youistic + ERP\youistic-os
# Or double-click after right-clicking → "Run with PowerShell"

Write-Host "🚀 Starting Youistic OS Dev Server..." -ForegroundColor Cyan

# Kill anything on port 3000 first
$proc = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($proc) {
    Stop-Process -Id $proc -Force -ErrorAction SilentlyContinue
    Write-Host "⚡ Cleared existing process on port 3000" -ForegroundColor Yellow
}

# Start the dev server (bypasses Node 20.8 engine check)
$env:NODE_OPTIONS = "--no-deprecation"
Write-Host "✅ Open http://localhost:3000 in your browser" -ForegroundColor Green
Write-Host ""
node node_modules/next/dist/bin/next dev --port 3000
