# FullWidget 組件市場

給 FullWidget（Windows 桌面小組件）的組件，由大家投稿。

**逛市場：** <https://hmgvibe.github.io/fullwidget-market/>

[English below](#english)

## 安裝組件

- **在 FullWidget 裏：** 控制中心 →「添加組件」→「線上」，按「安裝」。安裝前會列出組件要用的權限，你同意了才會裝上。之後有新版本，同一個地方會出現「更新」。
- **在網站上：** 打開組件，按「下載 .fwz」，雙擊下載的檔案，或把它拖到控制中心。

需要 FullWidget 1.1.0 以上。

## 投稿組件

見 [CONTRIBUTING.md](CONTRIBUTING.md)。簡單來說：fork 這個儲存庫，把組件資料夾放進 `widgets/你的GitHub帳號.組件名/`，開一個 pull request。自動檢查通過、維護者看過之後合併，幾分鐘內就會出現在市場上。

## 這個儲存庫裏有什麼

| 位置 | 內容 |
|---|---|
| `widgets/` | 每個組件一個資料夾，資料夾名稱就是組件的 id |
| `scripts/check.mjs` | 檢查組件：說明檔、權限、檔案類型和大小、版本號 |
| `scripts/build.mjs` | 把每個組件打包成 `.fwz`，產生 `index.json` 和網站 |
| `site/` | 市場網站 |
| `.github/workflows/` | pull request 時自動檢查；合併到 main 後發佈到 GitHub Pages |

在自己電腦上試：裝好 Node.js 20 以上，執行 `node scripts/check.mjs` 和 `node scripts/build.mjs`，網站會在 `_site/`。

### index.json

FullWidget 讀的組件清單，網址是 `https://hmgvibe.github.io/fullwidget-market/index.json`。每個組件有 `id`、`name`、`description`、`author`、`version`、`category`、`permissions`、`icon`、`preview`、`package`（`.fwz` 的位置，相對於 index.json）、`sha256`、`bytes` 和 `updated`。FullWidget 下載 `.fwz` 後會核對 `sha256`，不符就不安裝。

---

## English

Widgets for FullWidget (desktop widgets for Windows), made by everyone.

**Browse:** <https://hmgvibe.github.io/fullwidget-market/>

**Installing:** in FullWidget, Control Center → Add widgets → Online, then Install. You see what the widget may do before anything is installed, and updates show up in the same place. Or download the `.fwz` file from the website and double-click it. Needs FullWidget 1.1.0 or later.

**Submitting:** see [CONTRIBUTING.md](CONTRIBUTING.md). Fork, put your widget in `widgets/<your-github-name>.<widget>/`, and open a pull request. Once the automatic check passes and a maintainer has looked at it, it's merged and appears in the market within minutes.

**Trying it locally:** with Node.js 20+, run `node scripts/check.mjs` and `node scripts/build.mjs`; the site is built into `_site/`.
