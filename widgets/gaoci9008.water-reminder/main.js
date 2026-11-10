// 喝水提醒：到点弹 Windows 通知；点按钮记录（按杯数或按毫升），进度和计数重启也在。
const $ = (id) => document.getElementById(id);
const TAG = "water";
const MIN = 60 * 1000;

let cups = 0;      // 按杯模式：喝了几杯；按毫升模式：累计毫升
let day = "";
let lastDrink = 0;
let timer = null;

function today() {
  return new Date().toDateString();
}

// 免打扰时段内不弹通知（组件画面上的提示照常显示）
function quietNow() {
  const s = String(widget.settings.get("quietStart") || "");
  const e = String(widget.settings.get("quietEnd") || "");
  if (!s || !e) return false;
  const toMin = (t) => { const [h, m] = t.split(":").map(Number); return (h || 0) * 60 + (m || 0); };
  const now = new Date().getHours() * 60 + new Date().getMinutes();
  const a = toMin(s), b = toMin(e);
  return a <= b ? (now >= a && now < b) : (now >= a || now < b); // 跨午夜
}

function intervalMs() {
  const v = Number(widget.settings.get("interval"));
  return (v > 0 ? v : 45) * MIN;
}

const mode = () => (widget.settings.get("mode") === "ml" ? "ml" : "cup");

// 本次点击增加多少（杯数记 1；毫升记每杯毫升数）
function stepAmount() {
  if (mode() === "ml") return Math.max(1, Number(widget.settings.get("cupSize")) || 250);
  return 1;
}

function goal() {
  if (mode() === "ml") return Math.max(1, Number(widget.settings.get("goalMl")) || 2000);
  return Math.max(1, Number(widget.settings.get("goal")) || 8);
}

function fmt(n) {
  return n.toLocaleString(widget.locale);
}

// 提示音：Web Audio 合成一段清脆的「叮咚」，不用音频文件
function chime() {
  if (!widget.settings.get("sound")) return;
  try {
    const ctx = new AudioContext();
    const notes = [[880, 0], [1174.7, 0.18]];   // A5 → D6
    for (const [freq, delay] of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.55);
    }
  } catch (e) { widget.log("chime failed", e); }
}

// 每日补水的好处：每次提醒随机挑一条放进通知
// 二次元风格小贴士：健康知识 + 萌系语气
const TIPS = [
  "喝水能促进新陈代谢，帮助身体排毒～身体轻盈得像要飘起来一样☆",
  "充足的水分让皮肤更水润有光泽，变成发光的美少女✨",
  "补水有助于大脑保持清醒、提升专注力，头脑转得像超算一样快☆",
  "多喝水能润滑关节，减少久坐的僵硬感，身体软软的很舒服～",
  "水分充足可以帮助调节体温，夏天不易中暑，元气满满度过每一天☆",
  "饭前喝点水有助于消化，还能避免吃太多，零食也能吃下更多啦☆",
  "多喝水能预防结石，给肾脏减减负，内脏也要好好疼爱哦～",
  "轻度脱水就会让人疲劳头痛，别等渴了才喝，要像充电一样定时补水☆",
  "喝水能保持呼吸道湿润，嗓子更舒服，唱歌也更动听啦♪",
  "充足水分让血液循环更顺畅，精力更充沛，一整天都活力全开☆",
];
function tip() {
  return TIPS[Math.floor(Math.random() * TIPS.length)];
}

function paint() {
  const g = goal();
  const isMl = mode() === "ml";
  $("cups").textContent = fmt(cups);
  $("goal").textContent = isMl ? `/ ${fmt(g)} 毫升` : `/ ${g} 杯`;
  $("bar").style.width = Math.min(100, (cups / g) * 100) + "%";
  $("drink").textContent = isMl
    ? `喝了 ${stepAmount()} 毫升`
    : "喝水了";

  if (!lastDrink) { $("next").textContent = "—"; return; }
  const left = lastDrink + intervalMs() - Date.now();
  if (left <= 0) {
    $("next").textContent = "该喝水啦！";
    if (!quietNow()) {
      if (!paint._chimed) { paint._chimed = true; chime(); }   // 到点只响一次
      widget.notify({
        title: "喝水提醒 ☆",
        body: (isMl
          ? `今天已 ${fmt(cups)} / ${fmt(g)} 毫升，再喝一口嘛～`
          : `今天已经 ${cups} 杯啦，再喝一杯嘛～`) + `\n💧 ${tip()}`,
        tag: TAG,
      });
    }
  } else {
    const m = Math.ceil(left / MIN);
    $("next").textContent = m >= 60 ? `${Math.floor(m / 60)} 时 ${m % 60} 分后` : `${m} 分后`;
    paint._chimed = false;   // 重新计时后允许下一次到点再响
  }
}

function schedule() {
  // 预约到点通知；FullWidget 计时，页面暂停也准时。每次喝水/改设置都会重新预约。
  const at = lastDrink + intervalMs();
  if (!quietNow() && at > Date.now()) {
    widget.notify({ title: "喝水提醒 ☆", body: `该喝杯水啦，主人～不喝水的话，我会担心你的哦💧\n💧 ${tip()}`, at, tag: TAG });
  } else {
    widget.notify.cancel(TAG);
  }
}

function tick() {
  // 跨天自动清零
  if (day !== today()) { day = today(); cups = 0; widget.storage.set("log", { day, cups }); }
  paint();
}

widget.storage.get("log").then((log) => {
  if (log && log.day === today()) cups = log.cups || 0;
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
  cups += stepAmount();
  lastDrink = Date.now();
  widget.storage.set("log", { day, cups });
  widget.storage.set("last", lastDrink);
  widget.notify.cancel(TAG);   // 喝了就先取消这条
  paint();
  schedule();
});

// 重置今日：清零计数，倒计时重新开始
$("reset").addEventListener("click", () => {
  cups = 0;
  lastDrink = Date.now();
  widget.storage.set("log", { day, cups });
  widget.storage.set("last", lastDrink);
  paint();
  schedule();
});

// 用户在控制中心改了设置（计量方式/目标/间隔/免打扰），立即生效
widget.settings.onChange(() => { paint(); schedule(); });
