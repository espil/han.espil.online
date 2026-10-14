param(
  [string]$CapturePath = "C:\Users\quadc\Desktop\htdocs\cauldron.usedesign.rf.gd\cauldron-vancouver\data\captures\vancouver_3000m_mapbox_satellite_v9.capture.json",
  [int]$GridSize = 128,
  [int]$PosterizeLevels = 6
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$palette = @(
  @{ id = 0; name = "water"; rgb = @(145, 210, 238); spriteType = "water" },
  @{ id = 1; name = "greenspace"; rgb = @(163, 220, 161); spriteType = "park" },
  @{ id = 2; name = "greenspace_light"; rgb = @(178, 234, 173); spriteType = "park" },
  @{ id = 3; name = "road"; rgb = @(190, 197, 216); spriteType = "road" },
  @{ id = 4; name = "building"; rgb = @(222, 218, 217); spriteType = "building" },
  @{ id = 5; name = "land"; rgb = @(244, 240, 239); spriteType = "terrain" },
  @{ id = 6; name = "commercial_land"; rgb = @(254, 236, 223); spriteType = "terrain" },
  @{ id = 7; name = "medical_land"; rgb = @(244, 223, 223); spriteType = "terrain" },
  @{ id = 8; name = "roof"; rgb = @(231, 215, 203); spriteType = "building" }
)

function Posterize-Value {
  param([int]$Value, [int]$Levels)
  $step = 255 / [Math]::Max(1, ($Levels - 1))
  return [int][Math]::Max(0, [Math]::Min(255, [Math]::Round([Math]::Round($Value / $step) * $step)))
}

function Closest-Tile {
  param([int[]]$Rgb)
  $best = $null
  $bestDistance = [double]::PositiveInfinity
  foreach ($tile in $palette) {
    $distance = (($Rgb[0] - $tile.rgb[0]) * ($Rgb[0] - $tile.rgb[0])) +
      (($Rgb[1] - $tile.rgb[1]) * ($Rgb[1] - $tile.rgb[1])) +
      (($Rgb[2] - $tile.rgb[2]) * ($Rgb[2] - $tile.rgb[2]))
    if ($distance -lt $bestDistance) {
      $bestDistance = $distance
      $best = $tile
    }
  }
  return $best
}

function Average-Block {
  param(
    [System.Drawing.Bitmap]$Bitmap,
    [int]$StartX,
    [int]$StartY,
    [int]$BlockWidth,
    [int]$BlockHeight
  )
  $endX = [Math]::Min($Bitmap.Width, $StartX + $BlockWidth)
  $endY = [Math]::Min($Bitmap.Height, $StartY + $BlockHeight)
  $stepX = [Math]::Max(1, [int][Math]::Floor($BlockWidth / 6))
  $stepY = [Math]::Max(1, [int][Math]::Floor($BlockHeight / 6))
  $red = 0
  $green = 0
  $blue = 0
  $samples = 0
  for ($y = $StartY; $y -lt $endY; $y += $stepY) {
    for ($x = $StartX; $x -lt $endX; $x += $stepX) {
      $pixel = $Bitmap.GetPixel($x, $y)
      $red += $pixel.R
      $green += $pixel.G
      $blue += $pixel.B
      $samples += 1
    }
  }
  if ($samples -eq 0) { return @(0, 0, 0) }
  return @(
    [int][Math]::Round($red / $samples),
    [int][Math]::Round($green / $samples),
    [int][Math]::Round($blue / $samples)
  )
}

$captureFullPath = (Resolve-Path $CapturePath).Path
$capture = Get-Content $captureFullPath -Raw | ConvertFrom-Json
$webRoot = Split-Path -Path (Split-Path -Path $PSScriptRoot -Parent) -Parent
$relativeImagePath = $capture.imagePath.TrimStart('.').TrimStart('\','/')
$imageFullPath = Join-Path $webRoot $relativeImagePath.Replace('/', '\')
$baseName = [System.IO.Path]::GetFileNameWithoutExtension($imageFullPath)
$outputDir = Split-Path -Path $imageFullPath -Parent
$jsonOutputPath = Join-Path $outputDir "$baseName.grid$GridSize.json"
$previewPath = Join-Path $outputDir "$baseName.grid$GridSize.preview.png"

$bitmap = [System.Drawing.Bitmap]::FromFile($imageFullPath)
try {
  $sourceCellWidth = $bitmap.Width / $GridSize
  $sourceCellHeight = $bitmap.Height / $GridSize
  $tileMatrix = New-Object 'System.Collections.Generic.List[object]'
  $sourceColorMatrix = New-Object 'System.Collections.Generic.List[object]'
  $posterizedColorMatrix = New-Object 'System.Collections.Generic.List[object]'
  $counts = [ordered]@{
    terrain = 0
    road = 0
    water = 0
    park = 0
    building = 0
  }

  $preview = New-Object System.Drawing.Bitmap($GridSize, $GridSize)
  for ($y = 0; $y -lt $GridSize; $y += 1) {
    $row = New-Object 'System.Collections.Generic.List[object]'
    $sourceRow = New-Object 'System.Collections.Generic.List[object]'
    $posterizedRow = New-Object 'System.Collections.Generic.List[object]'
    for ($x = 0; $x -lt $GridSize; $x += 1) {
      $avg = Average-Block -Bitmap $bitmap `
        -StartX ([int][Math]::Floor($x * $sourceCellWidth)) `
        -StartY ([int][Math]::Floor($y * $sourceCellHeight)) `
        -BlockWidth ([int][Math]::Max(1, [Math]::Ceiling($sourceCellWidth))) `
        -BlockHeight ([int][Math]::Max(1, [Math]::Ceiling($sourceCellHeight)))
      $posterized = @(
        (Posterize-Value -Value $avg[0] -Levels $PosterizeLevels),
        (Posterize-Value -Value $avg[1] -Levels $PosterizeLevels),
        (Posterize-Value -Value $avg[2] -Levels $PosterizeLevels)
      )
      $tile = Closest-Tile -Rgb $posterized
      $row.Add($tile.id)
      $sourceRow.Add(@($avg[0], $avg[1], $avg[2]))
      $posterizedRow.Add(@($posterized[0], $posterized[1], $posterized[2]))
      $counts[$tile.spriteType] += 1
      $preview.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($tile.rgb[0], $tile.rgb[1], $tile.rgb[2]))
    }
    $tileMatrix.Add($row)
    $sourceColorMatrix.Add($sourceRow)
    $posterizedColorMatrix.Add($posterizedRow)
  }

  $result = [ordered]@{
    schema = 'cauldron.satelliteTileGrid.v0.1'
    capturePath = $capture.imagePath
    city = $capture.city
    center = @($capture.center[0], $capture.center[1])
    radiusMeters = $capture.radiusMeters
    diameterMeters = $capture.diameterMeters
    sourceImageSize = @($bitmap.Width, $bitmap.Height)
    gridSize = $GridSize
    posterizeLevels = $PosterizeLevels
    conversionModel = 'satellite-png-posterize-downsample-v0.3'
    tileLegend = $palette
    counts = $counts
    tileMatrix = $tileMatrix
    sourceColorMatrix = $sourceColorMatrix
    posterizedColorMatrix = $posterizedColorMatrix
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  }

  [System.IO.File]::WriteAllText($jsonOutputPath, (($result | ConvertTo-Json -Depth 8) + [Environment]::NewLine))
  $preview.Save($previewPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $preview.Dispose()

  [pscustomobject]@{
    ok = $true
    capture = $captureFullPath
    image = $imageFullPath
    gridSize = $GridSize
    posterizeLevels = $PosterizeLevels
    jsonOutputPath = $jsonOutputPath
    previewPath = $previewPath
    counts = $counts
  } | ConvertTo-Json -Depth 6
}
finally {
  $bitmap.Dispose()
}
