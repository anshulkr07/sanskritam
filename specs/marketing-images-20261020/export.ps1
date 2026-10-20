param([string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$record = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'jobs.json') -Raw | ConvertFrom-Json
$imageDir = Join-Path $ProjectRoot 'images'

function Set-Quality($graphics) {
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
}
function New-RoundedPath([single]$x, [single]$y, [single]$width, [single]$height, [single]$radius) {
    $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $diameter = $radius * 2
    $path.AddArc($x, $y, $diameter, $diameter, 180, 90)
    $path.AddArc($x + $width - $diameter, $y, $diameter, $diameter, 270, 90)
    $path.AddArc($x + $width - $diameter, $y + $height - $diameter, $diameter, $diameter, 0, 90)
    $path.AddArc($x, $y + $height - $diameter, $diameter, $diameter, 90, 90)
    $path.CloseFigure()
    return ,$path
}
$review = @()
foreach ($job in $record.jobs) {
    $generated = [System.Drawing.Bitmap]::new($job.generated)
    $canvas = [System.Drawing.Bitmap]::new(1080, 1920)
    $graphics = [System.Drawing.Graphics]::FromImage($canvas)
    Set-Quality $graphics
    # Center-crop only the spare outer background to obtain exact 9:16, with no stretching.
    $cropWidth = [double]$generated.Width
    $cropHeight = $cropWidth * 16 / 9
    if ($cropHeight -gt $generated.Height) {
        $cropHeight = [double]$generated.Height
        $cropWidth = $cropHeight * 9 / 16
    }
    $backgroundSource = [System.Drawing.RectangleF]::new(($generated.Width - $cropWidth) / 2, ($generated.Height - $cropHeight) / 2, $cropWidth, $cropHeight)
    $graphics.DrawImage($generated, [System.Drawing.RectangleF]::new(0, 0, 1080, 1920), $backgroundSource, [System.Drawing.GraphicsUnit]::Pixel)
    if (-not $job.reuseApproved) {
        # Final compositing restores the user's actual pixels, not regenerated UI.
        # All five source posters share this device rectangle and physical proportions.
        $original = [System.Drawing.Bitmap]::new((Join-Path $imageDir $job.source))
        $phoneSource = [System.Drawing.RectangleF]::new(358, 684, 831, 1769)
        $phoneHeight = [single]1420
        $phoneWidth = [single]($phoneHeight * $phoneSource.Width / $phoneSource.Height)
        $phoneTarget = [System.Drawing.RectangleF]::new((1080 - $phoneWidth) / 2, 348, $phoneWidth, $phoneHeight)
        $phonePath = New-RoundedPath $phoneTarget.X $phoneTarget.Y $phoneTarget.Width $phoneTarget.Height ($phoneHeight * 110 / 1769)
        $graphics.SetClip($phonePath)
        $graphics.DrawImage($original, $phoneTarget, $phoneSource, [System.Drawing.GraphicsUnit]::Pixel)
        $graphics.ResetClip()
        $phonePath.Dispose()
        $original.Dispose()
    }
    $destination = Join-Path $imageDir $job.output
    $canvas.Save($destination, [System.Drawing.Imaging.ImageFormat]::Png)
    $review += [pscustomobject]@{
        title = $job.title
        source = $job.source
        output = $job.output
        width = $canvas.Width
        height = $canvas.Height
        exact_9_16 = ($canvas.Width * 16 -eq $canvas.Height * 9)
        generated_width = $generated.Width
        generated_height = $generated.Height
        source_sha256 = (Get-FileHash -LiteralPath (Join-Path $imageDir $job.source) -Algorithm SHA256).Hash
        output_sha256 = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash
        original_phone_restored = (-not $job.reuseApproved)
    }
    $graphics.Dispose()
    $canvas.Dispose()
    $generated.Dispose()
}
$review | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'verification.json') -Encoding UTF8

# Contact sheet for visual review; not an additional marketing deliverable.
$sheet = [System.Drawing.Bitmap]::new(1080, 1340)
$sheetGraphics = [System.Drawing.Graphics]::FromImage($sheet)
Set-Quality $sheetGraphics
$sheetGraphics.Clear([System.Drawing.Color]::FromArgb(24, 24, 24))
$font = [System.Drawing.Font]::new('Segoe UI', 13)
for ($index = 0; $index -lt $record.jobs.Count; $index++) {
    $job = $record.jobs[$index]
    $poster = [System.Drawing.Bitmap]::new((Join-Path $imageDir $job.output))
    $column = $index % 3
    $row = [math]::Floor($index / 3)
    $x = $column * 360 + 10
    $y = $row * 670 + 10
    $sheetGraphics.DrawImage($poster, [System.Drawing.Rectangle]::new($x, $y, 340, 604))
    $sheetGraphics.DrawString($job.title, $font, [System.Drawing.Brushes]::White, [single]($x + 6), [single]($y + 615))
    $poster.Dispose()
}
$sheet.Save((Join-Path $PSScriptRoot 'contact-sheet.jpg'), [System.Drawing.Imaging.ImageFormat]::Jpeg)
$font.Dispose()
$sheetGraphics.Dispose()
$sheet.Dispose()
$review | Select-Object output,width,height,exact_9_16,original_phone_restored | Format-Table -AutoSize
