/**
 * 常見疾病分類（依健康管理師課程的疾病分類整理；課程影片連結暫不放上網站）。
 * id 存在於 diseases.ts 的疾病為已完成的衛教模組，其餘為規劃中，會分批補上。
 */
import { DISEASE_MAP } from './diseases';

export interface CategoryDisease { id: string; title: string }
export interface DiseaseCategory { id: string; title: string; icon: string; diseases: CategoryDisease[] }

const d = (id: string, title: string): CategoryDisease => ({ id, title });

export const CATEGORIES: DiseaseCategory[] = [
  { id: 'women', title: '女性疾病', icon: '♀', diseases: [d('menopause', '更年期症候群'), d('pcos', '多囊性卵巢症候群'), d('uterine-fibroids', '子宮肌瘤'), d('endometriosis', '子宮內膜異位症')] },
  { id: 'men', title: '男性疾病', icon: '♂', diseases: [d('bph', '良性攝護腺肥大'), d('erectile-dysfunction', '勃起功能障礙'), d('late-onset-hypogonadism', '男性更年期（睪固酮低下）')] },
  { id: 'rheum', title: '風濕免疫疾病', icon: '🦴', diseases: [d('rheumatoid-arthritis', '類風濕性關節炎'), d('gout', '痛風'), d('sle', '全身性紅斑性狼瘡')] },
  { id: 'geriatric', title: '老年疾病', icon: '🧓', diseases: [d('dementia', '失智症'), d('sarcopenia', '肌少症'), d('frailty-falls', '衰弱與跌倒'), d('osteoporosis', '骨質疏鬆症')] },
  { id: 'cancer', title: '癌症疾病', icon: '🎗', diseases: [d('colorectal-cancer', '大腸直腸癌'), d('breast-cancer', '乳癌'), d('cervical-cancer', '子宮頸癌'), d('oral-cancer', '口腔癌'), d('lung-cancer', '肺癌')] },
  { id: 'psych', title: '精神疾病', icon: '🧠', diseases: [d('depression', '憂鬱症'), d('anxiety', '焦慮症'), d('insomnia', '失眠症')] },
  { id: 'autonomic', title: '自律神經失調', icon: '⚡', diseases: [d('autonomic-dysfunction', '自律神經失調'), d('panic-disorder', '恐慌症')] },
  { id: 'vascular-lymph', title: '血管淋巴疾病', icon: '🩸', diseases: [d('varicose-veins', '靜脈曲張'), d('dvt', '深部靜脈血栓'), d('lymphedema', '淋巴水腫')] },
  { id: 'senses', title: '五官疾病', icon: '👁', diseases: [d('dry-eye', '乾眼症'), d('cataract', '白內障'), d('glaucoma', '青光眼'), d('allergic-rhinitis', '過敏性鼻炎'), d('hearing-loss', '聽力損失')] },
  { id: 'metsyn', title: '代謝症候群', icon: '⚖️', diseases: [d('metabolic-syndrome', '代謝症候群')] },
  { id: 'cardio', title: '心血管疾病', icon: '❤️', diseases: [d('hypertension', '高血壓'), d('atherosclerosis', '動脈粥狀硬化'), d('atrial-fibrillation', '心房顫動'), d('heart-failure', '心臟衰竭')] },
  { id: 'cerebro', title: '腦血管疾病', icon: '🧩', diseases: [d('stroke', '腦中風')] },
  { id: 'resp', title: '肺部呼吸疾病', icon: '🫁', diseases: [d('asthma', '氣喘'), d('copd', '慢性阻塞性肺病（COPD）'), d('pneumonia', '肺炎')] },
  { id: 'kidney', title: '腎臟疾病', icon: '🫘', diseases: [d('ckd', '慢性腎臟病'), d('kidney-stones', '腎結石')] },
  { id: 'urology', title: '泌尿系統疾病', icon: '💧', diseases: [d('uti', '泌尿道感染'), d('urinary-incontinence', '尿失禁'), d('overactive-bladder', '膀胱過動症')] },
  { id: 'gi', title: '肝膽胃腸疾病', icon: '🍽', diseases: [d('fatty-liver', '脂肪肝（MASLD）'), d('gerd', '胃食道逆流'), d('viral-hepatitis', 'B 型與 C 型肝炎'), d('ibs', '大腸激躁症'), d('gallstones', '膽結石')] },
  { id: 'endo', title: '新陳代謝疾病', icon: '🧪', diseases: [d('t2dm', '第二型糖尿病'), d('dyslipidemia', '高血脂'), d('thyroid-disorders', '甲狀腺功能異常'), d('obesity', '肥胖')] },
  { id: 'heme', title: '血液方面疾病', icon: '🔴', diseases: [d('iron-deficiency-anemia', '缺鐵性貧血'), d('thalassemia', '地中海型貧血')] },
  { id: 'msk', title: '骨骼關節脊椎疾病', icon: '🦵', diseases: [d('osteoporosis', '骨質疏鬆症'), d('osteoarthritis', '退化性關節炎'), d('low-back-pain', '下背痛與椎間盤突出')] },
];

export const isReady = (id: string) => !!DISEASE_MAP[id];
export const CATEGORY_STATS = (() => {
  const ids = [...new Set(CATEGORIES.flatMap((c) => c.diseases.map((x) => x.id)))];
  return { total: ids.length, ready: ids.filter(isReady).length };
})();
