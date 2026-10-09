$ErrorActionPreference = 'Stop'
try {
    $gameFile = Join-Path $PSScriptRoot 'index.html'
    if (!(Test-Path -LiteralPath $gameFile)) { throw 'index.html nao encontrado na pasta do jogo.' }
    Start-Process -FilePath $gameFile
    Write-Host 'Hiper Roll aberto no navegador, sem servidor ou porta.'
} catch {
    Write-Host "Nao foi possivel abrir o jogo: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
