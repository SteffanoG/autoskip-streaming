$ErrorActionPreference = 'Stop'
$workspace = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$manifest = Get-Content -LiteralPath (Join-Path $workspace 'manifest.json') -Raw | ConvertFrom-Json
$stage = Join-Path $workspace 'dist\package'
$icons = Join-Path $stage 'icons'
$localePt = Join-Path $stage '_locales\pt_BR'
$localeEn = Join-Path $stage '_locales\en'
$zipPath = Join-Path $workspace ("dist\AutoSkip-Chrome-Web-Store-v{0}.zip" -f $manifest.version)

New-Item -ItemType Directory -Force -Path $icons | Out-Null
New-Item -ItemType Directory -Force -Path $localePt | Out-Null
New-Item -ItemType Directory -Force -Path $localeEn | Out-Null
foreach ($relativePath in @('manifest.json', 'content.js', 'popup.html', 'popup.js', 'icons\icon-128.png')) {
  $source = Join-Path $workspace $relativePath
  if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { throw "Arquivo obrigatório ausente: $relativePath" }
  Copy-Item -LiteralPath $source -Destination (Join-Path $stage $relativePath) -Force
}
Copy-Item -LiteralPath (Join-Path $workspace '_locales\pt_BR\messages.json') -Destination $localePt -Force
Copy-Item -LiteralPath (Join-Path $workspace '_locales\en\messages.json') -Destination $localeEn -Force

Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zipPath -Force
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
try {
  $entries = @($archive.Entries | ForEach-Object { $_.FullName.Replace('\', '/') })
  foreach ($required in @('manifest.json', 'content.js', 'popup.html', 'popup.js', 'icons/icon-128.png', '_locales/pt_BR/messages.json', '_locales/en/messages.json')) {
    if ($required -notin $entries) { throw "Arquivo não encontrado na raiz do pacote: $required" }
  }
  Write-Output "Pacote pronto: $zipPath"
  Write-Output "Arquivos: $($entries -join ', ')"
} finally {
  $archive.Dispose()
}
