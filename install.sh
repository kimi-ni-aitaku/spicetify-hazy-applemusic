#!/usr/bin/env bash
set -e

# ==============================================================================
# Spicetify Hazy Apple Music Theme One-Click Installer (macOS & Linux)
# Repository: https://github.com/kimi-ni-aitaku/spicetify-hazy-applemusic
# ==============================================================================

echo "🍎 正在安装 / 更新 Spicetify Hazy Apple Music 主题..."

# 1. Check if spicetify is installed
if ! command -v spicetify &> /dev/null; then
    echo "❌ 未检测到 spicetify CLI 工具！"
    echo "💡 请先安装 Spicetify: curl -fsSL https://raw.githubusercontent.com/spicetify/cli/main/install.sh | sh"
    exit 1
fi

SPICETIFY_CONFIG=$(spicetify -c 2>/dev/null || true)
if [ -z "$SPICETIFY_CONFIG" ]; then
    echo "❌ 无法获取 Spicetify 配置路径，请确认已运行过 spicetify 并在系统初始化！"
    exit 1
fi

SPICETIFY_DIR=$(dirname "$SPICETIFY_CONFIG")
THEMES_DIR="$SPICETIFY_DIR/Themes"
EXTENSIONS_DIR="$SPICETIFY_DIR/Extensions"
TARGET_DIR="$THEMES_DIR/Hazy"

mkdir -p "$THEMES_DIR"
mkdir -p "$EXTENSIONS_DIR"

# 2. Clone or update repository
if [ -d "$TARGET_DIR/.git" ]; then
    echo "🔄 检测到已有主题目录，正在同步拉取最新优化..."
    cd "$TARGET_DIR"
    git fetch origin main
    git reset --hard origin/main
else
    echo "📥 正在克隆主题仓库到 $TARGET_DIR..."
    rm -rf "$TARGET_DIR"
    git clone https://github.com/kimi-ni-aitaku/spicetify-hazy-applemusic.git "$TARGET_DIR"
fi

# 3. Ensure SpicyLyrics extension entrypoint exists
SPICY_EXT="$EXTENSIONS_DIR/spicy-lyrics.mjs"
if [ ! -f "$SPICY_EXT" ]; then
    echo "📦 正在配置 SpicyLyrics 扩展依赖..."
    echo 'import(`https://cdn.jsdelivr.net/gh/Spikerko/spicy-lyrics@main/builds/main/entrypoint.mjs?t=${Date.now()}`);' > "$SPICY_EXT"
fi

# 4. Configure Spicetify
echo "⚙️ 正在应用主题与扩展配置..."
spicetify config current_theme Hazy
spicetify config color_scheme ""
spicetify config extensions spicy-lyrics.mjs

# 5. Apply
echo "🚀 正在生效主题至 Spotify..."
spicetify apply

echo ""
echo "✨ 安装成功！尽情享受 Apple Music 极致全屏沉浸歌词体验吧！"
