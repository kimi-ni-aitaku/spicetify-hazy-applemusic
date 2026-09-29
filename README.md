# Spicetify Hazy - Apple Music Lyrics Edition
> 深度定制的 Spotify Hazy 主题，融入 Apple Music 原生质感全屏动态歌词、毛玻璃封面控制纽扣与极致性能优化。

![Apple Music Lyrics Preview](./screenshots/fullscreen_preview.png)

---

## ✨ 核心特性

### 1. 🍎 极致拟真的 Apple Music 全屏歌词
- **原生流动动态背景**：告别纯色图层遮挡，完美还原 Apple Music 随音频律动的主题光斑渐变流动。
- **逐字扫光与整句高亮双模式**：
  - **逐字/平滑动画模式**：支持 Apple Music 级别的字词进度扫光、呼吸光晕与逐字点亮；
  - **整句模式**：整行高亮与平滑淡入切换，适合极简低能耗环境；
  - 两种模式可在设置中随时一键自由切换。
- **Apple Music 原生排版**：精细校准的文字字重、层级行距与微光渐隐。

### 2. 🎛️ 封面嵌入式毛玻璃控制栏 (Embedded Artwork Controls)
- 将歌词控制栏精致嵌入到专辑封面（`MediaContent`）正上方中央，告别边缘突兀悬浮。
- 采用 Apple Music 风格的高透暗色毛玻璃气泡纽扣（`backdrop-filter: blur(20px)`），黑白反差自适应，微弹动效交互。
- 完整集成 6 大核心按钮：
  - `[ ⬚ ] 紧凑封面模式`
  - `[ な ] 日语假名 / 罗马音注音`
  - `[ ◫ ] 无图模式 / 切换封面`
  - `[ ↔ ] 切换封面左右侧`
  - `[ ⚙ ] 歌词设置`
  - `[ ✕ ] 退出全屏歌词`

### 3. 🔲 独创「无图模式」(Pure Lyrics Immersion)
- 点击控制栏的 `[ ◫ ]` 按钮，专辑封面平滑收起滑出，大字号歌词填满全屏。
- 控制按钮自适应平滑浮动至右上角，随时一键还原封面展示。

### 4. 🌐 歌词设置全中文本地化 & 去商业推广
- 设置面板内所有功能项、开关说明、下拉菜单及实验性特性全面汉化。
- 彻底屏蔽移除原项目底部的作者社交媒体外链（Website、Discord、Ko-fi）与无用信息，保持纯净。

### 5. 🧹 播放底栏与全局精简
- 彻底移除播放器底栏头像后的垃圾桶按钮、右侧麦克风按钮及重复的迷你播放器图标。
- 顶栏保留极简主页与搜索，去除冗余前进后退与右上角动态广播。
- 点击播放栏左下角封面直接秒级全屏；按 `ESC` 或点击 `[ ✕ ]` 瞬时退出。

### 6. ⚡ 算法与内存调度优化
- **按需渲染**：仅在激活全屏歌词时加载着色器；普通歌单与浏览界面彻底关闭动态着色器 Canvas，杜绝持续占用 GPU/CPU。
- **平滑缩放**：采用阈值消抖算法优化窗口缩放，告别拖动窗口时的突兀阶梯缩放与卡顿。

---

## 📸 界面预览

| 经典分栏全屏歌词 | 沉浸式无图纯歌词模式 |
| :---: | :---: |
| ![经典分栏](./screenshots/fullscreen_preview.png) | ![无图模式](./screenshots/no_picture_preview.png) |

| 全中文歌词设置 | 封面左右侧自由翻转 |
| :---: | :---: |
| ![全中文设置](./screenshots/settings_preview.png) | ![右侧模式](./screenshots/right_side_preview.png) |

---

## 🚀 安装与使用指南

### 前置要求
- 已安装 [Spicetify CLI](https://spicetify.app/)

### 快速安装

1. **克隆本仓库到 Spicetify 主题目录**：
   ```bash
   cd "$(spicetify -c | xargs dirname)/Themes"
   git clone https://github.com/kimi-ni-aitaku/spicetify-hazy-applemusic.git Hazy
   ```

2. **配置 Spicetify 启用该主题及歌词扩展**：
   ```bash
   spicetify config current_theme Hazy
   spicetify config extensions spicy-lyrics.mjs
   spicetify apply
   ```

3. **快捷键与操作**：
   - **进入全屏歌词**：点击底栏左下角正在播放的专辑封面。
   - **退出全屏歌词**：按键盘 `ESC` 或点击封面顶部的 `[ ✕ ]` 按钮。
   - **切换无图模式**：点击封面顶部的 `[ ◫ ]` 按钮。
   - **切换逐字/整句模式**：点击封面顶部 `[ ⚙ ]` -> 在「歌词显示」中切换「精简歌词（整句模式）」。

---

## 📄 开源许可
基于 MIT License 开源。
