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

export type SectionKey = 'define' | 'mechanism' | 'organs' | 'screening' | 'lifestyle' | 'nutrition' | 'meds' | 'redflags';

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
  screening: '篩檢與早期發現',
  lifestyle: '生活型態',
  nutrition: '飲食與營養',
  meds: '藥物（客觀衛教，非處方建議）',
  redflags: '就醫警訊',
};

const created = { date: '2026-11-15', note: '依 P0 核對的指引建立初版草稿' };
const MED_NOTE: Claim = { text: '藥物需由醫師依個人狀況評估與處方。請勿自行開始、停用或調整藥物劑量；有疑問請與醫師或藥師討論。', src: [], check: 'general' };

/* 第一批起使用的簡寫：t＝已對照原文，gen＝一般衛教知識，sec＝分節 */
const t = (text: string, g: string, where?: string): Claim => ({ text, src: [{ g, where }], check: 'text' });
const gen = (text: string): Claim => ({ text, src: [], check: 'general' });
const sec = (key: SectionKey, claims: Claim[]) => ({ key, title: SECTION_TITLE[key], claims });
const rev = (guidelineVersion: string, specialty: string): ReviewState => ({
  guidelineVersion, changelog: [{ date: '2026-11-15', note: '第一批常見疾病：依官方衛教頁面原文建立初版' }],
  roles: [{ role: specialty, required: true, records: [] }, { role: '合格營養師（飲食與營養）', required: true, records: [] }],
});
const TREAT = gen('治療方式由專科醫師依癌症種類與分期決定。');
const MALE_MODEL = gen('目前的 3D 模型為成年男性，無法顯示這個器官。');
const EMERGENCY = gen('出現胸痛、嚴重呼吸困難、突然單側無力或口齒不清、意識改變時，請立即撥打 119。');

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
  /* ===== 第一批常見疾病（2026-11-15） ===== */
  {
    id: 'metabolic-syndrome', title: '代謝症候群', en: 'Metabolic Syndrome', organs: ['pancreas', 'liver', 'vessels', 'heart'], specialty: '家醫科或新陳代謝科',
    review: rev('國健署代謝症候群（代謝症候群學習手冊 105 年版）', '家醫科或新陳代謝科'),
    animPlan: ['腹部內臟脂肪堆積', '胰島素阻抗與血糖上升', '五項判定因子與心血管風險'],
    sections: [
      sec('define', [
        t('判定標準共五項：(1) 腹部肥胖：男性腰圍 ≥90 公分、女性 ≥80 公分；(2) 收縮壓 ≥130 mmHg 或舒張壓 ≥85 mmHg；(3) 空腹血糖 ≥100 mg/dL；(4) 空腹三酸甘油酯 ≥150 mg/dL；(5) 高密度脂蛋白膽固醇男性 <40、女性 <50 mg/dL。符合三項（含）以上即判定為代謝症候群。', 'hpa-metsyn', '一、誰是代謝症候群病人'),
        t('代謝症候群可預防也可治療；若不及早檢查治療，與一般人相比，得到糖尿病的風險增加 6 倍、高血壓 4 倍、高血脂 3 倍、心臟病及腦中風 2 倍。', 'hpa-metsyn', '簡介'),
        gen('判定需依實際量測腰圍、血壓與抽血結果，不能只看外觀或症狀判斷。'),
      ]),
      sec('mechanism', [
        t('胰島素阻抗是發生代謝症候群的原因：細胞對胰島素的敏感度變差，血液中的葡萄糖不容易進入細胞，身體代謝就會出問題。', 'hpa-metsyn', '三、胰島素阻抗'),
        t('腹部肥胖代表內臟脂肪堆積多。BMI 無法完全反映內臟脂肪；腰圍代表脂肪分布，腰圍粗、內臟脂肪多更容易導致代謝異常。', 'hpa-metsyn', '四、以腹部肥胖偵測'),
      ]),
      sec('organs', [
        gen('長期可能影響血管、心臟、腦血管，以及胰臟與肝臟的代謝功能。這是群體層次的風險，不代表每個人都會發生。'),
      ]),
      sec('lifestyle', [
        t('成因中不良生活型態約佔 50%、遺傳因素約佔 20%；家族中有高血壓、糖尿病、高血脂的人機率較高；長期壓力也可能使血糖上升。', 'hpa-metsyn', '二、為什麼會得到'),
        t('預防五大絕招：聰明選、健康吃；減少久坐，一天至少運動 30 分鐘；不吸菸、少喝酒；紓解壓力，必要時尋求醫師或臨床心理師協助；善用成人預防保健檢查，及早發現。', 'hpa-metsyn', '五、預防代謝症候群'),
      ]),
      sec('nutrition', [
        t('「三低一高」健康飲食口訣：低油、低糖、低鹽、高纖。低纖、高糖、高油脂飲食與過量飲酒的人較容易有代謝症候群。', 'hpa-metsyn', '二、五'),
      ]),
      sec('meds', [gen('若血壓、血糖或血脂已達疾病標準，需由醫師評估是否治療。'), MED_NOTE]),
      sec('redflags', [EMERGENCY]),
    ],
  },
  {
    id: 'stroke', title: '腦中風', en: 'Stroke', organs: ['brain', 'vessels', 'heart'], specialty: '神經內科',
    review: rev('國健署腦血管疾病；MedlinePlus Stroke', '神經內科'),
    animPlan: ['腦部血流與缺血', '血管阻塞與血管破裂出血的差異', '三高與腦血管風險'],
    sections: [
      sec('define', [
        t('腦中風分兩種：缺血性中風是血塊阻塞腦部血管，約佔 80%；出血性中風是腦部血管破裂出血。另有暫時性腦缺血（TIA），症狀類似中風。', 'mp-stroke', 'Types of stroke'),
        t('腦中風是全球死亡與失能的主要原因；腦血管疾病長期為國人十大死因第 2–4 位，存活後常遺留不同程度的神經功能障礙。', 'hpa-stroke'),
      ]),
      sec('mechanism', [gen('腦細胞需要持續的血流供應氧氣與養分，血流中斷時腦組織可能在短時間內受損，所以越早治療越好。')]),
      sec('organs', [gen('依受影響的腦部位置不同，可能影響肢體活動、說話、理解、視力、平衡與吞嚥。')]),
      sec('lifestyle', [
        t('高血壓、高血糖、高血脂者發生中風的風險，分別是非三高者的 2.84、2.86 與 2.37 倍。有三高問題應尋求醫療協助並定期回診；國健署列出的控制數字為血壓 <140/90 mmHg、醣化血色素 <7%、低密度脂蛋白膽固醇 <100 mg/dL（個人目標依醫師評估）。', 'hpa-stroke', '一、掌握三高關鍵控制數字'),
        t('規律運動：每週五次（至少三次），每次 30 分鐘；維持 BMI 18.5–24，腰圍男性 <90 公分、女性 <80 公分；戒菸、節酒。', 'hpa-stroke', '三、四、五'),
        t('40–64 歲每 3 年一次、65 歲以上每年一次，可使用國民健康署免費成人預防保健服務檢查血壓、血糖、血脂、BMI 與腰圍。', 'hpa-stroke', '六、定期健康檢查'),
      ]),
      sec('nutrition', [
        t('「三少二多」：少調味品、低油脂、少加工食品、多蔬果、多高纖；每日鈉攝取量少於 2.4 公克（約 6 公克食鹽、1 茶匙）。', 'hpa-stroke', '二、選擇健康飲食'),
      ]),
      sec('meds', [MED_NOTE]),
      sec('redflags', [
        t('中風症狀通常突然發生：臉、手或腳突然麻木或無力（特別是單側）；突然意識混亂、說話或理解困難；單眼或雙眼突然看不清楚；突然走路困難、頭暈、失去平衡；突然出現原因不明的劇烈頭痛。', 'mp-stroke', 'Symptoms'),
        gen('出現上述任一症狀，請立即撥打 119 並記下發作時間，不要等待症狀自行消失。'),
      ]),
    ],
  },
  {
    id: 'ckd', title: '慢性腎臟病', en: 'Chronic Kidney Disease', organs: ['kidneys', 'vessels', 'heart'], specialty: '腎臟科',
    review: rev('國健署腎臟病；NIDDK', '腎臟科'),
    animPlan: ['腎絲球過濾血液', '高血壓與高血糖對腎絲球微血管的影響', '水分與廢物堆積'],
    sections: [
      sec('define', [
        t('慢性腎臟病是腎臟受損或結構異常，無法正常過濾血液，使廢物與多餘水分堆積在體內。', 'niddk-ckd'),
        t('大多數早期患者沒有症狀，很多人到腎臟病晚期才出現症狀；唯一確認的方法是做血液與尿液檢查。', 'niddk-ckd', 'Symptoms of early CKD'),
      ]),
      sec('mechanism', [
        t('腎臟由許多腎絲球與腎元組成，含有豐富微血管。血壓、血糖或血脂控制不好會傷害血管壁；高血壓使腎臟無法有效過濾廢物，高血糖則可能導致腎絲球硬化與腎元破壞。', 'hpa-kidney'),
      ]),
      sec('organs', [
        t('腎臟無法排除多餘水分與鹽分時，可能出現水腫，常見於腿、腳、腳踝，較少見於手或臉。部分人可能進展到腎衰竭。', 'niddk-ckd'),
      ]),
      sec('lifestyle', [
        t('腎臟保健八項守則：監測及控制三高、規律運動、健康飲食、體重控制、多喝水、不抽菸、避免服用不當藥物、定期檢查腎功能。', 'hpa-kidney'),
        t('預防或控制糖尿病與高血壓，可能預防慢性腎臟病或減緩惡化。', 'niddk-ckd'),
      ]),
      sec('nutrition', [gen('已確診者的蛋白質、鉀、磷與水分攝取需依醫師與營養師指示調整，不建議自行限制或補充。')]),
      sec('meds', [t('避免服用會傷害腎臟的藥物。', 'niddk-ckd'), gen('止痛藥、來路不明的藥物或保健食品，使用前請先詢問醫師或藥師。'), MED_NOTE]),
      sec('redflags', [gen('尿量明顯減少、全身水腫、呼吸困難或意識改變時，請儘速就醫。')]),
    ],
  },
  {
    id: 'asthma', title: '氣喘', en: 'Asthma', organs: ['airway', 'lungs'], specialty: '胸腔內科（兒童為小兒科）',
    review: rev('國健署慢性呼吸道疾病；WHO Asthma fact sheet（2026）', '胸腔內科（兒童為小兒科）'),
    animPlan: ['正常支氣管', '發炎與平滑肌收縮使氣道變窄', '吸入藥物的作用'],
    sections: [
      sec('define', [
        t('氣喘是受到過敏原或刺激物刺激後，支氣管產生慢性發炎，可能出現呼吸困難、喘鳴音、胸悶和咳嗽。', 'hpa-resp', '氣喘'),
        t('症狀可輕可重、時好時壞；這些症狀也可能由其他疾病造成，有症狀的人應由醫療人員評估。', 'who-asthma', 'Symptoms'),
      ]),
      sec('mechanism', [t('小氣道發炎，加上周圍肌肉收縮，使氣道變窄、呼吸變得困難。', 'who-asthma')]),
      sec('organs', [t('家族中有人有氣喘、本身有濕疹或過敏性鼻炎等過敏疾病，以及過重或肥胖，都與氣喘風險較高有關。', 'who-asthma', 'Causes')]),
      sec('lifestyle', [
        t('保持清潔、遠離過敏原：塵蟎、蟑螂、黴菌、花粉與寵物毛髮是常見誘發因子；寢具每 1–2 週以 55 度熱水清洗。', 'hpa-resp', '控制氣喘 4 觀念'),
        t('避免刺激物：戒菸並避免二手菸；注意氣溫驟變、空氣污染、突然劇烈運動與刺激性氣味。運動前暖身 15–30 分鐘，並隨身攜帶藥物。', 'hpa-resp', '控制氣喘 4 觀念'),
      ]),
      sec('nutrition', [gen('維持健康體重；飲食均衡，留意個人確定會誘發症狀的食物。')]),
      sec('meds', [
        t('氣喘目前無法治癒，但可以控制。最常見的治療是吸入器，把藥物直接送到肺部：支氣管擴張劑用來緩解症狀，吸入型類固醇用來減少發炎。', 'who-asthma', 'Treatment'),
        t('應遵從醫囑按時用藥、不可自行停藥，並定期回診。', 'hpa-resp', '定期回診、正確用藥'),
        t('醫療人員可能提供氣喘行動計畫，說明症狀惡化時如何增加治療，以避免嚴重發作。', 'who-asthma', 'Self-care'),
        MED_NOTE,
      ]),
      sec('redflags', [gen('喘到無法說完一句話、嘴唇發紫，或使用緩解藥物後仍無改善時，請立即撥打 119 或前往急診。')]),
    ],
  },
  {
    id: 'copd', title: '慢性阻塞性肺病（COPD）', en: 'Chronic Obstructive Pulmonary Disease', organs: ['lungs', 'airway', 'heart'], specialty: '胸腔內科',
    review: rev('國健署慢性呼吸道疾病', '胸腔內科'),
    animPlan: ['正常肺泡與氣體交換', '肺氣腫與呼吸道阻塞', '吸菸對呼吸道的影響'],
    sections: [
      sec('define', [
        t('慢性阻塞性肺病是呼吸道長期發炎，導致無法恢復的呼吸道阻塞，包括「慢性支氣管炎」與「肺氣腫」兩大類型，常見症狀為「咳、痰、悶、喘」。', 'hpa-resp', 'COPD'),
      ]),
      sec('mechanism', [t('呼吸道阻塞使氣體無法通暢進出，肺部氣體交換功能變差。', 'hpa-resp', 'COPD')]),
      sec('organs', [t('可能伴隨心血管疾病、骨質疏鬆、糖尿病、肺癌等共病，影響生活品質。', 'hpa-resp', 'COPD')]),
      sec('lifestyle', [
        t('約 9 成患者是因吸菸引起，但確診者中仍有 4 成在吸菸；請戒菸並遠離二手菸、三手菸。', 'hpa-resp', 'COPD'),
        t('日常建議：勤練腹式呼吸；多喝水、勤拍痰；多走路、勤活動；常洗手、外出戴口罩；避免人多與密閉的環境。', 'hpa-resp', 'COPD 十項建議'),
      ]),
      sec('nutrition', [t('飲食要均衡。', 'hpa-resp', 'COPD 十項建議')]),
      sec('meds', [t('相信專業、配合醫囑，正確並確實用藥。', 'hpa-resp', 'COPD 十項建議'), MED_NOTE]),
      sec('redflags', [gen('喘明顯加重、嘴唇或指甲發紫、意識改變時，請立即就醫或撥打 119。')]),
    ],
  },
  {
    id: 'osteoporosis', title: '骨質疏鬆症', en: 'Osteoporosis', organs: ['bones'], specialty: '骨科或內分泌科',
    review: rev('國健署骨質疏鬆', '骨科或內分泌科'),
    animPlan: ['正常骨小樑', '骨流失與孔隙增加', '負重運動與鈣質對骨骼的作用'],
    sections: [
      sec('define', [
        t('骨量大約在 20–30 歲達到高峰，之後逐漸減少；女性停經後骨流失加快。骨流失過多會在骨骼中形成許多孔隙，使骨骼變脆、變弱。', 'hpa-osteo'),
        t('骨質疏鬆是沉默的疾病，大多沒有明顯症狀，有些人只出現身高變矮或駝背；輕微跌倒或彎腰搬東西就可能骨折。', 'hpa-osteo'),
        t('曾經骨折或 65 歲以上的婦女等高風險者，可依醫師建議做骨鬆檢查；大規模社區篩檢的國際實證目前仍不足。', 'hpa-osteo'),
      ]),
      sec('mechanism', [
        t('風險因子包括：父母曾骨折（特別是髖骨骨折）、曾發生骨鬆性骨折（再次骨折機率為兩倍）、服用類固醇、停經、卵巢切除或 45 歲前提早更年期。', 'hpa-osteo'),
      ]),
      sec('organs', [t('骨折可能引發嚴重疼痛、無法行動、長期失能，甚至死亡。', 'hpa-osteo')]),
      sec('lifestyle', [
        t('從事負重運動可增加骨密度與肌肉，改善平衡、降低跌倒與骨折風險，例如健走、慢跑、爬樓梯、舞蹈、登山、跳繩，或雙手拿約 0.5–1 公斤的啞鈴做操。', 'hpa-osteo'),
        t('適度曬太陽幫助身體製造維生素 D3：上午 10 點前或下午 2 點後，不擦防曬乳曬 10–20 分鐘，並避免曬傷。不吸菸、節制飲酒、避免過量咖啡與熬夜。', 'hpa-osteo'),
      ]),
      sec('nutrition', [
        t('多攝取骨骼需要的鈣質、維生素 D3 與蛋白質，例如乳品、高鈣豆製品、黑芝麻、小魚乾與深綠色蔬菜。', 'hpa-osteo'),
        t('世界骨質疏鬆基金會指出，年輕時多增加 10% 骨密度，可使骨質疏鬆延緩 13 年發生（引述自國民健康署）。', 'hpa-osteo'),
      ]),
      sec('meds', [t('已有骨質疏鬆者，藥物治療、規律運動與健康飲食都有助於維持骨骼健康。', 'hpa-osteo'), MED_NOTE]),
      sec('redflags', [gen('跌倒後無法站立或行走、出現劇烈背痛或髖部疼痛時，請儘速就醫。')]),
    ],
  },
  {
    id: 'depression', title: '憂鬱症', en: 'Depressive Disorder', organs: ['brain'], specialty: '精神科或身心科',
    review: rev('WHO Depression fact sheet（2026-09）', '精神科或身心科'),
    animPlan: ['情緒與腦部的關係（示意）', '壓力事件與恢復的循環', '運動、睡眠與社會支持的作用'],
    sections: [
      sec('define', [
        t('憂鬱症是常見的精神疾病，全球約 5.2% 的成人受影響，女性多於男性；憂鬱症可能導致自殺，但輕度、中度與重度憂鬱症都有有效治療。', 'who-depression', 'Key facts'),
        t('憂鬱發作時會情緒低落（悲傷、易怒、空虛）或對活動失去興趣，且一天大部分時間、幾乎每天、持續至少兩週，與一般的情緒起伏不同。', 'who-depression', 'Symptoms and patterns'),
        t('其他可能症狀：注意力差、過度罪惡感或自我價值低、對未來絕望、想到死亡或自殺、睡眠紊亂、食慾或體重改變、非常疲倦或沒有精力。', 'who-depression', 'Symptoms and patterns'),
        gen('是否罹患憂鬱症需由精神科或身心科醫師評估，不能只靠問卷或單一症狀判斷。'),
      ]),
      sec('mechanism', [
        t('憂鬱症是社會、心理與生物因素複雜交互作用的結果；經歷失業、喪親、創傷等不良生活事件的人較容易發生。', 'who-depression', 'Contributing factors'),
      ]),
      sec('organs', [
        t('憂鬱症與身體健康密切相關：缺乏活動、有害飲酒等因素，也是心血管疾病、癌症、糖尿病與呼吸道疾病的風險因子；罹患這些疾病的人也可能因疾病負擔而出現憂鬱。', 'who-depression', 'Contributing factors'),
      ]),
      sec('lifestyle', [
        t('自我照顧：持續做以前喜歡的活動、與親友保持聯繫、規律運動（即使只是短暫散步）、盡量維持規律的飲食與睡眠、避免或減少飲酒、不使用非法藥物。', 'who-depression', 'Self-care'),
      ]),
      sec('nutrition', [gen('維持規律、均衡的飲食；避免以酒精處理情緒。')]),
      sec('meds', [
        t('有效治療包括心理治療與藥物。心理治療是首要治療，中度與重度憂鬱症可合併抗憂鬱藥物；輕度憂鬱症不需要抗憂鬱藥物。', 'who-depression', 'Diagnosis and treatment'),
        MED_NOTE,
      ]),
      sec('redflags', [
        gen('有傷害自己或自殺的念頭時，請立即撥打 119 或前往急診，並告訴身邊信任的人。（台灣心理諮詢專線資訊待人工核對後補上）'),
      ]),
    ],
  },
  {
    id: 'menopause', title: '更年期症候群', en: 'Menopausal Syndrome', organs: ['brain', 'bones', 'heart'], specialty: '婦產科或家醫科',
    review: rev('國健署更年期保健', '婦產科或家醫科'),
    animPlan: ['卵巢荷爾蒙變化（示意；目前 3D 模型為男性，無法顯示女性生殖器官）', '荷爾蒙與骨質流失', '更年期症狀與生活調整'],
    sections: [
      sec('define', [
        t('婦女約在 45–52 歲時，卵巢逐漸停止製造女性荷爾蒙，月經從不規則到最後一年內不再有月經；停經前後的過渡期就是更年期。', 'hpa-menopause'),
        t('更年期是自然過程，不是疾病，多數人都會順利度過；約三成婦女會因女性荷爾蒙不足而出現身心不適。', 'hpa-menopause'),
      ]),
      sec('mechanism', [t('卵巢製造的女性荷爾蒙逐漸減少，是更年期身心變化的主要原因。', 'hpa-menopause')]),
      sec('organs', [
        t('生理症狀可能包括：熱潮紅、盜汗、虛弱、暈眩、胸悶、心悸、陰道乾澀、性交疼痛、頻尿、尿失禁與骨質流失；心理上可能有焦慮、煩躁、失眠、恐慌、心情低落與記憶力衰退。', 'hpa-menopause'),
        gen('胸悶、心悸也可能來自心臟問題，應就醫排除，不要直接歸因於更年期。'),
      ]),
      sec('lifestyle', [
        t('正常作息、充足睡眠、均衡飲食、規律運動，避免飲酒、吸菸與熬夜；學習情緒管理，積極參與社交活動。', 'hpa-menopause'),
      ]),
      sec('nutrition', [gen('更年期骨質流失加快，可多攝取含鈣與維生素 D 的食物（可參考「骨質疏鬆症」的飲食建議）。')]),
      sec('meds', [t('45 歲以上婦女身體不適時，可先與家庭醫學科或婦科醫師討論。', 'hpa-menopause'), MED_NOTE]),
      sec('redflags', [gen('停經一年以上又出現陰道出血，或經血量異常大、持續出血時，請儘速就醫。')]),
    ],
  },
  /* ===== 第二批常見疾病（2026-11-16） ===== */
  {
    id: 'dyslipidemia', title: '高血脂', en: 'Dyslipidemia', organs: ['vessels', 'liver', 'heart'], specialty: '心臟內科或新陳代謝科',
    review: rev('2022 台灣初級預防血脂指引；MedlinePlus Cholesterol', '心臟內科或新陳代謝科'),
    animPlan: ['LDL 與 HDL 在血液中的運送', '膽固醇與斑塊堆積', '生活調整與藥物的作用'],
    sections: [
      sec('define', [
        t('膽固醇是存在於全身細胞的類脂肪物質，身體需要它製造荷爾蒙、維生素 D 與幫助消化的物質。身體能自行製造所需的膽固醇，蛋黃、肉類、乳酪等動物性食物也含有膽固醇。', 'mp-chol', 'What is cholesterol'),
        t('高膽固醇通常沒有徵兆或症狀，只能靠抽血檢查得知；檢查頻率依年齡、風險因子與家族史而定。', 'mp-chol', 'How is high cholesterol diagnosed'),
        t('低密度脂蛋白膽固醇（LDL-C）升高是動脈粥狀硬化心血管疾病的主要風險因子；台灣初級預防指引依個人風險分級設定 LDL-C 目標。', 'tw-lipid-2022', '摘要'),
      ]),
      sec('mechanism', [
        t('LDL 俗稱「壞膽固醇」，LDL 過高會使斑塊堆積在動脈；HDL 俗稱「好膽固醇」，負責把膽固醇帶回肝臟移除；VLDL 主要攜帶三酸甘油酯，也會促成斑塊堆積。', 'mp-chol', 'HDL, LDL, and VLDL'),
        t('血中膽固醇過多時，會與其他物質形成斑塊並附著在動脈壁上。', 'mp-chol', 'What is cholesterol'),
      ]),
      sec('organs', [t('斑塊可能使冠狀動脈變窄甚至阻塞，並與冠狀動脈疾病、中風及周邊動脈疾病有關。', 'mp-chol')]),
      sec('lifestyle', [
        t('高膽固醇最常見的原因是不健康的生活型態：飽和脂肪吃太多會升高 LDL；缺乏運動、久坐會降低 HDL；吸菸會降低 HDL、升高 LDL。', 'mp-chol', 'What causes high cholesterol'),
        t('可透過心臟健康飲食、體重管理與規律身體活動降低膽固醇。', 'mp-chol', 'How can I lower my cholesterol'),
      ]),
      sec('nutrition', [
        t('飽和脂肪常見於紅肉、全脂乳製品、巧克力、部分烘焙食品，以及許多油炸與加工食品。', 'mp-chol', 'What causes high cholesterol'),
        { text: '台灣初級預防指引提供食物、膳食補充品與飲酒的建議，具體內容需以指引全文確認。', src: [{ g: 'tw-lipid-2022', where: '摘要' }], check: 'citation' },
      ]),
      sec('meds', [t('若生活調整仍不足以降低膽固醇，可能需要藥物，例如 statin；服藥期間仍應持續生活調整。', 'mp-chol', 'How can I lower my cholesterol'), MED_NOTE]),
      sec('redflags', [EMERGENCY]),
    ],
  },
  {
    id: 'atrial-fibrillation', title: '心房顫動', en: 'Atrial Fibrillation', organs: ['heart', 'brain'], specialty: '心臟內科',
    review: rev('MedlinePlus Atrial Fibrillation', '心臟內科'),
    animPlan: ['正常心跳的電訊號', '心房顫動時不規則的電訊號', '心房血栓與中風風險'],
    sections: [
      sec('define', [
        t('心房顫動是最常見的心律不整之一：心跳不規則，有時比正常快很多，心臟上下腔室無法協調運作，使下方心室無法充分充血與送血。', 'mp-afib', 'What is atrial fibrillation'),
        t('有些人沒有任何症狀，不知道自己有心房顫動；有症狀的人可能偶爾出現，也可能頻繁發生。', 'mp-afib', 'Symptoms'),
        gen('是否為心房顫動需以心電圖等檢查確認，不能只靠自覺心跳判斷。'),
      ]),
      sec('mechanism', [
        t('最常見的原因是心臟組織或心跳電訊號的改變，可能與高血壓、冠狀動脈疾病、先天性心臟病、感染與老化有關，有時原因不明。', 'mp-afib', 'What causes'),
        t('心房顫動時，心臟可能無法完全把血液打到肺部與全身；血液可能淤積在心臟裡，增加形成血塊的風險，進而可能導致中風。', 'nhlbi-afib', 'What is atrial fibrillation'),
      ]),
      sec('organs', [t('未治療的心房顫動可能導致中風、心臟衰竭、血栓、心因性猝死，以及認知障礙與失智。', 'mp-afib', 'What other problems can AFib cause')]),
      sec('lifestyle', [t('心臟健康的生活調整：限制或避免飲酒（酒精可能使心跳加快）、維持健康體重、規律身體活動。', 'mp-afib', 'Treatments')]),
      sec('nutrition', [
        t('採用心臟健康飲食，限制飽和脂肪、鹽與膽固醇，例如得舒（DASH）飲食。', 'mp-afib', 'Treatments'),
        gen('服用抗凝血劑者，飲食或保健食品（如大量深綠色蔬菜、魚油）有明顯改變前，請先詢問醫師或藥師。'),
      ]),
      sec('meds', [t('治療可能包括預防血栓的抗凝血藥物，以及控制心律與心跳速率的藥物。', 'mp-afib', 'Treatments'), MED_NOTE]),
      sec('redflags', [
        t('可能的症狀：極度疲倦（最常見）、心悸、呼吸困難（特別是平躺或運動時）、胸痛、頭暈或昏厥、血壓偏低。', 'mp-afib', 'Symptoms'),
        gen('出現胸痛、昏厥，或單側無力、口齒不清等中風徵兆時，請立即撥打 119。'),
      ]),
    ],
  },
  {
    id: 'heart-failure', title: '心臟衰竭', en: 'Heart Failure', organs: ['heart', 'lungs', 'kidneys'], specialty: '心臟內科',
    review: rev('MedlinePlus Heart Failure', '心臟內科'),
    animPlan: ['正常心臟的打血功能', '心臟打血不足與血液回堵', '體液堆積造成水腫'],
    sections: [
      sec('define', [
        t('心臟衰竭是心臟無法打出足夠的含氧血液來滿足身體需要，並不是心臟已經停止或即將停止跳動。', 'mp-hf', 'What is heart failure'),
        t('可能影響單側或兩側心臟：右心衰竭時心臟無力把血液送到肺部；左心衰竭較常見。', 'mp-hf', 'What is heart failure'),
      ]),
      sec('mechanism', [
        t('大多數心臟衰竭是由長期疾病慢慢造成，也可能在疾病或傷害損傷心肌後突然發生；相關疾病包括心律不整、心肌病變、先天性心臟病、冠狀動脈疾病、心內膜炎、心肌梗塞、瓣膜疾病與高血壓等。', 'mp-hf', 'What causes heart failure'),
        t('多數症狀來自器官血流減少與體液堆積：血液流經心臟變慢，回心的血管發生回堵，液體滲入身體組織造成水腫。', 'mp-hf', 'Symptoms'),
      ]),
      sec('organs', [
        t('可能的症狀：爬樓梯等活動時喘（常是最早的症狀）、休息後仍疲倦無力、咳嗽、腳踝小腿或腹部因積水腫脹與體重增加、平躺難以入睡、噁心與食慾差、頸部靜脈腫脹、頻尿。初期可能沒有症狀或只有輕微症狀。', 'mp-hf', 'Symptoms'),
      ]),
      sec('lifestyle', [
        t('多數治療計畫包括：戒菸、壓力管理、依醫療人員建議進行身體活動，並治療可能使心衰竭惡化的疾病。', 'mp-hf', 'Treatments'),
        t('與醫療人員合作控制會增加風險的疾病，並改善飲食、運動等生活習慣，可能預防或延緩心臟衰竭。', 'mp-hf', 'Can heart failure be prevented'),
      ]),
      sec('nutrition', [t('減少鈉攝取並依醫療人員指示限制水分，以控制體液堆積。', 'mp-hf', 'Treatments')]),
      sec('meds', [
        t('心臟衰竭目前無法治癒，但治療可以延長壽命、減少症狀；即使接受治療，通常仍會隨時間惡化，多數人需要長期治療，治療計畫多包含藥物。', 'mp-hf', 'Treatments'),
        MED_NOTE,
      ]),
      sec('redflags', [gen('喘明顯加重或休息時也喘、胸痛、昏厥，或短時間內體重快速增加、水腫明顯加重時，請儘速就醫或撥打 119。')]),
    ],
  },
  {
    id: 'cataract', title: '白內障', en: 'Cataract', organs: ['eyes'], specialty: '眼科',
    review: rev('NEI Cataracts', '眼科'),
    animPlan: ['透明水晶體與光線對焦', '水晶體混濁造成視線模糊', '手術置換人工水晶體（示意）'],
    sections: [
      sec('define', [
        t('白內障是眼睛的水晶體出現混濁；水晶體是眼睛中幫助對焦的透明構造。年紀越大越常見，美國 80 歲以上的人有一半以上已有白內障或接受過手術。', 'nei-cataract', 'What are cataracts'),
        t('初期可能沒有感覺；隨時間白內障變大，視力可能變得模糊、霧霧的或色彩變淡，影響閱讀等日常活動，最終可能導致視力喪失。', 'nei-cataract', 'What are cataracts'),
        t('診斷需要散瞳眼科檢查。', 'nei-cataract'),
      ]),
      sec('mechanism', [t('多數白內障來自老化造成的眼睛正常變化：年輕時水晶體是透明的，大約 40 歲起，水晶體中的蛋白質開始分解並聚集，形成混濁區域，也就是白內障；隨時間會讓更多水晶體變混濁。', 'nei-cataract', 'What causes cataracts')]),
      sec('organs', [t('可能的症狀：視力模糊或霧感、顏色看起來變淡、夜間看不清楚、燈光陽光或車燈顯得太刺眼、燈光周圍有光暈、複視。這些也可能是其他眼睛問題的徵兆。', 'nei-cataract', 'Symptoms')]),
      sec('lifestyle', [
        t('風險較高的情況：年紀增加、糖尿病等健康問題、吸菸、過量飲酒、家族史、眼睛受傷或手術、上半身放射治療、長時間日曬、使用類固醇。', 'nei-cataract', 'Am I at risk'),
        t('保護眼睛：戴太陽眼鏡與寬邊帽遮陽；使用電動工具或從事特定運動時戴護目鏡；戒菸。', 'nei-cataract', 'How can I prevent cataracts'),
      ]),
      sec('nutrition', [gen('均衡飲食並控制血糖；目前沒有食物或保健食品能消除白內障。')]),
      sec('meds', [t('手術可以移除白內障，安全且能矯正白內障造成的視力問題。', 'nei-cataract', 'What are cataracts'), t('白內障手術是移除混濁的水晶體，換上人工水晶體；手術非常安全，10 位接受手術者中有 9 位視力改善。初期也可以用較亮的照明、抗眩光太陽眼鏡、放大鏡等方式應對。', 'nei-cataract', 'Treatment'), gen('是否需要手術及時機由眼科醫師評估。')]),
      sec('redflags', [gen('視力突然下降、突然看不見，或眼睛劇烈疼痛時，請立即就醫。')]),
    ],
  },
  {
    id: 'glaucoma', title: '青光眼', en: 'Glaucoma', organs: ['eyes', 'nerves'], specialty: '眼科',
    review: rev('NEI Glaucoma', '眼科'),
    animPlan: ['眼內液體循環與眼壓', '視神經受損', '視野從周邊逐漸縮小（示意）'],
    sections: [
      sec('define', [
        t('青光眼是一群會損傷眼睛後方視神經、導致視力喪失與失明的眼睛疾病；症狀可能進展得很慢而不易察覺，唯一確認的方法是完整的散瞳眼科檢查。', 'nei-glaucoma', 'What is glaucoma'),
      ]),
      sec('mechanism', [t('最常見類型的確切原因尚不清楚，但許多患者眼壓偏高，而降低眼壓的治療有助減緩疾病。', 'nei-glaucoma', 'What causes glaucoma')]),
      sec('organs', [t('初期通常沒有症狀，一半的患者不知道自己有青光眼；隨時間可能慢慢失去視力，通常從周邊視力開始（特別是靠近鼻側），未治療最終可能失明。', 'nei-glaucoma', 'Symptoms')]),
      sec('screening', [
        t('60 歲以上、有青光眼家族史等族群風險較高，應與醫師討論檢查頻率；高風險者需每 1–2 年接受完整的散瞳眼科檢查。', 'nei-glaucoma', 'Am I at risk'),
        t('目前沒有方法能預防青光眼，因此定期眼科檢查很重要，才能在影響視力前發現。', 'nei-glaucoma', 'What causes glaucoma'),
      ]),
      sec('nutrition', [gen('目前沒有食物或保健食品能取代青光眼的治療。')]),
      sec('meds', [t('青光眼無法治癒，但早期治療常能阻止損傷、保護視力；治療方式包括藥物（通常是眼藥水）、雷射與手術。', 'nei-glaucoma', 'What is glaucoma'),
        t('藥物用來降低眼壓、預防視神經受損；雷射與手術則幫助眼內液體排出，以降低眼壓。', 'nei-glaucoma', 'Treatment'), MED_NOTE]),
      sec('redflags', [t('隅角閉鎖型青光眼可能突然出現劇烈眼痛、噁心、眼睛紅、視力模糊；出現這些症狀請立即就醫或前往急診。', 'nei-glaucoma', 'Angle-closure glaucoma')]),
    ],
  },
  {
    id: 'colorectal-cancer', title: '大腸直腸癌', en: 'Colorectal Cancer', organs: ['intestines'], specialty: '大腸直腸外科或腸胃科',
    review: rev('國健署大腸癌防治與篩檢', '大腸直腸外科或腸胃科'),
    animPlan: ['腺瘤息肉在大腸形成', '息肉出血與糞便潛血檢查', '大腸鏡切除息肉（示意）'],
    sections: [
      sec('define', [
        t('自民國 95 年起，大腸癌居全國癌症發生數第 1 位，每年約有一萬多人診斷、超過五千人死亡。大腸癌可以早期發現、早期治療，早期妥善治療的存活率高達 90% 以上。', 'hpa-crc'),
      ]),
      sec('mechanism', [t('大腸癌主要由大腸內的腺瘤息肉癌化而來，若能早期發現腺瘤息肉並切除，可以減少大腸癌發生。', 'hpa-crc')]),
      sec('organs', [t('大腸內的腫瘤或息肉受糞便摩擦而出血，血液附著在糞便表面排出，糞便潛血檢查就能測出是否含有血液。', 'hpa-crc-screen')]),
      sec('screening', [
        t('政府補助 45 歲至未滿 75 歲民眾，以及 40–44 歲有家族史者，每 2 年 1 次糞便潛血檢查。', 'hpa-cancer-screen'),
        t('定期糞便潛血檢查可減少 34% 晚期大腸癌發生率、降低 40% 大腸癌死亡率。結果陰性請持續每 2 年檢查 1 次；陽性請接受大腸鏡檢查確診。', 'hpa-crc-screen'),
        t('糞便潛血檢查並非百分之百準確，有任何異狀時仍應找專科醫師檢查。', 'hpa-crc'),
      ]),
      sec('nutrition', [gen('多蔬果、全穀與膳食纖維，減少紅肉與加工肉品。')]),
      sec('meds', [TREAT]),
      sec('redflags', [gen('出現血便、黑便、排便習慣持續改變或不明原因的體重下降時，請儘速就醫。')]),
    ],
  },
  {
    id: 'breast-cancer', title: '乳癌', en: 'Breast Cancer', organs: [], specialty: '乳房外科',
    review: rev('國健署乳癌與子宮頸癌防治、乳癌篩檢', '乳房外科'),
    animPlan: ['乳房組織與乳腺（需女性模型）', '乳房 X 光攝影的原理（示意）'],
    sections: [
      sec('define', [
        t('乳癌是女性常見、可經由篩檢早期發現早期治療的癌症；發生率急遽上升，不能只靠自我檢查，要透過專科醫師檢查及乳房攝影篩檢才能早期發現。', 'hpa-breast-cervical'),
      ]),
      sec('mechanism', [gen('乳房組織中的細胞不正常增生，形成惡性腫瘤。')]),
      sec('organs', [MALE_MODEL]),
      sec('screening', [
        t('政府補助 40 至 74 歲婦女，每 2 年 1 次乳房 X 光攝影檢查。', 'hpa-cancer-screen'),
        t('乳房攝影可降低 3 成乳癌死亡率。檢查時會以壓迫板緊壓乳房，以取得清晰影像並減少輻射劑量，因此會有疼痛感。', 'hpa-breast-screen'),
        t('檢查結果：無異常請持續每 2 年檢查 1 次；有無法確定診斷的變化需再做其他影像檢查；疑似良性變化請 3–6 個月追蹤檢查。', 'hpa-breast-screen'),
      ]),
      sec('nutrition', [gen('維持健康體重、規律運動、減少飲酒。')]),
      sec('meds', [TREAT]),
      sec('redflags', [gen('乳房出現硬塊、乳頭異常分泌或凹陷、皮膚凹陷或變化時，請儘速就醫。')]),
    ],
  },
  {
    id: 'cervical-cancer', title: '子宮頸癌', en: 'Cervical Cancer', organs: [], specialty: '婦產科',
    review: rev('國健署乳癌與子宮頸癌防治、子宮頸癌篩檢', '婦產科'),
    animPlan: ['子宮頸細胞的變化（需女性模型）', '抹片檢查的原理（示意）'],
    sections: [
      sec('define', [
        t('子宮頸癌是女性常見、可經由篩檢早期發現的癌症，疾病發展相當緩慢；定期做抹片就能早期發現，子宮頸原位癌治癒率可達 100%。', 'hpa-breast-cervical'),
      ]),
      sec('mechanism', [gen('子宮頸細胞可能先出現癌前病變，再逐漸發展成癌症；多數與人類乳突病毒（HPV）持續感染有關。')]),
      sec('organs', [MALE_MODEL]),
      sec('screening', [
        t('政府補助子宮頸抹片：25–29 歲婦女每 3 年 1 次；30 歲以上婦女每年 1 次（建議每 3 年至少做 1 次）。', 'hpa-cancer-screen'),
        t('子宮頸抹片檢查可降低 6–9 成子宮頸癌死亡率。檢查時以擴陰器擴張陰道，輕輕刮取子宮頸剝落的細胞，以顯微鏡觀察是否有癌前病變或癌症。', 'hpa-cervical-screen'),
        t('檢查結果：正常請持續每 3 年至少檢查 1 次；意義不明的鱗狀細胞變化，3–6 個月內再做抹片或 HPV 檢測；輕度癌前病變請接受陰道鏡檢查或 3–6 個月內再抹片；重度癌前病變請接受陰道鏡檢查與切片。', 'hpa-cervical-screen'),
      ]),
      sec('nutrition', [gen('不吸菸，均衡飲食。')]),
      sec('meds', [TREAT]),
      sec('redflags', [gen('非經期出血、性行為後出血或停經後出血時，請儘速就醫。')]),
    ],
  },
  {
    id: 'oral-cancer', title: '口腔癌', en: 'Oral Cancer', organs: ['mouth'], specialty: '口腔顎面外科或耳鼻喉科',
    review: rev('國健署檳榔危害與口腔癌防治、口腔癌篩檢', '口腔顎面外科或耳鼻喉科'),
    animPlan: ['口腔黏膜構造', '檳榔與菸對口腔黏膜的刺激（示意）', '口腔黏膜檢查（示意）'],
    sections: [
      sec('define', [t('口腔癌是台灣青壯年（25–44 歲）男性常見的癌症，每年逾 8,000 名新診斷個案、3,300 人因口腔癌死亡。', 'hpa-oral')]),
      sec('mechanism', [
        t('國際癌症研究總署（IARC）認定「嚼含菸草的檳榔」或「同時吸菸與嚼檳榔」對人類有致癌性，部位主要在口腔、咽及食道；2003 年更認定檳榔子屬第一類致癌物，即使不含任何添加物也會致癌。', 'hpa-oral'),
      ]),
      sec('organs', [t('口腔黏膜檢查是由醫師目視檢查口腔黏膜，看是否有疑似癌前病變或癌症的病灶。', 'hpa-oral-screen')]),
      sec('screening', [
        t('政府補助 30 歲以上有嚼檳榔（含已戒）或吸菸者，以及 18 歲以上有嚼檳榔（含已戒）的原住民，每 2 年 1 次口腔黏膜檢查。', 'hpa-cancer-screen'),
        t('口腔黏膜檢查可降低 4 成口腔癌死亡率。結果陰性請持續每 2 年檢查 1 次；陽性請至醫院口腔外科或耳鼻喉科確診，並遵照醫囑每 3–6 個月定期追蹤。', 'hpa-oral-screen'),
      ]),
      sec('lifestyle', [t('請戒嚼檳榔、戒菸與戒酒。', 'hpa-oral-screen')]),
      sec('nutrition', [gen('均衡飲食，避免以檳榔提神。')]),
      sec('meds', [TREAT]),
      sec('redflags', [gen('口腔潰瘍超過 2 週未癒合，或出現白斑、紅斑、硬塊時，請至口腔外科或耳鼻喉科檢查。')]),
    ],
  },
  {
    id: 'lung-cancer', title: '肺癌', en: 'Lung Cancer', organs: ['lungs', 'airway'], specialty: '胸腔內科',
    review: rev('國健署肺癌防治、危險因子、早期警訊', '胸腔內科'),
    animPlan: ['支氣管與肺泡', '腫瘤在支氣管或肺泡生長（示意）', '低劑量電腦斷層篩檢（示意）'],
    sections: [
      sec('define', [t('肺癌是生長於支氣管或肺泡的惡性腫瘤，高居國人癌症死因首位，每年超過 9,000 人死於肺癌、約 1 萬 3,000 人新診斷。', 'hpa-lung')]),
      sec('mechanism', [
        t('吸菸是肺癌最大的危險因子，約佔 70–80%；二手菸暴露使罹患肺癌的機會比一般人高出 20–30%，三手菸殘留的有毒物質同樣會危害健康。', 'hpa-lung-risk', '一、菸害'),
        t('其他危險因子：空氣污染、職場或居家環境暴露（石綿、砷、氡氣）、肺癌家族史、結核病或慢性阻塞性肺病病史、煮食未使用抽油煙機。', 'hpa-lung-risk'),
      ]),
      sec('organs', [t('肺癌初期通常症狀不明顯。', 'hpa-lung-warning')]),
      sec('screening', [
        t('政府補助低劑量電腦斷層檢查，每 2 年 1 次：(一) 有肺癌家族史（父母、子女或兄弟姊妹經診斷為肺癌）的 45–74 歲男性或 40–74 歲女性；(二) 50–74 歲、吸菸史達 20 包-年以上，有意願戒菸或戒菸 15 年內的重度吸菸者。', 'hpa-cancer-screen'),
      ]),
      sec('lifestyle', [t('戒菸並遠離二手菸、三手菸；在室內煮食時使用抽油煙機。', 'hpa-lung-risk')]),
      sec('nutrition', [gen('均衡飲食，維持體力；戒菸是最重要的預防措施。')]),
      sec('meds', [TREAT]),
      sec('redflags', [t('常見症狀：持續咳嗽且未好轉、痰帶血絲或咳血、呼吸急促或喘鳴、持續且惡化的胸痛、聲音沙啞、異常的肢體疼痛、無預警的體重下降或食慾不振。雖然不一定是肺癌引起，仍建議就醫評估。', 'hpa-lung-warning')]),
    ],
  },
];

export const DISEASE_MAP: Record<string, DiseaseModule> = Object.fromEntries(DISEASES.map((d) => [d.id, d]));
export const CHECK_LABEL: Record<Check, string> = { text: '已對照原文', citation: '出處已確認・內容待全文核對', general: '一般衛教知識・待醫學審閱' };
