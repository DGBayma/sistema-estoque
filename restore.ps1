# ============================================
# Script de restore do banco de dados
# Uso: .\restore.ps1 caminho\do\backup.sql
#
# Exemplos:
#   .\restore.ps1 backups\backup_20260925_143022.sql
#   .\restore.ps1 C:\Users\DG\Downloads\backup.sql
# ============================================

param(
    [Parameter(Mandatory=$true, HelpMessage="Caminho do arquivo .sql de backup")]
    [string]$Arquivo
)

$ErrorActionPreference = "Stop"

# Verifica se o arquivo existe
if (-not (Test-Path $Arquivo)) {
    Write-Host "[ERRO] Arquivo nao encontrado: $Arquivo" -ForegroundColor Red
    Write-Host "`nBackups disponiveis em .\backups\:" -ForegroundColor Yellow
    if (Test-Path "backups") {
        Get-ChildItem backups\*.sql | Sort-Object LastWriteTime -Descending | Format-Table Name, Length, LastWriteTime
    } else {
        Write-Host "  (nenhuma pasta 'backups' encontrada)"
    }
    exit 1
}

# Confirma o tamanho do arquivo
$tamanho = [math]::Round((Get-Item $Arquivo).Length / 1KB, 2)
Write-Host "[INFO] Arquivo: $Arquivo ($tamanho KB)" -ForegroundColor Cyan

# Aviso de sobrescrita
Write-Host "`n[AVISO] Isso vai SOBRESCREVER os dados atuais do banco!" -ForegroundColor Yellow
Write-Host "        Todos os dados atuais serao substituidos pelo backup." -ForegroundColor Yellow
Write-Host "`nDigite 'sim' (sem aspas) para continuar: " -NoNewline -ForegroundColor White
$confirmacao = Read-Host

if ($confirmacao -ne "sim") {
    Write-Host "`nCancelado pelo usuario." -ForegroundColor Yellow
    exit 0
}

# Confirma que os containers estao rodando
Write-Host "`n[CHECK] Verificando containers..." -ForegroundColor Cyan
$containers = docker compose ps --format json | ConvertFrom-Json
$dbRodando = $containers | Where-Object { $_.Service -eq "db" -and $_.State -eq "running" }

if (-not $dbRodando) {
    Write-Host "[ERRO] O container 'db' nao esta rodando." -ForegroundColor Red
    Write-Host "       Rode 'docker compose up -d' antes de restaurar." -ForegroundColor Yellow
    exit 1
}

Write-Host "[OK] Container db esta rodando" -ForegroundColor Green

# Faz o restore
Write-Host "`n[RESTORE] Restaurando backup..." -ForegroundColor Cyan

Get-Content $Arquivo -Raw | docker compose exec -T db psql -U admin -d estoque

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n[OK] Backup restaurado com sucesso!" -ForegroundColor Green

    # Verificacao rapida
    Write-Host "`n[CHECK] Contagem de registros apos restore:" -ForegroundColor Cyan
    docker compose exec -T db psql -U admin -d estoque -c "
        SELECT 'usuarios'      AS tabela, COUNT(*) FROM usuarios
        UNION ALL SELECT 'funcionarios',  COUNT(*) FROM funcionarios
        UNION ALL SELECT 'fornecedores',  COUNT(*) FROM fornecedores
        UNION ALL SELECT 'produtos',      COUNT(*) FROM produtos
        UNION ALL SELECT 'movimentacoes', COUNT(*) FROM movimentacoes
        UNION ALL SELECT 'contatos',      COUNT(*) FROM contatos
        UNION ALL SELECT 'notificacoes',  COUNT(*) FROM notificacoes;
    "
} else {
    Write-Host "`n[ERRO] Falha no restore" -ForegroundColor Red
    exit 1
}