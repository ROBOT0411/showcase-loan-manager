# 展示品借貨管理系統（PWA）

以提供的「展示品借貨表」HTML 為功能來源，改成手機優先的安裝型 Web App。純前端靜態檔案，無建置步驟。

## 功能

- 業務員篩選，以及未歸還、已封存、全部紀錄篩選
- 新增與編輯借用單：借出／歸還日期、客戶名稱、業務員複選、產品與 1／2 數量
- 部分歸還：選擇業務員與本次歸還產品，歸還明細存為封存紀錄
- 歷史紀錄、恢復主表、永久刪除確認
- 匯出 Excel（SheetJS）
- Firebase Firestore 即時同步；Firebase 未設定或離線時以 localStorage 保存
- PWA manifest、Service Worker 離線快取、畫面版本號

產品與業務員初始清單沿用來源 HTML。沒有加入新的產品或業務流程。

## 本機預覽

需透過 HTTP/HTTPS 開啟以啟用 Service Worker。可用 Python、Node.js 或 VS Code Live Server 提供此資料夾；例如在專案資料夾執行 `python -m http.server 8000`，瀏覽 `http://localhost:8000`。

## 部署至 GitHub Pages

此 repo 已包含 `.github/workflows/pages.yml`。將預設分支設為 `main` 並推送後，於 GitHub repo 的 **Settings → Pages → Build and deployment** 選擇 **GitHub Actions**。部署完成後，開啟 Actions 產生的 Pages 網址即可用手機測試。網址必須使用 HTTPS 才能安裝 PWA。

## 手機安裝與測試

1. 用 iPhone Safari 或 Android Chrome 開啟部署網址。
2. 新增一筆借用單，檢查日期、客戶、業務員及產品數量。
3. 用「歸還品項」選擇本次歸還品項，再切到「已封存」確認歸還明細；使用「恢復主表」可還原紀錄。
4. 測試 Excel 匯出及重新開啟後的本機資料。
5. iPhone：Safari「分享 → 加入主畫面」；Android：Chrome 選單「安裝應用程式／加到主畫面」。
6. 安裝後可先載入一次，再關閉網路測試已快取頁面；雲端即時同步當然需要網路。

## Firebase 雲端同步

不含任何可用的 Firebase 專案憑證。要跨裝置同步，請建立／選擇自己的 Firebase 專案：

1. 在 Firebase 專案新增 Web App，複製 Web 設定 JSON。
2. 啟用 Authentication 的匿名登入，並建立 Firestore Database。
3. 在 APP 右上角齒輪貼上 Firebase JSON 並儲存。
4. Firestore 路徑沿用來源 HTML 的結構：`artifacts/demo-inventory-app/public/data/inventory_transactions/{id}`。

Firestore 規則至少應要求已登入使用者；匿名登入可讓知道部署網址的使用者取得匿名身分，請依組織需要限制可讀寫範圍：

```text
match /artifacts/demo-inventory-app/public/data/inventory_transactions/{document=**} {
  allow read, write: if request.auth != null;
}
```

此範例規則只確認使用者已登入，並不限制匿名使用者彼此隔離。若借貨資料不應公開給任何持有連結的人，部署前請改用正式登入與更嚴格的 Firestore 規則。Firebase Web 設定不是管理員私鑰，但 Firestore 安全性必須由規則保護。

本機離線資料只存在各瀏覽器的 localStorage。設定 Firebase 時，雲端快照會成為共用資料來源；第一次設定前請先確認欲保留的資料已同步或匯出。

## 版本更新

每次建立更新版本時，先執行 `node scripts/bump-version.mjs`。工具會自動遞增 `app.js` 顯示的 patch 版本，並同步更新 `service-worker.js` 快取名稱；提交兩個檔案後部署即可。

## 專案檔案

- `index.html`、`styles.css`、`app.js`：手機優先介面與借還資料流程
- `manifest.webmanifest`、`service-worker.js`、`icons/`：安裝資訊與離線殼層快取
- `.github/workflows/pages.yml`：GitHub Pages 部署
- `scripts/bump-version.mjs`：版本號與快取版本同步遞增
