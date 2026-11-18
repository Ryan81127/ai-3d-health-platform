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
const MALE_MODEL = gen('目前的真實解剖模型為成年男性，沒有女性器官；本頁的 3D 動畫為程式繪製的示意模型，形狀與比例經過簡化，不是真實解剖模型。');
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
  /* ===== 第三批常見疾病（2026-11-17） ===== */
  {
    id: 'dementia', title: '失智症', en: 'Dementia', organs: ['brain'], specialty: '神經內科或精神科',
    review: rev('MedlinePlus Dementia', '神經內科或精神科'),
    animPlan: ['大腦與記憶、語言等功能', '阿茲海默症的類澱粉斑塊與神經纖維糾結（示意）', '血管性失智與腦部血流'],
    sections: [
      sec('define', [
        t('失智症是心智功能退化到影響日常生活與活動，包括記憶、語言、視覺理解、解決問題、處理日常事務與專注力。', 'mp-dementia', 'What is dementia'),
        t('年紀大了稍微健忘是正常的，但失智症不是正常老化，而是會干擾日常生活的嚴重疾病。', 'mp-dementia', 'What is dementia'),
        t('診斷可能包括病史、身體檢查、思考記憶與語言能力測驗，以及抽血、基因或腦部影像檢查，並評估是否有精神疾病影響症狀。', 'mp-dementia', 'How is dementia diagnosed'),
      ]),
      sec('mechanism', [
        t('最常見的失智症屬於神經退化性疾病，腦細胞停止運作或死亡。阿茲海默症是老年人最常見的類型：β-類澱粉蛋白在腦細胞之間聚集成斑塊，tau 蛋白在神經細胞內形成糾結，神經細胞之間的連結也減少。', 'mp-dementia', 'Types of dementia'),
        t('血管性失智症與腦部血液供應改變有關，常由中風或腦部動脈粥狀硬化造成；也有兩種以上類型同時存在的混合型失智症。', 'mp-dementia', 'Types of dementia'),
      ]),
      sec('organs', [
        t('常見症狀：健忘常是第一個症狀；也可能在熟悉的社區迷路、用奇怪的詞指稱熟悉物品、忘記親友名字或舊記憶、需要別人協助原本能自己完成的事；部分人情緒與個性改變、變得冷漠。', 'mp-dementia', 'Symptoms'),
      ]),
      sec('lifestyle', [
        t('風險因子包括：年齡（最大的風險因子）、吸菸、未控制的糖尿病、高血壓、過量飲酒、近親有失智症。', 'mp-dementia', 'Who is at risk'),
        t('目前沒有經證實能預防失智症的方法，但健康的生活方式可能影響部分風險因子。', 'mp-dementia', 'Can dementia be prevented'),
      ]),
      sec('nutrition', [gen('均衡飲食並控制血糖、血壓；目前沒有食物或保健食品能治療失智症。')]),
      sec('meds', [
        t('多數失智症（包括阿茲海默症）無法治癒；治療可能幫助較久維持心智功能、處理行為症狀並減緩症狀，包括藥物、職能治療、語言治療、心理諮商，以及音樂或藝術治療。', 'mp-dementia', 'Treatments'),
        MED_NOTE,
      ]),
      sec('redflags', [gen('記憶力明顯變差並影響日常生活時，請至神經內科或精神科評估；突然出現意識混亂、單側無力或口齒不清時，請立即撥打 119。')]),
    ],
  },
  {
    id: 'sarcopenia', title: '肌少症', en: 'Sarcopenia', organs: ['muscles'], specialty: '家醫科或老年醫學科',
    review: rev('AWGS 2019 亞洲肌少症共識', '家醫科或老年醫學科'),
    animPlan: ['肌肉量與肌力', '隨年齡流失的肌肉（示意）', '阻力運動與營養（示意）'],
    sections: [
      sec('define', [
        t('亞洲肌少症工作小組（AWGS）定義肌少症為「與年齡相關的肌肉量流失，加上肌力低下和／或身體功能表現低下」。', 'awgs-2019', 'Abstract'),
        t('AWGS 2019 的判定：握力男性 <28 公斤、女性 <18 公斤為肌力低下；6 公尺步行速度 <1.0 公尺／秒、簡易身體功能量表（SPPB）≤9 分，或連續起立 5 次 ≥12 秒為身體功能表現低下。', 'awgs-2019', 'Abstract'),
        t('社區可先以小腿圍（男性 <34、女性 <33 公分）、SARC-F 問卷（≥4 分）或 SARC-CalF（≥11 分）篩檢；只有肌力或身體功能低下者稱為「可能肌少症」，以便及早進行生活型態介入。', 'awgs-2019', 'Abstract'),
        gen('是否為肌少症需由醫療人員依肌力、身體功能與肌肉量量測判定。'),
      ]),
      sec('mechanism', [gen('隨年齡增長，肌肉量與肌力逐漸減少；活動量少、營養不足時可能更明顯。')]),
      sec('organs', [gen('肌力與行動能力下降時，日常活動與平衡可能受影響，跌倒風險增加。')]),
      sec('lifestyle', [t('生活型態介入，特別是運動與營養補充，是肌少症治療的主軸。', 'awgs-2019', 'Abstract'), gen('運動以阻力運動（如彈力帶、深蹲起立）搭配有氧與平衡訓練為主，強度依個人狀況漸進。')]),
      sec('nutrition', [gen('每餐攝取足夠的蛋白質（豆魚蛋肉類、乳品），並維持足夠熱量；腎臟病患者的蛋白質攝取量需與醫師或營養師討論。')]),
      sec('meds', [gen('目前肌少症以運動與營養為主；其他治療需由醫師評估。'), MED_NOTE]),
      sec('redflags', [gen('短時間內體重或肌力明顯下降、反覆跌倒時，請就醫評估原因。')]),
    ],
  },
  {
    id: 'osteoarthritis', title: '退化性關節炎', en: 'Osteoarthritis', organs: ['bones'], specialty: '骨科或復健科',
    review: rev('MedlinePlus Osteoarthritis', '骨科或復健科'),
    animPlan: ['健康關節的軟骨', '軟骨磨損與骨刺（示意）', '減重與肌力訓練減輕關節負擔（示意）'],
    sections: [
      sec('define', [
        t('退化性關節炎是最常見的關節炎，只影響關節，通常在手、膝、髖、頸部與下背。', 'mp-oa', 'What is osteoarthritis'),
        t('診斷沒有單一的檢查，醫師會詢問症狀與病史、做身體檢查，可能安排 X 光等影像或抽血排除其他問題。', 'mp-oa', 'How is osteoarthritis diagnosed'),
      ]),
      sec('mechanism', [
        t('健康關節的骨頭末端覆蓋著光滑的軟骨，緩衝並讓關節順暢活動；退化性關節炎時軟骨磨損變粗糙，有時完全磨光使骨頭互相摩擦，關節附近也可能長出骨刺。', 'mp-oa', 'What is osteoarthritis'),
      ]),
      sec('organs', [t('常見症狀：活動時疼痛、休息後改善；起床後最初 30 分鐘特別僵硬；大量使用後關節腫脹；活動範圍變小；關節感覺鬆動不穩。不是每個人都會痛。', 'mp-oa', 'Symptoms')]),
      sec('lifestyle', [
        t('風險因子：年齡（50 歲後女性多於男性）、體重過重（增加關節壓力）、關節受傷或手術、大量跳躍扭轉的過度使用、關節排列不正、家族史。', 'mp-oa', 'Who is more likely'),
        t('治療通常從增加肌力、柔軟度與平衡的運動開始，需要時減重以改善髖、膝疼痛，並可使用醫療人員配置的護具或鞋墊。', 'mp-oa', 'Treatments'),
      ]),
      sec('nutrition', [gen('維持健康體重可減輕髖、膝負擔；目前沒有保健食品能讓軟骨再生。')]),
      sec('meds', [t('可使用非處方止痛藥或藥膏，但最好先與醫療人員討論；效果不足時，醫師可能安排關節注射或處方止痛藥，必要時考慮手術。熱敷、冰敷也可能有幫助。', 'mp-oa', 'Treatments'), MED_NOTE]),
      sec('redflags', [gen('關節突然紅腫熱痛、發燒，或受傷後無法承重時，請儘速就醫。')]),
    ],
  },
  {
    id: 'gout', title: '痛風', en: 'Gout', organs: ['bones', 'kidneys'], specialty: '風濕免疫科',
    review: rev('MedlinePlus Gout', '風濕免疫科'),
    animPlan: ['尿酸在血液中與腎臟排出', '尿酸結晶沉積在大腳趾關節（示意）', '控制尿酸與生活調整（示意）'],
    sections: [
      sec('define', [
        t('痛風是常見的發炎性關節炎，造成一個或多個關節疼痛、腫脹、發紅；通常以急性發作出現，持續一兩週後改善，常從大腳趾或下肢開始。', 'mp-gout', 'What is gout'),
        t('血中尿酸過高稱為高尿酸血症，不一定對每個人造成健康問題；診斷可能包括抽取關節液檢查尿酸結晶、血液或尿液尿酸檢查，以及超音波或特殊電腦斷層。', 'mp-gout', 'What causes gout；How is gout diagnosed'),
      ]),
      sec('mechanism', [
        t('尿酸是身體分解普林時產生的廢物，普林存在於身體組織與許多食物中。尿酸多數溶在血液中，經腎臟過濾由尿液排出；當身體製造太多或排出不足時，尿酸會在體內累積。', 'mp-gout', 'What causes gout'),
        t('部分人的尿酸會形成針狀結晶，沉積在關節造成痛風，也可能造成腎結石。', 'mp-gout', 'What causes gout'),
      ]),
      sec('organs', [
        t('發作常在夜間突然開始，患部劇痛（可能痛到醒來）、腫脹、發紅、發熱；長期未治療時發作可能更頻繁、更久，並可能在皮下形成尿酸結晶硬塊（痛風石），造成骨骼與軟組織損傷、關節變形。', 'mp-gout', 'Symptoms'),
      ]),
      sec('lifestyle', [
        t('較容易發生的情況：男性、中年以上、肥胖、心臟衰竭、高血壓、代謝症候群、慢性腎臟病、家族史、飲酒，以及大量攝取高普林食物（紅肉、內臟、部分海鮮）或含果糖的食物與飲料。', 'mp-gout', 'Who is more likely'),
        t('預防發作：減重、限制飲酒、避免高普林食物；若正在服用可能升高尿酸的藥物，醫師可能建議調整。', 'mp-gout', 'Treatments'),
      ]),
      sec('nutrition', [gen('減少紅肉、內臟、部分海鮮與含糖（果糖）飲料，限制飲酒，多喝水。')]),
      sec('meds', [
        t('急性發作可用非類固醇消炎止痛藥、秋水仙素或類固醇緩解疼痛；需要時使用降尿酸藥物預防發作、痛風石與腎結石。及早診斷治療並調整生活，痛風是最能控制的關節炎之一。', 'mp-gout', 'Treatments'),
        MED_NOTE,
      ]),
      sec('redflags', [gen('關節紅腫熱痛合併發燒時，需儘速就醫排除關節感染。')]),
    ],
  },
  {
    id: 'gerd', title: '胃食道逆流', en: 'Gastroesophageal Reflux Disease (GERD)', organs: ['stomach'], specialty: '腸胃科',
    review: rev('MedlinePlus GERD', '腸胃科'),
    animPlan: ['食道下端括約肌正常關閉', '括約肌鬆弛使胃酸逆流（示意）', '少量多餐、飯後不躺等生活調整'],
    sections: [
      sec('define', [
        t('偶爾逆流很常見；若每週出現症狀兩次以上，或已造成食道黏膜損傷，可能是胃食道逆流疾病（GERD），這是會造成不適、長期可能引起其他健康問題的慢性疾病。', 'mp-gerd', 'What is GERD'),
        t('檢查可能包括上消化道內視鏡、切片、X 光、食道酸鹼值檢測與食道壓力檢查。', 'mp-gerd', 'How is GERD diagnosed'),
      ]),
      sec('mechanism', [
        t('食道末端的肌肉沒有好好關閉時，胃內容物會往上移動並刺激食道；當這條肌肉變弱或在錯誤時間放鬆，就可能發生胃食道逆流。', 'mp-gerd', 'What causes GERD'),
      ]),
      sec('organs', [
        t('最常見的症狀是胸口或喉嚨的灼熱感（火燒心），也可能嘴裡有酸味或食物味、乾咳或聲音沙啞、類似氣喘的症狀、吞嚥困難。', 'mp-gerd', 'Symptoms'),
        t('未治療時可能造成食道發炎、結疤或黏膜組織改變（巴瑞特氏食道），也可能使氣喘惡化或造成慢性咳嗽、沙啞。', 'mp-gerd', 'How is GERD treated'),
      ]),
      sec('lifestyle', [
        t('較容易發生的情況：體重過重或肥胖、懷孕、吸菸或接觸二手菸、食道裂孔疝氣。', 'mp-gerd', 'What causes GERD'),
        t('生活調整：少量進食、飯後至少 2–3 小時不躺下、避免誘發症狀的食物、需要時減重、床頭墊高、戒菸；也可穿寬鬆衣物、左側睡。', 'mp-gerd', 'How is GERD treated；prevention'),
      ]),
      sec('nutrition', [t('避免會誘發症狀的食物，例如辛辣食物、巧克力、咖啡因或油膩食物；避免飲酒、不要在睡前進食。', 'mp-gerd', 'How is GERD treated；prevention')]),
      sec('meds', [t('多數人可透過生活調整與藥物控制，包括非處方制酸劑與處方藥；少數需要手術。', 'mp-gerd', 'How is GERD treated'), MED_NOTE]),
      sec('redflags', [t('胸痛合併呼吸急促，或下巴、手臂疼痛時，可能是心臟問題，請立即就醫。', 'mp-gerd', 'Symptoms'), gen('吞嚥困難持續加重、吐血或解黑便、體重不明原因下降時，請儘速就醫。')]),
    ],
  },
  {
    id: 'viral-hepatitis', title: 'B 型與 C 型肝炎', en: 'Hepatitis B and C', organs: ['liver'], specialty: '腸胃肝膽科',
    review: rev('MedlinePlus Hepatitis B、Hepatitis C；國健署成人預防保健', '腸胃肝膽科'),
    animPlan: ['肝臟的功能', '病毒感染造成肝臟發炎（示意）', '長期發炎、肝硬化與肝癌風險（示意）'],
    sections: [
      sec('define', [
        t('肝炎是肝臟發炎，組織受傷或感染時出現的腫脹會損傷肝臟、影響肝功能。B 型肝炎由 B 型肝炎病毒造成，可能是急性或慢性感染；C 型肝炎由 C 型肝炎病毒造成，多數急性感染會轉為慢性。', 'mp-hbv', 'What is hepatitis；What is hepatitis B'),
        t('B 型肝炎常沒有症狀；慢性感染者可能直到數十年後出現併發症才有症狀，因此即使沒有症狀，篩檢也很重要。', 'mp-hbv', 'Symptoms'),
        t('多數 C 型肝炎感染者沒有症狀，慢性感染可能數十年後出現併發症，因此即使沒有症狀，篩檢也很重要。', 'mp-hcv', 'Symptoms'),
      ]),
      sec('mechanism', [
        t('B 型肝炎病毒經由接觸感染者的血液、精液或其他體液傳染。', 'mp-hbv', 'What causes hepatitis B'),
        t('C 型肝炎經由接觸感染者的血液傳染，例如共用針具、被用過的針扎傷、使用未消毒的刺青穿洞工具或墨水、共用刮鬍刀或牙刷，或由母親傳給新生兒。', 'mp-hcv', 'How is hepatitis C spread'),
      ]),
      sec('organs', [
        t('慢性 B 型肝炎可能演變為肝硬化（肝臟結疤）、肝癌與肝衰竭；未治療的 C 型肝炎可能導致肝硬化、肝衰竭與肝癌，及早診斷治療可預防這些併發症。', 'mp-hbv', 'What other problems'),
        t('急性肝炎可能出現深黃色尿、疲倦、發燒、灰白色糞便、關節痛、食慾不振、噁心嘔吐、腹痛與黃疸（眼睛、皮膚變黃）。', 'mp-hcv', 'Symptoms'),
      ]),
      sec('screening', [
        t('國健署成人預防保健：民國 75 年次以前出生至 79 歲的民眾，可搭配成人預防保健服務終身接受 1 次 B 型肝炎表面抗原（HBsAg）及 C 型肝炎抗體（anti-HCV）檢查。', 'hpa-adult-check', '服務內容'),
      ]),
      sec('lifestyle', [
        t('預防 B 型肝炎最好的方法是接種 B 型肝炎疫苗；不共用針具、牙刷、刮鬍刀、指甲剪，接觸他人血液時戴手套，刺青穿洞確認器具消毒，性行為使用保險套。', 'mp-hbv', 'Can hepatitis B be prevented'),
        t('C 型肝炎目前沒有疫苗，預防方式是不共用針具、接觸血液時戴手套、刺青穿洞使用無菌器具與未開封墨水。', 'mp-hcv', 'Can hepatitis C be prevented'),
      ]),
      sec('nutrition', [gen('避免飲酒，不自行服用來路不明的草藥或保健食品，以免增加肝臟負擔。')]),
      sec('meds', [
        t('慢性 B 型肝炎若血液檢查顯示肝臟可能受損，可能需要抗病毒藥物；C 型肝炎以抗病毒藥物治療，多數可以治癒。', 'mp-hcv', 'Treatments'),
        MED_NOTE,
      ]),
      sec('redflags', [gen('出現黃疸、茶色尿、意識混亂、吐血或解黑便時，請儘速就醫。')]),
    ],
  },
  {
    id: 'kidney-stones', title: '腎結石', en: 'Kidney Stones', organs: ['kidneys', 'bladder'], specialty: '泌尿科',
    review: rev('MedlinePlus Kidney Stones；NIDDK Kidney Stones', '泌尿科'),
    animPlan: ['腎臟過濾尿液', '礦物質在尿中結晶成結石（示意）', '結石卡在輸尿管與多喝水預防（示意）'],
    sections: [
      sec('define', [
        t('腎結石是在腎臟中由尿液物質形成的固體，小如沙粒、大如珍珠；多數會自行排出，但有時會卡在泌尿道、阻塞尿流並造成劇痛。', 'mp-kstone', 'Summary'),
        t('醫師會以尿液、血液與影像檢查診斷腎結石。', 'mp-kstone', 'Summary'),
      ]),
      sec('mechanism', [t('腎結石是因為尿液中鈣、草酸、磷的濃度過高；這些礦物質平時就存在尿液中，濃度低時不會造成問題。', 'niddk-kstone', 'Symptoms & Causes')]),
      sec('organs', [
        t('症狀包括：背部、側腹、下腹或鼠蹊部劇痛，粉紅、紅或褐色血尿，一直想解尿、解尿疼痛、解不出或只解少量，尿液混濁或有異味；可能伴隨噁心嘔吐、發燒、畏寒。', 'niddk-kstone', 'Symptoms & Causes'),
      ]),
      sec('lifestyle', [
        t('喝足夠的水是預防腎結石最重要的事；除非有腎衰竭，許多醫療人員建議每天喝 6–8 杯（每杯約 240 毫升），實際量請與醫療人員討論。', 'niddk-kstone', 'Eating, Diet, & Nutrition'),
        t('體重過重會增加腎結石風險；研究顯示得舒（DASH）飲食可以降低腎結石風險。', 'niddk-kstone', 'Eating, Diet, & Nutrition'),
      ]),
      sec('nutrition', [t('依過去結石的種類，可能需要調整鈉、動物性蛋白質、鈣或草酸的攝取量；可請專精結石預防的營養師協助規劃。', 'niddk-kstone', 'Eating, Diet, & Nutrition')]),
      sec('meds', [t('無法自行排出的結石可用震波碎石、經尿道內視鏡或手術處理。', 'mp-kstone', 'Summary'), MED_NOTE]),
      sec('redflags', [t('背部或側腹劇痛不緩解、血尿、發燒畏寒、嘔吐、尿液混濁有異味或解尿灼熱，可能需要醫師協助，請儘速就醫。', 'mp-kstone', 'Summary')]),
    ],
  },
  {
    id: 'obesity', title: '肥胖', en: 'Obesity', organs: ['heart', 'liver', 'pancreas', 'bones'], specialty: '家醫科或新陳代謝科',
    review: rev('國健署成人健康體位標準；MedlinePlus Obesity', '家醫科或新陳代謝科'),
    animPlan: ['熱量攝取與消耗', '多餘熱量變成脂肪儲存（示意）', '減重 5–10% 對健康的幫助（示意）'],
    sections: [
      sec('define', [
        t('我國 18 歲以上成人依 BMI 分為：過輕（BMI <18.5）、健康體重（18.5 ≦ BMI <24）、過重（24 ≦ BMI <27）、肥胖（BMI ≧27）。BMI＝體重（公斤）÷身高（公尺）÷身高（公尺）。', 'hpa-bmi1824'),
        t('世界衛生組織指出 BMI 是判定體位常用的簡易方法，但不同個案可能有差異。', 'hpa-bmi'),
        t('BMI 無法區分脂肪、肌肉與骨骼重量；腰圍大、脂肪多集中在腹部時，體重相關健康問題的風險更高。', 'mp-obesity', 'How is obesity diagnosed'),
      ]),
      sec('mechanism', [t('肥胖是長期攝取的熱量多於身體活動與日常生活消耗的熱量，身體把多餘熱量以脂肪儲存；遺傳、飲食習慣、活動量、部分藥物或疾病都可能影響體重。', 'mp-obesity', 'What raises your risk')]),
      sec('organs', [
        t('研究顯示過重或肥胖（BMI ≧24）是糖尿病、心血管疾病、惡性腫瘤等慢性疾病的主要風險因素。', 'hpa-bmi1824'),
        t('體型較大會讓心臟更費力、增加關節壓力，並增加第二型糖尿病、心臟病、高血壓、中風、代謝症候群、退化性關節炎、睡眠呼吸中止與部分癌症的風險。', 'mp-obesity', 'What health problems'),
      ]),
      sec('lifestyle', [
        t('肥胖者即使只減少 5–10% 體重，也能延緩或預防部分疾病。', 'mp-obesity', 'What health problems'),
        t('每天「進」與「出」創造 500 大卡的落差，就可以每週減重約 0.5 至 1 公斤。', 'hpa-calorie'),
      ]),
      sec('nutrition', [t('計算一天所需熱量：輕度工作者每天約每公斤體重 20–25 大卡；例如少喝一杯 500 毫升珍珠奶茶（約 300 大卡）並少吃 3 塊炸雞塊（約 200 大卡），即可減少約 500 大卡。', 'hpa-calorie')]),
      sec('meds', [t('治療可能包括飲食與運動目標、諮商或支持團體、減重藥物，嚴重肥胖或有嚴重相關疾病者可考慮減重手術。', 'mp-obesity', 'Treatments'), MED_NOTE]),
      sec('redflags', [gen('不要自行購買來路不明的減肥藥；體重在短時間內不明原因大幅改變時，請就醫評估。')]),
    ],
  },
  {
    id: 'thyroid-disorders', title: '甲狀腺功能異常', en: 'Thyroid Disorders', organs: ['thyroid', 'heart'], specialty: '新陳代謝科',
    review: rev('MedlinePlus Hypothyroidism、Hyperthyroidism', '新陳代謝科'),
    animPlan: ['甲狀腺的位置與荷爾蒙', '功能低下：身體機能變慢（示意）', '功能亢進：心跳加快等（示意）'],
    sections: [
      sec('define', [
        t('甲狀腺是頸部前方小小的蝴蝶形腺體，製造控制身體使用能量的荷爾蒙，幾乎影響每個器官，包括呼吸、心跳、體重、消化與情緒。', 'mp-hypothyroid', 'What is hypothyroidism'),
        t('甲狀腺功能低下是甲狀腺製造的荷爾蒙不足；甲狀腺功能亢進是製造的荷爾蒙超過身體需要。', 'mp-hyperthyroid', 'What is hyperthyroidism'),
        t('診斷包括病史、身體檢查、TSH、T3、T4 與甲狀腺抗體等血液檢查，以及甲狀腺掃描、超音波等影像。', 'mp-hyperthyroid', 'How is hyperthyroidism diagnosed'),
      ]),
      sec('mechanism', [
        t('功能低下最常見的原因是橋本氏甲狀腺炎（免疫系統攻擊甲狀腺）；功能亢進最常見的原因是葛瑞夫茲氏病（免疫攻擊使甲狀腺製造過多荷爾蒙），其他原因包括甲狀腺結節、甲狀腺炎與碘攝取過多。', 'mp-hyperthyroid', 'What causes hyperthyroidism'),
      ]),
      sec('organs', [
        t('功能低下可能出現：疲倦、體重增加、臉部浮腫、怕冷、關節肌肉痛、便秘、皮膚乾燥、頭髮稀疏、心跳變慢、憂鬱、甲狀腺腫；症狀發展慢，可能數月甚至數年都沒注意到。', 'mp-hypothyroid', 'Symptoms'),
        t('功能亢進可能出現：緊張易怒、疲倦、肌肉無力、怕熱、失眠、手抖、心跳快且不規則、排便次數多或腹瀉、體重減輕、情緒起伏、甲狀腺腫；未治療可能導致心律不整、血栓、中風、心臟衰竭、眼病變與骨質疏鬆。', 'mp-hyperthyroid', 'Symptoms；What other problems'),
      ]),
      sec('lifestyle', [t('風險較高的情況：女性、60 歲以上、曾有甲狀腺問題或手術、家族史、近 6 個月內懷孕或生產等。', 'mp-hypothyroid', 'Who is at risk')]),
      sec('nutrition', [t('自體免疫甲狀腺疾病或甲狀腺功能亢進者要避免碘攝取過多（如大量海藻類、含碘藥物或補充品），應與醫療人員討論需避免的食物；懷孕時碘需求增加。', 'mp-hyperthyroid', 'Treatments')]),
      sec('meds', [
        t('功能低下以藥物補充甲狀腺荷爾蒙，開始後約 6–8 週抽血調整劑量，不可自行停藥；功能亢進的治療包括抗甲狀腺藥物、乙型阻斷劑緩解症狀、放射碘治療與手術。', 'mp-hypothyroid', 'Treatments'),
        MED_NOTE,
      ]),
      sec('redflags', [gen('心跳很快或不規則、胸痛、呼吸困難、意識改變或頸部腫大壓迫呼吸吞嚥時，請儘速就醫。')]),
    ],
  },
  {
    id: 'insomnia', title: '失眠症', en: 'Insomnia', organs: ['brain'], specialty: '精神科、身心科或睡眠醫學',
    review: rev('MedlinePlus Insomnia', '精神科、身心科或睡眠醫學'),
    animPlan: ['睡眠與清醒的節律', '失眠：難入睡、易醒、早醒（示意）', '睡眠衛生與認知行為治療（示意）'],
    sections: [
      sec('define', [
        t('失眠是常見的睡眠障礙，可能難以入睡、難以維持睡眠或兩者都有，因此睡得太少或睡眠品質差，醒來不覺得恢復精神。', 'mp-insomnia', 'What is insomnia'),
        t('急性失眠常見，常由工作壓力、家庭壓力或創傷事件引起，通常持續數天或數週；慢性失眠持續一個月以上，多數是其他問題（疾病、藥物、其他睡眠障礙，或咖啡因、菸、酒）造成的。', 'mp-insomnia', 'Types of insomnia'),
        t('診斷包括病史、睡眠習慣、身體檢查，必要時安排睡眠檢查。', 'mp-insomnia', 'How is insomnia diagnosed'),
      ]),
      sec('mechanism', [t('原發性失眠的原因仍不完全清楚，長期壓力、情緒困擾、旅行時差與輪班工作都可能是因素。', 'mp-insomnia', 'Types of insomnia')]),
      sec('organs', [
        t('症狀：躺很久才睡著、每次只睡一小段、半夜大部分時間醒著、覺得完全沒睡、太早醒。', 'mp-insomnia', 'Symptoms'),
        t('失眠可能造成白天想睡、沒精神、焦慮、憂鬱或易怒，以及專注、學習與記憶困難；開車時想睡可能造成車禍。', 'mp-insomnia', 'What other problems'),
      ]),
      sec('lifestyle', [
        t('風險較高的情況：壓力大、憂鬱或情緒困擾、夜班或常換班、跨時區旅行、缺乏活動；女性與年長者較常見。', 'mp-insomnia', 'Who is at risk'),
        t('良好的睡眠習慣等生活調整常能緩解急性失眠。', 'mp-insomnia', 'Treatments'),
      ]),
      sec('nutrition', [gen('下午後避免咖啡因，睡前避免飲酒與大餐；酒精不能幫助好眠。')]),
      sec('meds', [t('治療包括生活調整、諮商與藥物；認知行為治療（CBT）可緩解慢性失眠相關的焦慮；若失眠是其他問題造成的，應同時治療該問題。', 'mp-insomnia', 'Treatments'), MED_NOTE]),
      sec('redflags', [gen('長期失眠合併情緒低落、有傷害自己的念頭，或睡眠時打鼾、呼吸暫停時，請就醫評估；有自殺念頭請立即撥打 119。')]),
    ],
  },
  /* ===== 第四批常見疾病（2026-11-18） ===== */
  {
    id: 'anxiety', title: '焦慮症', en: 'Anxiety Disorders', organs: ['brain', 'heart'], specialty: '精神科或身心科',
    review: rev('MedlinePlus Anxiety', '精神科或身心科'),
    animPlan: ['壓力時身體的反應（示意）', '焦慮持續不退（示意）', '心理治療與壓力管理'],
    sections: [
      sec('define', [
        t('焦慮是恐懼、擔憂與不安的感覺，可能讓人流汗、坐立不安、心跳加快；面對壓力時的焦慮是正常反應，有時能幫助專注與應對。', 'mp-anxiety', 'What is anxiety'),
        t('焦慮症是焦慮持續不退、可能隨時間惡化，並影響工作、課業與人際關係。類型包括廣泛性焦慮症（幾乎每天過度擔心健康、金錢、工作、家庭等日常事務，至少 6 個月）、恐慌症與恐懼症。', 'mp-anxiety', 'What are anxiety disorders'),
        t('診斷時醫療人員會詢問症狀與病史，並以身體檢查與檢驗排除其他健康問題，再進行心理評估。', 'mp-anxiety', 'How are anxiety disorders diagnosed'),
      ]),
      sec('mechanism', [t('焦慮症的原因不明，遺傳、大腦生理與化學、壓力與環境等因素可能都有影響。', 'mp-anxiety', 'What causes anxiety disorders')]),
      sec('organs', [t('焦慮症同時有難以控制的焦慮想法，身體症狀（心跳快或重、不明原因的疼痛、頭暈、呼吸急促），以及行為改變（避開以前會做的日常活動）。', 'mp-anxiety', 'Symptoms')]),
      sec('lifestyle', [
        t('風險因子包括：面對新情境容易害羞退縮的個性、童年或成年的創傷事件、焦慮或其他精神疾病家族史，以及甲狀腺問題、心律不整等身體疾病。', 'mp-anxiety', 'Who is at risk'),
        t('支持團體與壓力管理技巧可能有幫助；咖啡因、其他物質與某些藥物可能使症狀惡化。', 'mp-anxiety', 'Treatments；Symptoms'),
      ]),
      sec('nutrition', [gen('減少咖啡因與酒精，規律飲食與睡眠。')]),
      sec('meds', [t('主要治療是心理治療（如認知行為治療、接納與承諾治療）、藥物（抗焦慮藥與部分抗憂鬱藥），或兩者合併；可能需要嘗試不只一種藥物才能找到合適的。', 'mp-anxiety', 'Treatments'), MED_NOTE]),
      sec('redflags', [gen('胸痛、呼吸困難或昏厥時，請先就醫排除心臟或其他身體疾病；有傷害自己的念頭請立即撥打 119。')]),
    ],
  },
  {
    id: 'panic-disorder', title: '恐慌症', en: 'Panic Disorder', organs: ['brain', 'heart', 'lungs'], specialty: '精神科或身心科',
    review: rev('MedlinePlus Panic Disorder', '精神科或身心科'),
    animPlan: ['恐慌發作時心跳與呼吸加快（示意）', '發作後的擔心與逃避', '認知行為治療與生活調整'],
    sections: [
      sec('define', [
        t('恐慌症是焦慮症的一種，會反覆恐慌發作：在沒有真正危險時，突然出現強烈恐懼、不適或失控感，常伴隨心跳很快很重，感覺像心臟病發作。', 'mp-panic', 'What is panic disorder'),
        t('有過恐慌發作不代表就是恐慌症，許多人一生只發作一兩次且不需治療就好轉；恐慌症不會危及生命，但會影響生活品質，未治療時可能引發憂鬱或物質使用問題。', 'mp-panic', 'What is panic disorder'),
        t('診斷時醫療人員可能以身體檢查、抽血檢查甲狀腺等問題，以及心臟檢查排除其他身體原因。', 'mp-panic', 'How is panic disorder diagnosed'),
      ]),
      sec('mechanism', [t('原因不明，遺傳、大腦生理與化學、環境與重大壓力可能都有影響；童年經歷創傷者較容易發生。', 'mp-panic', 'What causes panic disorder')]),
      sec('organs', [t('發作時可能心跳很快或很重、流汗或發冷、發抖、呼吸困難、窒息感、無力或頭暈、胸痛、胃痛或噁心；發作可在任何時候毫無預警出現，持續幾分鐘到超過一小時。', 'mp-panic', 'Symptoms')]),
      sec('lifestyle', [t('女性較男性常見，常從青少年後期或成年早期開始。醫療人員可能建議健康的生活方式，例如避免飲酒、減少咖啡因。', 'mp-panic', 'Who is more likely；Treatments')]),
      sec('nutrition', [gen('減少咖啡因、避免飲酒。')]),
      sec('meds', [t('治療可能包括心理治療（如認知行為治療），以及抗憂鬱藥（SSRI、SNRI）或抗焦慮藥。', 'mp-panic', 'Treatments'), MED_NOTE]),
      sec('redflags', [gen('第一次出現胸痛、呼吸困難或昏厥時，請立即就醫或撥打 119，不要自行判斷為恐慌發作。')]),
    ],
  },
  {
    id: 'autonomic-dysfunction', title: '自律神經失調', en: 'Autonomic Nervous System Disorders', organs: ['nerves', 'heart', 'vessels'], specialty: '神經內科、家醫科或身心科',
    review: rev('MedlinePlus Autonomic Nervous System Disorders', '神經內科、家醫科或身心科'),
    animPlan: ['自律神經控制心跳與血管（示意）', '自律神經功能異常（示意）', '找出原因與改善症狀'],
    sections: [
      sec('define', [
        gen('台灣常說的「自律神經失調」是民眾常用的說法，不是單一的醫學診斷名稱；出現心悸、頭暈、腸胃不適、失眠等症狀時，需要由醫師找出原因，例如焦慮、甲狀腺問題、心律不整或其他疾病。'),
        t('自律神經系統是控制非自主動作的神經，例如心臟跳動、血管擴張或收縮。', 'mp-ans', 'Summary'),
      ]),
      sec('mechanism', [t('自律神經系統疾病可能單獨發生，也可能由其他疾病造成，例如帕金森氏症、酒精成癮與糖尿病；可能影響系統的一部分或全部，有些是暫時的，許多會隨時間惡化。', 'mp-ans', 'Summary')]),
      sec('organs', [t('自律神經系統出問題時，可能造成血壓問題、心臟問題、呼吸與吞嚥困難，以及男性勃起功能障礙；影響呼吸或心臟功能時可能危及生命。', 'mp-ans', 'Summary')]),
      sec('lifestyle', [gen('規律作息與睡眠、適度運動、練習放鬆與壓力管理，減少咖啡因與酒精；記錄症狀出現的時間與情境，就醫時提供給醫師。')]),
      sec('nutrition', [gen('規律進食、足夠水分；避免以酒精或大量咖啡因提神。')]),
      sec('meds', [t('部分自律神經系統疾病在治療原本的疾病後會改善；但常常無法治癒，此時治療目標是改善症狀。', 'mp-ans', 'Summary'), MED_NOTE]),
      sec('redflags', [gen('昏厥、胸痛、呼吸或吞嚥困難、站起來就頭暈到快跌倒時，請儘速就醫。')]),
    ],
  },
  {
    id: 'pneumonia', title: '肺炎', en: 'Pneumonia', organs: ['lungs', 'airway'], specialty: '胸腔內科或感染科',
    review: rev('MedlinePlus Pneumonia', '胸腔內科或感染科'),
    animPlan: ['正常的肺泡與氣體交換', '肺泡充滿液體或膿（示意）', '疫苗、洗手與戒菸預防'],
    sections: [
      sec('define', [
        t('肺炎是單側或雙側肺部的感染，使肺部的氣囊（肺泡）充滿液體或膿；嚴重程度從輕微到嚴重，取決於病原、年齡與整體健康狀況。', 'mp-pneumonia', 'What is pneumonia'),
        t('肺炎症狀可能與感冒或流感相似，有時不易診斷；醫師會詢問病史、用聽診器聽肺部，可能安排胸部 X 光與抽血檢查。', 'mp-pneumonia', 'How is pneumonia diagnosed'),
      ]),
      sec('mechanism', [
        t('細菌、病毒與黴菌感染都可能造成肺炎，細菌最常見，也可能在感冒或流感後發生；不小心把食物或液體吸入肺部（吸入性）也可能造成肺炎。', 'mp-pneumonia', 'What causes pneumonia'),
      ]),
      sec('organs', [
        t('症狀包括發燒、畏寒、咳嗽（通常有痰）、呼吸急促、呼吸或咳嗽時胸痛、噁心嘔吐、腹瀉；年長者症狀可能較少較輕，甚至體溫偏低，或突然虛弱、意識混亂。', 'mp-pneumonia', 'Symptoms'),
        t('嚴重時可能併發菌血症（可能導致敗血性休克）、肺膿瘍、肋膜疾病、腎衰竭與呼吸衰竭。', 'mp-pneumonia', 'What other problems'),
      ]),
      sec('lifestyle', [
        t('風險較高：2 歲以下與 65 歲以上、吸菸、大量飲酒、營養不良、肺部疾病、免疫力低下、中風等造成咳嗽或吞嚥困難、近期感冒或流感，以及糖尿病、心臟衰竭、肝病、腎病等慢性病。', 'mp-pneumonia', 'Who is more likely'),
        t('疫苗可以預防肺炎鏈球菌或流感病毒造成的肺炎；勤洗手、不吸菸與健康的生活方式也可能有幫助。', 'mp-pneumonia', 'Can pneumonia be prevented'),
      ]),
      sec('nutrition', [gen('生病期間補充足夠水分與營養；吞嚥困難的長者，進食時要坐正、放慢速度，必要時請語言治療師評估。')]),
      sec('meds', [t('抗生素治療細菌性肺炎，對病毒性肺炎無效；部分病毒性肺炎可用抗病毒藥，黴菌性肺炎用抗黴菌藥。症狀嚴重或有併發症風險時需住院。', 'mp-pneumonia', 'Treatments'), MED_NOTE]),
      sec('redflags', [gen('呼吸困難、嘴唇發紫、意識混亂、高燒不退，或長者突然虛弱、意識改變時，請立即就醫。')]),
    ],
  },
  {
    id: 'uti', title: '泌尿道感染', en: 'Urinary Tract Infection', organs: ['bladder', 'kidneys'], specialty: '泌尿科或家醫科',
    review: rev('MedlinePlus Urinary Tract Infections', '泌尿科或家醫科'),
    animPlan: ['泌尿系統：腎、輸尿管、膀胱、尿道', '細菌感染膀胱（示意）', '感染往上到腎臟的警訊（示意）'],
    sections: [
      sec('define', [
        t('泌尿系統是身體排除廢物與多餘水分的系統，包括兩個腎臟、兩條輸尿管、膀胱與尿道；泌尿道感染是身體第二常見的感染。', 'mp-uti', 'Summary'),
        t('醫師可以用尿液檢查判斷是否為泌尿道感染。', 'mp-uti', 'Summary'),
      ]),
      sec('mechanism', [gen('細菌進入泌尿道並在膀胱等處繁殖，引起發炎。')]),
      sec('organs', [t('可能的症狀：解尿疼痛或灼熱、發燒、疲倦或發抖、頻尿、下腹壓迫感、尿液有異味或混濁帶紅、肋骨下方的背部或側腹疼痛。', 'mp-uti', 'Summary')]),
      sec('lifestyle', [t('任何年齡與性別都可能發生，但女性約為男性的 4 倍；糖尿病、需要導尿管或脊髓損傷者風險較高。', 'mp-uti', 'Summary')]),
      sec('nutrition', [gen('喝足夠的水，不要憋尿。')]),
      sec('meds', [t('治療使用抗生素。', 'mp-uti', 'Summary'), gen('抗生素請依醫囑完整服用，不要症狀改善就自行停藥。'), MED_NOTE]),
      sec('redflags', [t('懷疑泌尿道感染時應就醫。', 'mp-uti', 'Summary'), gen('發燒、畏寒、腰背痛或嘔吐時，可能是腎臟感染，請儘速就醫。')]),
    ],
  },
  {
    id: 'urinary-incontinence', title: '尿失禁', en: 'Urinary Incontinence', organs: ['bladder'], specialty: '泌尿科或婦產科',
    review: rev('MedlinePlus Urinary Incontinence', '泌尿科或婦產科'),
    animPlan: ['膀胱儲尿與骨盆底肌', '腹壓增加時漏尿（應力性，示意）', '凱格爾運動與膀胱訓練（示意）'],
    sections: [
      sec('define', [
        t('尿失禁是無法控制排尿、膀胱失去控制，是常見的問題，從輕微到大幅影響日常生活都有可能，經適當治療可以改善。', 'mp-ui', 'What is urinary incontinence'),
        t('常見類型：應力性（咳嗽、打噴嚏、大笑、提重物時漏尿，原因包括骨盆底肌無力）、急迫性（突然很想解尿、來不及到廁所，常與膀胱過動有關）、滿溢性（膀胱排不乾淨，男性較常見）、功能性，以及混合型。', 'mp-ui', 'Types'),
        t('診斷可能包括病史與排尿日記、身體檢查、尿液或血液檢查、膀胱功能檢查與影像檢查。', 'mp-ui', 'How is urinary incontinence diagnosed'),
      ]),
      sec('mechanism', [t('隨年齡增長，泌尿道的肌肉變弱，較難憋住尿液。', 'mp-ui', 'Who is at risk')]),
      sec('organs', [gen('漏尿可能影響外出、運動、睡眠與心情，也可能造成皮膚問題。')]),
      sec('lifestyle', [
        t('風險較高：女性（特別是懷孕、生產或停經後）、年長者、男性攝護腺問題、糖尿病、肥胖、長期便秘、吸菸。', 'mp-ui', 'Who is at risk'),
        t('自我照顧：在適當時間喝適量的水、規律活動、維持健康體重、避免便秘、不吸菸；膀胱訓練（依排尿日記定時排尿、逐漸拉長間隔）；凱格爾運動（收縮與放鬆控制排尿的肌肉）強化骨盆底肌。', 'mp-ui', 'Treatments'),
      ]),
      sec('nutrition', [gen('減少咖啡因與酒精；多攝取膳食纖維與水分避免便秘。')]),
      sec('meds', [t('若自我照顧無效，可能使用放鬆膀胱或阻斷頻尿訊號的藥物、男性縮小攝護腺的藥物、導尿管或其他醫療器材、膨脹劑注射等。', 'mp-ui', 'Treatments'), MED_NOTE]),
      sec('redflags', [gen('突然無法解尿、血尿、發燒或解尿疼痛，或合併下肢無力麻木時，請儘速就醫。')]),
    ],
  },
  {
    id: 'ibs', title: '大腸激躁症', en: 'Irritable Bowel Syndrome', organs: ['intestines'], specialty: '腸胃科',
    review: rev('MedlinePlus Irritable Bowel Syndrome', '腸胃科'),
    animPlan: ['大腸的蠕動', '蠕動與感覺異常：腹痛、脹氣（示意）', '飲食、壓力管理與治療'],
    sections: [
      sec('define', [
        t('大腸激躁症是影響大腸的問題，可能造成腹部絞痛、脹氣與排便習慣改變（便秘、腹瀉或兩者交替）；雖然可能很不舒服，但不會傷害腸道。', 'mp-ibs', 'Summary'),
        t('沒有特定的檢查能診斷大腸激躁症；醫師可能安排糞便、血液、X 光、乙狀結腸鏡或大腸鏡檢查，以排除其他疾病。', 'mp-ibs', 'Summary'),
      ]),
      sec('mechanism', [t('目前沒有人知道大腸激躁症的確切原因。', 'mp-ibs', 'Summary')]),
      sec('organs', [gen('症狀主要在腸道，常在進食或壓力大時加重。')]),
      sec('lifestyle', [t('大腸激躁症很常見，女性約為男性的兩倍，多見於 45 歲以下。', 'mp-ibs', 'Summary')]),
      sec('nutrition', [t('多數人可透過飲食調整、壓力管理、益生菌與藥物控制症狀。', 'mp-ibs', 'Summary'), gen('可記錄飲食與症狀，找出誘發的食物；調整飲食前可與醫師或營養師討論。')]),
      sec('meds', [gen('藥物依便秘型、腹瀉型等症狀由醫師評估。'), MED_NOTE]),
      sec('redflags', [gen('出現血便、黑便、體重不明原因下降、夜間腹痛或腹瀉、貧血，或 50 歲以後才開始出現症狀時，請就醫排除其他疾病。')]),
    ],
  },
  {
    id: 'gallstones', title: '膽結石', en: 'Gallstones', organs: ['liver', 'stomach'], specialty: '腸胃肝膽科或一般外科',
    review: rev('MedlinePlus Gallstones', '腸胃肝膽科或一般外科'),
    animPlan: ['膽囊儲存膽汁並經膽管送到小腸', '膽汁物質變硬形成結石（示意）', '結石阻塞膽管（示意）'],
    sections: [
      sec('define', [
        t('膽囊是肝臟下方梨形的器官，儲存肝臟製造、用來消化脂肪的膽汁；進食消化時，膽囊經總膽管把膽汁送到小腸。', 'mp-gallstones', 'Summary'),
        t('膽結石常在因其他問題做影像檢查時被發現；沒有症狀時通常不需要治療。', 'mp-gallstones', 'Summary'),
      ]),
      sec('mechanism', [t('膽汁中的物質變硬就會形成膽結石；結石阻塞膽管中膽汁的流動時，最容易造成問題。', 'mp-gallstones', 'Summary')]),
      sec('organs', [t('膽結石發作通常在進食後，可能出現噁心、嘔吐，或腹部、背部、右側腋下附近疼痛。', 'mp-gallstones', 'Summary')]),
      sec('lifestyle', [t('膽結石最常見於年長者、女性與體重過重者。', 'mp-gallstones', 'Summary')]),
      sec('nutrition', [gen('均衡飲食、維持健康體重；避免過快減重。')]),
      sec('meds', [t('最常見的治療是切除膽囊；沒有膽囊也能生活，膽汁有其他途徑到達小腸。', 'mp-gallstones', 'Summary'), MED_NOTE]),
      sec('redflags', [gen('右上腹劇痛持續數小時、發燒畏寒、眼睛或皮膚變黃時，請儘速就醫。')]),
    ],
  },
  {
    id: 'iron-deficiency-anemia', title: '缺鐵性貧血', en: 'Iron-Deficiency Anemia', organs: ['heart', 'vessels'], specialty: '血液科或家醫科',
    review: rev('NHLBI Iron-Deficiency Anemia；MedlinePlus Anemia、Iron', '血液科或家醫科'),
    animPlan: ['紅血球與血紅素運送氧氣', '缺鐵使紅血球變少、攜氧變差（示意）', '找出原因與補鐵'],
    sections: [
      sec('define', [
        t('缺鐵性貧血是身體鐵質不足造成的貧血，是最常見的貧血類型。', 'nhlbi-ida', 'What is iron-deficiency anemia'),
        t('貧血時血液無法運送足夠的氧氣到全身；身體需要鐵來製造血紅素，血紅素是讓血液呈紅色、把氧氣從肺部送到全身的含鐵蛋白質。', 'mp-anemia', 'Summary'),
        t('醫師會以身體檢查與血液檢查診斷貧血，治療依貧血種類而定。', 'mp-anemia', 'Summary'),
      ]),
      sec('mechanism', [
        t('失血會流失鐵質，例如腸胃道出血（發炎性腸道疾病、潰瘍、大腸癌）、外傷或手術、經血量多或生產出血、長期使用阿斯匹靈或非類固醇消炎止痛藥；乳糜瀉、幽門桿菌感染、腸胃手術等也可能影響鐵的吸收。', 'nhlbi-ida', 'Causes'),
      ]),
      sec('organs', [t('輕度或中度可能沒有症狀；較嚴重時可能疲倦、呼吸急促、胸痛、頭暈、手腳冰冷、皮膚蒼白。', 'nhlbi-ida', 'Symptoms')]),
      sec('lifestyle', [t('較容易缺鐵的族群：經血量多、懷孕或哺乳、經常捐血、癌症、部分消化道疾病、心臟衰竭、洗腎等。', 'mp-iron', 'What causes low iron')]),
      sec('nutrition', [
        t('含鐵較多的食物：瘦肉、海鮮與家禽，強化鐵的早餐穀片與麵包，白豆、扁豆、菠菜、腰豆與豌豆，堅果與葡萄乾等果乾。', 'mp-iron', 'How do you get iron'),
        t('鐵太多也會傷害身體：健康的人服用過多鐵補充劑可能便秘、噁心嘔吐、腹痛、腹瀉，極高劑量可能造成器官損傷甚至死亡。', 'mp-iron', 'What happens if you get too much iron'),
      ]),
      sec('meds', [t('缺鐵與缺鐵性貧血通常以鐵補充劑治療。', 'mp-iron', 'What happens if you don’t get enough iron'), gen('補鐵前應先找出缺鐵原因（例如腸胃道出血），補充劑量請依醫師指示。'), MED_NOTE]),
      sec('redflags', [gen('出現黑便、血便、嘔血，或胸痛、呼吸困難、昏厥時，請儘速就醫。')]),
    ],
  },
  {
    id: 'low-back-pain', title: '下背痛與椎間盤突出', en: 'Low Back Pain and Herniated Disk', organs: ['bones', 'nerves'], specialty: '骨科、神經外科或復健科',
    review: rev('MedlinePlus Back Pain、Herniated Disk', '骨科、神經外科或復健科'),
    animPlan: ['脊椎與椎間盤', '椎間盤破裂壓迫神經（示意）', '活動、運動與物理治療'],
    sections: [
      sec('define', [
        t('背痛是最常見的醫療問題之一，10 個人中有 8 個一生中曾經背痛；可能是持續的悶痛，也可能是突然的劇痛。急性背痛突然發生，通常持續幾天到幾週；超過三個月稱為慢性背痛。', 'mp-backpain', 'Summary'),
        t('脊椎由 26 塊椎骨組成，椎骨之間有充滿膠狀物質的椎間盤，負責緩衝並固定椎骨；醫師以身體檢查、有時加上影像檢查診斷椎間盤突出。', 'mp-disk', 'Summary'),
      ]),
      sec('mechanism', [
        t('隨著年紀增長，椎間盤會退化、失去緩衝能力，背部受壓時可能疼痛；椎間盤突出是椎間盤破裂，中央的膠狀物質流出刺激附近神經，可能造成坐骨神經痛或背痛。', 'mp-disk', 'Summary'),
      ]),
      sec('organs', [gen('神經受刺激時，疼痛可能沿著臀部、大腿後側延伸到小腿，並可能麻木或無力。')]),
      sec('lifestyle', [
        t('大多數背痛會自行好轉，雖然可能需要一段時間；非處方止痛藥與休息可能有幫助，但臥床超過 1–2 天可能讓背痛更糟。', 'mp-backpain', 'Summary'),
        gen('搬重物時蹲下、用腿出力，避免彎腰扭轉；久坐時定時起身活動；規律運動強化核心肌群。'),
      ]),
      sec('nutrition', [gen('維持健康體重，減輕脊椎負擔。')]),
      sec('meds', [
        t('背痛的治療依疼痛種類與原因而定，可能包括冷熱敷、運動、藥物、注射、輔助療法，有時需要手術。', 'mp-backpain', 'Summary'),
        t('多數椎間盤突出的人經治療會恢復，治療包括休息、止痛與消炎藥、物理治療，有時需要手術。', 'mp-disk', 'Summary'),
        MED_NOTE,
      ]),
      sec('redflags', [
        t('背痛嚴重或三天沒有改善時應聯絡醫療人員；受傷後背痛也應就醫。', 'mp-backpain', 'Summary'),
        gen('合併大小便失禁、會陰部麻木、下肢逐漸無力，或發燒、不明原因體重下降時，請立即就醫。'),
      ]),
    ],
  },
  /* ===== 第五批常見疾病（2026-11-18） ===== */
  {
    id: 'rheumatoid-arthritis', title: '類風濕性關節炎', en: 'Rheumatoid Arthritis', organs: ['bones'], specialty: '風濕免疫科',
    review: rev('MedlinePlus Rheumatoid Arthritis', '風濕免疫科'),
    animPlan: ['手部的小關節', '免疫攻擊關節滑膜造成發炎（示意）', '及早治療減少關節損傷'],
    sections: [
      sec('define', [
        t('類風濕性關節炎是一種自體免疫疾病，造成關節疼痛、腫脹與僵硬；最常見於手腕與手指，但免疫系統可能攻擊任何關節組織，發炎也可能影響眼睛、皮膚、心臟、神經、血液等。', 'mp-ra', 'What is rheumatoid arthritis'),
        t('與常隨年齡出現的退化性關節炎不同，類風濕性關節炎影響關節的內襯，並損傷覆蓋骨頭末端的組織，最終可能使關節功能變差。', 'mp-ra', 'What is rheumatoid arthritis'),
        t('沒有單一檢查能診斷；醫師會詢問病史與家族史、檢查關節，並安排抽血或 X 光、超音波，可能轉介風濕科醫師。', 'mp-ra', 'How is rheumatoid arthritis diagnosed'),
      ]),
      sec('mechanism', [t('原因不明，可能與基因、環境（如香菸）及性荷爾蒙有關；免疫系統可能在出現症狀前數年就開始攻擊關節與組織。', 'mp-ra', 'What causes；Symptoms')]),
      sec('organs', [t('症狀可能包括：活動時關節疼痛或僵硬（早上或久未活動後更明顯），通常兩側對稱；關節壓痛、發紅、發熱、腫脹；疲倦、發燒、食慾差；關節附近皮下硬塊（類風濕結節）。', 'mp-ra', 'Symptoms')]),
      sec('lifestyle', [
        t('風險較高：年紀較長、女性、家族史、長期吸菸，以及肥胖、牙周病與肺部疾病。', 'mp-ra', 'Who is more likely'),
        t('自我管理：保持活動、維持健康體重、避免關節受傷與反覆動作、戒菸或不吸菸。', 'mp-ra', 'Treatments'),
      ]),
      sec('nutrition', [gen('均衡飲食、維持健康體重；目前沒有食物或保健食品能治癒類風濕性關節炎。')]),
      sec('meds', [t('類風濕性關節炎無法治癒，但及早治療可避免症狀惡化與關節損傷；治療可能包括藥物、生活調整與手術。', 'mp-ra', 'Treatments'), MED_NOTE]),
      sec('redflags', [gen('多處關節紅腫熱痛合併發燒，或出現呼吸困難、胸痛時，請儘速就醫。')]),
    ],
  },
  {
    id: 'sle', title: '全身性紅斑性狼瘡', en: 'Systemic Lupus Erythematosus', organs: ['skin', 'kidneys', 'heart'], specialty: '風濕免疫科',
    review: rev('MedlinePlus Lupus', '風濕免疫科'),
    animPlan: ['免疫系統誤攻擊健康組織（示意）', '臉部蝴蝶斑與多器官發炎（示意）', '預防與治療發作'],
    sections: [
      sec('define', [
        t('紅斑性狼瘡是慢性的自體免疫疾病：免疫系統誤攻擊健康的細胞與組織，造成發炎，可能損傷關節、皮膚、腎臟、心臟、肺與腦；全身性紅斑性狼瘡是最常見的類型。', 'mp-lupus', 'What is lupus'),
        t('沒有專一的檢查，常被誤認為其他症狀相似的疾病，可能需要一段時間才能確診。', 'mp-lupus', 'How is lupus diagnosed'),
      ]),
      sec('mechanism', [t('原因不明，研究中的可能因素包括基因、環境（病毒感染、陽光、某些藥物、吸菸）與免疫系統問題。', 'mp-lupus', 'What causes lupus')]),
      sec('organs', [
        t('常見症狀：關節炎與晨僵、發燒、疲倦、臉部紅疹（蝴蝶斑）、深呼吸時胸痛、掉髮、手指腳趾遇冷或壓力變白或發紫（雷諾氏現象）、對陽光敏感、腿或眼周水腫、口腔潰瘍、淋巴腺腫、頭痛頭暈、意識混亂與記憶問題；症狀時好時壞，出現症狀稱為發作。', 'mp-lupus', 'Symptoms'),
        t('全身發炎可能造成腎臟損傷（狼瘡性腎炎）、心肌炎或心包膜炎、血管炎、血栓、肋膜炎，也較容易發生冠狀動脈疾病與動脈粥狀硬化。', 'mp-lupus', 'What other problems'),
      ]),
      sec('lifestyle', [t('任何人都可能罹患，但女性遠多於男性；亞洲人也較常見。', 'mp-lupus', 'Who is more likely'), gen('外出做好防曬、避免吸菸、規律作息，新症狀出現時及早告知醫師。')]),
      sec('nutrition', [gen('均衡飲食；有腎臟侵犯時，鹽分與蛋白質攝取需與醫師或營養師討論。')]),
      sec('meds', [t('紅斑性狼瘡無法治癒，但藥物與生活調整可以控制；治療目標是預防與治療發作、減少器官損傷並改善生活品質。通常由家庭醫師協調，搭配風濕科與其他專科。', 'mp-lupus', 'Treatments'), MED_NOTE]),
      sec('redflags', [gen('胸痛、呼吸困難、明顯水腫或尿量減少、抽搐或意識改變時，請立即就醫。')]),
    ],
  },
  {
    id: 'frailty-falls', title: '衰弱與跌倒', en: 'Frailty and Falls', organs: ['bones', 'muscles'], specialty: '家醫科或老年醫學科',
    review: rev('MedlinePlus Falls（NIA）', '家醫科或老年醫學科'),
    animPlan: ['站立與平衡', '肌力不足、平衡差時跌倒與髖部骨折（示意）', '運動、居家安全與鈣質'],
    sections: [
      sec('define', [
        gen('衰弱是長者體力、肌力與身體儲備能力下降的狀態，容易疲倦、走路變慢、體重減輕，跌倒與失能的風險較高；是否為衰弱需由醫療人員評估。'),
        t('長者跌倒特別嚴重：跌倒風險較高，也較容易骨折（特別是有骨質疏鬆時）；髖部骨折甚至可能造成失能與失去獨立生活能力。', 'mp-falls', 'Summary'),
      ]),
      sec('mechanism', [t('常見跌倒原因：平衡問題、會讓人頭暈或反應變慢的藥物、視力問題、酒精、肌肉無力（特別是腿部）、低血壓、糖尿病、神經病變等疾病、反射變慢，以及絆倒或滑倒。', 'mp-falls', 'Summary')]),
      sec('organs', [gen('跌倒可能造成髖部、手腕或脊椎骨折與頭部外傷；害怕再跌倒也可能讓活動減少，使肌力更差。')]),
      sec('lifestyle', [
        t('規律運動可強化肌肉、改善平衡、保持骨骼強健，降低跌倒風險；定期做眼睛檢查，並讓居家更安全，例如移除絆倒物、在樓梯與浴室加裝扶手。', 'mp-falls', 'Summary'),
      ]),
      sec('nutrition', [t('攝取足夠的鈣質與維生素 D，可降低跌倒時骨折的機會。', 'mp-falls', 'Summary'), gen('每餐攝取足夠蛋白質以維持肌肉量（可參考「肌少症」）。')]),
      sec('meds', [gen('服用多種藥物或有頭暈副作用的藥物時，請請醫師或藥師檢視用藥。'), MED_NOTE]),
      sec('redflags', [gen('跌倒後無法站立、髖部疼痛、頭部撞擊後頭痛嘔吐或意識改變時，請立即就醫或撥打 119。')]),
    ],
  },
  {
    id: 'allergic-rhinitis', title: '過敏性鼻炎', en: 'Allergic Rhinitis (Hay Fever)', organs: ['airway', 'eyes'], specialty: '耳鼻喉科或過敏免疫科',
    review: rev('MedlinePlus Hay Fever', '耳鼻喉科或過敏免疫科'),
    animPlan: ['鼻腔與鼻甲', '過敏原引起鼻黏膜腫脹（示意）', '藥物、鼻噴劑與生理食鹽水沖洗'],
    sections: [
      sec('define', [
        t('樹木、雜草與草地會釋放花粉到空氣中，部分花粉進入鼻子與喉嚨，可能引發稱為花粉熱的過敏（過敏性鼻炎的一種）。', 'mp-hayfever', 'Summary'),
        t('醫療人員可依身體檢查與症狀診斷，有時會做皮膚或血液檢查。', 'mp-hayfever', 'Summary'),
      ]),
      sec('mechanism', [gen('身體的免疫系統把花粉、塵蟎等無害物質當成威脅，引起鼻腔黏膜發炎腫脹與分泌物增加。')]),
      sec('organs', [t('症狀可能包括：打噴嚏（常伴隨流鼻水或鼻塞）、咳嗽與鼻涕倒流、眼睛鼻子喉嚨癢、眼睛紅與流淚、黑眼圈。', 'mp-hayfever', 'Summary')]),
      sec('lifestyle', [gen('記錄誘發症狀的環境；花粉多時減少外出、關窗並使用空氣清淨機，定期清洗寢具以減少塵蟎。')]),
      sec('nutrition', [gen('目前沒有食物能治癒過敏性鼻炎；均衡飲食、充足睡眠。')]),
      sec('meds', [t('藥物與鼻噴劑可以緩解症狀；也可以沖洗鼻腔，但要使用蒸餾水或滅菌水調製的生理食鹽水。減敏注射可降低對花粉的敏感度，提供長期緩解。', 'mp-hayfever', 'Summary'), MED_NOTE]),
      sec('redflags', [gen('出現呼吸困難、喘鳴、臉或喉嚨腫脹時，請立即撥打 119。')]),
    ],
  },
  {
    id: 'hearing-loss', title: '聽力損失', en: 'Hearing Loss', organs: ['nerves'], specialty: '耳鼻喉科',
    review: rev('MedlinePlus Hearing Disorders；Age-related hearing loss', '耳鼻喉科'),
    animPlan: ['聲音從外耳傳到內耳', '內耳毛細胞受損（示意）', '助聽器與人工電子耳'],
    sections: [
      sec('define', [
        t('聽力損失主要有兩種：內耳或聽神經受損，通常是永久的；聲波無法到達內耳（耳垢、積液或耳膜破洞），治療或手術常可恢復。', 'mp-hearing', 'Summary'),
        t('老年性聽力損失是隨年齡增長慢慢失去聽力；醫師會用耳鏡檢查耳道，必要時轉介耳鼻喉科與聽力師做聽力檢查。', 'mp-presby', 'Exams and Tests'),
      ]),
      sec('mechanism', [
        t('內耳的細小毛細胞接收聲波，轉換成大腦可解讀的神經訊號；毛細胞受損或死亡就會造成聽力損失，毛細胞不會再生，因此這類損失是永久的。', 'mp-presby', 'Causes'),
        t('可能原因包括遺傳、耳朵感染與腦膜炎等疾病、外傷、某些藥物、長期暴露於大聲噪音與老化。', 'mp-hearing', 'Summary'),
      ]),
      sec('organs', [t('症狀：聽不清楚周遭的人說話、需要把電視音量調大、常請別人重複、在吵雜環境更難聽清楚、分不清「ㄙ」等高頻音、耳鳴；聽力損失可能讓人避免出門而社交孤立。', 'mp-presby', 'Symptoms；Outlook')]),
      sec('lifestyle', [t('相關因素包括家族史、反覆暴露於噪音、吸菸、糖尿病等疾病與某些藥物。', 'mp-presby', 'Causes'), gen('減少噪音暴露：使用耳機時音量勿過大、時間勿過長，在吵雜環境配戴耳塞。')]),
      sec('nutrition', [gen('控制血糖與血壓；不吸菸。')]),
      sec('meds', [t('老年性聽力損失無法治癒，治療以改善日常功能為主：助聽器、電話擴音器等輔具、讀唇；嚴重者可考慮人工電子耳，能偵測聲音，但無法恢復正常聽力。', 'mp-presby', 'Treatment'), MED_NOTE]),
      sec('redflags', [t('聽力突然改變，或聽力損失合併其他症狀時，請立即聯絡醫療人員。', 'mp-presby', 'When to Contact a Medical Professional'), gen('突發性聽力損失需儘快就醫，愈早治療愈好。')]),
    ],
  },
  {
    id: 'overactive-bladder', title: '膀胱過動症', en: 'Overactive Bladder', organs: ['bladder'], specialty: '泌尿科或婦產科',
    review: rev('MedlinePlus Bladder Diseases、Urinary Incontinence；NIDDK Bladder Control', '泌尿科或婦產科'),
    animPlan: ['膀胱逐漸充滿', '膀胱在錯誤的時間收縮（示意）', '膀胱訓練與藥物'],
    sections: [
      sec('define', [
        t('膀胱過動症是膀胱在錯誤的時間把尿液擠出的狀況；診斷可能包括尿液檢查、X 光與膀胱鏡檢查。', 'mp-bladder', 'Summary'),
        t('急迫性尿失禁是突然很想解尿、來不及到廁所就漏尿，常與膀胱過動有關；也可能是泌尿道感染的徵兆。', 'mp-ui', 'Types'),
      ]),
      sec('mechanism', [gen('膀胱肌肉在尚未充滿時就不自主收縮，產生強烈尿意。')]),
      sec('organs', [t('常常突然很想上廁所，或在日常活動中漏尿，可能是膀胱控制問題，請與醫療人員討論。', 'niddk-bladder', 'Symptoms & Causes')]),
      sec('lifestyle', [
        t('膀胱訓練：依排尿日記定時排尿，再逐漸拉長間隔，幫助膀胱容納更多尿液；凱格爾運動可強化骨盆底肌。', 'mp-ui', 'Treatments'),
        t('良好的習慣，例如飲食均衡、喝足夠的水、維持健康體重，可能幫助維持膀胱健康。', 'niddk-bladder', 'Prevention'),
      ]),
      sec('nutrition', [gen('減少咖啡因、酒精與碳酸飲料；不要因為怕頻尿而喝太少水。')]),
      sec('meds', [t('若自我照顧無效，可能使用放鬆膀胱肌肉、預防膀胱痙攣或阻斷頻尿急尿神經訊號的藥物。', 'mp-ui', 'Treatments'), MED_NOTE]),
      sec('redflags', [gen('解尿疼痛、血尿、發燒，或突然解不出尿時，請儘速就醫。')]),
    ],
  },
  {
    id: 'thalassemia', title: '地中海型貧血', en: 'Thalassemia', organs: ['vessels', 'liver'], specialty: '血液科',
    review: rev('MedlinePlus Thalassemia', '血液科'),
    animPlan: ['紅血球與血紅素', '健康紅血球與血紅素較少（示意）', '輸血與排鐵治療'],
    sections: [
      sec('define', [
        t('地中海型貧血是遺傳性血液疾病：身體製造的健康紅血球與血紅素較少，因而造成貧血；常見於義大利、希臘、中東、南亞與非洲裔族群。', 'mp-thal', 'Summary'),
        t('醫師以血液檢查診斷地中海型貧血。', 'mp-thal', 'Summary'),
      ]),
      sec('mechanism', [t('血紅素是把氧氣運送到全身的蛋白質；地中海型貧血者的血紅素與健康紅血球製造較少。', 'mp-thal', 'Summary')]),
      sec('organs', [t('嚴重程度從輕微到嚴重；有些人沒有症狀或只有輕微貧血，重型可能在出生後兩年內出現嚴重貧血、生長與青春期遲緩，以及脾臟、肝臟、心臟或骨骼問題。', 'mp-thal', 'Summary')]),
      sec('lifestyle', [gen('地中海型貧血是遺傳疾病；計畫懷孕前可與醫師討論血液檢查與遺傳諮詢。')]),
      sec('nutrition', [gen('不要自行補充鐵劑：地中海型貧血與缺鐵性貧血不同，是否需要補鐵請由醫師依檢查決定。')]),
      sec('meds', [t('治療包括輸血與移除體內過多鐵質；症狀輕微或沒有症狀者可能不需要治療，部分嚴重個案需要骨髓移植。', 'mp-thal', 'Summary'), MED_NOTE]),
      sec('redflags', [gen('明顯喘、心悸、極度疲倦或臉色非常蒼白時，請儘速就醫。')]),
    ],
  },
  {
    id: 'bph', title: '良性攝護腺肥大', en: 'Benign Prostatic Hyperplasia (BPH)', organs: ['bladder'], specialty: '泌尿科',
    review: rev('MedlinePlus Enlarged Prostate (BPH)', '泌尿科'),
    animPlan: ['攝護腺位於膀胱下方、包圍尿道', '攝護腺變大壓迫尿道（示意）', '生活調整與藥物'],
    sections: [
      sec('define', [
        t('攝護腺是男性生殖系統的腺體，位於膀胱正下方，製造精液的一部分液體；良性攝護腺肥大是攝護腺比正常大，不是癌症，也不會增加攝護腺癌風險。', 'mp-bph', 'What is the prostate；What is an enlarged prostate'),
        t('攝護腺在成年期持續生長，因此良性攝護腺肥大是 50 歲以上最常見的攝護腺問題。', 'mp-bph', 'What is an enlarged prostate'),
      ]),
      sec('mechanism', [t('攝護腺變大時可能壓迫膀胱、擠壓尿道，使尿流變慢或受阻；長期下來膀胱肌肉可能因用力排尿而變弱，無法完全排空。研究者認為可能與老化的荷爾蒙變化有關。', 'mp-bph', 'What is an enlarged prostate；What causes')]),
      sec('organs', [t('症狀：頻尿或急尿、夜間多次起床解尿、不易開始解尿、尿流弱慢或斷斷續續、解完後滴尿、尿失禁、覺得沒有解乾淨、射精後或解尿時疼痛。', 'mp-bph', 'Symptoms')]),
      sec('lifestyle', [
        t('風險較高：40 歲以上、家族史、肥胖、心臟病與循環問題、第二型糖尿病、勃起功能障礙、活動量不足。', 'mp-bph', 'Who is more likely'),
        t('輕微症狀可透過生活調整改善：睡前或外出前少喝水、減少含咖啡因飲料與酒精、膀胱訓練與鍛鍊控制排尿的肌肉、預防或治療便秘。', 'mp-bph', 'Treatments'),
      ]),
      sec('nutrition', [gen('減少咖啡因與酒精，多攝取蔬果與膳食纖維預防便秘。')]),
      sec('meds', [t('不是每個人都需要治療；藥物可抑制攝護腺生長、縮小攝護腺或放鬆肌肉改善尿流，有時合併兩種藥物效果較好。', 'mp-bph', 'Treatments'), MED_NOTE]),
      sec('redflags', [t('完全解不出尿，或解尿疼痛、頻尿急尿合併發燒畏寒時，請立即就醫。', 'mp-bph', 'Symptoms')]),
    ],
  },
  {
    id: 'erectile-dysfunction', title: '勃起功能障礙', en: 'Erectile Dysfunction', organs: ['vessels', 'nerves'], specialty: '泌尿科',
    review: rev('MedlinePlus Erectile Dysfunction', '泌尿科'),
    animPlan: ['陰莖海綿體的血流（示意）', '血管阻塞或神經受損使血流不足（示意）', '運動、減重、戒菸與治療'],
    sections: [
      sec('define', [
        t('勃起功能障礙是常見的男性性功能障礙，指難以勃起或維持勃起；年紀越大越常見，但不是老化的正常現象。', 'mp-ed', 'Summary'),
      ]),
      sec('mechanism', [t('勃起功能障礙可能是健康問題的徵兆，例如血管阻塞，或糖尿病造成的神經損傷。', 'mp-ed', 'Summary')]),
      sec('organs', [gen('陰莖血管與心臟血管同樣可能受動脈粥狀硬化影響，因此也應評估血壓、血糖與血脂。')]),
      sec('lifestyle', [t('增加運動、減重或戒菸可能有幫助。', 'mp-ed', 'Summary')]),
      sec('nutrition', [gen('採用心臟健康飲食，控制血糖、血壓與血脂；限制飲酒。')]),
      sec('meds', [t('有勃起功能障礙應告訴醫師；若不就醫，背後的健康問題可能沒有被治療。醫師可提供多種治療，許多人只需服用藥物。', 'mp-ed', 'Summary'), gen('不要自行購買來路不明的壯陽藥；服用硝酸鹽類心臟藥物者，用藥前必須告知醫師。'), MED_NOTE]),
      sec('redflags', [gen('勃起持續超過 4 小時且疼痛時，請立即就醫。')]),
    ],
  },
  {
    id: 'late-onset-hypogonadism', title: '男性更年期（睪固酮低下）', en: 'Late-onset Hypogonadism', organs: ['bones', 'muscles'], specialty: '泌尿科或新陳代謝科',
    review: rev('MedlinePlus Testosterone Levels Test', '泌尿科或新陳代謝科'),
    animPlan: ['睪固酮的作用', '睪固酮低下：肌肉與骨骼變化（示意）', '抽血檢查與醫師評估'],
    sections: [
      sec('define', [
        t('睪固酮可幫助控制性慾，並協助肌肉與骨骼生長；在男性也與體毛、精子製造與紅血球生成有關。', 'mp-testo', 'What is a testosterone levels test'),
        t('睪固酮隨年齡下降是正常的；檢驗結果不正常不一定代表需要治療，需由醫師依年齡、症狀與其他檢查判斷。', 'mp-testo', 'What do the results mean'),
        gen('「男性更年期」是民眾常用的說法，醫學上與年齡相關的睪固酮低下需由醫師依症狀與抽血結果綜合評估。'),
      ]),
      sec('mechanism', [t('醫師可安排總睪固酮（最常用）、游離睪固酮或生物可利用睪固酮檢查，找出睪固酮異常的原因。', 'mp-testo', 'What is a testosterone levels test')]),
      sec('organs', [t('男性睪固酮低下的症狀可能包括：性慾低、勃起功能障礙、不孕、男性女乳、臉部或體毛稀少、不明原因的骨質變薄或貧血、肌肉量流失。', 'mp-testo', 'Why do I need a testosterone levels test')]),
      sec('lifestyle', [gen('規律運動（特別是阻力運動）、維持健康體重、充足睡眠、限制飲酒，有助維持肌肉與骨骼健康。')]),
      sec('nutrition', [gen('均衡飲食，攝取足夠蛋白質、鈣與維生素 D；不要自行使用來路不明的荷爾蒙或補品。')]),
      sec('meds', [gen('是否需要荷爾蒙治療由醫師評估，需考量益處與風險並定期追蹤。'), MED_NOTE]),
      sec('redflags', [gen('出現胸痛、單側無力，或乳房出現硬塊時，請儘速就醫。')]),
    ],
  },
  /* ===== 女性疾病（2026-11-18） ===== */
  {
    id: 'pcos', title: '多囊性卵巢症候群', en: 'Polycystic Ovary Syndrome (PCOS)', organs: [], specialty: '婦產科或新陳代謝科',
    review: rev('MedlinePlus Polycystic Ovary Syndrome', '婦產科或新陳代謝科'),
    animPlan: ['卵巢與排卵（示意）', '濾泡停止發育、不排卵（示意）', '生活調整與治療'],
    sections: [
      sec('define', [
        t('多囊性卵巢症候群是一種荷爾蒙疾病，影響卵巢與身體許多部位；通常至少有以下兩項：不排卵（月經不規則或沒有月經）、雄性素過高（臉部或身體毛髮過多），以及單側或雙側卵巢有停止發育的濾泡聚集，看起來像許多小囊泡。', 'mp-pcos', 'What is PCOS'),
        t('沒有專一的檢查；醫師會做身體檢查、詢問病史與家族史，可能安排骨盆檢查、骨盆超音波（看卵巢與子宮內膜厚度）與荷爾蒙抽血檢查。', 'mp-pcos', 'How is PCOS diagnosed'),
        MALE_MODEL,
      ]),
      sec('mechanism', [t('確切原因不明，可能與遺傳、雄性素失衡與胰島素阻抗有關。', 'mp-pcos', 'What causes PCOS')]),
      sec('organs', [
        t('症狀可能包括：月經不規則或沒來、臉胸腹或大腿毛髮過多、肥胖或不易減重、嚴重青春痘、皮膚油、皮膚出現增厚的深色區塊（黑色棘皮症）、不孕。', 'mp-pcos', 'Symptoms'),
        t('與多種健康問題有關：胰島素阻抗（可能導致糖尿病前期與第二型糖尿病）、心臟病、高血壓、血脂異常、子宮內膜增生、睡眠呼吸中止、憂鬱與焦慮。', 'mp-pcos', 'What other health problems'),
      ]),
      sec('lifestyle', [t('生活調整可減少許多症狀，並降低或幫助管理相關健康問題：維持健康體重、規律身體活動、健康飲食。', 'mp-pcos', 'Treatments')]),
      sec('nutrition', [gen('減少精緻糖與含糖飲料，多攝取蔬菜、全穀與優質蛋白質，有助控制體重與血糖。')]),
      sec('meds', [t('藥物可能包括荷爾蒙避孕藥（使月經規律）、抗雄性素藥物、改善胰島素阻抗的藥物、青春痘藥物與除毛治療；想懷孕時可考慮生育治療。', 'mp-pcos', 'Treatments'), MED_NOTE]),
      sec('redflags', [gen('月經長時間沒來、大量不正常出血，或出現糖尿病症狀時，請就醫評估。')]),
    ],
  },
  {
    id: 'uterine-fibroids', title: '子宮肌瘤', en: 'Uterine Fibroids', organs: [], specialty: '婦產科',
    review: rev('MedlinePlus Uterine Fibroids', '婦產科'),
    animPlan: ['子宮的構造（示意）', '肌瘤在子宮壁生長（示意）', '依症狀決定是否治療'],
    sections: [
      sec('define', [
        t('子宮肌瘤是生育年齡女性最常見的良性（非癌症）腫瘤，由肌肉細胞與其他組織構成，生長在子宮壁內或周圍，數量與大小不一，可能單顆或成群；常沒有症狀。', 'mp-fibroids', 'What are uterine fibroids'),
        t('醫師可能在骨盆檢查或影像檢查時發現肌瘤。', 'mp-fibroids', 'How are uterine fibroids diagnosed'),
        MALE_MODEL,
      ]),
      sec('mechanism', [t('原因不明，可能與遺傳與生長激素有關；雌激素與黃體素似乎會幫助肌瘤生長。', 'mp-fibroids', 'What causes uterine fibroids')]),
      sec('organs', [
        t('症狀依位置、大小與數量而定，可能包括：經血量多或經痛、經期間出血、下腹脹滿感、頻尿、性交疼痛、下背痛、不易懷孕或反覆流產。', 'mp-fibroids', 'Symptoms'),
      ]),
      sec('lifestyle', [t('風險較高：年紀較長、家族史、月經 10 歲前開始或從未懷孕、肥胖或維生素 D 缺乏；每次懷孕與長期使用避孕藥或避孕針會降低風險。', 'mp-fibroids', 'Who is more likely')]),
      sec('nutrition', [gen('經血量多時注意鐵質攝取（可參考「缺鐵性貧血」），必要時抽血檢查。')]),
      sec('meds', [t('沒有症狀可能不需要治療；有症狀時依年齡、肌瘤位置大小與是否想懷孕決定，可能包括減緩或停止肌瘤生長的藥物，或手術（如子宮切除）。肌瘤有時在更年期後縮小。', 'mp-fibroids', 'Treatments'), MED_NOTE]),
      sec('redflags', [gen('大量出血、頭暈心悸，或下腹劇痛時，請儘速就醫。')]),
    ],
  },
  {
    id: 'endometriosis', title: '子宮內膜異位症', en: 'Endometriosis', organs: [], specialty: '婦產科',
    review: rev('MedlinePlus Endometriosis', '婦產科'),
    animPlan: ['子宮內膜（示意）', '類似內膜的組織長在子宮外（示意）', '止痛、荷爾蒙與手術治療'],
    sections: [
      sec('define', [
        t('子宮內膜異位症是類似子宮內膜的組織長在身體其他地方，稱為植入、結節或病灶；最常見於卵巢表面或下方、輸卵管、子宮後方、固定子宮的組織，以及腸道或膀胱。', 'mp-endo', 'What is endometriosis'),
        t('手術是確診的唯一方法，最常見的是腹腔鏡；在此之前醫師會詢問症狀與病史，並做骨盆檢查與影像檢查。', 'mp-endo', 'How is endometriosis diagnosed'),
        MALE_MODEL,
      ]),
      sec('mechanism', [t('研究者還不知道子宮內膜異位症的原因。', 'mp-endo', 'What causes endometriosis')]),
      sec('organs', [t('主要症狀是骨盆疼痛（常在經期）與不孕；其他可能包括經痛愈來愈嚴重、性交中或後疼痛、腸道或下腹痛、經期排便或解尿疼痛、經血量多、經期間點狀出血、腸胃症狀與疲倦。', 'mp-endo', 'Symptoms')]),
      sec('lifestyle', [t('風險較高：母親、姊妹或女兒有子宮內膜異位症，月經 11 歲前開始，月經週期短於 27 天，經血量多且超過 7 天；曾經懷孕、較晚初經、哺乳者風險較低。', 'mp-endo', 'Who is at risk')]),
      sec('nutrition', [gen('經血量多時注意鐵質攝取；均衡飲食與規律運動有助整體健康。')]),
      sec('meds', [t('無法治癒，但可治療症狀：止痛藥（如非類固醇消炎止痛藥）、荷爾蒙治療（避孕藥、黃體素、GnRH 類藥物），嚴重疼痛可手術移除病灶；不孕可考慮腹腔鏡手術或試管嬰兒。', 'mp-endo', 'Treatments'), MED_NOTE]),
      sec('redflags', [gen('突然劇烈下腹痛、發燒，或經痛嚴重到影響日常生活時，請就醫評估。')]),
    ],
  },
  /* ===== 血管淋巴疾病（2026-11-18） ===== */
  {
    id: 'varicose-veins', title: '靜脈曲張', en: 'Varicose Veins', organs: ['vessels'], specialty: '心臟血管外科',
    review: rev('MedlinePlus Varicose Veins', '心臟血管外科'),
    animPlan: ['靜脈的單向瓣膜', '瓣膜無力、血液回堵（示意）', '運動、抬腿與避免久站'],
    sections: [
      sec('define', [
        t('靜脈曲張是皮膚下看得到、腫脹扭曲的靜脈，通常在腿部，也可能出現在身體其他部位；痔瘡也是一種靜脈曲張。', 'mp-varicose', 'Summary'),
        t('醫師常以身體檢查診斷，有時需要其他檢查。', 'mp-varicose', 'Summary'),
      ]),
      sec('mechanism', [t('靜脈有單向瓣膜，幫助血液流回心臟；瓣膜無力或受損時，血液會回堵並淤積在靜脈中，使靜脈腫脹，形成靜脈曲張。', 'mp-varicose', 'Summary')]),
      sec('organs', [gen('可能出現腿部沉重、痠脹、夜間抽筋或腳踝水腫，久站後較明顯。')]),
      sec('lifestyle', [
        t('靜脈曲張很常見；年紀較長、女性、肥胖、不運動或有家族史者風險較高，懷孕時也較常見。', 'mp-varicose', 'Summary'),
        t('運動、減重、休息時抬高腿、坐時不翹腳，穿寬鬆衣物並避免長時間站立，可以避免惡化。', 'mp-varicose', 'Summary'),
      ]),
      sec('nutrition', [gen('維持健康體重；多攝取膳食纖維預防便秘。')]),
      sec('meds', [t('若靜脈曲張疼痛或在意外觀，醫師可能建議以處置移除。', 'mp-varicose', 'Summary'), MED_NOTE]),
      sec('redflags', [gen('單側小腿突然紅腫熱痛，可能是深部靜脈血栓，請儘速就醫；靜脈曲張處出血不止時請就醫。')]),
    ],
  },
  {
    id: 'dvt', title: '深部靜脈血栓', en: 'Deep Vein Thrombosis', organs: ['vessels', 'lungs'], specialty: '心臟內科或心臟血管外科',
    review: rev('MedlinePlus Deep Vein Thrombosis', '心臟內科或心臟血管外科'),
    animPlan: ['腿部深層靜脈的血流', '血栓形成（示意）', '血栓脫落到肺部（肺栓塞，示意）'],
    sections: [
      sec('define', [t('深部靜脈血栓是在身體深層靜脈形成的血塊，多數發生在小腿或大腿；血栓可能脫落，造成肺部的嚴重問題，稱為肺栓塞。', 'mp-dvt', 'Summary')]),
      sec('mechanism', [t('長時間不動會增加深部靜脈血栓的風險；部分藥物與增加血栓風險的疾病也可能造成。', 'mp-dvt', 'Summary')]),
      sec('organs', [t('常見症狀：靜脈上方發熱與壓痛、患部疼痛或腫脹、皮膚發紅。', 'mp-dvt', 'Summary')]),
      sec('lifestyle', [t('長途開車或搭飛機時，要休息、走動或伸展雙腿，並多喝水。', 'mp-dvt', 'Summary')]),
      sec('nutrition', [gen('長時間坐著時補充足夠水分；服用抗凝血劑者，飲食或保健食品有明顯改變前請先詢問醫師或藥師。')]),
      sec('meds', [t('治療包括緩解疼痛與發炎、溶解血栓並預防新血栓形成的藥物；抬高患部與濕熱敷也可能有幫助。', 'mp-dvt', 'Summary'), MED_NOTE]),
      sec('redflags', [gen('突然呼吸困難、胸痛、咳血或心跳很快時，可能是肺栓塞，請立即撥打 119。')]),
    ],
  },
  {
    id: 'lymphedema', title: '淋巴水腫', en: 'Lymphedema', organs: ['vessels', 'skin'], specialty: '復健科或整形外科',
    review: rev('MedlinePlus Lymphedema', '復健科或整形外科'),
    animPlan: ['淋巴液沿淋巴管回流', '淋巴系統受損或阻塞，液體堆積（示意）', '運動、壓力衣、皮膚照顧與按摩'],
    sections: [
      sec('define', [t('淋巴水腫是一種腫脹：淋巴系統受損或阻塞時，淋巴液堆積在身體的軟組織，通常發生在手臂或腿部。淋巴液含有對抗病菌的白血球。', 'mp-lymphedema', 'Summary')]),
      sec('mechanism', [t('原因包括感染、癌症、放射治療或淋巴結手術切除造成的疤痕組織，以及先天淋巴結或淋巴管缺少或異常。', 'mp-lymphedema', 'Summary')]),
      sec('organs', [gen('患肢可能腫脹、沉重、緊繃，皮膚變厚，較容易感染。')]),
      sec('lifestyle', [t('治療可以控制症狀，包括運動、壓力裝置（如壓力衣）、皮膚照顧與按摩。', 'mp-lymphedema', 'Summary')]),
      sec('nutrition', [gen('維持健康體重；均衡飲食。')]),
      sec('meds', [gen('淋巴引流按摩與壓力治療請由受過訓練的治療師指導。'), MED_NOTE]),
      sec('redflags', [gen('患肢突然紅、腫、熱、痛或發燒時，可能是感染（蜂窩性組織炎），請儘速就醫。')]),
    ],
  },
];

export const DISEASE_MAP: Record<string, DiseaseModule> = Object.fromEntries(DISEASES.map((d) => [d.id, d]));
export const CHECK_LABEL: Record<Check, string> = { text: '已對照原文', citation: '出處已確認・內容待全文核對', general: '一般衛教知識・待醫學審閱' };
