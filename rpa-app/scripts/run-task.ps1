Set-Location (Split-Path -Parent $PSScriptRoot)
$nodePath = "C:\Program Files\nodejs\node.exe"
if (-not (Test-Path $nodePath)) {
    $nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
}
& $nodePath "scripts\sync-deli.js"
exit $LASTEXITCODE
