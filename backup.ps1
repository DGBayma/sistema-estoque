# ============================================
# Script de backup do banco de dados
# Uso: .\backup.ps1
# ============================================

$ErrorActionPreference = "Stop"

$data = Get-Date -Format "yyyyMMdd_HHmmss"
$arquivo = "backups\backup_$data.sql"

# Cria a pasta backups se não existir
if (-not (Test-Path "backups")) {
    New-Item -ItemType Directory -Path "backups" | Out-Null
}

Write-Host "[BACKUP] Gerando backup..." -ForegroundColor Cyan

docker compose exec -T db pg_dump -U admin estoque > $arquivo

if ($LASTEXITCODE -eq 0) {
    $tamanho = (Get-Item $arquivo).Length / 1KB
    Write-Host "[OK] Backup criado: $arquivo ($([math]::Round($tamanho, 2)) KB)" -ForegroundColor Green
} else {
    Write-Host "[ERRO] Falha no backup" -ForegroundColor Red
    exit 1
}

# Lista os 5 backups mais recentes
Write-Host "`n[BACKUPS] Ultimos backups:" -ForegroundColor Cyan
Get-ChildItem backups\*.sql | Sort-Object LastWriteTime -Descending | Select-Object -First 5 | Format-Table Name, Length, LastWriteTime