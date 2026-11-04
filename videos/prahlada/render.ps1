param(
    [string]$ManimPython = (Join-Path $env:USERPROFILE '.codex/mcp/video-tools/python-ce/Scripts/python.exe')
)
$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Push-Location $projectRoot
try {
    & backend/.venv/Scripts/python.exe videos/prahlada/narrate.py
    if ($LASTEXITCODE -ne 0) { throw 'Sarvam narration failed' }
    & $ManimPython -m manim render --renderer cairo --fps 30 -r 720,1280 --media_dir results/videos/prahlada/media -o animation.mp4 videos/prahlada/scene.py Prahlada
    if ($LASTEXITCODE -ne 0) { throw 'Manim rendering failed' }
    & $ManimPython videos/prahlada/finish.py
    if ($LASTEXITCODE -ne 0) { throw 'Video assembly or verification failed' }
} finally {
    Pop-Location
}
