import type { Evidence } from '../types';

/** 「生活因素 → 生理機制 → 器官影響 → 健康風險 → 改善方向」互動教學主題 */
export type Stage = '生活因素' | '生理機制' | '器官影響' | '健康風險' | '改善方向';

/** 對照動畫的種類，實作在 components/MechanismAnim.tsx */
export type AnimId = 'sleep-clock' | 'melatonin' | 'attention' | 'bp-dip' | 'insulin' | 'immune' | 'habits';

export interface TopicStep {
  stage: Stage;
  title: string;
  /** 依序亮起的器官 */
  organs: string[];
  /** 3D 中以流動光點表示的訊號路徑（示意），[起點器官, 終點器官] */
  flow?: [string, string][];
  anim: AnimId;
  /** 動畫下方的一句話說明 */
  caption: { normal: string; change: string };
  normal: string;
  change: string;
  evidence: Evidence;
  refs: string[];
}

export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number;
  explain: string;
  refs: string[];
}

export interface Topic {
  id: string;
  title: string;
  icon: string;
  ready: boolean;
  hook: string;
  intro: string;
  steps: TopicStep[];
  quiz: QuizQuestion[];
}

export const TOPICS: Topic[] = [
  {
    id: 'late-night', title: '長期熬夜', icon: '🌙', ready: true,
    hook: '晚睡一兩個小時，身體裡發生了什麼？',
    intro: '以下為群體研究歸納的可能機制，用於衛教說明。每個人的狀況不同，這不是對個案的預測。',
    steps: [
      { stage: '生活因素', title: '睡眠時間被壓縮', organs: ['brain'], anim: 'sleep-clock', evidence: 'A', refs: ['aasm'],
        caption: { normal: '多數成人每晚需要 7 小時以上', change: '凌晨才睡、早上照常起床' },
        normal: '成人建議每晚規律睡眠 7 小時以上，並維持固定的睡醒時間。',
        change: '長期晚睡、睡眠少於 7 小時或平假日作息差距大，身體需要持續調整節律。' },
      { stage: '生理機制', title: '光線與生理時鐘', organs: ['eyes', 'brain'], flow: [['eyes', 'brain']], anim: 'melatonin', evidence: 'B', refs: ['aha-sleep'],
        caption: { normal: '天黑後褪黑激素上升，身體準備入睡', change: '睡前強光可能讓上升時間延後' },
        normal: '眼睛接收光線訊號傳到下視丘的視交叉上核，夜晚光線變暗後松果體分泌褪黑激素，身體準備入睡。',
        change: '夜間持續接觸強光與螢幕，可能延後褪黑激素分泌，使入睡時間後移，生理時鐘與實際作息錯位。' },
      { stage: '器官影響', title: '注意力與情緒', organs: ['brain'], anim: 'attention', evidence: 'B', refs: ['lim'],
        caption: { normal: '反應時間穩定', change: '較常出現短暫恍神' },
        normal: '充足睡眠後，前額葉皮質能有效維持專注、判斷與情緒調節。',
        change: '統合分析顯示，短期睡眠剝奪會降低持續性注意力與反應速度；情緒也較容易起伏。' },
      { stage: '器官影響', title: '自律神經與血壓', organs: ['brain', 'heart', 'vessels'], flow: [['brain', 'heart']], anim: 'bp-dip', evidence: 'B', refs: ['aha-sleep'],
        caption: { normal: '夜間血壓自然下降，心血管休息', change: '夜間下降的幅度可能變小' },
        normal: '夜間睡眠時副交感神經活性上升，心跳與血壓會比白天降低，讓心血管系統休息。',
        change: '睡眠不足時交感神經活性相對偏高，夜間血壓下降的幅度可能減少。觀察性研究發現睡眠時間短與高血壓風險有相關性。' },
      { stage: '器官影響', title: '胰島素與血糖', organs: ['pancreas', 'liver'], flow: [['pancreas', 'liver']], anim: 'insulin', evidence: 'B', refs: ['spiegel', 'aha-sleep'],
        caption: { normal: '胰島素幫葡萄糖進入細胞', change: '細胞的反應可能變慢，葡萄糖較慢被利用' },
        normal: '進食後胰島素促使葡萄糖進入肌肉與肝臟細胞，血糖在一段時間內回到平穩。',
        change: '實驗研究顯示，連續數天限制睡眠後，健康成人的葡萄糖耐受性與胰島素敏感性下降；食慾相關荷爾蒙也可能改變，較想吃高熱量食物。' },
      { stage: '健康風險', title: '免疫與發炎調節', organs: ['airway', 'lungs'], anim: 'immune', evidence: 'B', refs: ['besedovsky'],
        caption: { normal: '睡眠期間免疫系統進行調節', change: '研究觀察到發炎指標偏高的傾向' },
        normal: '睡眠期間免疫系統進行調節，有助於形成免疫記憶。',
        change: '長期睡眠不足與發炎指標上升、感染後恢復及疫苗反應較差有相關性。這些是群體層次的風險關聯，不代表每個人都會發生。' },
      { stage: '改善方向', title: '我能做什麼', organs: ['brain', 'heart', 'pancreas'], anim: 'habits', evidence: 'A', refs: ['aasm', 'who-pa', 'dietguide'],
        caption: { normal: '從一件小事開始', change: '' },
        normal: '固定起床時間、起床後接觸日光、白天規律活動，是穩定生理時鐘的基礎。',
        change: '可行方向：每次提早 15–30 分鐘就寢；午後減少咖啡因；晚餐不過飽、睡前 2–3 小時不進食；每週累積 150 分鐘以上中等強度運動；睡前 1 小時調暗燈光並放下螢幕。' },
    ],
    quiz: [
      { q: '一般成人建議每晚睡多久？', options: ['5 小時就夠', '7 小時以上', '越多越好，至少 10 小時'], answer: 1, refs: ['aasm'],
        explain: '美國睡眠醫學會與睡眠研究學會的共識建議：成人每晚規律睡眠 7 小時以上。' },
      { q: '睡前長時間看手機，比較可能影響什麼？', options: ['褪黑激素上升的時間', '骨骼的長度', '血型'], answer: 0, refs: ['aha-sleep'],
        explain: '夜間強光可能延後褪黑激素分泌，讓入睡時間往後移。' },
      { q: '研究發現連續幾天睡不夠的健康成人，可能出現哪種變化？', options: ['一定會得糖尿病', '胰島素敏感性暫時下降', '血糖完全不受影響'], answer: 1, refs: ['spiegel'],
        explain: '實驗觀察到胰島素敏感性下降，但這是風險上升的訊號，不等於罹患糖尿病。是否有血糖異常要靠抽血檢查。' },
      { q: '「熬夜的人一定會得高血壓」這句話對嗎？', options: ['對，一定會', '不對，研究顯示的是風險相關，不是必然'], answer: 1, refs: ['aha-sleep'],
        explain: '觀察性研究發現睡眠時間短與高血壓風險相關，但每個人的狀況不同，不代表一定會發生。' },
    ],
  },
  { id: 'hypertension', title: '高血壓', icon: '🩺', ready: false, hook: '', intro: '', steps: [], quiz: [] },
  { id: 'atherosclerosis', title: '動脈粥狀硬化', icon: '🫀', ready: false, hook: '', intro: '', steps: [], quiz: [] },
  { id: 't2dm', title: '第二型糖尿病', icon: '🩸', ready: false, hook: '', intro: '', steps: [], quiz: [] },
  { id: 'fatty-liver', title: '脂肪肝', icon: '🧪', ready: false, hook: '', intro: '', steps: [], quiz: [] },
  { id: 'dry-eye', title: '乾眼症', icon: '👁', ready: false, hook: '', intro: '', steps: [], quiz: [] },
];

export const TOPIC_MAP: Record<string, Topic> = Object.fromEntries(TOPICS.map((t) => [t.id, t]));
