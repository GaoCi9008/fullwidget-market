// DeskWidgets 組件市場: reads index.json (built by scripts/build.mjs) and shows it.
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// The GitHub repository behind this site: <owner>.github.io/<repo>/ → github.com/<owner>/<repo>
const REPO = (() => {
  const m = location.hostname.match(/^([a-z0-9-]+)\.github\.io$/i);
  const repo = location.pathname.split("/").filter(Boolean)[0];
  return m && repo ? `https://github.com/${m[1]}/${repo}` : "https://github.com/hmgvibe/deskwidgets-market";
})();

// ── words ──
const WORDS = {
  "組件市場": ["组件市场", "Widget market"],
  "投稿組件": ["投稿组件", "Submit a widget"],
  "給 DeskWidgets 的桌面組件，由大家投稿": ["给 DeskWidgets 的桌面组件，由大家投稿", "Desktop widgets for DeskWidgets, made by everyone"],
  // [繁, 简, English] where the key is only a name
  "SUB": ["在 DeskWidgets 控制中心的<b>「添加組件 → 線上」</b>一鍵安裝；也可以下載 .dwz 檔案，雙擊安裝。", "在 DeskWidgets 控制中心的<b>「添加组件 → 在线」</b>一键安装；也可以下载 .dwz 文件，双击安装。", "Install in one click from the DeskWidgets Control Center (<b>Add widgets → Online</b>), or download the .dwz file and double-click it."],
  "搜尋組件": ["搜索组件", "Search widgets"],
  "全部": ["全部", "All"],
  "時間": ["时间", "Time"], "天氣": ["天气", "Weather"], "系統": ["系统", "System"], "效率": ["效率", "Productivity"],
  "資訊": ["资讯", "Info"], "媒體與裝飾": ["媒体与装饰", "Media & decor"], "其他": ["其他", "Other"],
  "量被畫出來": ["量被画出来", "Instrument"], "玻璃上的字": ["玻璃上的字", "Type"], "書桌上的紙": ["书桌上的纸", "Paper"],
  "組件由投稿者提供，經過自動檢查和維護者審核。安裝前請看清楚它要的權限。": ["组件由投稿者提供，经过自动检查和维护者审核。安装前请看清楚它要的权限。", "Widgets come from their authors and are checked automatically and by a maintainer. Look at what each one may do before installing it."],
  "如何投稿": ["如何投稿", "How to submit"],
  "回報問題": ["反馈问题", "Report a problem"],
  "正在載入…": ["正在加载…", "Loading…"],
  "暫時打不開組件清單": ["暂时打不开组件列表", "Can't load the widget list right now"],
  "重試": ["重试", "Retry"],
  "沒有符合的組件": ["没有符合的组件", "No widgets match"],
  "還沒有組件，歡迎第一個投稿": ["还没有组件，欢迎第一个投稿", "No widgets yet. Be the first to submit one"],
  "不需要權限": ["不需要权限", "No permissions"],
  "下載 .dwz": ["下载 .dwz", "Download .dwz"],
  "原始碼": ["源代码", "Source"],
  "它可以做什麼": ["它可以做什么", "What it may do"],
  "只顯示自己的內容，不能連網，也讀不到你電腦上的資訊。": ["只显示自己的内容，不能联网，也读不到你电脑上的信息。", "It shows only its own content: no network, and nothing from your PC."],
  "版本": ["版本", "Version"], "大小": ["大小", "Size"], "更新": ["更新", "Updated"], "檔案": ["文件", "Files"], "作者": ["作者", "Author"],
  "INSTALL_HINT": ["在 DeskWidgets 控制中心 →「添加組件」→「線上」可以直接安裝。", "在 DeskWidgets 控制中心 →「添加组件」→「在线」可以直接安装。", "Or install it straight from the DeskWidgets Control Center: Add widgets → Online."],
  "需要 DeskWidgets 1.1.0 以上": ["需要 DeskWidgets 1.1.0 以上", "Needs DeskWidgets 1.1.0 or later"],
  "關閉": ["关闭", "Close"],
  // permissions
  "讀取系統資訊": ["读取系统信息", "Read system info"], "處理器、記憶體、網速、磁碟和電池的使用情況。": ["处理器、内存、网速、磁盘和电池的使用情况。", "CPU, memory, network speed, drives and battery."],
  "顯示通知": ["显示通知", "Show notifications"], "在螢幕角落彈出 Windows 通知。": ["在屏幕角落弹出 Windows 通知。", "Pops up Windows notifications."],
  "調整音量": ["调整音量", "Change the volume"], "讀取和改變系統音量，也可以靜音。": ["读取和改变系统音量，也可以静音。", "Reads and changes the system volume, and can mute it."],
  "讀取和控制正在播放的媒體": ["读取和控制正在播放的媒体", "See and control what's playing"], "看到正在播放的歌名和封面，可以播放、暫停和切換曲目。": ["看到正在播放的歌名和封面，可以播放、暂停和切换曲目。", "Sees what's playing and can play, pause and skip."],
  "打開網址": ["打开网址", "Open links"], "用你的瀏覽器打開網頁或郵件連結。": ["用你的浏览器打开网页或邮件链接。", "Opens web pages or email links in your browser."],
  "打開程式和檔案": ["打开程序和文件", "Open programs and files"], "打開你電腦上的程式、資料夾和檔案。只在你信任這個組件時安裝。": ["打开你电脑上的程序、文件夹和文件。只在你信任这个组件时安装。", "Opens programs, folders and files on your PC. Install it only if you trust it."],
  "連到任何網站": ["连到任何网站", "Reach any website"], "可以和任何網站收發資料。": ["可以和任何网站收发数据。", "May send and receive data with any website."],
  "連到 {h}": ["连到 {h}", "Reach {h}"], "和這個網站收發資料。": ["和这个网站收发数据。", "Sends and receives data with this website."],
  "系統資訊": ["系统信息", "system info"], "通知": ["通知", "notifications"], "音量": ["音量", "volume"], "媒體播放": ["媒体播放", "media"],
  "打開程式": ["打开程序", "open programs"], "任何網站": ["任何网站", "any website"],
};
const LANGS = ["zh-TW", "zh-CN", "en"];
let lang = (() => {
  try { const s = localStorage.getItem("lang"); if (LANGS.includes(s)) return s; } catch { }
  const n = (navigator.language || "en").toLowerCase();
  return n.startsWith("zh") ? (/cn|sg|hans/.test(n) ? "zh-CN" : "zh-TW") : "en";
})();
/** Text in the page's language. Keys are the Traditional Chinese text; WORDS has 简 and English. */
const t = (k, vars) => {
  const w = WORDS[k];
  let s = w && w.length === 3 ? w[LANGS.indexOf(lang)] : lang === "zh-TW" || !w ? k : w[lang === "zh-CN" ? 0 : 1];
  for (const [a, b] of Object.entries(vars || {})) s = s.replace(`{${a}}`, b);
  return s;
};
/** A widget's text in the current language: "x" or { "zh-TW": …, "en": … } */
const pick = (v) => (v && typeof v === "object" ? v[lang] ?? (lang === "zh-CN" ? v["zh-TW"] : null) ?? v.en ?? Object.values(v)[0] ?? "" : v ?? "");

const CATS = [["time", "時間"], ["weather", "天氣"], ["system", "系統"], ["productivity", "效率"], ["info", "資訊"], ["media", "媒體與裝飾"], ["other", "其他"]];
const THEMES = [["instrument", "量被畫出來"], ["type", "玻璃上的字"], ["paper", "書桌上的紙"]];

function permInfo(p) {
  if (p === "system") return { name: t("系統資訊"), title: t("讀取系統資訊"), desc: t("處理器、記憶體、網速、磁碟和電池的使用情況。") };
  if (p === "notify") return { name: t("通知"), title: t("顯示通知"), desc: t("在螢幕角落彈出 Windows 通知。") };
  if (p === "audio") return { name: t("音量"), title: t("調整音量"), desc: t("讀取和改變系統音量，也可以靜音。") };
  if (p === "media") return { name: t("媒體播放"), title: t("讀取和控制正在播放的媒體"), desc: t("看到正在播放的歌名和封面，可以播放、暫停和切換曲目。") };
  if (p === "shell.open") return { name: t("打開網址"), title: t("打開網址"), desc: t("用你的瀏覽器打開網頁或郵件連結。") };
  if (p === "shell.launch") return { name: t("打開程式"), title: t("打開程式和檔案"), desc: t("打開你電腦上的程式、資料夾和檔案。只在你信任這個組件時安裝。"), warn: true };
  const h = p.slice(8);
  if (h === "*") return { name: t("任何網站"), title: t("連到任何網站"), desc: t("可以和任何網站收發資料。"), warn: true };
  return { name: h, title: t("連到 {h}", { h }), desc: t("和這個網站收發資料。") };
}

// ── state ──
let data = null, cat = null, query = "";
let theme = (() => { try { return localStorage.getItem("theme") || "instrument"; } catch { return "instrument"; } })();
const remember = (k, v) => { try { localStorage.setItem(k, v); } catch { } };

/** The preview picture for a widget in the chosen theme and language, falling back like DeskWidgets does. */
function previewOf(w, th = theme) {
  if (!w.preview) return null;
  const want = (thm, l) => w.preview.replace("{theme}", thm).replace("{lang}", l);
  const have = new Set(w.previews || []);
  if (!w.preview.includes("{")) return w.preview;
  for (const c of [want(th, lang), want(th, "en"), want(th, "zh-TW"), ...THEMES.map(([x]) => want(x, lang))]) if (have.has(c)) return c;
  return w.previews && w.previews[0] || null;
}

const kb = (n) => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`);
const day = (iso) => new Intl.DateTimeFormat(lang, { year: "numeric", month: "short", day: "numeric" }).format(new Date(iso));

function permChips(w) {
  if (!w.permissions.length) return `<span class="perm none">${esc(t("不需要權限"))}</span>`;
  return w.permissions.map((p) => { const i = permInfo(p); return `<span class="perm${i.warn ? " warn" : ""}">${esc(i.name)}</span>`; }).join("");
}

function card(w) {
  const img = previewOf(w);
  return `<article class="card" tabindex="0" data-id="${esc(w.id)}">
    <div class="thumb">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : w.icon ? `<img class="icon" src="${esc(w.icon)}" alt="">` : ""}</div>
    <div><h3>${esc(pick(w.name))}</h3><div class="by">${esc(w.author || "—")} · <span class="num">v${esc(w.version)}</span></div></div>
    <p>${esc(pick(w.description))}</p>
    <div class="perms">${permChips(w)}</div>
  </article>`;
}

function render() {
  document.documentElement.lang = lang === "en" ? "en" : lang === "zh-CN" ? "zh-Hans" : "zh-Hant";
  document.title = `DeskWidgets ${t("組件市場")}`;
  $("t-market").textContent = t("組件市場");
  $("t-title").textContent = t("給 DeskWidgets 的桌面組件，由大家投稿");
  $("t-sub").innerHTML = t("SUB");
  $("t-foot").textContent = t("組件由投稿者提供，經過自動檢查和維護者審核。安裝前請看清楚它要的權限。");
  $("l-submit").textContent = t("投稿組件");
  $("f-guide").textContent = t("如何投稿");
  $("f-issues").textContent = t("回報問題");
  $("q").placeholder = t("搜尋組件");
  document.querySelectorAll(".langs button").forEach((b) => b.classList.toggle("on", b.dataset.lang === lang));
  $("themes").innerHTML = THEMES.map(([id, n]) => `<button data-theme="${id}" class="${theme === id ? "on" : ""}">${esc(t(n))}</button>`).join("");

  if (!data) return;
  const all = data.widgets;
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const text = (w) => [w.id, w.author, ...Object.values(typeof w.name === "object" ? w.name : { x: w.name }), ...Object.values(typeof w.description === "object" ? w.description : { x: w.description })].join(" ").toLowerCase();
  const shown = all.filter((w) => (!cat || w.category === cat) && words.every((x) => text(w).includes(x)));
  const cats = CATS.filter(([c]) => all.some((w) => w.category === c));
  $("chips").innerHTML = [[null, "全部", all.length], ...cats.map(([c, n]) => [c, n, all.filter((w) => w.category === c).length])]
    .map(([c, n, k]) => `<button class="chip${cat === c ? " on" : ""}" data-cat="${c || ""}">${esc(t(n))}<span class="num">${k}</span></button>`).join("");
  $("gallery").innerHTML = shown.map(card).join("");
  $("state").innerHTML = !all.length ? `${esc(t("還沒有組件，歡迎第一個投稿"))}<br><a class="btn primary" href="${REPO}/blob/main/CONTRIBUTING.md">${esc(t("投稿組件"))}</a>`
    : shown.length ? "" : esc(t("沒有符合的組件"));
}

function openDetail(id) {
  const w = data && data.widgets.find((x) => x.id === id);
  if (!w) return;
  const shots = THEMES.map(([th, n]) => { const img = previewOf(w, th); return img ? `<figure><div class="thumb"><img src="${esc(img)}" alt=""></div><figcaption>${esc(t(n))}</figcaption></figure>` : ""; }).join("");
  const perms = w.permissions.length ? `<ul class="d-perms">${w.permissions.map((p) => { const i = permInfo(p); return `<li class="${i.warn ? "warn" : ""}"><div><b>${esc(i.title)}</b><span>${esc(i.desc)}</span></div></li>`; }).join("")}</ul>`
    : `<p class="d-hint">${esc(t("只顯示自己的內容，不能連網，也讀不到你電腦上的資訊。"))}</p>`;
  $("detail").innerHTML = `
    <div class="d-head">${w.icon ? `<img src="${esc(w.icon)}" alt="">` : ""}<div><h2>${esc(pick(w.name))}</h2><div class="by">${esc(w.author || "—")} · <span class="num">v${esc(w.version)}</span></div></div>
      <button class="d-close" data-close aria-label="${esc(t("關閉"))}">×</button></div>
    <div class="d-body">
      <p>${esc(pick(w.description))}</p>
      ${shots ? `<div class="shots">${shots}</div>` : ""}
      <div><h3 class="d-label">${esc(t("它可以做什麼"))}</h3>${perms}</div>
      <dl class="facts">
        <div><dt>${esc(t("版本"))}</dt><dd class="num">${esc(w.version)}</dd></div>
        <div><dt>${esc(t("更新"))}</dt><dd>${esc(day(w.updated))}</dd></div>
        <div><dt>${esc(t("大小"))}</dt><dd class="num">${esc(kb(w.bytes))} · ${w.files} ${esc(t("檔案"))}</dd></div>
        <div><dt>SHA-256</dt><dd class="num" title="${esc(w.sha256)}">${esc(w.sha256.slice(0, 16))}…</dd></div>
      </dl>
      <div class="d-actions">
        <a class="btn primary" href="${esc(w.package)}" download><svg viewBox="0 0 24 24"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>${esc(t("下載 .dwz"))}</a>
        <a class="btn" href="${REPO}/tree/main/widgets/${encodeURIComponent(w.id)}" target="_blank" rel="noopener">${esc(t("原始碼"))}</a>
        <span class="d-hint">${esc(t("INSTALL_HINT"))} ${esc(t("需要 DeskWidgets 1.1.0 以上"))}</span>
      </div>
    </div>`;
  if (!$("detail").open) $("detail").showModal();
  history.replaceState(null, "", `#${encodeURIComponent(w.id)}`);
}

async function load() {
  $("state").textContent = t("正在載入…");
  try {
    const r = await fetch("index.json", { cache: "no-cache" });
    if (!r.ok) throw new Error(r.status);
    data = await r.json();
    data.widgets.sort((a, b) => b.updated.localeCompare(a.updated));
    render();
    const id = decodeURIComponent(location.hash.slice(1));
    if (id) openDetail(id);
  } catch {
    $("state").innerHTML = `${esc(t("暫時打不開組件清單"))}<br><button class="btn" id="retry">${esc(t("重試"))}</button>`;
    $("retry").onclick = load;
  }
}

// ── events ──
$("l-repo").href = REPO;
$("l-submit").href = $("f-guide").href = `${REPO}/blob/main/CONTRIBUTING.md`;
$("f-issues").href = `${REPO}/issues`;
$("q").addEventListener("input", (e) => { query = e.target.value; render(); });
document.addEventListener("click", (e) => {
  const l = e.target.closest("[data-lang]");
  if (l) { lang = l.dataset.lang; remember("lang", lang); render(); if ($("detail").open) openDetail(decodeURIComponent(location.hash.slice(1))); return; }
  const th = e.target.closest("[data-theme]");
  if (th) { theme = th.dataset.theme; remember("theme", theme); render(); return; }
  const c = e.target.closest("[data-cat]");
  if (c) { cat = c.dataset.cat || null; render(); return; }
  const k = e.target.closest(".card");
  if (k) { openDetail(k.dataset.id); return; }
  if (e.target.closest("[data-close]") || e.target === $("detail")) $("detail").close();
});
document.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.classList && e.target.classList.contains("card")) openDetail(e.target.dataset.id); });
$("detail").addEventListener("close", () => history.replaceState(null, "", location.pathname + location.search));
render();
load();
