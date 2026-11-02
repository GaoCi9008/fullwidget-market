// Reviews widgets before they go into the market.
//   node scripts/check.mjs                      every widget
//   node scripts/check.mjs --against origin/main  only what a pull request changes, compared with the market
// Writes a report (Markdown) to the console, and to $GITHUB_STEP_SUMMARY on GitHub. Exits 1 on errors.
import fs from "node:fs";
import { checkWidget, widgetFolders, git, parseJsonc } from "./lib.mjs";

const args = process.argv.slice(2);
const against = args.includes("--against") ? args[args.indexOf("--against") + 1] : null;

let folders = widgetFolders();
const notes = [];
if (against) {
  const changed = git("diff", "--name-only", `${against}...HEAD`).split("\n").filter(Boolean);
  const touched = new Set(changed.filter((f) => f.startsWith("widgets/")).map((f) => f.split("/")[1]));
  const outside = changed.filter((f) => !f.startsWith("widgets/"));
  if (outside.length) notes.push(`改了 widgets/ 以外的檔案，需要維護者看過 / changes outside widgets/: ${outside.map((f) => `\`${f}\``).join(", ")}`);
  for (const f of touched) if (!folders.includes(f)) notes.push(`移除了組件 \`${f}\` / removes \`${f}\``);
  folders = folders.filter((f) => touched.has(f));
}

/** The version now in the market, if the widget is already there. */
function published(folder) {
  if (!against) return null;
  const text = git("show", `${against}:widgets/${folder}/widget.json`);
  try { return text ? parseJsonc(text).version : null; } catch { return null; }
}

const results = folders.map((f) => ({ ...checkWidget(f, { published: published(f) }), before: published(f) }));
const errors = results.reduce((n, r) => n + r.errors.length, 0);

const lines = [`## 組件檢查 / Widget check`, ""];
if (!results.length && !notes.length) lines.push("沒有組件改動。/ No widget changes.");
for (const n of notes) lines.push(`- ${n}`);
for (const r of results) {
  const m = r.manifest || {};
  const name = m.name && typeof m.name === "object" ? m.name["zh-TW"] || m.name.en || Object.values(m.name)[0] : m.name;
  const what = r.before ? (r.unchangedVersion ? `改了檔案但版本仍是 ${r.before}` : `更新 ${r.before} → ${m.version}`) : `新組件 v${m.version ?? "?"}`;
  lines.push("", `### ${r.errors.length ? "❌" : "✅"} \`${r.folder}\` ${name ? `— ${name}` : ""}`, "", `${what}；作者 ${m.author || "?"}；${r.files.length} 個檔案`);
  const perms = Array.isArray(m.permissions) && m.permissions.length ? m.permissions.map((p) => `\`${p}\``).join(" ") : "（不需要權限 / none）";
  lines.push("", `權限 / permissions: ${perms}`);
  if (r.unchangedVersion) r.warnings.push("改了檔案卻沒有提高 version，已安裝的人不會收到更新 / files changed but the version didn't");
  for (const e of r.errors) lines.push(`- ❌ ${e}`);
  for (const w of r.warnings) lines.push(`- ${w.startsWith("⚠") ? "" : "ℹ️ "}${w}`);
}
lines.push("", errors ? `**${errors} 個問題要修好才能合併。/ ${errors} problem(s) to fix before merging.**` : "**可以交給維護者審核。/ Ready for a maintainer's review.**");
const report = lines.join("\n");
console.log(report);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report + "\n");
process.exit(errors ? 1 : 0);
