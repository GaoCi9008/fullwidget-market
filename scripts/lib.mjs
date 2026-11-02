// Shared by check.mjs and build.mjs. Plain Node (20+), no packages: nothing to install, nothing
// third-party running in the market's CI.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

export const ROOT = path.resolve(import.meta.dirname, "..");
export const WIDGETS = path.join(ROOT, "widgets");

export const CATEGORIES = ["time", "weather", "system", "productivity", "info", "media"];
const SIMPLE_PERMISSIONS = ["system", "notify", "audio", "media", "shell.open", "shell.launch"];
const ID = /^[a-z0-9][a-z0-9._-]{1,63}$/;
const VERSION = /^\d+\.\d+\.\d+([-+][0-9A-Za-z.-]+)?$/;
const HOST = /^(\*\.)?[a-z0-9-]+(\.[a-z0-9-]+)*(:\d+)?$/;
// a widget is HTML, CSS, JS, pictures, fonts and sounds; anything that runs outside the page is refused
const REFUSED = new Set([".exe", ".dll", ".com", ".bat", ".cmd", ".ps1", ".psm1", ".vbs", ".vbe", ".wsf", ".wsh", ".hta",
  ".msi", ".msp", ".scr", ".cpl", ".sys", ".jar", ".sh", ".lnk", ".url", ".reg", ".inf", ".so", ".dylib", ".appref-ms"]);
export const LIMITS = { bytes: 5 * 1024 * 1024, files: 300 };

/** widget.json may have // comments and trailing commas, as DeskWidgets allows. */
export function parseJsonc(text) {
  text = text.replace(/^﻿/, ""); // a byte-order mark, as Notepad sometimes saves
  let out = "", i = 0, inStr = false;
  while (i < text.length) {
    const c = text[i], n = text[i + 1];
    if (inStr) {
      out += c;
      if (c === "\\") { out += n ?? ""; i += 2; continue; }
      if (c === '"') inStr = false;
      i++;
    } else if (c === '"') { inStr = true; out += c; i++; }
    else if (c === "/" && n === "/") { while (i < text.length && text[i] !== "\n") i++; }
    else if (c === "/" && n === "*") { i += 2; while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i++; i += 2; }
    else { out += c; i++; }
  }
  return JSON.parse(out.replace(/,(\s*[}\]])/g, "$1"));
}

/** Every file of a widget, as paths relative to its folder with "/". Hidden ones are left out. */
export function listFiles(dir) {
  const out = [];
  (function walk(d, rel) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name.startsWith(".") || e.name === "node_modules") continue;
      const p = path.join(d, e.name), r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isSymbolicLink()) out.push({ rel: r, link: true });
      else if (e.isDirectory()) walk(p, r);
      else out.push({ rel: r, bytes: fs.statSync(p).size });
    }
  })(dir, "");
  return out.sort((a, b) => a.rel.localeCompare(b.rel));
}

/** "1.10.0" vs "1.9.2", by numbers. */
export function compareVersions(a, b) {
  const p = (v) => String(v).split(/[-+]/)[0].split(".").map((x) => parseInt(x, 10) || 0);
  const x = p(a), y = p(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] || 0) - (y[i] || 0);
    if (d) return Math.sign(d);
  }
  return 0;
}

const pick = (v) => (v && typeof v === "object" ? v["zh-TW"] || v.en || v["zh-CN"] || Object.values(v)[0] : v);

/**
 * Reviews one widget folder. Returns { id, manifest, files, errors, warnings }.
 * Errors stop it from being published; warnings are for the person reviewing the pull request.
 */
export function checkWidget(folder, { published } = {}) {
  const dir = path.join(WIDGETS, folder);
  const errors = [], warnings = [];
  const r = { folder, id: folder, manifest: null, files: [], errors, warnings };
  const file = path.join(dir, "widget.json");
  if (!fs.existsSync(file)) { errors.push("沒有 widget.json / widget.json is missing"); return r; }
  let m;
  try { m = parseJsonc(fs.readFileSync(file, "utf8")); }
  catch (e) { errors.push(`widget.json 格式有誤 / is not valid JSON: ${e.message}`); return r; }
  r.manifest = m;

  // who it is
  if (typeof m.id !== "string" || !ID.test(m.id)) errors.push(`id「${m.id}」不合規則：小寫英文、數字和 . _ -，2–64 個字元 / bad id`);
  else {
    if (m.id !== folder) errors.push(`資料夾名稱要和 id 一樣：widgets/${m.id}/ / the folder must be named after the id`);
    if (m.id.startsWith("deskwidgets.")) errors.push("deskwidgets. 開頭的 id 留給內建組件 / ids starting with deskwidgets. are reserved");
    if (m.id.startsWith("user.")) errors.push("user. 開頭的 id 是本機自己寫的組件用的，請改成「你的 GitHub 帳號.組件名」 / user. is for local widgets; use <github-name>.<widget>");
    if (!m.id.includes(".")) errors.push("id 要寫成「你的 GitHub 帳號.組件名」，例如 octocat.clock / the id must look like <github-name>.<widget>");
  }
  if (!pick(m.name)) errors.push("缺少 name / name is missing");
  if (!pick(m.description)) warnings.push("沒有 description，組件庫的卡片上會是空白 / no description");
  if (typeof m.version !== "string" || !VERSION.test(m.version)) errors.push(`version「${m.version}」要像 1.0.0 / version must look like 1.0.0`);
  if (!m.author) warnings.push("沒有 author / no author");
  if (m.category != null && !CATEGORIES.includes(m.category)) warnings.push(`category「${m.category}」不是 ${CATEGORIES.join("、")} 之一，會放在「其他」`);

  // what it may do
  const perms = Array.isArray(m.permissions) ? m.permissions : m.permissions == null ? [] : null;
  if (!perms) errors.push("permissions 要是一個陣列 / permissions must be an array");
  for (const p of perms || []) {
    if (typeof p !== "string") { errors.push(`看不懂的權限 ${JSON.stringify(p)}`); continue; }
    if (SIMPLE_PERMISSIONS.includes(p)) continue;
    if (p.startsWith("network:")) {
      const h = p.slice(8);
      if (h === "*") warnings.push("⚠ network:*：可以連到任何網站 / may reach any website");
      else if (!HOST.test(h)) errors.push(`權限 ${p} 的網址看不懂 / bad host in ${p}`);
      continue;
    }
    errors.push(`DeskWidgets 不認識的權限「${p}」/ unknown permission`);
  }
  if ((perms || []).includes("shell.launch")) warnings.push("⚠ shell.launch：可以打開電腦上的程式和檔案 / may open programs and files");

  // its files
  if (!fs.existsSync(dir)) return r;
  const files = r.files = listFiles(dir);
  const total = files.reduce((s, f) => s + (f.bytes || 0), 0);
  if (files.length > LIMITS.files) errors.push(`檔案太多（${files.length} 個，最多 ${LIMITS.files}）/ too many files`);
  if (total > LIMITS.bytes) errors.push(`太大（${(total / 1048576).toFixed(1)} MB，最多 5 MB）/ too large`);
  for (const f of files) {
    if (f.link) errors.push(`${f.rel}：不能用捷徑或符號連結 / links are not allowed`);
    const ext = path.extname(f.rel).toLowerCase();
    if (REFUSED.has(ext)) errors.push(`${f.rel}：組件裏不能放 ${ext} 檔案 / ${ext} files are not allowed`);
  }
  const entry = m.entry || "index.html";
  if (!files.some((f) => f.rel === entry)) errors.push(`找不到頁面 ${entry} / entry page not found`);
  if (m.icon && !files.some((f) => f.rel === m.icon)) errors.push(`找不到圖標 ${m.icon} / icon not found`);
  if (!m.icon) warnings.push("沒有 icon，會顯示名稱的第一個字 / no icon");
  if (m.preview) {
    const re = new RegExp("^" + m.preview.replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace(/\{theme\}/g, "[a-z]+").replace(/\{lang\}/g, "[A-Za-z-]+") + "$");
    if (!files.some((f) => re.test(f.rel))) warnings.push(`preview 指向的圖片一張都沒有 / no picture matches ${m.preview}`);
  } else warnings.push("沒有 preview 預覽圖，市場上只會顯示圖標 / no preview picture");
  if (!m.size || m.size.grow == null) warnings.push("size 裏沒有 grow，拉大時內容不會跟着變大（見開發文檔）/ no size.grow");

  // things a reviewer should look at
  for (const f of files.filter((x) => /\.(html?|js|mjs)$/i.test(x.rel))) {
    const text = fs.readFileSync(path.join(dir, f.rel), "utf8");
    if (/<script[^>]+src\s*=\s*["']?https?:/i.test(text)) warnings.push(`⚠ ${f.rel}：從網上載入程式碼，審核時看不到它做什麼 / loads code from the web`);
    if (/\beval\s*\(|new\s+Function\s*\(/.test(text)) warnings.push(`⚠ ${f.rel}：用了 eval / new Function`);
  }

  // an update must come with a higher version
  if (published && m.version && published !== m.version && compareVersions(m.version, published) <= 0)
    errors.push(`版本要比市場上的 ${published} 新 / the version must be higher than ${published}`);
  if (published && published === m.version) r.unchangedVersion = true;
  return r;
}

export function widgetFolders() {
  return fs.existsSync(WIDGETS) ? fs.readdirSync(WIDGETS, { withFileTypes: true }).filter((e) => e.isDirectory() && !e.name.startsWith(".")).map((e) => e.name).sort() : [];
}

export function git(...args) {
  try { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); }
  catch { return ""; }
}

// ── .dwz: a zip of the widget folder ──

const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
function crc32(buf) { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; }

/** Zips files ({ rel, data }) the same way every time, so an unchanged widget keeps its hash. */
export function zip(entries) {
  const locals = [], centrals = [];
  let offset = 0;
  const DOS_TIME = 0, DOS_DATE = (0 << 9) | (1 << 5) | 1; // 1980-01-01
  for (const { rel, data } of entries) {
    const name = Buffer.from(rel, "utf8");
    const packed = zlib.deflateRawSync(data, { level: 9 });
    const store = packed.length >= data.length;
    const body = store ? data : packed;
    const crc = crc32(data);
    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(store ? 0 : 8, 8);
    h.writeUInt16LE(DOS_TIME, 10); h.writeUInt16LE(DOS_DATE, 12); h.writeUInt32LE(crc, 14);
    h.writeUInt32LE(body.length, 18); h.writeUInt32LE(data.length, 22); h.writeUInt16LE(name.length, 26); h.writeUInt16LE(0, 28);
    locals.push(h, name, body);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(store ? 0 : 8, 10);
    c.writeUInt16LE(DOS_TIME, 12); c.writeUInt16LE(DOS_DATE, 14); c.writeUInt32LE(crc, 16); c.writeUInt32LE(body.length, 20);
    c.writeUInt32LE(data.length, 24); c.writeUInt16LE(name.length, 28); c.writeUInt32LE(offset, 42);
    centrals.push(c, name);
    offset += h.length + name.length + body.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}

export const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
