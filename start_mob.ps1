# ==============================================================================
# Shabd - Automated Mobile & Backend Startup Script
# ==============================================================================
# Automatically detects the active local IP address.
# Updates the mobile app's config.ts with the correct IP.
# Starts the FastAPI backend in the background (bound to 0.0.0.0).
# Starts the Expo React Native packager in the foreground to show the QR code.
# ==============================================================================

param(
    # Backend port. Moved off the default on 2026-08-30: a phantom listener on
    # port 8000 kept winning connections ahead of every newly started server,
    # so the phone talked to stale code no matter how often this script was
    # rerun. Pass -Port 8000 to go back once that socket is gone (reboot clears it).
    [int]$Port = 8001,

    # Pass -Build to run `npx expo run:android --no-bundler` before starting
    # Metro. This compiles native code and installs the APK on a connected
    # device/emulator. Only needed when native dependencies or Android config
    # change; day-to-day JS-only changes don't require it.
    [switch]$Build
)

$ErrorActionPreference = "Continue"
$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "      SHABD - MOBILE SETUP & STARTUP SCRIPT       " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# ---- Find Local IPv4 Address ----
Write-Host "Detecting machine's local IP address for physical device connection..." -ForegroundColor Gray
$ipInfo = Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -ne $null -and $_.NetAdapter.Status -ne "Disconnected" }
$localIp = $ipInfo.IPv4Address.IPAddress

if (-not $localIp) {
    Write-Host "Warning: Could not automatically detect a Wi-Fi/Ethernet IP address. Using 'localhost'." -ForegroundColor Yellow
    $localIp = "localhost"
}
elseif ($localIp -is [array]) {
    $localIp = $localIp[0]
}
Write-Host " [OK] Active IP Address: $localIp" -ForegroundColor Green

# ---- Update mobile config.ts ----
Write-Host "Updating mobile/src/config.ts with DEVICE_HOST = '$localIp'..." -ForegroundColor Gray
$configPath = Join-Path $root "mobile\src\config.ts"
if (Test-Path $configPath) {
    $configContent = Get-Content $configPath -Raw
    # Update the DEVICE_HOST constant
    $newContent = $configContent -replace '(const\s+DEVICE_HOST\s*=\s*)["''][^"local]*["'']', "`$1`"$localIp`""
    
    # We should make sure we catch "localhost", "192...", etc.
    # A generic regex for matching the string content of DEVICE_HOST:
    $newContent = $configContent -replace "(?m)^(const\s+DEVICE_HOST\s*=\s*)([`"']).*?\2(.*)$", "`$1`"$localIp`"`$3"
    
    # Keep DEVICE_PORT in step with -Port, same as DEVICE_HOST above.
    # ${1} not $1: the port number follows immediately, and .NET would read
    # "$1" + "8001" as capture group 18001 and substitute nothing.
    $newContent = $newContent -replace "(?m)^(const\s+DEVICE_PORT\s*=\s*)\d+(.*)$", "`${1}$Port`${2}"

    Set-Content -Path $configPath -Value $newContent -Encoding UTF8
    Write-Host " [OK] Config updated (host $localIp, port $Port)." -ForegroundColor Green
}
else {
    Write-Host "Warning: mobile/src/config.ts not found. Ensure you are in the correct directory." -ForegroundColor Yellow
}

# ---- Virtual Environment Setup ----
$venvDir = Join-Path $root "backend\.venv"
$pythonExe = Join-Path $venvDir "Scripts\python.exe"

if (-not (Test-Path $pythonExe)) {
    Write-Host "Virtual environment not found. Creating backend\.venv..." -ForegroundColor Yellow
    python -m venv $venvDir
}

# ---- Install Python Dependencies ----
Write-Host "Syncing backend dependencies..." -ForegroundColor Gray
$reqFile = Join-Path $root "backend\requirements.txt"
& $pythonExe -m pip install -r $reqFile --quiet
Write-Host " [OK] Backend dependencies satisfied." -ForegroundColor Green

# ---- Launch Backend in Background ----
Write-Host ""
Write-Host "Starting Backend server on ${localIp}:${Port}..." -ForegroundColor Cyan
# Kill any existing server on $Port just in case
try {
    $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($connections) {
        $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($procId in $pids) {
            if ($procId -gt 0 -and $procId -ne $PID) {
                Write-Host " -> Killing existing Process ID $procId on port $Port..." -ForegroundColor Yellow
                Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
            }
        }
    }
}
catch { }

# Run FROM backend/, not from $root with --app-dir. Settings resolve relative
# paths against the CWD, so launching at the repo root pointed db_path="app.db"
# at a second, stale D:\Projects\Shabdpp.db that then drifted 7 migrations
# behind while holding a file lock. CWD is the schema you get.
$backendProcess = Start-Process -FilePath $pythonExe `
    -ArgumentList "-m", "uvicorn", "app.main:app", "--port", "$Port", "--host", "0.0.0.0", "--reload" `
    -WindowStyle Hidden -PassThru -WorkingDirectory (Join-Path $root "backend")

Write-Host " [OK] Backend is running in the background." -ForegroundColor Green
Start-Sleep -Seconds 2

# ---- NPM Install Check ----
$mobileDir = Join-Path $root "mobile"
if (-not (Test-Path (Join-Path $mobileDir "node_modules"))) {
    Write-Host ""
    Write-Host "First time mobile setup: Running 'npm install'..." -ForegroundColor Yellow
    npm install --prefix mobile
}

# ---- Native Android Build (optional) ----
if ($Build) {
    Write-Host ""
    Write-Host "--------------------------------------------------" -ForegroundColor Magenta
    Write-Host "     BUILDING & INSTALLING NATIVE ANDROID APP     " -ForegroundColor Magenta
    Write-Host "--------------------------------------------------" -ForegroundColor Magenta
    Write-Host " -> This compiles native code and installs the APK." -ForegroundColor White
    Write-Host " -> Using --no-bundler so Metro isn't started twice." -ForegroundColor White
    Write-Host ""

    Push-Location $mobileDir
    try {
        npx expo run:android --no-bundler
        if ($LASTEXITCODE -ne 0) {
            Write-Host " [WARN] Native build exited with code $LASTEXITCODE. Continuing anyway..." -ForegroundColor Yellow
        } else {
            Write-Host " [OK] Native build and install complete." -ForegroundColor Green
        }
    } finally {
        Pop-Location
    }
}

# ---- Launch Expo in Foreground ----
Write-Host ""
Write-Host "--------------------------------------------------" -ForegroundColor Green
Write-Host "         STARTING EXPO FOR MOBILE DEVICE          " -ForegroundColor Green
Write-Host "--------------------------------------------------" -ForegroundColor Green
Write-Host " -> Backend API running in background on port $Port" -ForegroundColor White
Write-Host " -> Open 'Expo Go' app on your phone and scan the QR code below." -ForegroundColor White
Write-Host " -> To stop everything, close this window or press Ctrl+C." -ForegroundColor White
Write-Host "--------------------------------------------------" -ForegroundColor Green
Write-Host ""

try {
    $env:REACT_NATIVE_PACKAGER_HOSTNAME = $localIp
    npm run start --prefix mobile -- -c
}
finally {
    if ($backendProcess -and -not $backendProcess.HasExited) {
        Write-Host "`nShutting down backend server..." -ForegroundColor Yellow
        Get-CimInstance Win32_Process -Filter "ParentProcessId=$($backendProcess.Id)" -ErrorAction SilentlyContinue |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
        Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
    }
}
