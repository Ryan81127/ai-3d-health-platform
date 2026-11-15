/**
 * 五大疾病標準化衛教資料模組（P1）。
 *
 * 每一則說明（Claim）都標示來源與核對程度：
 *   text      已逐字對照指引原文、官方摘要或官方 PDF
 *   citation  指引出處已確認，但這句的內容尚未以全文逐字核對
 *   general   一般生理學或公共衛生知識，非來自指定指引，需由醫療專業人員確認
 *
 * 審閱狀態由 reviewers.ts 的審閱名單推算；名單未填齊前顯示「待醫學審閱」。
 * 衛教邊界：區分風險、症狀、臨床診斷與已確診疾病；不以單一症狀判斷疾病；
 * 藥物僅作客觀介紹，不提供個人處方或停藥建議；食物與營養補充品不能取代必要醫療。
 */
import type { ReviewState } from './reviewers';

export type Check = 'text' | 'citation' | 'general';

export interface Claim {
  text: string;
  src: { g: string; where?: string }[];
  check: Check;
}

export type SectionKey = 'define' | 'mechanism' | 'organs' | 'lifestyle' | 'nutrition' | 'meds' | 'redflags';

export interface DiseaseModule {
  id: string; // 與 topics.ts 的主題 id 相同
  title: string;
  en: string;
  organs: string[];
  specialty: string; // 建議審閱的專科
  review: ReviewState;
  /** 3D 機制動畫的規劃（P3）；目前尚未完成 */
  animPlan: string[];
  sections: { key: SectionKey; title: string; claims: Claim[] }[];
}

export const SECTION_TITLE: Record<SectionKey, string> = {
  define: '定義與診斷（風險≠症狀≠診斷）',
  mechanism: '生理機制（衛教示意）',
  organs: '可能相關的器官影響',
  lifestyle: '生活型態',
  nutrition: '飲食與營養',
  meds: '藥物（客觀衛教，非處方建議）',
  redflags: '就醫警訊',
};

const created = { date: '2026-11-15', note: '依 P0 核對的指引建立初版草稿' };
const MED_NOTE: Claim = { text: '藥物需由醫師依個人狀況評估與處方。請勿自行開始、停用或調整藥物劑量；有疑問請與醫師或藥師討論。', src: [], check: 'general' };

export const DISEASES: DiseaseModule[] = [
  {
    id: 'hypertension', title: '高血壓', en: 'Hypertension', organs: ['heart', 'vessels', 'brain', 'kidneys'], specialty: '心臟內科或家醫科',
    review: { guidelineVersion: '2022 TSOC/THS；2026 THS 高齡者', changelog: [created], roles: [
      { role: '心臟內科或家醫科', required: true, records: [] },
      { role: '合格營養師（飲食與營養）', required: true, records: [] },
    ] },
    animPlan: ['正常血管與血壓調節', '血管收縮與周邊血管阻力', '長期高血壓可能造成的血管重塑', '心臟、腦部與腎臟的相關健康風險'],
    sections: [
      { key: 'define', title: SECTION_TITLE.define, claims: [
        { text: '2022 台灣指引建議：以標準化居家血壓量測為依據，血壓 ≥130/80 mmHg 定義為高血壓，一般治療目標為 <130/80 mmHg。', src: [{ g: 'tw-htn-2022', where: '摘要' }], check: 'text' },
        { text: '「722 量測法」：每次量 2 遍、每天早晚各量 1 次、連續量 7 天。', src: [{ g: 'tw-htn-2022', where: '摘要' }], check: 'text' },
        { text: '2026 高齡者指引依年齡層與常見共病分別訂定血壓目標，並強烈建議使用經驗證的示波式血壓計，定期在診間以外量測血壓。', src: [{ g: 'tw-htn-older-2026', where: '摘要' }], check: 'text' },
        { text: '單次量到偏高不等於高血壓，診斷需依標準化的多次量測並由醫師判斷。大多數高血壓沒有明顯症狀，頭暈、頭痛等症狀也不能用來判斷血壓高低。', src: [], check: 'general' },
      ] },
      { key: 'mechanism', title: SECTION_TITLE.mechanism, claims: [
        { text: '血壓的高低主要取決於心臟打出的血量與周邊血管的阻力。小動脈收縮、血管阻力上升時，維持血流需要更高的壓力。', src: [], check: 'general' },
        { text: '高齡者的高血壓與動脈變硬、對鹽較敏感、衰弱、姿勢性低血壓等特性有關。', src: [{ g: 'tw-htn-older-2026', where: '摘要' }], check: 'text' },
        { text: '長期血壓偏高時，動脈壁可能逐漸增厚、變硬（血管重塑），心臟也需要更用力收縮。進展速度因人而異，並非每個人都會發生。', src: [], check: 'general' },
      ] },
      { key: 'organs', title: SECTION_TITLE.organs, claims: [
        { text: '指引以「高血壓造成的器官損傷（HMOD）」評估心臟、腦部、腎臟與血管等器官，並作為治療調整的參考。', src: [{ g: 'tw-htn-2022', where: '摘要' }], check: 'text' },
        { text: '長期未控制的高血壓與中風、心臟衰竭、冠心病及腎功能下降的風險上升相關。這是群體層次的風險，不是個人預測。', src: [], check: 'general' },
      ] },
      { key: 'lifestyle', title: SECTION_TITLE.lifestyle, claims: [
        { text: '2022 台灣指引以「S-ABCDE」口訣整理生活型態調整，適用於血壓偏高者與高血壓患者，以降低一生的血壓負擔。', src: [{ g: 'tw-htn-2022', where: '摘要' }], check: 'text' },
        { text: 'S-ABCDE 一般理解為：減鹽（S）、限酒（A）、減重（B）、戒菸（C）、飲食調整（D）、規律運動（E）。各項的具體數值需以指引全文確認。', src: [{ g: 'tw-htn-2022' }], check: 'citation' },
        { text: '2026 高齡者指引鼓勵：減少鈉攝取、使用含鉀代鹽、健康飲食型態與身體活動。', src: [{ g: 'tw-htn-older-2026', where: '摘要' }], check: 'text' },
      ] },
      { key: 'nutrition', title: SECTION_TITLE.nutrition, claims: [
        { text: '減少鈉攝取是指引強調的飲食重點；鈉的主要來源包括食鹽、醬料、加工食品與湯品。', src: [{ g: 'tw-htn-older-2026', where: '摘要' }], check: 'text' },
        { text: '含鉀代鹽可降低鈉攝取，但腎功能不佳或服用部分降血壓藥（如 ACEI、ARB、保鉀利尿劑）的人可能有高血鉀風險，使用前須先詢問醫師。', src: [{ g: 'tw-htn-older-2026', where: '摘要（含鉀代鹽）' }], check: 'citation' },
      ] },
      { key: 'meds', title: SECTION_TITLE.meds, claims: [
        { text: '2022 台灣指引將五大類藥物列為第一線降血壓藥：ACEI、ARB、乙型阻斷劑、鈣離子阻斷劑、thiazide 類利尿劑；血壓高於目標 20/10 mmHg 以上時，建議起始即合併用藥，優先使用單一複方錠。', src: [{ g: 'tw-htn-2022', where: '摘要' }], check: 'text' },
        { text: '高齡者用藥以個人化為原則，衰弱長者特別要避免過度治療。', src: [{ g: 'tw-htn-older-2026', where: '摘要' }], check: 'text' },
        MED_NOTE,
      ] },
      { key: 'redflags', title: SECTION_TITLE.redflags, claims: [
        { text: '血壓明顯升高並伴隨胸痛、呼吸困難、劇烈頭痛、單側無力或口齒不清、視力突然改變時，請立即撥打 119 或前往急診。', src: [], check: 'general' },
      ] },
    ],
  },
  {
    id: 'atherosclerosis', title: '動脈粥狀硬化', en: 'Atherosclerosis', organs: ['vessels', 'heart', 'brain'], specialty: '心臟內科',
    review: { guidelineVersion: '2026 ACC/AHA 多學會血脂異常指引', changelog: [created], roles: [
      { role: '心臟內科', required: true, records: [] },
      { role: '合格營養師（飲食與營養）', required: true, records: [] },
    ] },
    animPlan: ['正常動脈內皮', 'LDL 脂蛋白進入血管壁', '發炎細胞與泡沫細胞形成', '粥狀斑塊的發展', '斑塊破裂與血栓形成的可能機制'],
    sections: [
      { key: 'define', title: SECTION_TITLE.define, claims: [
        { text: '動脈粥狀硬化是動脈壁內逐漸形成斑塊的過程，早期通常沒有症狀。是否有斑塊或狹窄需靠醫療檢查評估，不能由症狀或單一血脂數值判斷。', src: [], check: 'general' },
        { text: '2026 ACC/AHA 多學會指引是目前美國血脂異常管理的主要依據（2026 年 4 月發表，6 月與 9 月發布勘誤）。', src: [{ g: 'acc-aha-lipid-2026' }], check: 'text' },
      ] },
      { key: 'mechanism', title: SECTION_TITLE.mechanism, claims: [
        { text: '正常的動脈內皮平滑，會調節血管舒張並減少血球黏附。', src: [], check: 'general' },
        { text: 'LDL 脂蛋白可進入血管內皮下層並被修飾，引發發炎反應；單核球進入血管壁轉變為巨噬細胞，吞噬脂質後形成泡沫細胞。', src: [], check: 'general' },
        { text: '脂質與細胞逐漸堆積形成斑塊，外層由纖維帽覆蓋。部分斑塊可能破裂，引發血栓而阻塞血流。斑塊的形成速度與順序因人而異，並非每個人都會依固定時間或步驟發生。', src: [], check: 'general' },
      ] },
      { key: 'organs', title: SECTION_TITLE.organs, claims: [
        { text: '發生在冠狀動脈時與心絞痛、心肌梗塞相關；發生在腦部或頸部動脈時與缺血性中風相關；發生在下肢動脈時與周邊動脈疾病相關。', src: [], check: 'general' },
      ] },
      { key: 'lifestyle', title: SECTION_TITLE.lifestyle, claims: [
        { text: '血脂管理指引將健康生活型態（不吸菸、規律身體活動、健康飲食、維持體重）列為所有人降低動脈粥狀硬化心血管疾病風險的基礎。具體建議需以指引全文確認。', src: [{ g: 'acc-aha-lipid-2026' }], check: 'citation' },
      ] },
      { key: 'nutrition', title: SECTION_TITLE.nutrition, claims: [
        { text: '以蔬果、全穀、豆類、堅果、魚類為主，減少飽和脂肪與反式脂肪的飲食型態，有助於改善血脂。', src: [], check: 'general' },
      ] },
      { key: 'meds', title: SECTION_TITLE.meds, claims: [
        { text: 'Statin（他汀類）是降低 LDL 膽固醇的主要藥物，是否使用與目標值依個人整體心血管風險而定。指引中的 LDL 目標值需以全文確認。', src: [{ g: 'acc-aha-lipid-2026' }], check: 'citation' },
        MED_NOTE,
      ] },
      { key: 'redflags', title: SECTION_TITLE.redflags, claims: [
        { text: '胸痛或胸悶合併冒冷汗、喘、疼痛延伸至手臂或下巴；突然單側無力、臉歪嘴斜、口齒不清，請立即撥打 119。', src: [], check: 'general' },
      ] },
    ],
  },
  {
    id: 't2dm', title: '第二型糖尿病', en: 'Type 2 Diabetes', organs: ['pancreas', 'liver', 'muscles', 'kidneys', 'eyes', 'nerves'], specialty: '新陳代謝科',
    review: { guidelineVersion: 'ADA Standards of Care 2026；台灣糖尿病學會指引待核對', changelog: [created], roles: [
      { role: '新陳代謝科', required: true, records: [] },
      { role: '合格營養師（飲食與營養）', required: true, records: [] },
    ] },
    animPlan: ['正常血糖調節', '胰臟與胰島素', '細胞葡萄糖攝取', '胰島素阻抗', '長期高血糖與微血管健康風險'],
    sections: [
      { key: 'define', title: SECTION_TITLE.define, claims: [
        { text: '糖尿病需以抽血檢驗診斷：糖化血色素（HbA1c）≥6.5%、空腹血漿血糖 ≥126 mg/dL，或口服葡萄糖耐受試驗 2 小時血糖 ≥200 mg/dL。', src: [{ g: 'ada-2026-s2' }, { g: 'easl-masld-2024', where: 'Table 3：MASLD 定義中的心血管代謝風險因子' }], check: 'text' },
        { text: '口服葡萄糖耐受試驗 2 小時血糖 140–199 mg/dL 屬於葡萄糖耐受不良（糖尿病前期的一種）。', src: [{ g: 'easl-masld-2024', where: 'Table 3' }], check: 'text' },
        { text: '口渴、頻尿等症狀可能與血糖偏高有關，但不能用來確診；沒有症狀也不代表血糖正常。', src: [], check: 'general' },
      ] },
      { key: 'mechanism', title: SECTION_TITLE.mechanism, claims: [
        { text: '進食後胰臟的 β 細胞分泌胰島素，幫助葡萄糖進入肌肉、肝臟與脂肪細胞。', src: [], check: 'general' },
        { text: '第二型糖尿病的核心是細胞對胰島素的反應下降（胰島素阻抗），加上胰島素分泌逐漸不足，使血糖長期偏高。', src: [], check: 'general' },
      ] },
      { key: 'organs', title: SECTION_TITLE.organs, claims: [
        { text: '長期高血糖與微血管併發症相關：視網膜病變、腎臟病變與神經病變；ADA 指引有獨立章節說明篩檢與照護。', src: [{ g: 'ada-2026-s12' }], check: 'citation' },
      ] },
      { key: 'lifestyle', title: SECTION_TITLE.lifestyle, claims: [
        { text: 'ADA 指引第 5 章涵蓋營養治療、身體活動、戒菸、睡眠與心理健康等健康行為。具體建議需以章節全文確認。', src: [{ g: 'ada-2026-s5' }], check: 'citation' },
        { text: 'WHO 建議成人每週至少 150–300 分鐘中等強度有氧活動，並有 2 天以上的肌力訓練。', src: [], check: 'general' },
      ] },
      { key: 'nutrition', title: SECTION_TITLE.nutrition, claims: [
        { text: '選擇未精製全穀、足量蔬菜、優質蛋白質，減少含糖飲料與精製澱粉；醣類份量與分配應與醫療團隊或營養師討論。', src: [], check: 'general' },
      ] },
      { key: 'meds', title: SECTION_TITLE.meds, claims: [
        { text: '降血糖藥物有多種類別，選擇會考量心臟、腎臟共病與體重。指引內容需以 ADA 第 9 章全文確認。', src: [], check: 'general' },
        MED_NOTE,
      ] },
      { key: 'redflags', title: SECTION_TITLE.redflags, claims: [
        { text: '極度口渴、頻尿合併嘔吐、腹痛、呼吸急促或意識改變時，請立即就醫。', src: [], check: 'general' },
      ] },
    ],
  },
  {
    id: 'fatty-liver', title: '脂肪肝（MASLD）', en: 'Metabolic dysfunction-associated steatotic liver disease', organs: ['liver', 'pancreas', 'vessels'], specialty: '肝膽腸胃科',
    review: { guidelineVersion: '2024 EASL–EASD–EASO；AASLD 2023', changelog: [created], roles: [
      { role: '肝膽腸胃科', required: true, records: [] },
      { role: '合格營養師（飲食與營養）', required: true, records: [] },
    ] },
    animPlan: ['正常肝細胞', '肝細胞脂肪堆積', '可能發生的肝臟發炎', '肝纖維化形成', '生活習慣與代謝風險的關係'],
    sections: [
      { key: 'define', title: SECTION_TITLE.define, claims: [
        { text: 'MASLD（舊稱 NAFLD）的定義：脂肪性肝病，並至少合併一項心血管代謝風險因子，且沒有過量飲酒。', src: [{ g: 'easl-masld-2024', where: 'Summary' }], check: 'text' },
        { text: '疾病光譜包括單純脂肪變性、脂肪性肝炎（MASH，舊稱 NASH）、纖維化、肝硬化，以及 MASH 相關肝細胞癌。', src: [{ g: 'easl-masld-2024', where: 'Summary' }], check: 'text' },
        { text: '有心血管代謝風險因子、肝指數異常或影像顯示脂肪肝者，特別是有第二型糖尿病或肥胖合併其他代謝風險者，建議以非侵入性檢查評估纖維化：先用血液分數（如 FIB-4），再視需要接著做影像檢查（如瞬態彈性成像）。', src: [{ g: 'easl-masld-2024', where: 'Summary' }], check: 'text' },
      ] },
      { key: 'mechanism', title: SECTION_TITLE.mechanism, claims: [
        { text: '肝細胞內三酸甘油酯過度堆積形成脂肪肝；部分人可能進一步出現發炎與肝細胞損傷，長期下來可能形成纖維化。進展與否因人而異。', src: [], check: 'general' },
        { text: '肝臟本身沒有痛覺神經，早期變化通常沒有症狀，需靠檢查發現。', src: [], check: 'general' },
      ] },
      { key: 'organs', title: SECTION_TITLE.organs, claims: [
        { text: '進階纖維化可預測肝臟相關的預後。', src: [{ g: 'easl-masld-2024', where: 'Summary' }], check: 'text' },
      ] },
      { key: 'lifestyle', title: SECTION_TITLE.lifestyle, claims: [
        { text: '成人 MASLD 建議生活型態調整：減重、飲食改變、身體活動，並勸導避免飲酒；同時妥善處理共病。', src: [{ g: 'easl-masld-2024', where: 'Summary' }], check: 'text' },
        { text: '體重過重或肥胖者：減重 ≥5% 可改善脂肪變性，減重 ≥7–10% 可改善脂肪性肝炎與纖維化。', src: [{ g: 'easl-masld-2024', where: 'Fig. 3：MASLD 生活型態管理流程' }], check: 'text' },
        { text: '每週 >150 分鐘中等強度或 75 分鐘高強度身體活動，並減少久坐時間。', src: [{ g: 'easl-masld-2024', where: 'Fig. 3：MASLD 生活型態管理流程' }], check: 'text' },
      ] },
      { key: 'nutrition', title: SECTION_TITLE.nutrition, claims: [
        { text: '地中海飲食或類似的健康飲食型態；減少加工肉品、超加工食品與含糖飲料，增加未加工或少加工的食物。', src: [{ g: 'easl-masld-2024', where: 'Fig. 3：MASLD 生活型態管理流程' }], check: 'text' },
      ] },
      { key: 'meds', title: SECTION_TITLE.meds, claims: [
        { text: '合併第二型糖尿病或肥胖者，可視適應症使用腸泌素類藥物（如 semaglutide、tirzepatide）；肥胖者也可考慮減重手術。非肝硬化的 MASH 合併顯著纖維化（≥F2），在當地核准時可考慮 resmetirom。目前沒有可推薦用於肝硬化階段的 MASH 專用藥物。', src: [{ g: 'easl-masld-2024', where: 'Summary' }], check: 'text' },
        MED_NOTE,
      ] },
      { key: 'redflags', title: SECTION_TITLE.redflags, claims: [
        { text: '出現皮膚或眼白變黃、腹部腫脹、解黑便或吐血、意識混亂時，請儘速就醫。', src: [], check: 'general' },
      ] },
    ],
  },
  {
    id: 'dry-eye', title: '乾眼症', en: 'Dry Eye Disease', organs: ['eyes'], specialty: '眼科',
    review: { guidelineVersion: 'TFOS DEWS III（2025）', changelog: [created], roles: [
      { role: '眼科', required: true, records: [] },
      { role: '合格營養師（飲食與營養）', required: true, records: [] },
    ] },
    animPlan: ['眼球與角膜結構', '淚膜的主要組成', '正常眨眼與淚膜分布', '淚膜不穩定與蒸發', '眼表發炎及乾眼相關機制'],
    sections: [
      { key: 'define', title: SECTION_TITLE.define, claims: [
        { text: 'TFOS DEWS III 定義：乾眼是一種多因子、有症狀的疾病，特徵是淚膜和／或眼表失去恆定，淚膜不穩定與高滲透壓、眼表發炎與損傷，以及神經感覺異常都是致病因素。', src: [{ g: 'dews3-dx', where: '修訂定義' }], check: 'text' },
        { text: 'DEWS III 建議以簡化版眼表疾病指數（OSDI-6）作為篩檢問卷，再檢查淚膜與眼表。診斷需由眼科專業人員進行。', src: [{ g: 'dews3-dx' }], check: 'text' },
      ] },
      { key: 'mechanism', title: SECTION_TITLE.mechanism, claims: [
        { text: '乾眼可依病因分類：淚膜成分不足（脂質層、水液層、黏液／醣萼）、眼瞼異常（眨眼或閉眼不完全）以及眼表異常。', src: [{ g: 'dews3-dx', where: 'Disease drivers' }], check: 'text' },
        { text: '研究區分出水液缺乏型與以蒸發為主的類型；瞼板腺分泌的脂質品質會影響淚液蒸發與淚膜穩定。', src: [{ g: 'dews3-digest', where: 'Pathophysiology／Tear film' }], check: 'text' },
      ] },
      { key: 'organs', title: SECTION_TITLE.organs, claims: [
        { text: '主要影響角膜、結膜、眼瞼（瞼板腺）與淚腺等眼表構造。', src: [{ g: 'dews3-digest' }], check: 'citation' },
      ] },
      { key: 'lifestyle', title: SECTION_TITLE.lifestyle, claims: [
        { text: '減少可控制的風險因子：使用螢幕時眨眼次數減少、眨眼不完全、睡眠不足、化妝品使用與環境因素。', src: [{ g: 'dews3-mgmt', where: '官方摘要' }], check: 'text' },
        { text: '可行的調整：使用 3C 時定時休息、提高室內濕度、改善眨眼品質；瞼板腺功能異常常以熱敷處理。', src: [{ g: 'dews3-mgmt', where: '官方摘要' }], check: 'text' },
      ] },
      { key: 'nutrition', title: SECTION_TITLE.nutrition, claims: [
        { text: 'DEWS III 將營養與替代療法列為輔助；魚油或亞麻仁籽的 Omega-3 脂肪酸「可能」有幫助，不能取代眼科治療。', src: [{ g: 'dews3-mgmt', where: '官方摘要' }], check: 'text' },
      ] },
      { key: 'meds', title: SECTION_TITLE.meds, claims: [
        { text: '第一線處理以補充、保存與刺激淚膜為主，人工淚液是治療基礎；依病因可能使用抗發炎藥物或診間治療。', src: [{ g: 'dews3-mgmt', where: '摘要' }], check: 'text' },
        MED_NOTE,
      ] },
      { key: 'redflags', title: SECTION_TITLE.redflags, claims: [
        { text: '突然視力下降且眨眼後沒有改善，需要緊急就醫排除其他原因（例如血管阻塞）。乾眼通常是雙側；明顯單眼紅、痛，或伴隨分泌物、腫脹，可能是其他眼疾，應就醫評估。', src: [{ g: 'dews3-dx', where: '病史問診表' }], check: 'text' },
      ] },
    ],
  },
];

export const DISEASE_MAP: Record<string, DiseaseModule> = Object.fromEntries(DISEASES.map((d) => [d.id, d]));
export const CHECK_LABEL: Record<Check, string> = { text: '已對照原文', citation: '出處已確認・內容待全文核對', general: '一般衛教知識・待醫學審閱' };
