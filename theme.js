(function hazy() {
  if (!Spicetify?.Platform || !Spicetify?.Platform?.History?.listen) {
    setTimeout(hazy, 100);
    return;
  }

  const defImage = "https://i.imgur.com/Wl2D0h0.png";
  let startImage = localStorage.getItem("hazy:startupBg") || defImage;
  const toggleInfo = [
    {
      id: "UseCustomBackground",
      name: "启用自定义背景图",
      defVal: false,
    },
    {
      id: "UseCustomColor",
      name: "启用自定义主题色",
      defVal: false,
    },
    {
      id: "HideNowPlayingSidebar",
      name: "隐藏正在播放侧边栏",
      defVal: false,
    },
  ];
  const toggles = {
    UseCustomBackground: false,
    UseCustomColor: false,
    HideNowPlayingSidebar: false
  };
  const sliders = [
    {
      id: "blur",
      name: "背景模糊度",
      min: 0,
      max: 50,
      step: 1,
      defVal: 15,
      end: "px",
    },
    { id: "cont", name: "背景对比度", min: 0, max: 200, step: 2, defVal: 50 },
    { id: "satu", name: "背景饱和度", min: 0, max: 200, step: 2, defVal: 70 },
    {
      id: "bright",
      name: "背景明亮度",
      min: 0,
      max: 200,
      step: 2,
      defVal: 120,
    },
  ];

  (function sidebar() {
    if (localStorage.getItem("Hazy Sidebar Activated")) return;
    // Sidebar settings
    const parsedObject = JSON.parse(
      localStorage.getItem("spicetify-exp-features")
    );

    // Variable if client needs to reload
    let reload = false;

    // Array of features
    const features = [
      "enableYLXSidebar",
      "enableRightSidebar",
      "enableRightSidebarTransitionAnimations",
      "enableRightSidebarLyrics",
      "enableRightSidebarExtractedColors",
      "enablePanelSizeCoordination",
    ];

    for (const feature of features) {
      // Ignore if feature not present
      if (!parsedObject?.[feature]) continue;

      // Change value if disabled
      if (!parsedObject?.[feature]?.value) {
        parsedObject[feature].value = true;
        reload = true;
      }
    }

    localStorage.setItem(
      "spicetify-exp-features",
      JSON.stringify(parsedObject)
    );
    localStorage.setItem("Hazy Sidebar Activated", true);
    if (reload) {
      window.location.reload();
      reload = false;
    }
  })();

  function loadSliders() {
    sliders.forEach((opt) => {
      const val = localStorage.getItem(`${opt.id}Amount`) || opt.defVal;
      document.documentElement.style.setProperty(
        `--${opt.id}`,
        `${val}${opt.end || "%"}`
      );
    });
  }

  function setAccentColor(color) {
    document.querySelector(":root").style.setProperty("--spice-button", color);
    document
      .querySelector(":root")
      .style.setProperty("--spice-button-active", color);
    document.querySelector(":root").style.setProperty("--spice-accent", color);
  }

  async function fetchFadeTime() {
    try {
      const response = await Spicetify.Platform.PlayerAPI._prefs.get({
        key: "audio.crossfade_v2",
      });

      // Default to 0.4s if crossfade is disabled
      if (!response.entries["audio.crossfade_v2"].bool) {
        document.documentElement.style.setProperty("--fade-time", "0.4s");
        return;
      }
      const fadeTimeResponse = await Spicetify.Platform.PlayerAPI._prefs.get({
        key: "audio.crossfade.time_v2",
      });
      const fadeTime =
        fadeTimeResponse.entries["audio.crossfade.time_v2"].number;

      // Use the CSS variable "--fade-time" for transition time
      document.documentElement.style.setProperty(
        "--fade-time",
        `${fadeTime / 1000}s`
      );
    } catch (error) {
      document.documentElement.style.setProperty("--fade-time", "0.4s");
    }
  }

  function getCurrentBackground(replace) {
    let url = Spicetify?.Player?.data?.item?.metadata?.image_url;
    if (toggles.UseCustomBackground || !url || !URL.canParse(url)) return startImage;
    if (replace)
      url = url.replace("spotify:image:", "https://i.scdn.co/image/");
    return url;
  }

  async function onSongChange() {
    fetchFadeTime();

    const album_uri = Spicetify?.Player?.data?.item?.metadata?.album_uri;
    if (album_uri !== undefined && !album_uri.includes("spotify:show")) {
      // Album
    } else if (Spicetify?.Player?.data?.item?.uri?.includes("spotify:episode")) {
      // Podcast
    } else if (Spicetify?.Player?.data?.item?.isLocal) {
      // Local file
    } else if (Spicetify?.Player?.data?.item?.provider === "ad") {
      // Ad
      return;
    } else {
      // When clicking a song from the homepage, songChange is fired with half empty metadata
      setTimeout(onSongChange, 200);
    }

    updateLyricsPageProperties();

    // Custom code added by lily
    if (!toggles.UseCustomColor) {
      // Get the accent color from the background image
      const img = new Image();
      // Allows CORS-enabled images
      img.crossOrigin = "Anonymous";

      img.onload = function () {
        const sampleSize = 32;
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        canvas.width = sampleSize;
        canvas.height = sampleSize;
        ctx.drawImage(img, 0, 0, sampleSize, sampleSize);

        const imageData = ctx.getImageData(
          0,
          0,
          sampleSize,
          sampleSize
        ).data;

        const rgbList = [];
        for (let i = 0; i < imageData.length; i += 4) {
          rgbList.push({
            r: imageData[i],
            g: imageData[i + 1],
            b: imageData[i + 2],
          });
        }

        // Attempt with filters
        let hexColor = findColor(rgbList);

        // Retry without filters if no color is found
        if (!hexColor) hexColor = findColor(rgbList, true);

        // Apple Music Ambient Fallback for monochrome or ultra-dark covers
        if (!hexColor || hexColor === "#000000" || hexColor === "#121212") {
          hexColor = "#546e7a";
        }

        setAccentColor(hexColor);
      };

      img.src = getCurrentBackground(true);
    } else {
      setAccentColor(localStorage.getItem("CustomColor") || "#ffc0ea");
    }

    // Update background
    document.documentElement.style.setProperty(
      "--image_url",
      `url("${getCurrentBackground(false)}")`
    );
  }

  // Gets the most prominent color in a list of RGB values
  function findColor(rgbList, skipFilters = false) {
    const colorCount = {};
    let maxColor = "";
    let maxCount = 0;

    for (let i = 0; i < rgbList.length; i++) {
      if (
        !skipFilters &&
        (isTooDark(rgbList[i]) || isTooCloseToWhite(rgbList[i]))
      ) {
        continue;
      }

      const color = `${rgbList[i].r},${rgbList[i].g},${rgbList[i].b}`;
      colorCount[color] = (colorCount[color] || 0) + 1;

      if (colorCount[color] > maxCount) {
        maxColor = color;
        maxCount = colorCount[color];
      }
    }

    return maxColor ? rgbToHex(...maxColor.split(",").map(Number)) : null;
  }

  // Converts RGB to Hex
  function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
  }

  // Checks if a color is too dark
  function isTooDark(rgb) {
    const brightness = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
    // Lower threshold to 60 so rich saturated dark colors are preserved
    const threshold = 60;
    return brightness < threshold;
  }

  // Checks if a color is too close to white
  function isTooCloseToWhite(rgb) {
    const threshold = 200;
    return rgb.r > threshold && rgb.g > threshold && rgb.b > threshold;
  }

  // Ensure SpicyLyrics never drops into CompactMode on narrow/resized windows, preserving vertical center lyrics
  (function patchMatchMediaForSpicyLyrics() {
    const origMatchMedia = window.matchMedia;
    if (!origMatchMedia || window.__matchMediaPatchedForSpicy) return;
    window.__matchMediaPatchedForSpicy = true;

    window.matchMedia = function (query) {
      if (typeof query === "string" && query.includes("70.812rem")) {
        const res = origMatchMedia.call(this, query);
        return new Proxy(res, {
          get(target, prop) {
            if (prop === "matches") return false;
            return typeof target[prop] === "function" ? target[prop].bind(target) : target[prop];
          }
        });
      }
      return origMatchMedia.call(this, query);
    };
  })();

  // Optimistic Seek Wrapper: Prevents Spotify async seek position snapback / jitter
  let optimisticProgress = null;
  let optimisticUntil = 0;

  function applyOptimisticSeek(targetMs) {
    optimisticProgress = targetMs;
    optimisticUntil = Date.now() + 1200;
    const dur = Spicetify.Player.getDuration() || 1;
    const pct = Math.max(0, Math.min(1, targetMs / dur));
    document.querySelectorAll("#SpicyLyricsPage .SliderBar").forEach((sb) => {
      sb.style.setProperty("--SliderProgress", pct.toString());
    });
    document.querySelectorAll("#SpicyLyricsPage .NowBar .Timeline .Time.Position").forEach((el) => {
      el.textContent = Spicetify.Player.formatTime(targetMs);
    });
  }

  function protectSliderBar(sb) {
    if (!sb || sb.__protectInstalled) return;
    sb.__protectInstalled = true;
    const origSetProperty = sb.style.setProperty.bind(sb.style);
    sb.style.setProperty = function (prop, val, prio) {
      if (prop === "--SliderProgress" && optimisticProgress !== null && Date.now() < optimisticUntil) {
        const dur = Spicetify.Player.getDuration() || 1;
        const targetPct = optimisticProgress / dur;
        const incoming = parseFloat(val);
        if (!isNaN(incoming) && Math.abs(incoming - targetPct) > 0.03) {
          return origSetProperty(prop, targetPct.toString(), prio);
        }
      }
      return origSetProperty(prop, val, prio);
    };
  }

  function installOptimisticSeekWrapper() {
    if (!Spicetify?.Player?.seek || !Spicetify?.Player?.getProgress) return;
    if (Spicetify.Player.__optimisticSeekInstalled) return;
    Spicetify.Player.__optimisticSeekInstalled = true;

    const origSeek = Spicetify.Player.seek;
    Spicetify.Player.seek = function (count) {
      const duration = Spicetify.Player.getDuration() || 0;
      const targetMs = count <= 1 && duration > 0 ? Math.round(count * duration) : Math.round(count);
      applyOptimisticSeek(targetMs);
      return origSeek.call(this, count);
    };

    if (Spicetify.Player.origin?.seekTo) {
      const origSeekTo = Spicetify.Player.origin.seekTo.bind(Spicetify.Player.origin);
      Spicetify.Player.origin.seekTo = function (ms) {
        applyOptimisticSeek(Math.round(ms));
        return origSeekTo(ms);
      };
    }

    const origGetProgress = Spicetify.Player.getProgress;
    Spicetify.Player.getProgress = function () {
      if (optimisticProgress !== null) {
        if (Date.now() < optimisticUntil) {
          const real = origGetProgress.call(this);
          if (Math.abs(real - optimisticProgress) < 1000) {
            optimisticProgress = null;
            return real;
          }
          return optimisticProgress;
        }
        optimisticProgress = null;
      }
      return origGetProgress.call(this);
    };
  }

  installOptimisticSeekWrapper();
  loadSliders();
  loadToggles();
  Spicetify.Player.addEventListener("songchange", onSongChange);
  if (window.navigator.userAgent.indexOf("Win") !== -1)
    document.body.classList.add("windows");
  galaxyFade();

  function scrollToTop() {
    const element = document.querySelector(".main-entityHeader-container");
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  document.addEventListener("click", (event) => {
    if (event.target.closest(".main-entityHeader-topbarTitle")) scrollToTop();
  });

  // Auto-play when user clicks a lyric line while playback is paused
  document.addEventListener(
    "click",
    (event) => {
      const line = event.target.closest(
        "#SpicyLyricsPage .LyricsContent .line, #SpicyLyricsPage .LyricsContent .word, #SpicyLyricsPage .LyricsContent .letter"
      );
      if (!line) return;
      if (!Spicetify?.Player?.isPlaying?.()) {
        setTimeout(() => {
          if (!Spicetify?.Player?.isPlaying?.()) {
            Spicetify?.Player?.play?.();
          }
        }, 50);
      }
    },
    true
  );

  // Track last non-lyrics route to ensure robust back navigation
  let lastNonLyricsRoute = "/";
  if (Spicetify.Platform?.History?.listen) {
    Spicetify.Platform.History.listen((loc) => {
      const p = loc?.pathname || Spicetify.Platform?.History?.location?.pathname;
      if (p && p !== "/lyrics" && p !== "/SpicyLyrics") {
        lastNonLyricsRoute = p;
      }
    });
  }

  // Default SpicyLyrics state to Apple Music left-split & opened NowBar
  try {
    const rawState = Spicetify.LocalStorage.get("SL:uiState");
    const state = rawState ? JSON.parse(rawState) : {};
    if (state.nowBarSide !== "left" || !state.isNowBarOpen || state.forceCompactMode) {
      state.nowBarSide = "left";
      state.isNowBarOpen = true;
      state.forceCompactMode = false;
      Spicetify.LocalStorage.set("SL:uiState", JSON.stringify(state));
    }
  } catch (e) {}

  // Toggle Apple Music Fullscreen Lyrics
  function toggleAppleMusicFullscreen() {
    const page = document.getElementById("SpicyLyricsPage");
    const isFs = page && page.classList.contains("Fullscreen");
    if (isFs) {
      const close = document.getElementById("Close");
      if (close) {
        close.click();
        setTimeout(() => {
          if (Spicetify.Platform?.History?.push) {
            Spicetify.Platform.History.push(lastNonLyricsRoute || "/");
          }
        }, 50);
        return;
      }
    }
    const fsBtn = document.getElementById("SpicyLyrics_FullscreenButton");
    if (fsBtn) {
      fsBtn.click();
    }
  }

  // Handle direct click on [ ✕ ] close button in lyrics capsule
  document.addEventListener(
    "click",
    (event) => {
      if (event.target.closest("#Close")) {
        setTimeout(() => {
          if (Spicetify.Platform?.History?.push) {
            Spicetify.Platform.History.push(lastNonLyricsRoute || "/");
          }
        }, 50);
      }
    },
    true
  );

  // Click bottom-left cover art to toggle Apple Music Fullscreen Lyrics
  document.addEventListener(
    "click",
    (event) => {
      const cover = event.target.closest(
        ".main-nowPlayingWidget-coverArtContainer, [data-testid='cover-art-button'], .main-coverSlotExpanded-container"
      );
      if (cover) {
        event.preventDefault();
        event.stopPropagation();
        toggleAppleMusicFullscreen();
      }
    },
    true
  );



  // Press ESC to exit fullscreen lyrics
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const page = document.getElementById("SpicyLyricsPage");
      if (page && page.classList.contains("Fullscreen")) {
        toggleAppleMusicFullscreen();
      }
    }
  });

  // Apple Music Inactivity Auto-Fade (3.5s idle fades out controls & cursor)
  let inactivityTimer = null;
  function handleUserActivity() {
    const page = document.getElementById("SpicyLyricsPage");
    if (!page || !page.classList.contains("Fullscreen")) return;

    if (page.classList.contains("is-inactive")) {
      page.classList.remove("is-inactive");
    }
    clearTimeout(inactivityTimer);

    inactivityTimer = setTimeout(() => {
      const activePage = document.getElementById("SpicyLyricsPage");
      if (
        activePage &&
        activePage.classList.contains("Fullscreen") &&
        !document.querySelector("sl-generic-modal, .main-contextMenu-menu")
      ) {
        activePage.classList.add("is-inactive");
      }
    }, 3500);
  }

  window.addEventListener("mousemove", handleUserActivity, { passive: true });
  window.addEventListener("mousedown", handleUserActivity, { passive: true });
  window.addEventListener("keydown", handleUserActivity, { passive: true });
  window.addEventListener("wheel", handleUserActivity, { passive: true });
  window.addEventListener("touchstart", handleUserActivity, { passive: true });
  setTimeout(handleUserActivity, 1500);

  // =========================================================================
  // SpicyLyrics Enhancements: Artwork Embedded Controls, No-Picture Mode, & Chinese Settings
  // =========================================================================

  const SPICY_SETTINGS_TRANSLATIONS = {
    "Settings": "歌词设置",
    "Search settings…": "搜索设置…",
    "Filter": "筛选",
    "Background": "背景效果",
    "Lyrics Display": "歌词显示",
    "Playback": "播放控制",
    "Scrolling": "滚动效果",
    "Appearance": "外观样式",
    "Interface": "界面布局",
    "Experiments": "实验性功能",
    "Developer": "开发者选项",
    "Cache": "缓存管理",
    "Static Background": "静态背景",
    "Pin the background to a fixed image or color instead of animating it.": "固定背景为静态图片或纯色，取消动态动画以降低资源占用。",
    "Display Dynamic Background in Now Playing View": "在“正在播放”面板显示动态背景",
    "Show the animated background in the Now Playing panel.": "在右侧“正在播放”面板中启用动态流动背景。",
    "Off": "关闭 (全动态)",
    "Auto": "自动",
    "Artist Header": "歌手封面",
    "Cover Art": "专辑封面",
    "Color": "纯色背景",
    "Simple Lyrics Mode": "精简歌词（整句模式）",
    "Remove extra visual effects from lyrics": "开启后使用整句静态高亮；关闭后启用 Apple Music 逐字/平滑进度显现动画。",
    "Simple Mode: Text Animation Style": "整句模式：文字切换过渡方式",
    "How lyrics text transitions are rendered in Simple Lyrics Mode.": "整句歌词模式下，句子切换时的淡入动画算法。",
    "Enable Simple Lyrics Mode to modify this setting": "开启“精简歌词（整句模式）”后方可调节此选项",
    "calculate": "实时平滑淡入",
    "animate": "标准渐变动画",
    "Minimal Lyrics Mode": "极简歌词模式",
    "Hides sung lyrics lines in Fullscreen and Cinema Mode": "全屏模式下仅保留当前播放行，隐藏已唱过的歌词。",
    "Line Hover Background": "歌词行悬停高亮背景",
    "Shows a highlight box behind a lyrics line when you hover over it": "鼠标悬停在某行歌词时显示半透明高亮底色背景。",
    "Playback Offset": "歌词时间轴偏移",
    "Shift lyrics timing in milliseconds. Negative values show lyrics earlier; positive values delay them.": "微调歌词同步时间（毫秒）。负数提前显示，正数延迟显示。",
    "Seek Fade-in Compensation": "跳转播放淡入补偿",
    "Clicking a line jumps 300ms before it, so Spotify's fade-in doesn't cut off the start. Best for rap or fast-paced songs.": "点击歌词跳转时自动提前 300ms，防止 Spotify 的音频淡入截断歌词首音，特别适合快节奏或说唱曲目。",
    "Early Scroll": "提前滚动预备",
    "Start scrolling to the next line slightly before it becomes active, so the move feels less abrupt.": "在下一行歌词开唱前稍早开始平滑滚动，使歌词滚动更自然丝滑。",
    "Early Scroll Time": "提前滚动时间",
    "How early the next line is scrolled to, before it becomes active.": "下一行歌词激活前提前开始滚动的毫秒数。",
    "Enable Early Scroll to modify this setting": "启用“提前滚动预备”后方可修改此选项",
    "Smooth Scrolling": "平滑自然滚动",
    "Makes the lyrics scroll smoothly.": "开启全局平滑歌词滚动效果。",
    "Use System Font": "使用系统默认字体",
    "Disable the custom Spicy Lyrics font and fall back to your system font.": "停用 SpicyLyrics 自带字体，使用系统原生无衬线字体。",
    "Lock Media Box Size in Compact Mode": "紧凑模式锁定尺寸",
    "Prevent the media box from resizing when Forced Compact Mode is active.": "在强制紧凑模式下锁定专辑封面的显示大小。",
    "Disable Popup Lyrics Window": "停用歌词弹窗",
    "Prevent lyrics from opening in a floating popup window.": "禁止在浮动画中画小窗口中打开歌词。",
    "View Controls Position": "控制按钮位置",
    "Where the view controls (play, scroll, etc.) appear.": "歌词控制按钮栏的显示位置。",
    "Top": "顶部",
    "Bottom": "底部",
    "Timeline Outside Media Box": "进度条移至封面下方",
    "Display the playback timeline outside the media box, in the NowBar header. Stays inside the media box in Compact Mode or PIP.": "将播放进度条显示在专辑封面下方，紧凑或画中画模式下保持原位。",
    "Remove Spotify's Lyrics Button": "移除 Spotify 原生歌词按钮",
    "Hide Spotify's built-in lyrics button from the playback bar. The Spicy Lyrics button stays.": "从底部播放栏隐藏 Spotify 原生歌词图标，仅保留当前歌词系统。",
    "Volume Slider": "封面音量滑块",
    "Show a volume control on the album artwork in Fullscreen, Cinema View and Popup Lyrics.": "在全屏模式的专辑封面上显示音量控制滑块。",
    "Disable NPV Lyrics": "停用侧边栏歌词",
    "Never show the lyrics card in the Now Playing sidebar.": "不在右侧“正在播放”面板中加载歌词卡片以节省内存。",
    "Hide NPV Lyrics When No Lyrics Are Available": "无歌词时自动隐藏侧边栏卡片",
    "Remove the lyrics card from the Now Playing sidebar while the current song has no lyrics, instead of showing a notice. It comes back on the next song that has them.": "当前曲目无歌词时不显示“无歌词”提示卡片，直接隐藏该面板；有歌词的曲目则正常显示。",
    "Experiments": "实验性功能",
    "Try out in-progress features, and switch back if you prefer the old behaviour.": "体验开发中的新功能特性，随时可恢复默认行为。",
    "These features are still being shaped. Toggle one off if you prefer how things worked before.": "这些功能仍在实验演进中。如果您更喜欢先前的表现方式，可以随时关闭相应选项。",
    "New SliderBar Styling": "全新毛玻璃进度条样式",
    "New glass-like style for the SliderBar. Disable to revert back to the original one.": "为进度滑块启用晶莹剔透的毛玻璃外观，关闭则恢复默认样式。",
    "Duet Line Padding": "对唱歌词智能缩进",
    "Indents lyrics lines on the side they lean away from when a song has duet lines, so the two voices read as separate columns. Disable to give every line the same slight padding.": "当歌曲包含双人对唱时，根据男女歌手两侧进行对齐缩进，使多声部呈现独立视觉列。",
    "Lyrics Loading Skeleton": "歌词加载骨架屏",
    "Shows placeholder lines and a small \"Loading Lyrics\" label while lyrics fetch and render, instead of the blurred spinner. Disable to bring the spinner back.": "在获取并解析歌词时展示优雅的占位骨架屏与状态提示，取代旋转加载图标。",
    "Developer": "开发者选项",
    "Developer Mode": "开发者调试模式",
    "Enable extra logging and debug utilities.": "开启更详细的控制台调试日志与诊断工具。",
    "Cache": "缓存管理",
    "Clear All Caches for Current Song": "清除当前歌曲全部缓存",
    "Remove all cached lyrics data for the currently playing track.": "删除当前正在播放曲目的所有已缓存歌词数据。",
    "Clear Stored Lyrics Cache": "清除本地歌词数据缓存",
    "Delete lyrics that have been cached for up to 3 days.": "清理存储在本地且保留最多3天的歌词缓存文件。",
    "Clear Current Song from Internal State": "重置当前歌曲内存状态",
    "Remove the current song's lyrics from the in-memory state only.": "仅从运行内存状态中重置当前歌曲的歌词对象。",
    "Clear": "清除",
    "Clear Cache": "清除缓存",
    "Clear State": "重置状态",
    "Close": "关闭"
  };

  function translateSpicyModal(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    let n;
    while ((n = walker.nextNode())) {
      const text = n.nodeValue.trim();
      if (SPICY_SETTINGS_TRANSLATIONS[text]) {
        n.nodeValue = n.nodeValue.replace(text, SPICY_SETTINGS_TRANSLATIONS[text]);
      }
    }
    root.querySelectorAll("input[placeholder]").forEach((inp) => {
      if (SPICY_SETTINGS_TRANSLATIONS[inp.placeholder]) {
        inp.placeholder = SPICY_SETTINGS_TRANSLATIONS[inp.placeholder];
      }
    });
    root.querySelectorAll("option").forEach((opt) => {
      const text = opt.innerText.trim();
      if (SPICY_SETTINGS_TRANSLATIONS[text]) {
        opt.innerText = SPICY_SETTINGS_TRANSLATIONS[text];
      }
    });
    root.querySelectorAll(".sl-sp-btn").forEach((btn) => {
      const text = btn.innerText.trim();
      if (text.startsWith("Open (")) {
        btn.innerText = text.replace("Open (", "查看试验项 (");
      } else if (SPICY_SETTINGS_TRANSLATIONS[text]) {
        btn.innerText = SPICY_SETTINGS_TRANSLATIONS[text];
      }
    });
  }

  // 3-State Playback Mode Cycler: 顺序播放 -> 随机播放 -> 循环播放 -> 顺序播放
  function cyclePlayMode() {
    const isShuffle = !!Spicetify.Player.getShuffle?.();
    const repeat = Spicetify.Player.getRepeat?.() || 0;

    if (isShuffle) {
      // Shuffle -> Loop
      Spicetify.Player.setShuffle(false);
      Spicetify.Player.setRepeat(1);
    } else if (repeat > 0) {
      // Loop -> Order (Sequential)
      Spicetify.Player.setShuffle(false);
      Spicetify.Player.setRepeat(0);
    } else {
      // Order -> Shuffle
      Spicetify.Player.setShuffle(true);
      Spicetify.Player.setRepeat(0);
    }
    updatePlayModeUI();
    setTimeout(() => {
      updatePlayModeUI();
    }, 60);
  }

  function updatePlayModeUI(root = document) {
    const isShuffle = !!Spicetify.Player.getShuffle?.();
    const repeat = Spicetify.Player.getRepeat?.() || 0;

    let mode = "order";
    if (isShuffle) mode = "shuffle";
    else if (repeat > 0) mode = "loop";

    const title = mode === "order" ? "顺序播放" : mode === "shuffle" ? "随机播放" : "循环播放";

    const targets = root.matches?.(".PlayModeToggle, .btn-playmode")
      ? [root]
      : Array.from(root.querySelectorAll?.(".PlayModeToggle, .btn-playmode") || []);

    targets.forEach((btn) => {
      btn.classList.toggle("mode-order", mode === "order");
      btn.classList.toggle("mode-shuffle", mode === "shuffle");
      btn.classList.toggle("mode-loop", mode === "loop");
      btn.classList.toggle("Enabled", mode !== "order");
      btn.setAttribute("title", title);
      btn.setAttribute("aria-label", title);

      const orderSvg = btn.querySelector(".mode-icon-order");
      const shuffleSvg = btn.querySelector(".mode-icon-shuffle");
      const loopSvg = btn.querySelector(".mode-icon-loop");
      if (orderSvg) orderSvg.style.display = mode === "order" ? "block" : "none";
      if (shuffleSvg) shuffleSvg.style.display = mode === "shuffle" ? "block" : "none";
      if (loopSvg) loopSvg.style.display = mode === "loop" ? "block" : "none";
    });
  }

  // Apple Music Pure Lyrics Mode: Floating Frosted Bottom Dock
  function syncPureLyricsBottomBar() {
    const page = document.getElementById("SpicyLyricsPage");
    if (!page || !page.classList.contains("Fullscreen")) {
      const existing = document.getElementById("ApplePureLyricsBottomBar");
      if (existing) existing.remove();
      return;
    }

    const isNoPic = page.classList.contains("NowBarStatus__Closed");
    let bar = document.getElementById("ApplePureLyricsBottomBar");

    if (!isNoPic) {
      if (bar) bar.style.display = "none";
      return;
    }

    if (!bar) {
      bar = document.createElement("div");
      bar.id = "ApplePureLyricsBottomBar";
      bar.innerHTML = `
        <div class="PureLyricsMeta">
          <img class="PureLyricsThumb" src="" alt="" />
          <div class="PureLyricsDetails">
            <span class="PureLyricsTitle"></span>
            <span class="PureLyricsArtist"></span>
          </div>
        </div>
        <div class="PureLyricsCenter">
          <div class="PureLyricsControls">
            <button class="PureLyricsBtn btn-playmode" title="播放模式">
              <svg class="mode-icon-order" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="7" x2="18" y2="7"/><polyline points="15 4 18 7 15 10"/><line x1="3" y1="17" x2="18" y2="17"/><polyline points="15 14 18 17 15 20"/></svg>
              <svg class="mode-icon-shuffle" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:none;"><path d="M16 3h5v5"/><path d="M4 20L21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/></svg>
              <svg class="mode-icon-loop" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:none;"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
            </button>
            <button class="PureLyricsBtn btn-prev" title="上一首">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>
            </button>
            <button class="PureLyricsBtn btn-playpause" title="播放 / 暂停">
              <svg class="icon-play" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <svg class="icon-pause" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
            </button>
            <button class="PureLyricsBtn btn-next" title="下一首">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>
            </button>
          </div>
          <div class="PureLyricsTimeline">
            <span class="PureLyricsTime time-cur">0:00</span>
            <div class="PureLyricsTrack">
              <div class="PureLyricsProgress"></div>
            </div>
            <span class="PureLyricsTime time-dur">0:00</span>
          </div>
        </div>
      `;

      bar.querySelector(".btn-playmode").addEventListener("click", (e) => {
        e.stopPropagation();
        cyclePlayMode();
      });
      bar.querySelector(".btn-playpause").addEventListener("click", (e) => {
        e.stopPropagation();
        Spicetify.Player.playPause();
      });
      bar.querySelector(".btn-prev").addEventListener("click", (e) => {
        e.stopPropagation();
        Spicetify.Player.back();
      });
      bar.querySelector(".btn-next").addEventListener("click", (e) => {
        e.stopPropagation();
        Spicetify.Player.next();
      });

      const track = bar.querySelector(".PureLyricsTrack");
      function handleBottomSeek(e) {
        const rect = track.getBoundingClientRect();
        if (!rect.width) return 0;
        const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const dur = Spicetify.Player.getDuration() || 0;
        const targetMs = Math.round(pct * dur);
        const prog = bar.querySelector(".PureLyricsProgress");
        if (prog) prog.style.width = `${pct * 100}%`;
        const curTime = bar.querySelector(".time-cur");
        if (curTime) curTime.textContent = Spicetify.Player.formatTime(targetMs);
        return targetMs;
      }
      track.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        bar.__isBottomDragging = true;
        handleBottomSeek(e);
        function onPointerMove(me) {
          if (!bar.__isBottomDragging) return;
          handleBottomSeek(me);
        }
        function onPointerUp(ue) {
          if (!bar.__isBottomDragging) return;
          bar.__isBottomDragging = false;
          window.removeEventListener("pointermove", onPointerMove);
          window.removeEventListener("pointerup", onPointerUp);
          const finalMs = handleBottomSeek(ue);
          if (finalMs !== undefined) {
            Spicetify.Player.seek(finalMs);
          }
        }
        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
      });

      page.appendChild(bar);
    }

    bar.style.display = "flex";

    const item = Spicetify.Player.data?.item;
    const meta = item?.metadata;
    if (meta) {
      const titleEl = bar.querySelector(".PureLyricsTitle");
      const artistEl = bar.querySelector(".PureLyricsArtist");
      const thumbEl = bar.querySelector(".PureLyricsThumb");

      if (titleEl) titleEl.textContent = meta.title || "未知曲目";
      if (artistEl) artistEl.textContent = meta.artist_name || "";
      if (thumbEl) {
        let imgUrl = meta.image_url;
        if (imgUrl && imgUrl.startsWith("spotify:image:")) {
          imgUrl = imgUrl.replace("spotify:image:", "https://i.scdn.co/image/");
        }
        if (imgUrl) {
          thumbEl.src = imgUrl;
          thumbEl.style.display = "block";
        } else {
          thumbEl.style.display = "none";
        }
      }
    }

    const isPlaying = Spicetify.Player.isPlaying();
    const playIcon = bar.querySelector(".icon-play");
    const pauseIcon = bar.querySelector(".icon-pause");
    if (playIcon && pauseIcon) {
      playIcon.style.display = isPlaying ? "none" : "block";
      pauseIcon.style.display = isPlaying ? "block" : "none";
    }

    if (!bar.__isBottomDragging) {
      const curMs = Spicetify.Player.getProgress() || 0;
      const durMs = Spicetify.Player.getDuration() || 1;
      const pct = Math.min(100, Math.max(0, (curMs / durMs) * 100));

      const prog = bar.querySelector(".PureLyricsProgress");
      if (prog) prog.style.width = `${pct}%`;

      const curTime = bar.querySelector(".time-cur");
      const durTime = bar.querySelector(".time-dur");
      if (curTime) curTime.textContent = Spicetify.Player.formatTime(curMs);
      if (durTime) durTime.textContent = Spicetify.Player.formatTime(durMs);
    }
  }

  function toggleNowBarPictureMode() {
    const page = document.getElementById("SpicyLyricsPage");
    if (!page) return;
    const nowBar = page.querySelector(".NowBar");
    if (!nowBar) return;
    const isClosed = page.classList.contains("NowBarStatus__Closed") || !nowBar.classList.contains("Active");
    if (isClosed) {
      page.classList.remove("NowBarStatus__Closed");
      page.classList.add("NowBarStatus__Open");
      nowBar.classList.add("Active");
      try {
        const s = JSON.parse(Spicetify.LocalStorage.get("SL:uiState") || "{}");
        s.isNowBarOpen = true;
        Spicetify.LocalStorage.set("SL:uiState", JSON.stringify(s));
      } catch (e) {}
    } else {
      page.classList.remove("NowBarStatus__Open");
      page.classList.add("NowBarStatus__Closed");
      nowBar.classList.remove("Active");
      try {
        const s = JSON.parse(Spicetify.LocalStorage.get("SL:uiState") || "{}");
        s.isNowBarOpen = false;
        Spicetify.LocalStorage.set("SL:uiState", JSON.stringify(s));
      } catch (e) {}
    }
    syncSpicyControls();
    syncPureLyricsBottomBar();
    window.dispatchEvent(new Event("resize"));
  }

  // Periodic ticker for Pure Lyrics bottom bar (fast-path early exit when not active)
  setInterval(() => {
    const bar = document.getElementById("ApplePureLyricsBottomBar");
    if (!bar || bar.style.display === "none") return;
    const page = document.getElementById("SpicyLyricsPage");
    if (page && page.classList.contains("Fullscreen") && page.classList.contains("NowBarStatus__Closed")) {
      syncPureLyricsBottomBar();
    }
  }, 500);

  let syncScheduled = false;
  function syncSpicyControls() {
    const page = document.getElementById("SpicyLyricsPage");
    if (!page) return;

    installOptimisticSeekWrapper();

    // Clean up stuck compact mode so lyrics stay vertically centered
    if (page.classList.contains("CompactMode") || page.classList.contains("ForcedCompactMode")) {
      const compactBtn = document.getElementById("CompactModeToggle");
      if (compactBtn) {
        compactBtn.click();
      } else {
        page.classList.remove("CompactMode", "ForcedCompactMode", "CompactifyEnabledCompactMode");
      }
    }

    const header = page.querySelector(".NowBar .Header");
    const tl = page.querySelector(".Timeline");
    const allPcs = page.querySelectorAll(".PlaybackControls");
    let pc = allPcs[0] || null;
    if (allPcs.length > 1) {
      for (let i = 1; i < allPcs.length; i++) {
        allPcs[i].remove();
      }
    }

    // Protect timeline slider bars from being overwritten by async unsynced position poll
    page.querySelectorAll(".SliderBar").forEach(protectSliderBar);

    // Ensure PlaybackControls exists in header
    if (!pc && header) {
      pc = document.createElement("div");
      pc.className = "PlaybackControls";
      pc.innerHTML = `
        <button class="PlaybackControl PlayModeToggle" id="PlayModeToggle" title="播放模式">
          <svg class="mode-icon-order" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="7" x2="18" y2="7"/><polyline points="15 4 18 7 15 10"/><line x1="3" y1="17" x2="18" y2="17"/><polyline points="15 14 18 17 15 20"/></svg>
          <svg class="mode-icon-shuffle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:none;"><path d="M16 3h5v5"/><path d="M4 20L21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/></svg>
          <svg class="mode-icon-loop" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:none;"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
        </button>
        <button class="PlaybackControl TrackSkip PrevTrack" title="上一首">
          <svg viewBox="0 0 24 24"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="4" x2="5" y2="20" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
        </button>
        <button class="PlaybackControl PlayStateToggle" title="播放/暂停">
          <svg class="icon-play" viewBox="0 0 24 24"><polygon points="6 4 20 12 6 20 6 4"/></svg>
          <svg class="icon-pause" viewBox="0 0 24 24" style="display:none;"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
        </button>
        <button class="PlaybackControl TrackSkip NextTrack" title="下一首">
          <svg viewBox="0 0 24 24"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="4" x2="19" y2="20" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
        </button>
        <div class="PlayControlsSpacer"></div>
      `;
      pc.querySelector(".PlayModeToggle")?.addEventListener("click", (e) => {
        e.stopPropagation();
        cyclePlayMode();
      });
      pc.querySelector(".PrevTrack")?.addEventListener("click", (e) => {
        e.stopPropagation();
        Spicetify.Player.back();
      });
      pc.querySelector(".PlayStateToggle")?.addEventListener("click", (e) => {
        e.stopPropagation();
        Spicetify.Player.playPause();
      });
      pc.querySelector(".NextTrack")?.addEventListener("click", (e) => {
        e.stopPropagation();
        Spicetify.Player.next();
      });
    }

    if (pc) {
      // 1. Remove separate shuffle/loop toggles created by SpicyLyrics
      pc.querySelector(".ShuffleToggle")?.remove();
      pc.querySelector(".LoopToggle")?.remove();

      // 2. Ensure PlayModeToggle exists
      let pmBtn = pc.querySelector(".PlayModeToggle");
      if (!pmBtn) {
        pmBtn = document.createElement("button");
        pmBtn.className = "PlaybackControl PlayModeToggle";
        pmBtn.id = "PlayModeToggle";
        pmBtn.title = "播放模式";
        pmBtn.innerHTML = `
          <svg class="mode-icon-order" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="7" x2="18" y2="7"/><polyline points="15 4 18 7 15 10"/><line x1="3" y1="17" x2="18" y2="17"/><polyline points="15 14 18 17 15 20"/></svg>
          <svg class="mode-icon-shuffle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:none;"><path d="M16 3h5v5"/><path d="M4 20L21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/></svg>
          <svg class="mode-icon-loop" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:none;"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
        `;
        pmBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          cyclePlayMode();
        });
        const prev = pc.querySelector(".PrevTrack");
        if (prev) {
          pc.insertBefore(pmBtn, prev);
        } else {
          pc.insertBefore(pmBtn, pc.firstChild);
        }
      }

      // 3. Ensure PlayControlsSpacer exists at end for symmetry
      let spacer = pc.querySelector(".PlayControlsSpacer");
      if (!spacer) {
        spacer = document.createElement("div");
        spacer.className = "PlayControlsSpacer";
        pc.appendChild(spacer);
      }

      const isPlaying = Spicetify.Player.isPlaying();
      const playIcon = pc.querySelector(".icon-play");
      const pauseIcon = pc.querySelector(".icon-pause");
      if (playIcon && pauseIcon) {
        playIcon.style.display = isPlaying ? "none" : "block";
        pauseIcon.style.display = isPlaying ? "block" : "none";
      }
      pc.querySelector(".PlayStateToggle")?.classList.toggle("Playing", isPlaying);
      updatePlayModeUI(pc);
    }

    // 1. Re-parent Timeline & PlaybackControls into NowBar Header in correct order
    if (header && tl && tl.parentElement !== header) {
      if (pc && pc.parentElement === header) {
        header.insertBefore(tl, pc);
      } else {
        header.appendChild(tl);
      }
    }
    if (header && pc && pc.parentElement !== header) {
      header.appendChild(pc);
    }

    // Suppress tooltips on PlaybackControls
    if (pc) {
      pc.querySelectorAll("button, .PlaybackControl").forEach((b) => {
        b.removeAttribute("title");
        b.removeAttribute("data-tooltip");
      });
    }

    // 2. ViewControls top-right capsule & button filtering
    const vc = page.querySelector(".ViewControls");
    if (!vc) return;

    // Inject or update NowBarToggle button
    let nbToggle = vc.querySelector("#NowBarToggle");
    if (!nbToggle) {
      nbToggle = document.createElement("button");
      nbToggle.id = "NowBarToggle";
      nbToggle.className = "ViewControl";
      nbToggle.innerHTML = `<svg class="NoFill" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2.5"/><rect x="6" y="7.5" width="6" height="6" rx="1"/><path d="M14.5 9h3.5"/><path d="M14.5 12h3.5"/><path d="M6.5 17h11"/></svg>`;
      nbToggle.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleNowBarPictureMode();
      });
      const sideToggle = vc.querySelector("#NowBarSideToggle");
      if (sideToggle) {
        vc.insertBefore(nbToggle, sideToggle);
      } else {
        const settings = vc.querySelector("#SettingsToggle");
        if (settings) {
          vc.insertBefore(nbToggle, settings);
        } else {
          vc.appendChild(nbToggle);
        }
      }
    }

    // Control bar placement: always keep floating at top right
    const contentBox = page.querySelector(".ContentBox") || page;
    if (contentBox && vc.parentElement !== contentBox) {
      contentBox.appendChild(vc);
    }

    // Cancel Settings and Compact Mode toggles (Keep interface ultra-clean)
    const settingsBtn = vc.querySelector("#SettingsToggle");
    if (settingsBtn) {
      settingsBtn.style.setProperty("display", "none", "important");
    }
    const compactBtn = vc.querySelector("#CompactModeToggle");
    if (compactBtn) {
      compactBtn.style.setProperty("display", "none", "important");
    }

    // Replace Japanese "な" icon with Apple-style bilingual translation / phonetics icon
    const romBtn = vc.querySelector("#RomanizationToggle");
    if (romBtn) {
      const appleTransSvg = `<svg class="NoFill" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>`;
      if (romBtn.innerHTML !== appleTransSvg) {
        romBtn.innerHTML = appleTransSvg;
      }
    }

    // Completely remove all tooltip attributes and tippy instances from capsule buttons
    vc.querySelectorAll("button, .ViewControl").forEach((btn) => {
      btn.removeAttribute("title");
      btn.removeAttribute("data-tooltip");
      if (btn._tippy) {
        try {
          btn._tippy.destroy();
        } catch (e) {
          btn._tippy.disable();
        }
      }
    });
  }

  // Observer for SpicyLyrics elements & Settings Modal translations
  const spicyObserver = new MutationObserver((mutations) => {
    let relevant = false;
    for (let i = 0; i < mutations.length; i++) {
      const m = mutations[i];
      if (m.target && (
        m.target.id === "SpicyLyricsPage" ||
        m.target.classList?.contains("ViewControls") ||
        m.target.classList?.contains("MediaContent") ||
        m.target.classList?.contains("MediaBox") ||
        m.target.classList?.contains("NowBar") ||
        m.target.classList?.contains("Header") ||
        m.target.classList?.contains("PlaybackControls") ||
        m.target.tagName === "SL-GENERIC-MODAL"
      )) {
        relevant = true;
        break;
      }
      for (let j = 0; j < m.addedNodes.length; j++) {
        const node = m.addedNodes[j];
        if (node.nodeType === 1 && (
          node.id === "SpicyLyricsPage" ||
          node.tagName === "SL-GENERIC-MODAL" ||
          node.classList?.contains("SpicyLyricsModal") ||
          node.classList?.contains("PlaybackControls") ||
          node.classList?.contains("MediaBox") ||
          node.classList?.contains("NowBar")
        )) {
          relevant = true;
          break;
        }
      }
      if (relevant) break;
    }
    if (!relevant) return;

    if (!syncScheduled) {
      syncScheduled = true;
      requestAnimationFrame(() => {
        syncScheduled = false;
        syncSpicyControls();
        const modal = document.querySelector("sl-generic-modal.SpicyLyricsModal");
        if (modal) {
          translateSpicyModal(modal);
        }
      });
    }
  });
  spicyObserver.observe(document.body, { childList: true, subtree: true });


  // Window Resize Zero-Lag Engine (No DOM style recalculation storms)
  function setupWindowResizeEngine() {
    // Zoom is locked to 1 in CSS root; no dynamic resize listeners needed.
  }

  setupWindowResizeEngine();

  function waitForElement(elements, func, timeout = 100) {
    const queries = elements.map((element) => document.querySelector(element));
    if (queries.every((a) => a)) {
      func(queries);
    } else if (timeout > 0) {
      setTimeout(waitForElement, 300, elements, func, timeout - 1);
    }
  }

  waitForElement(
    [".Root__globalNav"],
    (element) => {
      const isCenteredGlobalNav = Spicetify.Platform.version >= "1.2.46.462";
      let addedClass = "control-nav";
      if (element?.[0]?.classList.contains("Root__globalNav"))
        addedClass = isCenteredGlobalNav ? "global-nav-centered" : "global-nav";
      document.body.classList.add(addedClass);
    },
    10000
  );

  Spicetify.Platform.History.listen(updateLyricsPageProperties);

  waitForElement([".Root__lyrics-cinema"], ([lyricsCinema]) => {
    const lyricsCinemaObserver = new MutationObserver(
      updateLyricsPageProperties
    );
    const lyricsCinemaObserverConfig = {
      attributes: true,
      attributeFilter: ["class"],
    };
    lyricsCinemaObserver.observe(lyricsCinema, lyricsCinemaObserverConfig);
  });

  waitForElement([".main-view-container"], ([mainViewContainer]) => {
    const mainViewContainerResizeObserver = new ResizeObserver(() => {
      if (!document.querySelector(".Root__lyrics-cinema, .lyrics-lyrics-contentWrapper")) return;
      updateLyricsPageProperties();
    });
    mainViewContainerResizeObserver.observe(mainViewContainer);
  });

  // Fixes container shifting & active line clipping
  // Taken from Bloom | https://github.com/nimsandu/spicetify-bloom
  function updateLyricsPageProperties() {
    function setLyricsPageProperties() {
      function calculateLyricsMaxWidth(lyricsContentWrapper) {
        const lyricsContentContainer = lyricsContentWrapper.parentElement;
        const marginLeft = Number.parseInt(
          window.getComputedStyle(lyricsContentWrapper).marginLeft,
          10
        );
        const totalOffset = lyricsContentWrapper.offsetLeft + marginLeft;
        return Math.round(
          0.95 * (lyricsContentContainer.clientWidth - totalOffset)
        );
      }

      waitForElement(
        [".lyrics-lyrics-contentWrapper"],
        ([lyricsContentWrapper]) => {
          lyricsContentWrapper.style.maxWidth = "";
          lyricsContentWrapper.style.width = "";

          // 0, 1 - blank lines
          const lyric = document.querySelectorAll(
            ".lyrics-lyricsContent-lyric"
          )[2];
          document.documentElement.style.setProperty(
            "--lyrics-text-direction",
            /[\u0591-\u07FF]/.test(lyric?.innerText ?? "") ? "right" : "left"
          );

          document.documentElement.style.setProperty(
            "--lyrics-active-max-width",
            `${calculateLyricsMaxWidth(lyricsContentWrapper)}px`
          );

          // Lock lyrics wrapper width
          const lyricsWrapperWidth =
            lyricsContentWrapper.getBoundingClientRect().width;
          lyricsContentWrapper.style.maxWidth = `${lyricsWrapperWidth}px`;
          lyricsContentWrapper.style.width = `${lyricsWrapperWidth}px`;
        }
      );
    }

    function lyricsCallback(mutationsList, lyricsObserver) {
      for (const mutation of mutationsList)
        for (addedNode of mutation.addedNodes)
          if (addedNode.classList?.contains("lyrics-lyricsContent-provider"))
            setLyricsPageProperties();
      lyricsObserver.disconnect;
    }

    waitForElement(
      [".lyrics-lyricsContent-provider"],
      ([lyricsContentProvider]) => {
        setLyricsPageProperties();
        const lyricsObserver = new MutationObserver(lyricsCallback);
        lyricsObserver.observe(lyricsContentProvider.parentElement, {
          childList: true,
        });
      }
    );
  }

  function setFadeDirection(scrollNode) {
    let fadeDirection = "full";
    if (scrollNode.scrollTop <= 0) {
      fadeDirection = "bottom";
    } else if (
      Math.abs(
        scrollNode.scrollHeight -
          scrollNode.scrollTop -
          scrollNode.clientHeight
      ) <= 2
    ) {
      fadeDirection = "top";
    }
    if (scrollNode.getAttribute("fade") !== fadeDirection) {
      scrollNode.setAttribute("fade", fadeDirection);
    }
  }

  // Add fade and dimness effects to mainview and the artist image on scroll
  // Taken from Galaxy | https://github.com/harbassan/spicetify-galaxy/
  function galaxyFade() {
    // Apply artist fade function
    const applyArtistFade = (scrollNode) => {
      const scrollValue = scrollNode.scrollTop || 0;
      const fadeValue = Math.max(0, (-0.35 * scrollValue + 100) / 100);
      document.documentElement.style.setProperty("--artist-fade", fadeValue);
      document.documentElement.style.setProperty("--header-scroll-y", scrollValue + "px");
    };

    let ticking = false;
    // Capture scroll on window so SPA navigation / component replacement never breaks scroll observation
    window.addEventListener(
      "scroll",
      (event) => {
        if (document.querySelector("#SpicyLyricsPage.Fullscreen")) return;
        const target = event.target;
        if (!target || target === document || target === window) return;

        const scrollNode =
          (target.classList?.contains("main-view-container__scroll-node") || target.hasAttribute?.("data-overlayscrollbars-viewport"))
            ? target
            : target.closest?.(".main-view-container__scroll-node") || target.closest?.(".Root__main-view");

        if (scrollNode) {
          if (!ticking) {
            window.requestAnimationFrame(() => {
              applyArtistFade(scrollNode);
              setFadeDirection(scrollNode);
              ticking = false;
            });
            ticking = true;
          }
        }
      },
      true
    );

    // Reset fade & scroll on SPA navigation
    if (Spicetify.Platform?.History?.listen) {
      Spicetify.Platform.History.listen(() => {
        document.documentElement.style.setProperty("--artist-fade", 1);
        document.documentElement.style.setProperty("--header-scroll-y", "0px");
        setTimeout(() => {
          const node =
            document.querySelector(".main-view-container__scroll-node > div") ||
            document.querySelector(".main-view-container__scroll-node") ||
            document.querySelector(".Root__main-view [data-overlayscrollbars-viewport]");
          if (node) {
            applyArtistFade(node);
            setFadeDirection(node);
          }
        }, 150);
      });
    }

    // Nav bar - fade direction only
    waitForElement(
      [".Root__nav-bar [data-overlayscrollbars-viewport], .Root__nav-bar [style*='overflow']"],
      ([scrollNode]) => {
        scrollNode.setAttribute("fade", "bottom");
        setFadeDirection(scrollNode);
      }
    );
    // Right sidebar - fade direction only
    waitForElement(
      [".Root__right-sidebar [data-overlayscrollbars-viewport], .Root__right-sidebar [style*='overflow']"],
      ([scrollNode]) => {
        scrollNode.setAttribute("fade", "bottom");
        setFadeDirection(scrollNode);
      }
    );
  }

  function loadToggles() {
    toggles.UseCustomBackground = JSON.parse(
      localStorage.getItem("UseCustomBackground")
    );
    toggles.UseCustomColor = JSON.parse(localStorage.getItem("UseCustomColor"));
    toggles.HideNowPlayingSidebar = JSON.parse(localStorage.getItem("HideNowPlayingSidebar"));

    if (toggles.HideNowPlayingSidebar) {
      document.body.classList.add("__hazy_hidenowplayingsidebar");
    }
    else {
      document.body.classList.remove("__hazy_hidenowplayingsidebar");
    }

    onSongChange();
  }

  // Input for custom background images (disabled until properly implemented)
  /* const bannerInput = document.createElement("input");
  bannerInput.type = "file";
  bannerInput.className = "banner-input";
  bannerInput.accept = [
    "image/jpeg",
    "image/apng",
    "image/avif",
    "image/gif",
    "image/png",
    "image/svg+xml",
    "image/webp",
  ].join(",");

  // When user selects a custom background image
  bannerInput.onchange = () => {
    if (!bannerInput.files.length) return;

    const file = bannerInput.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target.result;
      const [, , uid] = Spicetify.Platform.History.location.pathname.split("/");
      if (!uid) {
        try {
          localStorage.setItem("hazy:startupBg", result);
        } catch {
          Spicetify.showNotification("File too large");
          return;
        }
        document.querySelector("#home-select img").src = result;
      }
    };
    reader.readAsDataURL(file);
  }; */

  // Clean User Avatar Context Menu (Keep only Profile, Settings, and Log Out)
  const menuObserver = new MutationObserver((mutations) => {
    let hasMenu = false;
    for (let i = 0; i < mutations.length; i++) {
      const m = mutations[i];
      for (let j = 0; j < m.addedNodes.length; j++) {
        const node = m.addedNodes[j];
        if (node.nodeType === 1 && (node.getAttribute?.("role") === "menu" || node.querySelector?.('[role="menu"]'))) {
          hasMenu = true;
          break;
        }
      }
      if (hasMenu) break;
    }
    if (!hasMenu) return;

    const menus = document.querySelectorAll('[role="menu"]');
    if (!menus.length) return;

    const blockedKeywords = [
      "帐号",
      "账号",
      "支持",
      "最近播放",
      "私人点歌房",
      "Spicy Lyrics",
      "你的更新",
      "更新",
      "Experimental",
      "官方主题",
      "主题宝库",
      "应用商店",
      "Marketplace",
      "Shuffle",
      "Home config",
    ];

    menus.forEach((menu) => {
      Array.from(menu.children).forEach((child) => {
        const text = child.textContent.trim();
        if (blockedKeywords.some((kw) => text.includes(kw))) {
          child.style.setProperty("display", "none", "important");
        }
      });
    });
  });

  menuObserver.observe(document.body, { childList: true, subtree: true });
})();
