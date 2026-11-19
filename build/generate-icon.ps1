param([Parameter(Mandatory)][string] $Project)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$folder = Join-Path $Project 'build'
[IO.Directory]::CreateDirectory($folder) | Out-Null
$sizes = @(16, 24, 32, 48, 64, 128, 256)
$images = foreach ($size in $sizes) {
    $bitmap = [Drawing.Bitmap]::new($size, $size, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = 'AntiAlias'
    $graphics.ScaleTransform($size / 64.0, $size / 64.0)
    $graphics.Clear([Drawing.Color]::Transparent)
    $frame = [Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#0B0F12'))
    $track = [Drawing.Pen]::new([Drawing.ColorTranslator]::FromHtml('#76868D'), 3.3)
    $track.StartCap = 'Round'
    $track.EndCap = 'Round'
    $amber = [Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#FFB35B'))
    $black = [Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#292528'))
    $red = [Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#FF463F'))
    $graphics.FillEllipse($frame, 1, 1, 62, 62)
    $graphics.DrawLine($track, 16, 51, 47, 51)
    $graphics.DrawLine($track, 20, 56, 43, 56)
    $graphics.DrawLine($track, 31.8, 49, 31.8, 30)
    $graphics.FillEllipse($amber, 16, 7, 32, 32)
    $graphics.FillEllipse($black, 18, 9, 28, 28)
    $graphics.FillEllipse($red, 22, 13, 20, 20)
    $memory = [IO.MemoryStream]::new()
    $bitmap.Save($memory, [Drawing.Imaging.ImageFormat]::Png)
    ,$memory.ToArray()
    @($graphics, $bitmap, $frame, $track, $amber, $black, $red, $memory) | ForEach-Object Dispose
}
$writer = [IO.BinaryWriter]::new([IO.File]::Create((Join-Path $folder 'icon.ico')))
try {
    $writer.Write([uint16] 0)
    $writer.Write([uint16] 1)
    $writer.Write([uint16] $sizes.Count)
    $offset = 6 + $sizes.Count * 16
    for ($index = 0; $index -lt $sizes.Count; $index++) {
        $writer.Write([byte] ($sizes[$index] % 256))
        $writer.Write([byte] ($sizes[$index] % 256))
        $writer.Write([uint16] 0)
        $writer.Write([uint16] 1)
        $writer.Write([uint16] 32)
        $writer.Write([uint32] $images[$index].Length)
        $writer.Write([uint32] $offset)
        $offset += $images[$index].Length
    }
    foreach ($png in $images) { $writer.Write([byte[]] $png) }
} finally {
    $writer.Dispose()
}
