# ==============================================================================
# Spicetify Hazy Apple Music Theme One-Click Installer (Windows PowerShell)
# Repository: https://github.com/kimi-ni-aitaku/spicetify-hazy-applemusic
# ==============================================================================

$ErrorActionPreference = "Stop"
Write-Host "🍎 正在安装 / 更新 Spicetify Hazy Apple Music 主题..." -ForegroundColor Cyan

# 1. Check if spicetify is installed
if (-not (Get-Command spicetify -ErrorAction SilentlyContinue)) {
    Write-Host "❌ 未检测到 spicetify CLI 工具！" -ForegroundColor Red
    Write-Host "💡 请先安装 Spicetify: iwr -useb https://raw.githubusercontent.com/spicetify/cli/main/install.ps1 | iex" -ForegroundColor Yellow
    exit 1
}

$spicetifyConfig = (spicetify -c)
$spicetifyDir = Split-Path -Path $spicetifyConfig -Parent
$themesDir = Join-Path $spicetifyDir "Themes"
$extDir = Join-Path $spicetifyDir "Extensions"
$targetDir = Join-Path $themesDir "Hazy"

New-Item -ItemType Directory -Force -Path $themesDir | Out-Null
New-Item -ItemType Directory -Force -Path $extDir | Out-Null

# 2. Clone or update repository
if (Test-Path "$targetDir\.git") {
    Write-Host "🔄 检测到已有主题目录，正在同步拉取最新优化..." -ForegroundColor Yellow
    Push-Location $targetDir
    git fetch origin main
    git reset --hard origin/main
    Pop-Location
} else {
    Write-Host "📥 正在克隆主题仓库到 $targetDir..." -ForegroundColor Yellow
    if (Test-Path $targetDir) { Remove-Item -Recurse -Force $targetDir }
    git clone https://github.com/kimi-ni-aitaku/spicetify-hazy-applemusic.git $targetDir
}

# 3. Ensure SpicyLyrics extension entrypoint exists
$spicyExt = Join-Path $extDir "spicy-lyrics.mjs"
if (-not (Test-Path $spicyExt)) {
    Write-Host "📦 正在配置 SpicyLyrics 扩展依赖..." -ForegroundColor Yellow
    Set-Content -Path $spicyExt -Value 'import(`https://cdn.jsdelivr.net/gh/Spikerko/spicy-lyrics@main/builds/main/entrypoint.mjs?t=${Date.now()}`);'
}

# 4. Configure Spicetify
Write-Host "⚙️ 正在应用主题与扩展配置..." -ForegroundColor Cyan
spicetify config current_theme Hazy
spicetify config color_scheme ""
spicetify config extensions spicy-lyrics.mjs
spicetify config custom_apps ""
spicetify config home_config 0
spicetify config experimental_features 0
spicetify config check_spicetify_update 0

# 5. Apply
Write-Host "🚀 正在生效主题至 Spotify..." -ForegroundColor Cyan
spicetify apply

Write-Host "`n✨ 安装成功！尽情享受 Apple Music 极致全屏沉浸歌词体验吧！" -ForegroundColor Green
