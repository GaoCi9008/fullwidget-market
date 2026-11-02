// Builds the market website into _site/: the pages, index.json (the catalog DeskWidgets reads),
// one .dwz package per widget, and each widget's icon and preview pictures.
//   node scripts/build.mjs [--base-url https://hmgvibe.github.io/deskwidgets-market/]
import fs from "node:fs";
import path from "node:path";
import { ROOT, WIDGETS, checkWidget, widgetFolders, git, zip, sha256 } from "./lib.mjs";

const OUT = path.join(ROOT, "_site");
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, "packages"), { recursive: true });

const widgets = [];
let failed = 0;
for (const folder of widgetFolders()) {
  const r = checkWidget(folder);
  if (r.errors.length) {
    failed++;
    console.error(`✗ ${folder}\n  ${r.errors.join("\n  ")}`);
    continue;
  }
  const m = r.manifest, dir = path.join(WIDGETS, folder);
  const files = r.files.map((f) => ({ rel: f.rel, data: fs.readFileSync(path.join(dir, f.rel)) }));
  const pkg = zip(files);
  const pkgName = `${m.id}-${m.version}.dwz`;
  fs.writeFileSync(path.join(OUT, "packages", pkgName), pkg);

  // icon and pictures, for the website and the control center
  const assets = path.join(OUT, "assets", m.id);
  const copy = (rel) => {
    const to = path.join(assets, rel);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(path.join(dir, rel), to);
  };
  if (m.icon) copy(m.icon);
  let previews = [];
  if (m.preview) {
    const re = new RegExp("^" + m.preview.replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace(/\{theme\}/g, "[a-z]+").replace(/\{lang\}/g, "[A-Za-z-]+") + "$");
    previews = r.files.filter((f) => re.test(f.rel)).map((f) => f.rel);
    previews.forEach(copy);
  }

  widgets.push({
    id: m.id,
    name: m.name,
    description: m.description ?? "",
    author: m.author ?? "",
    version: m.version,
    category: m.category ?? "other",
    permissions: (m.permissions ?? []).filter((p) => typeof p === "string"),
    size: { width: m.size?.width ?? 240, height: m.size?.height ?? 120 },
    icon: m.icon ? `assets/${m.id}/${m.icon}` : null,
    preview: m.preview ? `assets/${m.id}/${m.preview}` : null,
    previews: previews.map((p) => `assets/${m.id}/${p}`),
    package: `packages/${pkgName}`,
    sha256: sha256(pkg),
    bytes: pkg.length,
    files: files.length,
    homepage: m.homepage ?? null,
    // when the widget's folder last changed (the time of the git commit)
    updated: git("log", "-1", "--format=%cI", "--", `widgets/${folder}`) || new Date().toISOString(),
  });
  console.log(`✓ ${m.id} ${m.version}  ${(pkg.length / 1024).toFixed(1)} KB`);
}
if (failed) {
  console.error(`\n${failed} widget(s) failed the check; nothing was published.`);
  process.exit(1);
}

const index = { format: 1, name: "DeskWidgets 組件市場", updated: new Date().toISOString(), widgets };
fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify(index, null, 1));
// the website itself
fs.cpSync(path.join(ROOT, "site"), OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, ".nojekyll"), "");
console.log(`\n${widgets.length} widget(s) → _site/`);
