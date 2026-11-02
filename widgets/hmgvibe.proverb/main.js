const $ = (id) => document.getElementById(id);
const t = widget.t;
let opts = widget.settings.get();
const zh = widget.locale.startsWith("zh");
const simplified = zh && /CN|SG|Hans/.test(widget.locale);
const list = zh ? SAYINGS.zh : SAYINGS.en;
let offset = 0; // clicks since midnight

const dayNumber = () => { const d = new Date(); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); };

async function show() {
  let [text, source] = list[(((dayNumber() + offset) % list.length) + list.length) % list.length];
  if (simplified) {
    [text, source] = await Promise.all([widget.convertChinese(text, "simplified"), widget.convertChinese(source, "simplified")]);
    text = text.replace(/於/g, "于"); // Windows' table keeps 於
  }
  $("text").textContent = text;
  $("src").textContent = source;
  $("src").hidden = !opts.source;
  fit();
}

/** The largest size at which the saying fits. */
function fit() {
  const el = $("text"), box = $("q");
  el.style.fontSize = "";
  let lo = 11, hi = 64;
  while (hi - lo > 0.5) {
    const mid = (lo + hi) / 2;
    el.style.fontSize = `${mid}px`;
    if (box.scrollHeight <= box.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1) lo = mid; else hi = mid;
  }
  el.style.fontSize = `${Math.floor(lo)}px`;
}

$("q").addEventListener("click", () => { offset++; show(); });
$("q").title = t({ "zh-TW": "點一下換一句", "zh-CN": "点一下换一句", en: "Click for another" });
widget.settings.onChange((o) => { opts = o; show(); });
new ResizeObserver(() => requestAnimationFrame(fit)).observe($("q"));

// a new saying after midnight
function atMidnight() {
  const now = new Date(), next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
  setTimeout(() => { offset = 0; show(); atMidnight(); }, next - now);
}
atMidnight();
document.fonts.ready.then(show);
