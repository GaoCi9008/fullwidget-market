# 投稿組件 / Submitting a widget

[English below](#english)

## 1. 先在 FullWidget 裏做好

在 FullWidget 控制中心按「添加組件 → 新建組件」，照「開發文檔」寫好組件，在桌面上實際用過。三套主題（量被畫出來、玻璃上的字、書桌上的紙）都看一遍，拉大縮小也看一遍。

## 2. 準備給市場

- **id** 改成「你的 GitHub 帳號.組件名」，例如 `octocat.weather-bar`。只能用小寫英文、數字和 `. _ -`。發佈後不要再改 id，已安裝的人靠它收到更新。
- **name、description** 最好有繁中、簡中、英文三種：`{ "zh-TW": "…", "zh-CN": "…", "en": "…" }`。
- **version** 寫成 `1.0.0` 這樣。每次更新都要提高。
- **icon**：一個 SVG 圖標。
- **preview**（建議）：一張預覽圖，例如 `"preview.png"`；或者每個主題、語言各一張：`"preview/{theme}.{lang}.webp"`。市場和控制中心的組件庫都會顯示它。
- **category**：`time`、`weather`、`system`、`productivity`、`info` 或 `media`。
- **size.grow**：寫 `1`，用戶把組件拉大時內容會跟着變大。
- **permissions**：只要真的用到的。

## 3. 開 pull request

1. Fork 這個儲存庫。
2. 把組件資料夾放到 `widgets/你的GitHub帳號.組件名/`（資料夾名稱要和 id 一樣）。
3. 開 pull request，照範本填好：它做甚麼、為甚麼需要那些權限。

自動檢查會在 pull request 下面列出結果。❌ 的要修好；⚠ 是給審核的人看的提醒，例如組件要連到任何網站，或要打開電腦上的程式。

## 規則

- 一個組件最多 5 MB、300 個檔案。只能放網頁用的檔案：HTML、CSS、JS、圖片、字體、聲音。`.exe`、`.dll`、`.bat`、`.ps1` 等會被拒絕。
- 不要從網上載入程式碼（`<script src="https://…">`）。要用的函式庫請放進組件資料夾，審核的人才看得到它做什麼。
- 不要收集用戶的資料，也不要把用戶的資料送到別的地方，除非這就是組件的用途，而且說明裏寫清楚了。
- 更新別人的組件之前，先在 issue 裏和作者商量。
- 你要有權發佈組件裏的所有內容（程式碼、圖片、字體、聲音）。可以在組件資料夾放一個 `LICENSE` 檔案說明授權。

在自己電腦上先檢查：`node scripts/check.mjs`（需要 Node.js 20 以上）。

---

## English

1. **Build it in FullWidget first.** Control Center → Add widgets → New widget, follow the developer guide, and use it on your desktop. Look at it in all three themes, and at small and large sizes.
2. **Get it ready.**
   - Change the **id** to `<your-github-name>.<widget>`, e.g. `octocat.weather-bar` (lowercase letters, digits and `. _ -`; never change it after publishing).
   - Give **name** and **description** in `zh-TW`, `zh-CN` and `en` if you can.
   - Use a **version** like `1.0.0` and raise it with every update.
   - Add an SVG **icon**, a **preview** picture, a **category**, and `"grow": 1` in **size**.
   - Ask only for the **permissions** you use.
3. **Open a pull request.** Fork, put the widget in `widgets/<your-github-name>.<widget>/` (the folder named after the id), and open a pull request with the template filled in.

The automatic check lists its findings on the pull request: fix every ❌; ⚠ notes are for the reviewer.

**Rules:**
- At most 5 MB and 300 files, web files only (HTML, CSS, JS, pictures, fonts, sounds).
- No code loaded from the web; bundle your libraries.
- Don't collect or send away people's data unless that is plainly what the widget is for.
- Talk to the author in an issue before changing someone else's widget.
- You must have the right to publish everything in it; add a `LICENSE` file if you like.

Check locally with `node scripts/check.mjs` (Node.js 20+).
