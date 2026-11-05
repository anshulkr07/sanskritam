param(
    [ValidateSet('threejs', 'puppets')][string]$Style = 'puppets',
    [string]$MediaPython = (Join-Path $env:USERPROFILE '.codex/mcp/video-tools/python-ce/Scripts/python.exe'),
    [switch]$PrepareOnly
)
$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Push-Location $projectRoot
try {
    & backend/.venv/Scripts/python.exe codetovideo/prahlada/narrate.py --short
    if ($LASTEXITCODE -ne 0) { throw 'Short Sarvam narration failed' }
    & backend/.venv/Scripts/python.exe codetovideo/prahlada/narrate.py
    if ($LASTEXITCODE -ne 0) { throw 'Animation reference timeline preparation failed' }
    & $MediaPython codetovideo/prahlada/finish.py --score-only
    if ($LASTEXITCODE -ne 0) { throw 'Score preparation failed' }
    if ($PrepareOnly) { return }
    $renderArgs = @('codetovideo/prahlada/render-illustrated.mjs', '--short')
    if ($Style -eq 'threejs') { $renderArgs += '--3d' }
    & node @renderArgs
    if ($LASTEXITCODE -ne 0) { throw 'Three.js rendering failed' }
    # Exports explicit voice-only copies and the unmuted player for the existing set.
    & $MediaPython codetovideo/prahlada/voice-delivery.py
    if ($LASTEXITCODE -ne 0) { throw 'Sarvam voice export failed' }
} finally {
    Pop-Location
}
