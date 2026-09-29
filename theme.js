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
    // Adjust this value to control the "darkness" threshold
    const threshold = 100;
    return brightness < threshold;
  }

  // Checks if a color is too close to white
  function isTooCloseToWhite(rgb) {
    const threshold = 200;
    return rgb.r > threshold && rgb.g > threshold && rgb.b > threshold;
  }

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

  // Track last non-lyrics route to ensure robust back navigation
  let lastNonLyricsRoute = "/";
  if (Spicetify.Platform?.History?.listen) {
    Spicetify.Platform.History.listen((loc) => {
      const p = loc?.pathname || Spicetify.Platform?.History?.location?.pathname;
      if (p && p !== "/lyrics") {
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
        return;
      }
    }
    const fsBtn = document.getElementById("SpicyLyrics_FullscreenButton");
    if (fsBtn) {
      fsBtn.click();
    }
  }

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

  // Suppress all playbar lyrics buttons (including far-right microphone button)
  function hidePlaybarLyricsButtons() {
    const ids = ["SpicyLyrics_FullscreenButton", "SpicyLyrics_PopupLyricsButton", "SpicyLyrics_PageButton"];
    ids.forEach((id) => {
      const btn = document.getElementById(id);
      if (btn && btn.style.display !== "none") {
        btn.style.setProperty("display", "none", "important");
      }
    });
    const nativeBtns = document.querySelectorAll(
      'button[aria-label="歌词"], button[data-testid="lyrics-button"], button.BCyglZU3nRFZ5tXW1Q2Q'
    );
    nativeBtns.forEach((btn) => {
      if (btn && btn.style.display !== "none") {
        btn.style.setProperty("display", "none", "important");
      }
    });
  }
  setInterval(hidePlaybarLyricsButtons, 600);

  // Press ESC to exit fullscreen lyrics
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const page = document.getElementById("SpicyLyricsPage");
      if (page && page.classList.contains("Fullscreen")) {
        toggleAppleMusicFullscreen();
      }
    }
  });

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
    window.dispatchEvent(new Event("resize"));
  }

  let syncScheduled = false;
  function syncSpicyControls() {
    const page = document.getElementById("SpicyLyricsPage");
    if (!page) return;
    const vc = page.querySelector(".ViewControls");
    if (!vc) return;

    const nowBar = page.querySelector(".NowBar");
    const isNowBarOpen = nowBar && nowBar.classList.contains("Active") && !page.classList.contains("NowBarStatus__Closed");
    const isCompact = page.classList.contains("CompactMode") || page.classList.contains("ForcedCompactMode");

    // 1. Inject or update NowBarToggle button
    let nbToggle = vc.querySelector("#NowBarToggle");
    if (!nbToggle) {
      nbToggle = document.createElement("button");
      nbToggle.id = "NowBarToggle";
      nbToggle.className = "ViewControl";
      nbToggle.setAttribute("data-tooltip", "无图模式 / 切换封面");
      nbToggle.title = "无图模式 / 切换封面";
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

    // 2. Control bar placement: inside album art when open, in ContentBox when closed or compact
    if (isNowBarOpen && !isCompact) {
      const mediaContent = page.querySelector(".ContentBox .NowBar .Header .MediaBox .MediaContent");
      if (mediaContent && vc.parentElement !== mediaContent) {
        mediaContent.appendChild(vc);
      }
    } else {
      const contentBox = page.querySelector(".ContentBox");
      if (contentBox && vc.parentElement !== contentBox) {
        contentBox.appendChild(vc);
      }
    }

    // 3. Natural Chinese Tooltips
    const tooltips = {
      CompactModeToggle: isCompact ? "退出紧凑封面" : "紧凑封面模式",
      NowBarToggle: isNowBarOpen ? "无图模式 (全屏歌词)" : "显示专辑封面",
      NowBarSideToggle: "切换封面左右侧",
      RomanizationToggle: "日语假名 / 罗马音注音",
      SettingsToggle: "歌词设置",
      Close: "退出全屏歌词"
    };
    for (const [id, tip] of Object.entries(tooltips)) {
      const btn = vc.querySelector(`#${id}`);
      if (btn) {
        btn.title = tip;
        btn.setAttribute("data-tooltip", tip);
        if (btn._tippy && typeof btn._tippy.setContent === "function") {
          btn._tippy.setContent(tip);
        }
      }
    }
  }

  // Observer for SpicyLyrics elements & Settings Modal translations
  const spicyObserver = new MutationObserver(() => {
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


  // Window Zoom Variable (Debounced with deadband threshold to prevent resize stutter)
  function updateZoomVariable() {
    let prevZoom = -1;
    let timer = null;

    function calculateAndApplyZoom() {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        const newOuterWidth = window.outerWidth;
        const newInnerWidth = window.innerWidth;
        if (newInnerWidth <= 0) return;
        const zoomFactor = Math.round((newOuterWidth / newInnerWidth) * 100) / 100 || 1;
        if (Math.abs(zoomFactor - prevZoom) >= 0.05) {
          prevZoom = zoomFactor;
          document.documentElement.style.setProperty("--zoom", zoomFactor);
        }
      }, 100);
    }

    calculateAndApplyZoom();
    window.addEventListener("resize", calculateAndApplyZoom, { passive: true });
  }

  updateZoomVariable();

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
    const mainViewContainerResizeObserver = new ResizeObserver(
      updateLyricsPageProperties
    );
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
    if (scrollNode.scrollTop === 0) {
      fadeDirection = "bottom";
    } else if (
      scrollNode.scrollHeight -
        scrollNode.scrollTop -
        scrollNode.clientHeight ===
      0
    ) {
      fadeDirection = "top";
    }
    scrollNode.setAttribute("fade", fadeDirection);
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
        const target = event.target;
        if (!target || target === document || target === window) return;

        const isMainScroll =
          target.closest?.(".main-view-container__scroll-node") ||
          target.classList?.contains("main-view-container__scroll-node") ||
          target.hasAttribute?.("data-overlayscrollbars-viewport") ||
          (target.scrollHeight > target.clientHeight && target.closest?.(".Root__main-view"));

        if (isMainScroll) {
          if (!ticking) {
            window.requestAnimationFrame(() => {
              applyArtistFade(target);
              setFadeDirection(target);
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

  // Create edit home topbar button (Localized in Chinese, clutter-free)
  const homeEdit = new Spicetify.Topbar.Button("主题设置", "edit", () => {
    const content = document.createElement("div");
    content.classList.add("hazy-settings-container");
    content.style.padding = "10px 4px";
    content.style.display = "flex";
    content.style.flexDirection = "column";
    content.style.gap = "10px";

    function createToggle(opt) {
      let { id, name, defVal } = opt;
      const toggleRow = document.createElement("div");
      toggleRow.classList.add("hazyOptionRow");
      toggleRow.innerHTML = `
      <span class="hazyOptionDesc">${name}:</span>
      <button class="hazyOptionToggle" aria-label="${name}">
        <span class="toggleWrapper">
          <span class="toggle"></span>
        </span>
      </button>`;
      toggleRow.setAttribute("name", id);
      toggleRow
        .querySelector("button")
        .addEventListener("click", () =>
          toggleRow.querySelector(".toggle").classList.toggle("enabled")
        );
      const isEnabled = JSON.parse(localStorage.getItem(id)) ?? defVal;
      toggleRow.querySelector(".toggle").classList.toggle("enabled", isEnabled);
      content.append(toggleRow);
    }

    function createSlider(opt) {
      let { id, name, min, max, step, defVal, end } = opt;
      const val = localStorage.getItem(`${id}Amount`) || defVal;
      const slider = document.createElement("div");
      slider.classList.add("hazyOptionRow");
      slider.innerHTML = `
      <div class="slider-container">
        <label for="${id}-input">${name}:</label>
        <input class="slider" id="${id}-input" type="range" min="${min}" max="${max}" step="${step}" value="${val}">
        <div class="slider-value">
          <p id="${id}-value" contenteditable="true">${val}${end || "%"}</p>
        </div>
      </div>`;
      slider.querySelector(`#${id}-value`).addEventListener("input", () => {
        let text = slider.querySelector(`#${id}-value`).textContent.trim();
        const number = Number.parseInt(text);
        if (text.length > 4) {
          text = slider.querySelector(`#${id}-value`).textContent = text.slice(0, 4);
        }
        if (!isNaN(number)) {
          slider.querySelector(`#${id}-input`).value = number;
        }
      });
      slider.querySelector(`#${id}-input`).addEventListener("input", () => {
        slider.querySelector(`#${id}-value`).textContent = `${
          slider.querySelector(`#${id}-input`).value
        }${opt.end || "%"}`;
      });
      content.append(slider);
    }

    // 1. Toggles (启用自定义背景图 / 启用自定义主题色 / 隐藏正在播放侧边栏)
    toggleInfo.forEach(createToggle);

    // 2. Custom Background URL Input (No author dummy preview image)
    const bgRow = document.createElement("div");
    bgRow.classList.add("hazyOptionRow");
    bgRow.style.flexDirection = "column";
    bgRow.style.alignItems = "stretch";
    bgRow.style.gap = "6px";
    bgRow.style.paddingTop = "10px";

    const bgLabel = document.createElement("label");
    bgLabel.htmlFor = "src-input";
    bgLabel.textContent = "自定义背景图片链接 (URL):";
    bgLabel.style.fontSize = "0.875rem";
    bgLabel.style.color = "rgba(255, 255, 255, 0.85)";

    const srcInput = document.createElement("input");
    srcInput.type = "text";
    srcInput.classList.add(
      "main-playlistEditDetailsModal-textElement",
      "main-playlistEditDetailsModal-titleInput"
    );
    srcInput.id = "src-input";
    srcInput.placeholder = "请输入图片直链 (URL)...";
    if (startImage && !startImage.startsWith("data:image")) {
      srcInput.value = startImage;
    }
    bgRow.append(bgLabel, srcInput);
    content.append(bgRow);

    // 3. Custom Accent Color Picker
    const colorRow = document.createElement("div");
    colorRow.classList.add("hazyOptionRow");

    const colorLabel = document.createElement("label");
    colorLabel.id = "color-label";
    colorLabel.htmlFor = "color-input";
    colorLabel.textContent = "自定义强调色:";
    colorLabel.style.fontSize = "0.875rem";
    colorLabel.style.marginRight = "10px";

    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.id = "color-input";
    colorInput.value = localStorage.getItem("CustomColor") || "#30bf63";
    colorInput.style.border = "none";
    colorInput.style.borderRadius = "4px";
    colorInput.style.cursor = "pointer";
    colorInput.style.height = "28px";
    colorInput.style.width = "42px";
    colorInput.style.padding = "0";

    colorRow.append(colorLabel, colorInput);
    content.append(colorRow);

    // 4. Sliders (背景模糊度 / 对比度 / 饱和度 / 明亮度)
    sliders.forEach(createSlider);
    loadSliders();

    // 5. Buttons Row (Reset & Apply, NO author issue link, NO external link)
    const buttonsRow = document.createElement("div");
    buttonsRow.style.display = "flex";
    buttonsRow.style.paddingTop = "18px";
    buttonsRow.style.justifyContent = "flex-end";
    buttonsRow.style.gap = "12px";

    const resetButton = document.createElement("button");
    resetButton.id = "value-reset";
    resetButton.innerHTML = "恢复默认";

    const saveButton = document.createElement("button");
    saveButton.id = "home-save";
    saveButton.innerHTML = "应用设置";

    saveButton.onclick = async () => {
      if (srcInput.value && !URL.canParse(srcInput.value)) {
        saveButton.innerHTML = "链接格式无效";
        saveButton.classList.add("applyfailed");
        saveButton.disabled = true;

        setTimeout(() => {
          saveButton.innerHTML = "应用设置";
          saveButton.classList.remove("applyfailed");
          saveButton.disabled = false;
        }, 2000);
        return;
      }

      saveButton.innerHTML = "已保存应用";
      saveButton.classList.add("applied");
      saveButton.disabled = true;

      setTimeout(() => {
        saveButton.innerHTML = "应用设置";
        saveButton.classList.remove("applied");
        saveButton.disabled = false;
      }, 1200);

      if (srcInput.value) {
        startImage = srcInput.value;
        localStorage.setItem("hazy:startupBg", startImage);
      }

      localStorage.setItem("CustomColor", colorInput.value);

      toggleInfo.forEach((opt) =>
        localStorage.setItem(
          opt.id,
          document
            .querySelector(`.hazyOptionRow[name=${opt.id}] .toggle`)
            ?.classList.contains("enabled") ?? opt.defVal
        )
      );
      sliders.forEach((opt) => {
        const sliderInput = document.querySelector(`.hazyOptionRow #${opt.id}-input`);
        if (sliderInput) {
          localStorage.setItem(opt.id + "Amount", sliderInput.value);
        }
      });

      loadSliders();
      loadToggles();
    };

    resetButton.onclick = () => {
      sliders.forEach((opt) => {
        const inp = document.querySelector(`.hazyOptionRow #${opt.id}-input`);
        const val = document.querySelector(`.hazyOptionRow #${opt.id}-value`);
        if (inp) inp.value = opt.defVal;
        if (val) val.textContent = `${opt.defVal}${opt.end || "%"}`;
      });
      toggleInfo.forEach((opt) => {
        const t = document.querySelector(`.hazyOptionRow[name=${opt.id}] .toggle`);
        if (t) t.classList.toggle("enabled", opt.defVal);
      });
      srcInput.value = defImage;
      colorInput.value = "#30bf63";
    };

    buttonsRow.append(resetButton, saveButton);
    content.append(buttonsRow);

    Spicetify.PopupModal.display({ title: "主题个性化设置", content });
  });

  homeEdit.element.classList.toggle("hidden", false);
  homeEdit.element.setAttribute("title", "主题设置");
  homeEdit.element.setAttribute("aria-label", "主题设置");
})();
