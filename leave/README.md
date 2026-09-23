# 家長請假中心

手機優先的家長請假與取消接送頁面。使用既有 LIFF ID，取消接送、美語、安親與托育為四項獨立複選，不會連動全選。

## 正式發布條件

- 前端檔案：`leave/index.html`、`leave/parent-center.css`、`leave/parent-center.js`。
- 校方核發工具：`parent-binding/index.html`、`parent-binding/binding.js`。
- Gateway 必須同步升級至 `parent-center-v2`。完整 Gateway 含校方設定，只透過私有交付提供，不得提交到公開 GitHub。
- LIFF Endpoint URL 維持 `https://taipingxinguang.org/leave/`，LIFF 必須啟用 `profile` scope。
- `PARENT_LINE_CHANNEL_ID` 須符合實際 LINE Login Channel；程式預設為既有 LIFF 的 Channel ID。
- Cloudflare 網站發布與 GitHub commit 為兩件不同的事。除非已確認自動部署，不能只憑 commit 宣稱正式上線。

## 使用流程

- 家長從官方 LINE 的既有 LIFF 入口進入。
- 已綁定者直接看到本人帳號對應的有效在校孩子。
- 未綁定者由校方核驗身分後核發 30 分鐘一次性綁定碼，不提供「知道電話即可認領孩子」的查詢。
- 家長選孩子、日期、項目，檢視確認畫面後送出。
- 新增、修改與取消都由 Gateway 記錄，並通知相關群組；畫面區分「LINE 已受理」、「等待重試」與「請校方協助」，不宣稱老師已讀。
- 原每日彙整維持不變。修改／取消仍遵循原 11:30 與已彙整鎖定規則。

## 安全界線

前端不傳入可信的學生姓名、LINE userId 或管理員旗標。後端向 LINE 驗證 access token，依伺服器名冊取得孩子與課程資訊。token 只放在 POST body，不使用 GET query 或持久化儲存。

請求編號與待確認的請假內容暫存在目前分頁的 sessionStorage，用於連線中斷後查核同一筆請求；成功後即移除，不儲存 LINE token 或校方密碼。

校方綁定工具每次請求都由後端驗證管理員／行政帳號。核發後清除畫面中的密碼；綁定碼不可張貼在群組，已綁定欄位不會直接被覆寫。

本次只調整家長請假入口，不代表既有 Gateway 其他模組已完成安全稽核。
