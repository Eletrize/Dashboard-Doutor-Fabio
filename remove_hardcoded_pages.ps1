# Script para remover páginas hard-coded de luzes e cortinas do index.html
# Essas páginas serão geradas dinamicamente pelo config.js

$indexPath = "c:\Eletrize\novo modelo\Dashboard-Template\index.html"
$content = Get-Content -Raw $indexPath

# Lista de páginas para remover (serão geradas pelo config.js)
$pagesToRemove = @(
    'ambiente1-luzes',
    'ambiente1-cortinas',
    'ambiente3-luzes',
    'ambiente3-cortinas',
    'ambiente4-luzes',
    'ambiente4-cortinas',
    'ambiente5-luzes',
    'ambiente5-cortinas',
    'ambiente6-luzes',
    'ambiente6-cortinas',
    'ambiente7-luzes',
    'ambiente7-cortinas',
    'ambiente8-luzes',
    'ambiente8-cortinas',
    'ambiente9-luzes',
    'ambiente9-cortinas'
)

foreach ($page in $pagesToRemove) {
    Write-Host "Removendo página: $page" -ForegroundColor Yellow
    
    # Padrão regex para encontrar toda a definição da página
    # Formato: "pagename": () => `...conteúdo...`,
    $pattern = [regex]::Escape("""$page""") + ':\s*\(\)\s*=>\s*`[\s\S]*?^        `,\s*$'
    
    # Tentar encontrar e remover
    if ($content -match $pattern) {
        $content = $content -replace $pattern, ''
        Write-Host "  ✓ Removido!" -ForegroundColor Green
    } else {
        # Tentar padrão alternativo (última página antes do fechamento do objeto)
        $pattern2 = [regex]::Escape("""$page""") + ':\s*\(\)\s*=>\s*`[\s\S]*?^        `,?\s*(?=\s*};)'
        if ($content -match $pattern2) {
            $content = $content -replace $pattern2, ''
            Write-Host "  ✓ Removido (última entrada)!" -ForegroundColor Green
        } else {
            Write-Host "  ✗ Não encontrado" -ForegroundColor Red
        }
    }
}

# Salvar o arquivo modificado
$content | Set-Content -Path $indexPath -NoNewline
Write-Host "`n✅ Arquivo index.html atualizado!" -ForegroundColor Green
Write-Host "Páginas hard-coded removidas. Agora o config.js controla essas páginas." -ForegroundColor Cyan
