# ==============================================================================
# Shabd - Automated UI & Backend Startup Script
# ==============================================================================
# Automatically detects free ports for backend and frontend.
# Automatically checks and installs Python dependencies.
# Serves the static frontend via Python's http.server.
# If all candidate ports are busy, kills the process on the default port.
# ==============================================================================

$ErrorActionPreference = "Continue"
$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "        SHABD - AUTOMATED STARTUP SCRIPT          " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# ---- Helper: Check if a TCP port is in use ----
function Test-PortInUse ($Port) {
    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        if ($connections) { return $true }
    } catch { }

    try {
        $listeners = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners()
        foreach ($l in $listeners) {
            if ($l.Port -eq $Port) { return $true }
        }
    } catch { }
    return $false
}

# ---- Helper: Get a free port from a candidate list ----
function Get-FreePort ($Ports) {
    foreach ($p in $Ports) {
        if (-not (Test-PortInUse $p)) { return $p }
    }
    return $null
}

# ---- Helper: Kill whatever process is listening on a port ----
function Kill-PortProcess ($Port) {
    Write-Host "All candidate ports busy! Attempting to free port $Port..." -ForegroundColor Yellow

    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        if ($connections) {
            $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
            foreach ($procId in $pids) {
                if ($procId -gt 0 -and $procId -ne $PID) {
                    Write-Host " -> Killing Process ID $procId on port $Port..." -ForegroundColor Red
                    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
                }
            }
        }
    } catch { }

    try {
        $netstatOut = netstat -ano | Select-String ":$Port\s+"
        foreach ($line in $netstatOut) {
            $parts = $line.ToString().Trim() -split '\s+'
            $procId = $parts[-1]
            if ($procId -match '^\d+$' -and [int]$procId -gt 0 -and [int]$procId -ne $PID) {
                Write-Host " -> Killing Process ID $procId on port $Port (netstat)..." -ForegroundColor Red
                Stop-Process -Id [int]$procId -Force -ErrorAction SilentlyContinue
            }
        }
    } catch { }

    Start-Sleep -Seconds 1
}

# ---- Backend Port Selection ----
$backendCandidatePorts = @(8000, 8001, 8002, 8003, 8080)
Write-Host "Checking Backend ports ($($backendCandidatePorts -join ', '))..." -ForegroundColor Gray
$backendPort = Get-FreePort -Ports $backendCandidatePorts

if ($null -eq $backendPort) {
    Kill-PortProcess -Port 8000
    $backendPort = 8000
}
Write-Host " [OK] Backend -> Port $backendPort" -ForegroundColor Green

# ---- Frontend Port Selection ----
$frontendCandidatePorts = @(5500, 5501, 5502, 5503, 3000)
Write-Host "Checking Frontend ports ($($frontendCandidatePorts -join ', '))..." -ForegroundColor Gray
$frontendPort = Get-FreePort -Ports $frontendCandidatePorts

if ($null -eq $frontendPort) {
    Kill-PortProcess -Port 5500
    $frontendPort = 5500
}
Write-Host " [OK] Frontend -> Port $frontendPort" -ForegroundColor Green

# ---- Virtual Environment Setup ----
$venvDir = Join-Path $root "backend\.venv"
$pythonExe = Join-Path $venvDir "Scripts\python.exe"

if (-not (Test-Path $pythonExe)) {
    Write-Host "Virtual environment not found. Creating backend\.venv..." -ForegroundColor Yellow
    if (Get-Command uv -ErrorAction SilentlyContinue) {
        uv venv $venvDir
    } else {
        python -m venv $venvDir
    }
}
Write-Host " [OK] Python: $pythonExe" -ForegroundColor Gray

# ---- Install Python Dependencies ----
Write-Host "Syncing backend dependencies..." -ForegroundColor Gray
$reqFile = Join-Path $root "backend\requirements.txt"
if (Get-Command uv -ErrorAction SilentlyContinue) {
    uv pip install -r $reqFile --python $pythonExe
} else {
    & $pythonExe -m pip install -r $reqFile --quiet
}
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to install backend dependencies!" -ForegroundColor Red
    exit 1
}
Write-Host " [OK] Backend dependencies satisfied." -ForegroundColor Green

# ---- Launch Backend (uvicorn) ----
Write-Host ""
Write-Host "Starting Backend server..." -ForegroundColor Cyan
$backendProcess = Start-Process -FilePath $pythonExe `
    -ArgumentList "-m", "uvicorn", "app.main:app", "--app-dir", "backend", "--port", "$backendPort", "--host", "127.0.0.1", "--reload" `
    -NoNewWindow -PassThru -WorkingDirectory $root

Start-Sleep -Seconds 2

# ---- Launch Frontend (Python http.server for static files) ----
Write-Host "Starting Frontend server..." -ForegroundColor Cyan
$frontendDir = Join-Path $root "frontend"
$frontendProcess = Start-Process -FilePath $pythonExe `
    -ArgumentList "-m", "http.server", "$frontendPort", "--bind", "127.0.0.1" `
    -NoNewWindow -PassThru -WorkingDirectory $frontendDir

# ---- Open browser ----
Start-Sleep -Seconds 2
$frontendUrl = "http://127.0.0.1:$frontendPort"
try {
    Start-Process $frontendUrl -ErrorAction SilentlyContinue
} catch { }

Write-Host ""
Write-Host "--------------------------------------------------" -ForegroundColor Green
Write-Host "       BOTH SERVERS LAUNCHED SUCCESSFULLY!        " -ForegroundColor Green
Write-Host "--------------------------------------------------" -ForegroundColor Green
Write-Host " -> Backend API : http://127.0.0.1:$backendPort"    -ForegroundColor White
Write-Host " -> API Docs    : http://127.0.0.1:$backendPort/docs" -ForegroundColor White
Write-Host " -> Frontend UI : $frontendUrl"                      -ForegroundColor White
Write-Host "--------------------------------------------------" -ForegroundColor Green
Write-Host " Press Ctrl+C to stop both servers." -ForegroundColor Gray
Write-Host ""

# ---- Keep alive & clean up on exit ----
try {
    while ($true) {
        if ($backendProcess.HasExited -and $frontendProcess.HasExited) {
            Write-Host "Both servers have exited." -ForegroundColor Yellow
            break
        }
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host "`nShutting down servers..." -ForegroundColor Yellow
    foreach ($proc in @($backendProcess, $frontendProcess)) {
        if ($proc -and -not $proc.HasExited) {
            Get-CimInstance Win32_Process -Filter "ParentProcessId=$($proc.Id)" -ErrorAction SilentlyContinue |
                ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        }
    }
    Write-Host "Servers stopped." -ForegroundColor Green
}
