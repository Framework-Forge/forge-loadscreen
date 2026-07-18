# =============================================================
# Script para baixar video e musica da loadscreen como arquivos locais
# Necessario para funcionar no FiveM loading screen (protocolo nui://)
# O YouTube bloqueia embeds diretos com erro 150/153 no FiveM
# 
# REQUER: deno instalado (para funcionar com yt-dlp moderno)
# Instale deno: irm https://deno.land/install.ps1 | iex
# =============================================================

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$publicVideosDir = Join-Path $scriptDir "ui\public\videos"
$publicMusicDir  = Join-Path $scriptDir "ui\public\music"

# Criar pastas se nao existirem
New-Item -ItemType Directory -Force -Path $publicVideosDir | Out-Null
New-Item -ItemType Directory -Force -Path $publicMusicDir  | Out-Null

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  forge Loadscreen - Download de Midia Local" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# Tentar encontrar yt-dlp
$ytdlp = $null
$possiblePaths = @(
    "$env:USERPROFILE\Downloads\yt-dlp.exe",
    "C:\yt-dlp\yt-dlp.exe",
    "yt-dlp"
)

foreach ($path in $possiblePaths) {
    try {
        $ver = & $path --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            $ytdlp = $path
            break
        }
    } catch {}
}

if (-not $ytdlp) {
    Write-Host "[AVISO] yt-dlp nao encontrado em caminhos padrao." -ForegroundColor Yellow
    Write-Host "Baixando yt-dlp para Downloads..." -ForegroundColor Yellow
    $ytdlpDest = "$env:USERPROFILE\Downloads\yt-dlp.exe"
    Invoke-WebRequest -Uri "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" -OutFile $ytdlpDest -UseBasicParsing
    $ytdlp = $ytdlpDest
}

# Adicionar deno ao PATH se instalado
$denoPath = "$env:USERPROFILE\.deno\bin"
if (Test-Path $denoPath) {
    $env:Path = "$denoPath;$env:Path"
    Write-Host "[OK] Deno encontrado e adicionado ao PATH" -ForegroundColor Green
} else {
    Write-Host "[AVISO] Deno nao encontrado. Instale com: irm https://deno.land/install.ps1 | iex" -ForegroundColor Yellow
}

Write-Host "Usando yt-dlp: $ytdlp" -ForegroundColor Gray
Write-Host ""

# ---- BAIXAR VIDEO (mp4 com audio) ----
$videoUrl  = "https://www.youtube.com/watch?v=XaelcRR0D68"
$videoOut  = Join-Path $publicVideosDir "background.mp4"

Write-Host "[1/2] Baixando VIDEO de background..." -ForegroundColor Yellow
Write-Host "      URL: $videoUrl" -ForegroundColor Gray

if (Test-Path -LiteralPath $videoOut) {
    Write-Host "      Arquivo ja existe: $videoOut" -ForegroundColor Green
    Write-Host "      Para re-baixar, delete o arquivo e execute novamente." -ForegroundColor Gray
} else {
    & $ytdlp --format "22/best[height<=720][ext=mp4]/best" --output $videoOut $videoUrl
    if (Test-Path -LiteralPath $videoOut) {
        Write-Host "      [OK] Video salvo em: $videoOut" -ForegroundColor Green
    } else {
        Write-Host "      [ERRO] Falha ao baixar o video! Tente rodar com deno instalado." -ForegroundColor Red
    }
}

Write-Host ""

# ---- BAIXAR MUSICA (webm/opus) ----
$musicUrl  = "https://www.youtube.com/watch?v=lOaHn3lcjl0"
$musicOut  = Join-Path $publicMusicDir "background.webm"

Write-Host "[2/2] Baixando MUSICA de background..." -ForegroundColor Yellow
Write-Host "      URL: $musicUrl" -ForegroundColor Gray

if (Test-Path -LiteralPath $musicOut) {
    Write-Host "      Arquivo ja existe: $musicOut" -ForegroundColor Green
    Write-Host "      Para re-baixar, delete o arquivo e execute novamente." -ForegroundColor Gray
} else {
    & $ytdlp --format "bestaudio[ext=webm]/bestaudio" --output $musicOut $musicUrl
    if (Test-Path -LiteralPath $musicOut) {
        Write-Host "      [OK] Musica salva em: $musicOut" -ForegroundColor Green
    } else {
        Write-Host "      [ERRO] Falha ao baixar a musica!" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  Pronto! Agora faca o build da UI:" -ForegroundColor Green
Write-Host "  cd ui && npm run build" -ForegroundColor White
Write-Host "  (ou execute via cmd: cmd /c 'cd /d [pasta]\ui && npm run build')" -ForegroundColor White
Write-Host "  Depois reinicie o resource no servidor FiveM." -ForegroundColor White
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""
