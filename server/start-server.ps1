# Auto-start script for Pixel Office Server
# Kills any process using port 3001 before starting

$port = 3001

Write-Host "Checking port $port..." -ForegroundColor Cyan

$connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($connections) {
    foreach ($conn in $connections) {
        if ($conn.OwningProcess -ne 0) {
            try {
                $proc = Get-Process -Id $conn.OwningProcess -ErrorAction Stop
                Write-Host "Killing orphaned process: $($proc.ProcessName) (PID: $($proc.Id))" -ForegroundColor Yellow
                Stop-Process -Id $proc.Id -Force
            } catch {
                Write-Host "Could not kill process $($conn.OwningProcess): $_" -ForegroundColor Red
            }
        }
    }
    Start-Sleep -Milliseconds 500
}

$stillOccupied = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($stillOccupied) {
    Write-Host "WARNING: Port $port is still occupied after cleanup" -ForegroundColor Red
} else {
    Write-Host "Port $port is free, starting server..." -ForegroundColor Green
}

# Start the server
node $PSScriptRoot/index.js
