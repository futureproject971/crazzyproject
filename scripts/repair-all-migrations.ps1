# Marca todas as migrações locais como aplicadas no banco remoto.
# Use quando o banco remoto já tem a estrutura (ex: migrado do SkyStoreFullSite).

$migrationsDir = Join-Path $PSScriptRoot "..\supabase\migrations"
$files = Get-ChildItem -Path $migrationsDir -Filter "*.sql" | Sort-Object Name

$count = 0
foreach ($file in $files) {
    $version = ($file.BaseName -split '_')[0]
    if ($version -match "^\d{14}$") {
        Write-Host "Reparando $version..."
        npx supabase migration repair $version --status applied
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "Falha ao reparar $version (pode já estar aplicada)"
        } else {
            $count++
        }
    }
}

Write-Host "`nConcluído. $count migração(ões) reparada(s)."
