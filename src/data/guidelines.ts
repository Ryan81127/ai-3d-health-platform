/**
 * 醫學指引登錄表（P0 核對結果）。
 * 核對日期 2026-11-15。status：
 *   verified      已連線取得正式出版紀錄（PubMed／Crossref／出版者頁面或 PDF），確認標題、年份與 DOI
 *   user-verified 開發環境無法自動讀取，已由平台負責人以瀏覽器人工核對連結與版本（2026-11-15）
 *   manual-check  連結無法自動讀取（防機器人驗證或連線被拒），需人工以瀏覽器核對
 */
export interface Guideline {
  id: string;
  short: string;
  title: string;
  org: string;
  year: number;
  citation: string;
  doi?: string;
  url: string;
  status: 'verified' | 'user-verified' | 'manual-check';
  checkedAt: string;
  note?: string;
}

export const GUIDELINES: Guideline[] = [
  /* 高血壓 */
  { id: 'tw-htn-2022', short: '2022 台灣高血壓指引', org: '台灣心臟學會（TSOC）、台灣高血壓學會（THS）', year: 2022,
    title: '2022 Guidelines of the Taiwan Society of Cardiology and the Taiwan Hypertension Society for the Management of Hypertension',
    citation: 'Acta Cardiol Sin. 2022;38(3):225–325. PMID 35673334', doi: '10.6515/ACS.202205_38(3).20220321A',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9121756/', status: 'verified', checkedAt: '2026-11-15',
    note: 'PMC 全文非開放取用；本平台內容依官方摘要核對。S-ABCDE 各字母的完整定義需以全文確認。' },
  { id: 'tw-htn-older-2026', short: '2026 台灣高齡者高血壓指引', org: '台灣高血壓學會（THS）；TSOC、TAGG、TSFM 共同背書', year: 2026,
    title: '2026 THS guidelines for the management of hypertension in older adults',
    citation: 'J Formos Med Assoc. 2026 Oct 24（線上優先發表）. PMID 42926177', doi: '10.1016/j.jfma.2026.09.040',
    url: 'https://pubmed.ncbi.nlm.nih.gov/42926177/', status: 'verified', checkedAt: '2026-11-15',
    note: '線上優先發表（Online ahead of print），卷期頁碼尚未確定。共 63 項建議；本平台依摘要核對。' },
  { id: 'hpa-cvd', short: '國健署心血管疾病預防照護指引', org: '衛生福利部國民健康署', year: 0,
    title: '心血管疾病預防照護指引（PDF）', citation: '待核對', url: 'https://health99.hpa.gov.tw/media/public/pdf/22113.pdf',
    status: 'user-verified', checkedAt: '2026-11-15', note: '連結與版本已由平台負責人人工核對；正式標題與年份待補入本登錄表。' },

  /* 動脈粥狀硬化／血脂 */
  { id: 'acc-aha-lipid-2026', short: '2026 ACC/AHA 血脂異常管理指引', org: 'ACC/AHA 與多個學會（AACVPR、ABC、ACPM、ADA、AGS、APhA、ASPC、NLA、PCNA）', year: 2026,
    title: '2026 ACC/AHA/AACVPR/ABC/ACPM/ADA/AGS/APhA/ASPC/NLA/PCNA Guideline on the Management of Dyslipidemia',
    citation: 'Circulation. 2026;153(17):e1154–e1276（另於 2026-06、2026-09 發布勘誤）', doi: '10.1161/CIR.0000000000001423',
    url: 'https://www.jacc.org/guidelines/cholesterol', status: 'verified', checkedAt: '2026-11-15',
    note: '出版紀錄與勘誤已由 PubMed 確認；JACC／AHA 指引頁面已由平台負責人人工核對。指引內的具體數值仍以全文為準。' },

  /* 第二型糖尿病 */
  { id: 'ada-2026-s2', short: 'ADA 2026 第 2 章 診斷與分類', org: '美國糖尿病學會（ADA）', year: 2026,
    title: '2. Diagnosis and Classification of Diabetes: Standards of Care in Diabetes—2026',
    citation: 'Diabetes Care. 2026;49(Suppl 1):S27–S49', doi: '10.2337/dc26-S002',
    url: 'https://professional.diabetes.org/standards-of-care', status: 'verified', checkedAt: '2026-11-15',
    note: 'ADA 官方頁面確認 2026 版為現行版本，每年更新。' },
  { id: 'ada-2026-s5', short: 'ADA 2026 第 5 章 健康行為', org: '美國糖尿病學會（ADA）', year: 2026,
    title: '5. Facilitating Positive Health Behaviors and Well-being to Improve Health Outcomes: Standards of Care in Diabetes—2026',
    citation: 'Diabetes Care. 2026;49(Suppl 1):S89–S131', doi: '10.2337/dc26-S005', url: 'https://professional.diabetes.org/standards-of-care', status: 'verified', checkedAt: '2026-11-15' },
  { id: 'ada-2026-s12', short: 'ADA 2026 第 12 章 視網膜、神經病變與足部照護', org: '美國糖尿病學會（ADA）', year: 2026,
    title: '12. Retinopathy, Neuropathy, and Foot Care: Standards of Care in Diabetes—2026',
    citation: 'Diabetes Care. 2026;49(Suppl 1):S261–S276', doi: '10.2337/dc26-S012', url: 'https://professional.diabetes.org/standards-of-care', status: 'verified', checkedAt: '2026-11-15' },
  { id: 'tw-dm', short: '台灣糖尿病學會臨床照護指引', org: '中華民國糖尿病學會', year: 0,
    title: '糖尿病臨床照護指引', citation: '待核對', url: 'https://www.endo-dm.org.tw/dia/direct/index.asp?t=1',
    status: 'user-verified', checkedAt: '2026-11-15', note: '連結與版本已由平台負責人人工核對；正式指引名稱與年份待補入本登錄表。' },

  /* 脂肪肝 MASLD */
  { id: 'easl-masld-2024', short: '2024 EASL–EASD–EASO MASLD 指引', org: 'EASL、EASD、EASO', year: 2024,
    title: 'EASL–EASD–EASO Clinical Practice Guidelines on the management of metabolic dysfunction-associated steatotic liver disease (MASLD)',
    citation: 'J Hepatol. 2024;81:492–542', url: 'https://easlcampus.eu/sites/default/files/2024-08/EASL_CPGs_management_of_MASLD.pdf',
    status: 'verified', checkedAt: '2026-11-15', note: '已讀取官方 PDF 全文（51 頁）。' },
  { id: 'aasld-2023', short: 'AASLD 2023 實務指引', org: '美國肝病研究學會（AASLD）', year: 2023,
    title: 'AASLD Practice Guidance on the clinical assessment and management of nonalcoholic fatty liver disease',
    citation: 'Hepatology. 2023;77:1797–1835', doi: '10.1097/HEP.0000000000000323',
    url: 'https://www.aasld.org/practice-guidelines/clinical-assessment-and-management-metabolic-dysfunction-associated-steatotic',
    status: 'verified', checkedAt: '2026-11-15',
    note: 'AASLD 頁面另列 MASLD 新命名更新（Hepatology 2023;79:1212–1219）、2024-10 resmetirom 與 2025-11 semaglutide 藥物更新。' },

  /* 乾眼症 */
  { id: 'dews3-digest', short: 'TFOS DEWS III Digest', org: 'Tear Film & Ocular Surface Society（TFOS）', year: 2025,
    title: 'TFOS DEWS III: Digest', citation: 'Am J Ophthalmol. 2025;279:451–553（2026-08 發布勘誤）', doi: '10.1016/j.ajo.2025.05.040',
    url: 'https://www.tearfilm.org/paginalong-tfos_dews_iii_downloadable_summaries/7646_7644/eng/', status: 'verified', checkedAt: '2026-11-15' },
  { id: 'dews3-dx', short: 'TFOS DEWS III 診斷方法', org: 'TFOS', year: 2025,
    title: 'TFOS DEWS III: Diagnostic Methodology', citation: 'Am J Ophthalmol. 2025;279:387–450', doi: '10.1016/j.ajo.2025.05.033',
    url: 'https://www.tearfilm.org/paginalong-tfos_dews_iii_downloadable_summaries/7646_7644/eng/', status: 'verified', checkedAt: '2026-11-15',
    note: '修訂後的乾眼定義與病史問診要點，依 TFOS 官方摘要（CORE 製作）核對。' },
  { id: 'dews3-mgmt', short: 'TFOS DEWS III 治療與管理', org: 'TFOS', year: 2025,
    title: 'TFOS DEWS III: Management and Therapy', citation: 'Am J Ophthalmol. 2025;279:289–386. PMID 40467022', doi: '10.1016/j.ajo.2025.05.039',
    url: 'https://pubmed.ncbi.nlm.nih.gov/40467022/', status: 'verified', checkedAt: '2026-11-15' },
];

export const GUIDELINE_MAP: Record<string, Guideline> = Object.fromEntries(GUIDELINES.map((g) => [g.id, g]));

export const doiUrl = (g: Guideline) => (g.doi ? `https://doi.org/${g.doi}` : g.url);
