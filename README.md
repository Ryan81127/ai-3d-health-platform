# AI 3D 人體健康探索與個人化健康管理平台（第一階段 MVP）

給健康管理師在諮詢現場帶著個案操作的衛教工具：問卷 → 規則式衛教分析 → 3D 人體標示相關器官 → 生活與營養方向 → 健康管理師審核 → 匯出 A4 PDF。

定位是健康教育、風險提醒與生活型態管理，**不做疾病診斷，不取代醫療專業判斷**。

## 啟動

需要 Node.js 20.19 以上。

```bash
npm install
npm run dev        # 開發模式，預設 http://localhost:5173
npm test           # 知識庫與規則引擎的一致性檢查
npm run build      # 型別檢查 + 建置，輸出到 dist/
npm run preview    # 預覽建置結果
```

建置結果是純靜態檔案，可放在任何靜態主機。

## 部署

推上 `main` 會執行 `.github/workflows/pages.yml`：跑測試、建置，再把 `dist/` 發佈到 GitHub Pages。線上網址：<https://ryan81127.github.io/ai-3d-health-platform/>

若 Actions 無法自動切換，請到 **Settings → Pages → Source** 選 **GitHub Actions**。

先前的單檔原型移到 `public/`，部署後網址為 `v3.html`（原首頁）、`preview-v4.html`、`sleep-explorer.html`（後兩者網址不變）。規劃文件見 `PRODUCT_VISION.md`、`EXPERIENCE_DESIGN.md`、`HEAD_TO_TOE_PLAN.md`、`ROADMAP.md`。

## 操作流程

1. **建立諮詢**：輸入個案代碼（不要用姓名）、日期、健康管理師。勾選知情同意：
   - 衛教用途（必要，未勾選不能開始）
   - 本機儲存（選填；不同意時資料只在記憶體，重新整理即消失）
   - 第三方 AI（選填；目前沒有 AI 服務，資料不會離開本機）
2. **問卷・3D・分析**（桌面三欄；手機改為三個分頁）
   - 左：先確認就醫警訊，再依系統勾選症狀。勾選後會出現起始時間、持續時間、頻率、困擾程度與追問題。所有題目可略過或選「不清楚」。
   - 中：3D 解剖人體（934 個可點選的部位）。拖曳旋轉、滾輪或雙指縮放、右鍵或雙指平移。「分層透視」滑桿由外而內依序淡出皮膚、肌肉、骨骼、器官、血管；「個別圖層」可單獨調整每一層的透明度。點任一部位會顯示名稱並聚焦，可「隱藏此部位」看後方構造；也可用搜尋（中文或英文解剖學名稱）或「器官選單」。從選單聚焦器官時，其他器官會淡化，方便看到被遮住的器官。橘色是問卷相關器官，青色是目前選取。「加入報告」最多 4 張。
   - 右：「分析」即時整理八類資訊並標示證據強度與來源；「器官」顯示功能與衛教；「機制主題」是長期熬夜的互動時間軸，會同步標示 3D 器官；「營養資料庫」可搜尋 19 項營養素。
   - 出現緊急警訊時，頁面最上方會出現紅色就醫提醒。
3. **審核與匯出**：健康管理師逐項決定要不要納入報告（就醫警訊與醫療評估建議不能排除）、填寫補充說明、填審核人並勾選三項確認後按「審核通過」。通過後才能「下載 A4 PDF」或「列印／另存 PDF」。審核後只要內容再被修改，審核就會失效，需要重新審核。

任何步驟都可以從上方流程列返回修改，已填內容會保留。

## 已完成與尚未完成

| 項目 | 狀態 |
| --- | --- |
| 症狀與生活習慣問卷（9 類 33 項、動態追問、可略過） | 已完成 |
| 就醫警訊優先提醒 | 已完成 |
| 3D 解剖人體（分層透視、逐部位點選、搜尋、隱藏、自動聚焦） | 已完成。使用 BodyParts3D 開放授權解剖模型（成年男性）。資料集沒有的甲狀腺與神經走向以示意幾何補上，介面有標示 |
| 規則式衛教分析（八類輸出、證據強度、來源、不確定性） | 已完成。這是固定規則查表，**不是 AI** |
| 長期熬夜互動教學（7 步時間軸、同步 3D 標示） | 已完成（文字與器官標示；不是逐格動畫） |
| 營養素資料庫（19 項、可搜尋） | 已完成 |
| 健康管理師審核流程、操作紀錄 | 已完成（紀錄存在本機） |
| A4 PDF 下載、列印 | 已完成。下載版是影像式 PDF，文字不可選取；列印版文字可選取 |
| 女性模型、四肢血管、周邊神經、舌等資料集未收錄的構造 | 尚未完成（需另外取得授權模型） |
| 部位中文名稱 | 部分完成：常用的約 200 個部位有中文，其餘顯示英文解剖學名稱 |
| AI 模型分析 API、醫學資料庫檢索 | 尚未完成（第二階段） |
| 組織／血管／細胞微觀探索、正常與異常動畫比較 | 尚未完成（第三階段） |
| 高血壓、動脈粥狀硬化、第二型糖尿病、脂肪肝、乾眼症主題 | 尚未完成 |
| 個案追蹤與前後比較 | 尚未完成（目前只能開啟、刪除本機紀錄） |
| 加密儲存、帳號與存取控制、保存期限管理 | 尚未完成 |
| 醫學內容專業審查 | **尚未完成**。知識庫是 `0.1.0-draft`，由文獻整理的草稿，未經醫師、營養師審閱 |

介面上所有未完成的功能都以「尚未完成」標示並停用。

## 正式使用前必須處理

- 知識庫（症狀對應、機制說明、營養素攝取量與藥物交互作用、參考文獻）需由醫療專業人員逐條審查並建立版本紀錄。攝取量數值請對照國健署最新公告。
- 目前資料以明文存在瀏覽器 localStorage，沒有加密、沒有登入。不適合共用電腦，也不符合正式的健康資料保存要求。
- 台灣個人資料保護法與相關醫療法規的適用性尚未評估。
- 書面知情同意書、資料保存期限與刪除流程需另行建立。

## 程式結構與擴充點

```
src/
  types.ts               資料型別（Consult、AnalysisResult…）
  store.ts               狀態與本機儲存（zustand）
  data/                  結構化衛教知識庫（可獨立審查與版本管理）
    symptoms.ts          症狀分類、追問、對應器官／機制／營養素
    knowledge.ts         生理機制、生活因素建議、就醫警訊
    organs.ts            器官衛教說明
    modelManifest.json   3D 模型部位清單（由 scripts/build-model.py 產生）
    partNames.ts         部位中文名稱
    nutrients.ts         營養素資料庫
    topics.ts            機制主題（熬夜；其餘待補）
    references.ts        參考文獻與內容版本
  engine/
    provider.ts          AnalysisProvider 介面；remoteAIProvider 是第二階段的空殼
    ruleEngine.ts        規則式分析
  three/
    BodyViewer.tsx       React Three Fiber 場景（分層載入 GLB）
    anatomy.ts           部位索引、聚焦範圍、搜尋
    modelSource.ts       模型來源與授權資訊
  pdf/exportPdf.ts       PDF 產生（可換成後端服務）
  components/            介面
scripts/engine-check.ts  知識庫一致性與引擎行為測試
scripts/build-model.py   把 BodyParts3D 轉成分層 GLB（減面、擷取皮膚外層、座標轉換）
public/models/           分層解剖模型（skin / muscle / skeleton / organ / vessel，共約 4.4 MB）
```

- **接 AI 模型**：實作 `AnalysisProvider`（`engine/provider.ts`）。必須檢查 `consent.thirdPartyAI`、只送去識別化資料、在 `audit` 記錄模型與版本，結果仍走同一個審核流程。
- **換成其他授權解剖模型**：輸出相同的分層 GLB（節點名稱 = 部位 id）與 `modelManifest.json`，檢視器不需修改。
- **新增主題**：在 `topics.ts` 補上 `steps` 並把 `ready` 設為 `true`。
- **新增症狀或營養素**：改 `data/` 後執行 `npm test`，會檢查所有 id 與文獻引用是否對得上。

## 3D 模型來源與授權

3D 解剖模型來自 **BodyParts3D**（v3.0）：

> BodyParts3D, © The Database Center for Life Science, licensed under CC Attribution-Share Alike 2.1 Japan
> Mitsuhashi N, et al. BodyParts3D: 3D structure database for anatomical concepts. Nucleic Acids Res. 2009;37:D782–5.

STL 檔取自 <https://github.com/Kevin-Mattheus-Moerman/BodyParts3D>。`public/models/` 內的檔案是經減面、合併與壓縮的衍生作品，依相同的 **CC BY-SA 2.1 JP** 授權釋出（見 `public/models/LICENSE.txt`）。使用或再散布時必須保留上述標示；這項授權允許商業使用，但衍生的模型檔必須以相同條款分享。此授權只涵蓋模型檔，不涵蓋本專案的程式碼與衛教內容。

重建模型：

```bash
pip install trimesh fast-simplification embreex
python3 scripts/build-model.py <BodyParts3D_data 目錄> /tmp/model
for l in skin muscle skeleton organ vessel; do npx @gltf-transform/cli meshopt /tmp/model/$l.glb public/models/$l.glb --level medium; done
cp /tmp/model/manifest.json src/data/modelManifest.json
```

這是單一成年男性的通用教學模型，不是個案影像，也不代表個別差異。
