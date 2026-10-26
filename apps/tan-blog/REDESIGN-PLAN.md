# 改造計畫：三遠

把 tan-blog 改成 [`DESIGN.md`](DESIGN.md) 描述的樣子：遠是江山、中是庭、近是信箋。
這份是**執行順序與進度**，設計本身以 DESIGN.md 為準；兩份衝突時改這份。

起草：2026-10-26

## 原則

- **先驗證再鋪開**：庭是新東西，先只做文章列表一頁的原型，看過覺得對了再套到其他頁。
- **每一階段都能單獨上線**：不開長壽分支；每階段一個（或幾個）PR，做完網站照常可用。
- **既有的先不動**：3D 夜航、墨暈開場、展卷、信箋都已經在跑，只補不拆。
- **字層不因比喻改版**：任何一階段都不改列表、文章的資訊結構。

## 現況盤點

| 項目 | 現況 | 目標 |
|---|---|---|
| 首頁畫層 | `InkLandscape`（3D 夜航＋`SeasonParticles`） | 保留，補水中鳥居與流出畫面的遣水 |
| 文章頁 | `LetterPaper`、`LetterSignature`、`WrittenOn` | 保留（近景已到位） |
| 開場／換頁 | `ink-intro`、`post-transitions`（展卷／收卷／翻頁）、`ink-progress` | 保留，另加列表之間的暈染與首頁推近 |
| 列表頁畫層 | 沒有 | 庭（各頁一隅） |
| 違反「紙與墨」的樣式 | 毛玻璃、漸層、粗陰影、Tailwind 原色，約十處（見階段 1） | 清掉 |
| 新舊的表現 | 只有文字日期 | 標題墨色乾濕 |

---

## 階段 0：基礎

讓後面每一階段都有共用的東西可以叫。

- [ ] `src/lib/season-spec.ts`：純函式、只有數字
  - `inkDryness(publishedAt, now)` → `'wet' | 'dry' | 'faded'`（這個節氣／今年／更早）
  - `rakePattern(termIndex)` → 二十四種耙紋之一（先定 4–6 種，其餘輪替）
  - `mossTone(season)`、`mistDensity(termIndex)`
  - 單元測試：節氣邊界（立春換年、冬至）、站主時區
- [ ] `scripts/check-design.ts` ＋ `pnpm check:design`：擋掉 `backdrop-blur`、`bg-gradient-*`、`shadow-lg/xl`、Tailwind 原色（`zinc-`、`neutral-` 等），`components/ui/` 與白名單除外；先只警告，階段 1 清完再改成會失敗
- [ ] 加進 `typecheck` 同一條 CI／pre-commit

**完成條件**：測試通過；`check:design` 列得出階段 1 的清單。

## 階段 1：清違規（小改、立即見效）

每一處改成「紙上加幾 % 墨＋髮絲線」或暈染：

- [ ] `components/layout/header/header.tsx:50` — 捲動後的毛玻璃底
- [ ] `components/layout/header/nav.tsx:258` — 毛玻璃＋`shadow-lg`
- [ ] `components/layout/header/nav.tsx:346,362` — 底線的漸層 → 一筆有起收的朱線
- [ ] `components/layout/header/nav.tsx:447` — 下拉選單毛玻璃＋`shadow-xl`
- [ ] `components/layout/footer/index.tsx:10` — 毛玻璃
- [ ] `components/fab/fab-container.tsx:54-56` — 毛玻璃、`shadow-lg`、`zinc-50`
- [ ] `routes/_layout/(home)/-components/home-editorial.tsx:70` — 漸層豎線 → 筆觸
- [ ] `routes/_layout/notes/-components/notes-calendar.tsx:43` — 毛玻璃卡片
- [ ] `routes/_layout/posts/-components/posts-sidebar.tsx:51` — 毛玻璃卡片
- [ ] `check:design` 改成會失敗

**完成條件**：`check:design` 零錯誤；晝夜、手機各看一次。

## 階段 2：字層的墨分乾濕

- [ ] 標題樣式：`.ink-wet` / `.ink-dry` / `.ink-faded`（styles.css，只用 `--foreground` 混色與低透明度 `text-shadow`），對比度都過 AA
- [ ] 套到：文章列表 `post-item.tsx`、筆記 `notes-journal.tsx`、碎念 `thinking-list.tsx`、分類 `categories-timeline.tsx`
- [ ] 滑過：該列標題暫時變濕（150–200ms），鍵盤聚焦同樣效果
- [ ] reduced-motion 下只換濃淡、不做暈

**完成條件**：這個節氣的文章一眼看得出「剛寫的」；拿掉樣式後版面完全不變。

## 階段 3：庭的原型（只做 `/posts`）⚑ 決策點

- [ ] `src/components/garden/garden-layer.tsx`：畫層容器（`aria-hidden`、固定在字層後、`afterLoadIdle` 才建立、不可見暫停）
- [ ] `src/components/garden/karesansui.ts`：純 canvas，畫砂紋（照 `rakePattern`）、一組石、霧；筆觸有起收
- [ ] 只掛在 `/posts`；手機只留右下一角
- [ ] 晝（宣紙上的庭）、夜（燈下的庭）兩套
- [ ] 效能：首次互動不受影響（Lighthouse TBT／INP 不退步）

**決策點**：站主看過原型後決定——
- 庭的感覺對 → 進階段 4
- 不對 → 回頭改 DESIGN.md 第 1、4 節，再做一次原型（後面的階段都不受影響）

## 階段 4：庭鋪到各列表頁

照 DESIGN.md 第 4 節，每頁一隅；共用 `garden-layer`，各頁只給一份「這一隅有什麼」的設定：

- [ ] 分類 `/categories/$slug`（一隅由 slug 決定）
- [ ] 筆記 `/notes`（苔庭）
- [ ] 專欄 `/notes/topics`（飛石小徑）
- [ ] 碎念 `/thinking`（竹枝與風）
- [ ] 時間線 `/timeline`（遣水）
- [ ] 友鏈 `/friends`（借景遠山）
- [ ] 朋友圈 `/fcircle`（牆頭的枝）

**完成條件**：每頁開著和關掉畫層各看一次；八頁的砂紋在同一個節氣是同一種。

## 階段 5：遠景補完（首頁）

- [ ] `ink-voyage.ts`：江中一座朱色鳥居（畫面唯一的高彩度物件，燈籠映在它身上）
- [ ] 江的一側引出一道遣水，流出畫面（接階段 6 的推近）
- [ ] `SeasonParticles` 確認只在首頁出現
- [ ] 手機上 3D 的幀率與耗電檢查；低階裝置退回 `ink-landscape` 的靜態版

## 階段 6：轉場

- [ ] 列表 ⇄ 列表：**暈染**——點擊處一滴墨暈開蓋住舊景、水洗淡、露出新景（重用 `lib/ink-fluid.ts`）
- [ ] 首頁 → 列表：**推近**——鏡頭順江推進、遣水化成庭的砂紋；反方向拉遠
- [ ] 列表 ⇄ 文章、文章之間：維持既有展卷／翻頁，確認跟暈染不會疊在一起
- [ ] 一碰螢幕／捲動／按鍵立即跳到結果；reduced-motion 只淡入

## 階段 7：細節頁

- [ ] 404：霧裡的鳥居
- [ ] 登入：暖簾
- [ ] 載入：円相（取代現有 loading）
- [ ] 留言：絵馬造型的留言框，站主回覆朱落款
- [ ] OG 圖：依 `season-spec` 帶上節氣與耙紋

---

## 待決定

- 庭的畫法：純 2D canvas（輕、好控制）還是共用 3D 夜航的 three.js（能做推近，但列表頁變重）？建議原型先用 2D，推近時用截圖或簡化場景接起來。
- 二十四種耙紋要全做，還是 4–6 種輪替？建議先輪替，看效果再補。
- 夜裡的庭要不要有燈（石燈籠）？會多一個暖色光源，要跟「強調色只有朱」對齊。
