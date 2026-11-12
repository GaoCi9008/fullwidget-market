// 喝水提醒：到点弹 Windows 通知；点按钮记录（按杯数或按毫升），进度和计数重启也在。
// 计数统一用毫升保存，切换「按杯数 / 按毫升」不会混算。
const $ = (id) => document.getElementById(id);
const TAG = "water";
const MIN = 60 * 1000;

let ml = 0;        // 今天累计喝了多少毫升
let day = "";
let lastDrink = 0;
let timer = null;

function today() {
  return new Date().toDateString();
}

function toMin(t) {
  const [h, m] = String(t || "").split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

// 免打扰时段；开始和结束相同、或填得不对，就当没有免打扰
function quietRange() {
  const a = toMin(widget.settings.get("quietStart"));
  const b = toMin(widget.settings.get("quietEnd"));
  if (a === null || b === null || a === b) return null;
  return { a, b };
}

// 某个时刻是否在免打扰时段内（支持跨午夜）
function quietAt(ms) {
  const r = quietRange();
  if (!r) return false;
  const d = new Date(ms);
  const now = d.getHours() * 60 + d.getMinutes();
  return r.a <= r.b ? (now >= r.a && now < r.b) : (now >= r.a || now < r.b);
}

function quietNow() {
  return quietAt(Date.now());
}

// ms 所在的免打扰时段结束后（含）最近的那一刻
function quietEndAfter(ms) {
  const r = quietRange();
  if (!r) return ms;
  const d = new Date(ms);
  d.setHours(Math.floor(r.b / 60), r.b % 60, 0, 0);
  if (d.getTime() <= ms) d.setDate(d.getDate() + 1);
  return d.getTime();
}

function intervalMs() {
  const v = Number(widget.settings.get("interval"));
  return (v > 0 ? v : 45) * MIN;
}

const mode = () => (widget.settings.get("mode") === "ml" ? "ml" : "cup");

// 一杯多少毫升（两种模式共用同一个步长）
function cupMl() {
  return Math.max(1, Number(widget.settings.get("cupSize")) || 250);
}

// 今日目标，统一换算成毫升
function goalMl() {
  if (mode() === "ml") return Math.max(1, Number(widget.settings.get("goalMl")) || 2000);
  return Math.max(1, Number(widget.settings.get("goal")) || 8) * cupMl();
}

function fmt(n) {
  return n.toLocaleString(widget.locale);
}

// 毫升换算成杯数显示（可能带一位小数）
function fmtCups() {
  return (ml / cupMl()).toLocaleString(widget.locale, { maximumFractionDigits: 1 });
}

// 每日补水的好处：每次提醒随机挑一条放进通知
// 二次元风格小贴士：健康知识 + 萌系语气
const TIPS = [
  "喝水能促进新陈代谢，帮助身体排毒～身体轻盈得像要飘起来一样☆",
  "充足的水分让皮肤更水润有光泽，变成发光的美少女✨",
  "补水有助于大脑保持清醒、提升专注力，头脑转得像超算一样快☆",
  "多喝水能润滑关节，减少久坐的僵硬感，身体软软的很舒服～",
  "水分充足可以帮助调节体温，夏天不易中暑，元气满满度过每一天☆",
  "饭前喝点水有助于消化，也能避免正餐吃过量，身材也更好保持啦☆",
  "多喝水能预防结石，给肾脏减减负，内脏也要好好疼爱哦～",
  "轻度脱水就会让人疲劳头痛，别等渴了才喝，要像充电一样定时补水☆",
  "喝水能保持呼吸道湿润，嗓子更舒服，唱歌也更动听啦♪",
  "充足水分让血液循环更顺畅，精力更充沛，一整天都活力全开☆",
];
function tip() {
  return TIPS[Math.floor(Math.random() * TIPS.length)];
}

function paint() {
  const isMl = mode() === "ml";
  const g = goalMl();
  $("cups").textContent = isMl ? fmt(ml) : fmtCups();
  $("goal").textContent = isMl ? `/ ${fmt(g)} 毫升` : `/ ${fmt(g / cupMl())} 杯`;
  $("bar").style.width = Math.min(100, (ml / g) * 100) + "%";
  $("drink").textContent = isMl ? `+${fmt(cupMl())} 毫升` : "喝水了";

  if (!lastDrink) { $("next").textContent = "—"; return; }
  const left = lastDrink + intervalMs() - Date.now();
  if (left <= 0) {
    $("next").textContent = "该喝水啦！";
    if (!quietNow()) {
      // 到点只弹一次通知：每 30 秒刷新会重复进这里，弹过或已预约过都不再弹
      if (!paint._notified && !paint._scheduled) {
        paint._notified = true;
        widget.notify({
          title: "喝水提醒 ☆",
          body: (isMl
            ? `今天已 ${fmt(ml)} / ${fmt(g)} 毫升，再喝一口嘛～`
            : `今天已经 ${fmtCups()} 杯啦，再喝一杯嘛～`) + `\n💧 ${tip()}`,
          tag: TAG,
        });
      }
    }
  } else {
    const m = Math.ceil(left / MIN);
    $("next").textContent = m >= 60 ? `${Math.floor(m / 60)} 时 ${m % 60} 分后` : `${m} 分后`;
    paint._notified = false;  // 重新计时后允许下一次到点再弹
  }
}

function schedule() {
  // 预约到点通知；FullWidget 计时，页面暂停也准时。每次喝水/改设置都会重新预约。
  let at = lastDrink + intervalMs();
  // 到点落在免打扰时段里，就顺延到免打扰结束，而不是照样弹
  if (quietAt(at)) at = quietEndAfter(at);

  if (at > Date.now() && !quietAt(at)) {
    paint._scheduled = true;
    widget.notify({ title: "喝水提醒 ☆", body: `该喝杯水啦，主人～不喝水的话，我会担心你的哦💧\n💧 ${tip()}`, at, tag: TAG });
  } else {
    paint._scheduled = false;
    widget.notify.cancel(TAG);
  }
}

function tick() {
  // 跨天自动清零
  if (day !== today()) { day = today(); ml = 0; widget.storage.set("intake", { day, ml }); }
  paint();
}

widget.storage.get("intake").then((saved) => {
  if (saved && saved.day === today()) ml = Number(saved.ml) || 0;
  day = today();
  return widget.storage.get("last");
}).then((last) => {
  lastDrink = Number(last) || Date.now();
  widget.storage.set("last", lastDrink);
  tick();
  schedule();
  timer = setInterval(tick, 30 * 1000);   // 每 30 秒刷新一次画面（跨天清零、倒计时）
});

$("drink").addEventListener("click", () => {
  ml += cupMl();
  lastDrink = Date.now();
  widget.storage.set("intake", { day, ml });
  widget.storage.set("last", lastDrink);
  widget.notify.cancel(TAG);   // 喝了就先取消这条
  paint();
  schedule();
});

// 重置今日：清零计数，倒计时重新开始
$("reset").addEventListener("click", () => {
  ml = 0;
  lastDrink = Date.now();
  widget.storage.set("intake", { day, ml });
  widget.storage.set("last", lastDrink);
  paint();
  schedule();
});

// 用户在控制中心改了设置（计量方式/目标/间隔/免打扰），立即生效
widget.settings.onChange(() => { paint(); schedule(); });
