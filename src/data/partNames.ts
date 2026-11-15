/** 部位中文名稱（常用者）。查不到時介面顯示英文解剖學名稱。 */
const ZH: Record<string, string> = {
  skin: '皮膚', ear: '耳朵', 'set of head hairs': '頭髮', 'set of eyebrows': '眉毛',
  eyeball: '眼球', 'optic nerve': '視神經', liver: '肝臟', stomach: '胃', esophagus: '食道', 'pancreas, nsn': '胰臟', 'pancreatic duct': '胰管',
  kidney: '腎臟', ureter: '輸尿管', 'urinary bladder': '膀胱', urethra: '尿道', spleen: '脾臟', gallbladder: '膽囊', 'adrenal gland': '腎上腺',
  duodenum: '十二指腸', jejunum: '空腸', ileum: '迴腸', 'colon, nsn': '結腸', rectum: '直腸', appendix: '闌尾',
  'wall of heart': '心臟壁', 'mitral valve': '二尖瓣', 'tricuspid valve': '三尖瓣', 'pulmonary valve': '肺動脈瓣',
  'upper lobe of left lung': '左肺上葉', 'lower lobe of left lung': '左肺下葉', 'upper lobe of right lung': '右肺上葉', 'middle lobe of lung': '肺中葉', 'lower lobe of right lung': '右肺下葉',
  trachea: '氣管', bronchus: '支氣管', 'thyroid cartilage': '甲狀軟骨', 'set of nasal cartilages': '鼻軟骨', 'lobe of thymus': '胸腺', prostate: '攝護腺',
  cerebellum: '小腦', pons: '橋腦', 'medulla oblongata': '延腦', 'midbrain, nsn': '中腦', thalamus: '視丘', 'hypothalamus, nsn': '下視丘', hippocampus: '海馬迴', amygdala: '杏仁核',
  'corpus callosum': '胼胝體', 'pituitary gland': '腦下垂體', 'pineal body': '松果體', 'occipital lobe': '枕葉', 'precentral gyrus': '中央前迴', 'postcentral gyrus': '中央後迴',
  'superior frontal gyrus': '額上迴', 'middle frontal gyrus': '額中迴', 'middle temporal gyrus': '顳中迴', 'inferior temporal gyrus': '顳下迴', insula: '腦島', 'optic chiasm': '視交叉',
  'lateral ventricle': '側腦室', 'third ventricle': '第三腦室', 'fourth ventricle': '第四腦室', putamen: '殼核', 'caudate nucleus': '尾狀核', 'cingulate gyrus': '扣帶迴',
  'ascending aorta': '升主動脈', 'arch of aorta': '主動脈弓', 'descending aorta': '降主動脈', 'superior vena cava': '上腔靜脈', 'inferior vena cava': '下腔靜脈',
  'pulmonary artery': '肺動脈', 'pulmonary vein': '肺靜脈', 'common carotid artery': '頸總動脈', 'internal jugular vein': '內頸靜脈', 'subclavian artery': '鎖骨下動脈', 'subclavian vein': '鎖骨下靜脈',
  'renal artery': '腎動脈', 'renal vein': '腎靜脈', 'common iliac artery': '髂總動脈', 'common iliac vein': '髂總靜脈', 'celiac artery': '腹腔動脈', 'splenic artery': '脾動脈',
  'superior mesenteric artery': '上腸繫膜動脈', 'trunk of right coronary artery': '右冠狀動脈', 'stem of left coronary artery': '左冠狀動脈主幹', 'coronary sinus': '冠狀竇',
  femur: '股骨', tibia: '脛骨', fibula: '腓骨', patella: '髕骨', humerus: '肱骨', radius: '橈骨', ulna: '尺骨', clavicle: '鎖骨', scapula: '肩胛骨', 'hip bone': '髖骨',
  sacrum: '薦骨', mandible: '下頜骨', maxilla: '上頜骨', 'frontal bone': '額骨', 'parietal bone': '頂骨', 'occipital bone': '枕骨', 'temporal bone': '顳骨', 'zygomatic bone': '顴骨',
  'nasal bone': '鼻骨', 'sphenoid bone': '蝶骨', 'hyoid bone': '舌骨', manubrium: '胸骨柄', 'body of sternum': '胸骨體', 'xiphoid process': '劍突', atlas: '寰椎（第一頸椎）', axis: '樞椎（第二頸椎）',
  calcaneus: '跟骨', talus: '距骨', 'costal cartilage': '肋軟骨',
  diaphragm: '橫膈膜', 'rectus abdominis': '腹直肌', 'external oblique': '腹外斜肌', 'internal oblique': '腹內斜肌', 'transversus abdominis': '腹橫肌', 'latissimus dorsi': '背闊肌',
  'gluteus maximus': '臀大肌', 'gluteus medius': '臀中肌', 'rectus femoris': '股直肌', 'vastus lateralis': '股外側肌', 'vastus medialis': '股內側肌', sartorius: '縫匠肌',
  semitendinosus: '半腱肌', semimembranosus: '半膜肌', soleus: '比目魚肌', 'tibialis anterior': '脛前肌', sternocleidomastoid: '胸鎖乳突肌', 'pectoralis minor': '胸小肌',
  'serratus anterior': '前鋸肌', brachialis: '肱肌', brachioradialis: '肱橈肌', temporalis: '顳肌', 'psoas major': '腰大肌', iliacus: '髂肌', 'calcaneal tendon': '跟腱（阿基里斯腱）',
  'levator scapulae': '提肩胛肌', 'rhomboid major': '大菱形肌', supraspinatus: '棘上肌', 'infraspinatus muscle': '棘下肌', 'teres major': '大圓肌', 'iliotibial tract': '髂脛束',
  'orbicularis oris': '口輪匝肌', platysma: '頸闊肌', 'tensor fasciae latae': '闊筋膜張肌', 'adductor longus': '內收長肌', 'adductor magnus': '內收大肌', gracilis: '股薄肌',
};
const ORD: Record<string, string> = { first: '一', second: '二', third: '三', fourth: '四', fifth: '五', sixth: '六', seventh: '七', eighth: '八', ninth: '九', tenth: '十', eleventh: '十一', twelfth: '十二' };

export function zhName(en: string): string | null {
  const m = en.match(/^(left|right) (.+)$/);
  const side = m ? (m[1] === 'left' ? '左' : '右') : '';
  const base = m ? m[2] : en;
  if (ZH[base]) return side + ZH[base];
  const o = base.match(/^(\w+) (rib|cervical vertebra|thoracic vertebra|lumbar vertebra|costal cartilage|metacarpal bone|metatarsal bone)$/);
  if (o && ORD[o[1]]) {
    const kind = { rib: '肋骨', 'cervical vertebra': '頸椎', 'thoracic vertebra': '胸椎', 'lumbar vertebra': '腰椎', 'costal cartilage': '肋軟骨', 'metacarpal bone': '掌骨', 'metatarsal bone': '蹠骨' }[o[2]]!;
    return `${side}第${ORD[o[1]]}${kind}`;
  }
  if (/tooth$/.test(base)) return '牙齒';
  if (/gingiva/.test(base)) return '牙齦';
  if (/labial part of mouth/.test(base)) return '嘴唇';
  if (/gyrus|gyri|lobule/.test(base)) return `${side}大腦皮質（腦迴）`;
  return null;
}

export const LAYER_ZH: Record<string, string> = { skin: '皮膚', muscle: '肌肉', skeleton: '骨骼', organ: '器官', vessel: '血管', nerve: '神經' };
