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

進站先看到大型 3D 人體（會緩慢自轉），可選兩條路線：

### 自由探索（不需填資料）

- 3D 人體佔滿畫面。左側是「主題故事」與依系統分類的器官清單，右側是說明。
- 點任一器官或部位，鏡頭會平滑放大到該處；右側的器官卡分成「正常運作／可能影響／我能做什麼」三個分頁。「可能影響」裡可直接「看對照動畫」。
- 下方控制列：分層透視滑桿（皮膚 → 肌肉 → 骨骼 → 器官 → 血管）、個別圖層、隱藏部位、加入報告。
- **主題故事（目前完成：長期熬夜）**：每一步鏡頭先框住相關器官，器官依序亮起，接著出現流動光點表示器官間的訊號路徑（示意），右側播放「一般狀況 vs 熬夜時」的對照動畫（睡眠時鐘、褪黑激素曲線、反應時間、夜間血壓、胰島素與葡萄糖、發炎訊號、可行習慣）。可暫停、上一步／下一步、點時間軸跳步；文字說明與來源收在「看文字說明與來源」。最後有 4 題小測驗，每題附解釋與來源（小測驗只看理解度，不是健康評分）。
- 所有動畫都標示「衛教示意」，說明這是群體研究觀察到的可能機制，不是對個人的預測，也不代表一定會發生疾病或器官損傷。

### 健康諮詢（健康管理師帶領）

1. **建立諮詢**：輸入個案代碼（不要用姓名）、日期、健康管理師，勾選知情同意（衛教用途為必要；本機儲存、第三方 AI 為選填，目前沒有 AI 服務）。
2. **問卷・3D・分析**：桌面三欄、手機三個分頁。左側問卷（就醫警訊、9 類症狀與追問、生活習慣、病史用藥，都可略過或選「不清楚」）；中間 3D 人體以橘色標示問卷相關器官；右側「分析」即時整理八類資訊並標示證據強度與來源，「機制主題」可播放同一套故事動畫。出現緊急警訊時頁面上方會出現紅色就醫提醒。
3. **審核與匯出**：健康管理師逐項決定要不要納入報告、填審核人並勾選確認後才能下載 A4 PDF 或列印。審核後內容再被修改，審核會自動失效。

任何步驟都能從上方返回修改。諮詢進行中重新整理頁面會留在諮詢流程。

右上角「減少動態」會關閉自動旋轉、鏡頭飛行與動畫（直接顯示完成狀態）；系統設定為「減少動態」時預設開啟。

## 已完成與尚未完成

| 項目 | 狀態 |
| --- | --- |
| 症狀與生活習慣問卷（9 類 33 項、動態追問、可略過） | 已完成 |
| 就醫警訊優先提醒 | 已完成 |
| 3D 解剖人體（分層透視、逐部位點選、搜尋、隱藏、自動聚焦） | 已完成。使用 BodyParts3D 開放授權解剖模型（成年男性）。資料集沒有的甲狀腺與神經走向以示意幾何補上，介面有標示 |
| 規則式衛教分析（八類輸出、證據強度、來源、不確定性） | 已完成。這是固定規則查表，**不是 AI** |
| 長期熬夜互動故事（鏡頭框選、器官依序亮起、訊號路徑、7 組對照動畫、小測驗） | 已完成。動畫為 2D 示意圖表，不是器官或細胞的 3D 動畫 |
| 首頁、自由探索模式、器官卡三分頁 | 已完成 |
| 營養素資料庫（19 項、可搜尋） | 已完成 |
| 健康管理師審核流程、操作紀錄 | 已完成（紀錄存在本機） |
| A4 PDF 下載、列印 | 已完成。下載版是影像式 PDF，文字不可選取；列印版文字可選取 |
| 女性模型、四肢血管、周邊神經、舌等資料集未收錄的構造 | 尚未完成（需另外取得授權模型） |
| 部位中文名稱 | 部分完成：常用的約 200 個部位有中文，其餘顯示英文解剖學名稱 |
| AI 模型分析 API、醫學資料庫檢索 | 尚未完成（第二階段） |
| 組織／血管／細胞微觀探索、器官與細胞層級的 3D 動畫 | 尚未完成（第三階段） |
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
  components/            介面（Home、Explore、StoryPlayer、MechanismAnim、OrganCard、諮詢流程各頁）
scripts/engine-check.ts  知識庫一致性與引擎行為測試
scripts/build-model.py   把 BodyParts3D 轉成分層 GLB（減面、擷取皮膚外層、座標轉換）
public/models/           分層解剖模型（skin / muscle / skeleton / organ / vessel，共約 4.4 MB）
```

- **接 AI 模型**：實作 `AnalysisProvider`（`engine/provider.ts`）。必須檢查 `consent.thirdPartyAI`、只送去識別化資料、在 `audit` 記錄模型與版本，結果仍走同一個審核流程。
- **換成其他授權解剖模型**：輸出相同的分層 GLB（節點名稱 = 部位 id）與 `modelManifest.json`，檢視器不需修改。
- **新增主題**：在 `topics.ts` 補上 `steps`（每步指定器官、訊號路徑 `flow`、對照動畫 `anim`、一句話說明）與 `quiz`，把 `ready` 設為 `true`；新的動畫種類加在 `components/MechanismAnim.tsx`。`npm test` 會檢查器官、路徑、來源與測驗答案是否對得上。
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
