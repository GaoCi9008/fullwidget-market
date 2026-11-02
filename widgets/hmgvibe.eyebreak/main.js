const $ = (id) => document.getElementById(id);
const t = widget.t;
let opts = widget.settings.get();
// { mode: "work" | "rest" | "paused", until: ms (work/rest end), left: ms left when paused }
let s = { mode: "work", until: 0, left: 0 };
let tick = 0;

const minutes = () => (Number(opts.interval) || 20) * 60e3;
const restMs = () => (Number(opts.rest) || 20) * 1000;
const clock = (ms) => { const x = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(x / 60)}:${String(x % 60).padStart(2, "0")}`; };
const hhmm = (ms) => new Intl.DateTimeFormat(widget.locale, { hour: "2-digit", minute: "2-digit" }).format(ms);

function save() { widget.storage.set("state", s); }

/** The Windows notification is booked with FullWidget, so it comes even if this widget is hidden. */
function book() {
  widget.notify.cancel("break").catch(() => {});
  if (s.mode !== "work") return;
  widget.notify({
    tag: "break", at: s.until,
    title: t({ "zh-TW": "讓眼睛休息一下", "zh-CN": "让眼睛休息一下", en: "Rest your eyes" }),
    body: t({ "zh-TW": `看向 6 公尺外的地方 ${opts.rest || 20} 秒。`, "zh-CN": `看向 6 米外的地方 ${opts.rest || 20} 秒。`, en: `Look at something 20 feet away for ${opts.rest || 20} seconds.` }),
  }).catch((e) => widget.log(`eyebreak: ${e.message}`));
}

function work() { s = { mode: "work", until: Date.now() + minutes(), left: 0 }; save(); book(); render(); }
function rest() { s = { mode: "rest", until: Date.now() + restMs(), left: 0 }; save(); book(); render(); }

function render() {
  const now = Date.now();
  if (s.mode === "work" && now >= s.until) { rest(); return; }
  if (s.mode === "rest" && now >= s.until) { work(); return; }
  document.body.dataset.mode = s.mode;
  $("main").classList.toggle("is-primary", s.mode === "paused"); // resuming is the thing to do
  const total = s.mode === "rest" ? restMs() : minutes();
  const left = s.mode === "paused" ? s.left : s.until - now;
  $("arc").style.strokeDashoffset = String(100 - Math.max(0, Math.min(1, left / total)) * 100);
  $("time").textContent = s.mode === "rest" ? String(Math.ceil(left / 1000)) : clock(left);
  if (s.mode === "rest") {
    $("label").textContent = t({ "zh-TW": "讓眼睛休息", "zh-CN": "让眼睛休息", en: "Resting your eyes" });
    $("hint").textContent = t({ "zh-TW": "看向 6 公尺外的地方", "zh-CN": "看向 6 米外的地方", en: "Look 20 feet away" });
    $("main").textContent = t({ "zh-TW": "跳過", "zh-CN": "跳过", en: "Skip" });
    $("side").hidden = true;
  } else {
    $("label").textContent = s.mode === "paused" ? t({ "zh-TW": "已暫停", "zh-CN": "已暂停", en: "Paused" }) : t({ "zh-TW": "下次休息", "zh-CN": "下次休息", en: "Next break" });
    $("hint").textContent = s.mode === "paused" ? "" : t({ "zh-TW": `${hhmm(s.until)} 提醒你`, "zh-CN": `${hhmm(s.until)} 提醒你`, en: `at ${hhmm(s.until)}` });
    $("main").textContent = s.mode === "paused" ? t({ "zh-TW": "繼續", "zh-CN": "继续", en: "Resume" }) : t({ "zh-TW": "暫停", "zh-CN": "暂停", en: "Pause" });
    $("side").textContent = t({ "zh-TW": "現在休息", "zh-CN": "现在休息", en: "Rest now" });
    $("side").hidden = false;
  }
}

$("main").onclick = () => {
  if (s.mode === "rest") work();
  else if (s.mode === "paused") { s = { mode: "work", until: Date.now() + s.left, left: 0 }; save(); book(); render(); }
  else { s = { mode: "paused", until: 0, left: Math.max(0, s.until - Date.now()) }; save(); book(); render(); }
};
$("side").onclick = rest;

widget.settings.onChange((o) => {
  const changed = o.interval !== opts.interval;
  opts = o;
  if (changed && s.mode === "work") work(); else render();
});

// one update a second, only while the widget can be seen
function run() { clearInterval(tick); if (!document.hidden) tick = setInterval(render, 1000); render(); }
document.addEventListener("visibilitychange", run);

(async () => {
  const saved = await widget.storage.get("state");
  if (saved && saved.mode === "paused") s = saved;
  else if (saved && saved.mode === "work" && saved.until > Date.now() && saved.until - Date.now() <= minutes()) s = saved;
  else { work(); return run(); }
  book();
  run();
})();
