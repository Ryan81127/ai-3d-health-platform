import { Suspense, lazy, useEffect, useState } from 'react';
import { CHECK_LABEL, DISEASE_MAP, type Claim } from '../data/diseases';
import { GUIDELINE_MAP, doiUrl } from '../data/guidelines';
import { ORGAN_MAP } from '../data/organs';
import { reviewStatus } from '../data/reviewers';
import { useStore, type LayerOpacity } from '../store';
import { Pending } from './ui';

const PixelMovie = lazy(() => import('../pixel/PixelMovie'));
import { MOVIES } from '../pixel/scripts';
const TearFilm = lazy(() => import('./TearFilm'));
const VesselFlow = lazy(() => import('./VesselFlow'));
const MetabolismAnim = lazy(() => import('./MetabolismAnim'));
const OrganAnims = lazy(() => import('./OrganAnims'));
const LungAnims = lazy(() => import('./LungAnims'));
const HeartAnims = lazy(() => import('./HeartAnims'));
const EyeAnims = lazy(() => import('./EyeAnims'));
const LipidAnims = lazy(() => import('./LipidAnims'));
const CancerAnims = lazy(() => import('./CancerAnims'));
const Batch1Anims = lazy(() => import('./Batch1Anims'));
const Batch3Anims = lazy(() => import('./Batch3Anims'));
const BATCH3 = ['dementia', 'sarcopenia', 'osteoarthritis', 'gout', 'gerd', 'viral-hepatitis', 'kidney-stones', 'obesity', 'thyroid-disorders', 'insomnia'] as const;
type B3 = (typeof BATCH3)[number];
const Batch4Anims = lazy(() => import('./Batch4Anims'));
const BATCH4 = ['anxiety', 'panic-disorder', 'autonomic-dysfunction', 'pneumonia', 'uti', 'urinary-incontinence', 'ibs', 'gallstones', 'iron-deficiency-anemia', 'low-back-pain'] as const;
type B4 = (typeof BATCH4)[number];
const Batch5Anims = lazy(() => import('./Batch5Anims'));
const BATCH5 = ['rheumatoid-arthritis', 'sle', 'frailty-falls', 'allergic-rhinitis', 'hearing-loss', 'overactive-bladder', 'thalassemia', 'bph', 'erectile-dysfunction', 'late-onset-hypogonadism'] as const;
type B5 = (typeof BATCH5)[number];
const FemaleAnims = lazy(() => import('./FemaleAnims'));
const FEMALE = ['pcos', 'uterine-fibroids', 'endometriosis', 'cervical-cancer', 'breast-cancer'] as const;
type FT = (typeof FEMALE)[number];
const VascAnims = lazy(() => import('./VascAnims'));
const VASC = ['varicose-veins', 'dvt', 'lymphedema'] as const;
type VT = (typeof VASC)[number];
const ORGAN_ANIM_DONE: Record<string, string> = {
  stroke: '已完成：正常血流、缺血性中風（血塊阻塞）與出血性中風（血管破裂）的示意。尚未完成：三高與腦血管風險的動畫。',
  ckd: '已完成：腎絲球過濾、微血管受損、腎絲球硬化與廢物堆積的示意。尚未完成：腎元整體結構的細部。',
  osteoporosis: '已完成：骨小樑從骨量高峰到骨質疏鬆的變化示意。尚未完成：負重運動與鈣質作用的動畫。',
  asthma: '已完成：正常氣道、氣喘發作（發炎與肌肉收縮）、使用支氣管擴張劑後的示意。尚未完成：吸入藥物進入肺部的細部動畫。',
  copd: '已完成：正常氣道與肺泡、慢性支氣管炎、肺氣腫的示意。尚未完成：吸菸對呼吸道影響的動畫。',
  'atrial-fibrillation': '已完成：正常心律的電訊號、心房顫動時的不規則跳動、血液淤積與血塊往腦部的示意。尚未完成：心電圖波形對照。',
  'heart-failure': '已完成：正常打血、打血不足（心室擴大、收縮變弱）、血液回堵與肺部積水的示意。尚未完成：下肢水腫與右心衰竭的動畫。',
  cataract: '已完成：光線對焦、水晶體混濁造成的阻擋與散射、人工水晶體的示意，以及看到的畫面對照。尚未完成：手術過程動畫。',
  dyslipidemia: '已完成：剖開的冠狀動脈（內膜、中膜、外膜）、紅血球、LDL 與 HDL 的運送、膽固醇堆積與斑塊使管腔變窄，並可切換到真實心臟看冠狀動脈位置。尚未完成：藥物作用的動畫。',
  'lung-cancer': '已完成：真實肺葉、氣管與支氣管模型上的呼吸氣流、腫瘤生長與低劑量電腦斷層掃描的示意。尚未完成：轉移與治療方式的動畫。',
  'oral-cancer': '已完成：真實牙齒、牙齦、舌與顎骨模型上的舌緣病灶、檳榔染色與口腔黏膜檢查的示意。尚未完成：張口狀態的模型。',
  'colorectal-cancer': '已完成：真實大腸模型剖面中的腺瘤息肉、出血與大腸鏡切除息肉的示意。尚未完成：糞便潛血檢查流程的動畫。',
  'metabolic-syndrome': '已完成：真實腹腔器官與皮膚上的內臟脂肪堆積、腰圍變粗、胰島素阻抗與五項判定指標的示意。尚未完成：血壓、血脂變化的細部動畫。',
  depression: '已完成：真實大腦模型，以光線明暗比喻情緒與活力，並列出 WHO 所列症狀與治療、自我照顧方式。尚未完成：壓力與恢復循環的動畫。',
  menopause: '已完成：女性荷爾蒙下降趨勢、熱潮紅（上半身血管）、骨質流失（脊椎與骨盆）的示意。尚未完成：卵巢與女性生殖器官（需要女性模型）。',
  dementia: '已完成：真實大腦模型上的阿茲海默症斑塊與糾結、腦萎縮與血管性失智的示意。尚未完成：神經細胞層級的動畫。',
  sarcopenia: '已完成：真實大腿肌群與股骨，肌肉變細、油花與運動收縮的示意。尚未完成：握力與步速測量的動畫。',
  osteoarthritis: '已完成：真實膝關節骨骼上的軟骨磨損、骨刺、關節間隙變窄，以及肌力訓練與減輕負擔的示意。尚未完成：髖關節與手部關節。',
  gout: '已完成：真實右腳骨骼上的尿酸結晶、紅腫發作與痛風石的示意。尚未完成：腎臟排出尿酸的動畫。',
  gerd: '已完成：真實食道與胃（剖面）上的括約肌關閉與鬆弛、胃酸逆流與食道發紅的示意。尚未完成：橫膈與食道裂孔疝氣。',
  'viral-hepatitis': '已完成：真實肝臟上的病毒感染、發炎、肝硬化結節與腫瘤的示意。尚未完成：肝細胞層級的動畫。',
  'kidney-stones': '已完成：真實腎臟（剖面）、輸尿管與膀胱上的尿液流動、結石形成與卡在輸尿管的示意。尚未完成：震波碎石的動畫。',
  obesity: '已完成：真實腹腔器官與皮膚上的內臟脂肪增加、腹部變粗與減重後減少的示意。尚未完成：熱量收支的互動計算。',
  'thyroid-disorders': '已完成：真實甲狀腺、氣管與頸部血管上的荷爾蒙分泌，功能低下與亢進、甲狀腺腫的示意。尚未完成：心跳與代謝變化的連動動畫。',
  insomnia: '已完成：真實大腦模型以光線比喻夜間入睡與失眠時的清醒狀態，並列出治療方式。尚未完成：睡眠週期的動畫。',
  anxiety: '已完成：真實大腦模型以光線比喻緊張程度，列出焦慮症的身體症狀與治療方式。尚未完成：壓力反應的全身動畫。',
  'panic-disorder': '已完成：真實心臟與肺部在平靜與恐慌發作時的心跳、呼吸速度對照。尚未完成：呼吸練習的互動引導。',
  'autonomic-dysfunction': '已完成：真實脊髓、神經、心臟與血管上的神經訊號傳遞與功能異常示意。尚未完成：交感與副交感神經的分別呈現。',
  pneumonia: '已完成：真實肺葉與支氣管，右下葉發炎實質化與病菌的示意。尚未完成：肺泡層級的動畫。',
  uti: '已完成：真實腎臟、輸尿管、膀胱與尿道上的細菌進入、膀胱發炎與往上感染腎臟的示意。尚未完成：女性泌尿道構造（需要女性模型）。',
  'urinary-incontinence': '已完成：真實骨盆、膀胱與骨盆底肌，咳嗽腹壓漏尿與凱格爾運動收縮的示意。尚未完成：女性骨盆（需要女性模型）。',
  ibs: '已完成：真實大腸與小腸的正常蠕動、不規則收縮與脹氣的示意。尚未完成：腸道與大腦連結的動畫。',
  gallstones: '已完成：真實肝臟、膽囊（剖面）與十二指腸，膽結石形成與阻塞膽管的示意（膽管為示意）。尚未完成：膽囊切除手術的動畫。',
  'iron-deficiency-anemia': '已完成：剖開的血管段中紅血球變少變淡、補鐵後恢復的示意。尚未完成：骨髓製造紅血球的動畫。',
  'low-back-pain': '已完成：真實腰椎、椎間盤、馬尾與坐骨神經，椎間盤突出刺激神經的示意。尚未完成：正確搬重物姿勢的動畫。',
  'rheumatoid-arthritis': '已完成：真實右手骨骼上的關節發炎腫脹與治療後消退的示意。尚未完成：關節內滑膜與軟骨破壞的剖面。',
  sle: '已完成：真實頭部皮膚上的蝴蝶斑發作與控制的示意，並列出可能受影響的器官。尚未完成：腎臟等器官發炎的動畫。',
  'frailty-falls': '已完成：真實全身骨骼的平衡搖晃、跌倒與髖部骨折風險示意，並列出預防方法。尚未完成：居家安全的互動檢查。',
  'allergic-rhinitis': '已完成：真實頭部骨骼與下鼻甲，花粉進入、鼻甲腫脹與食鹽水沖洗的示意。尚未完成：眼睛過敏症狀的動畫。',
  'hearing-loss': '已完成：真實外耳，以及示意的耳蝸毛細胞受損與助聽器放大聲音。尚未完成：內耳真實模型（目前模型沒有內耳）。',
  'overactive-bladder': '已完成：真實膀胱、尿道與骨盆，膀胱不自主收縮造成急尿的示意。尚未完成：女性骨盆（需要女性模型）。',
  thalassemia: '已完成：血管段中紅血球變少變小、輸血後補充的示意。尚未完成：遺傳方式的圖解。',
  bph: '已完成：真實膀胱、攝護腺、尿道與儲精囊，攝護腺變大壓迫尿道、尿流變弱的示意。尚未完成：手術治療的動畫。',
  'erectile-dysfunction': '已完成：真實骨盆動脈與海綿體，動脈斑塊使血流不足的示意。尚未完成：神經訊號的動畫。',
  'late-onset-hypogonadism': '已完成：真實睪丸、骨盆、股骨與大腿肌群，睪固酮減少時肌肉變細、骨質變化的示意。尚未完成：抽血檢查流程。',
  pcos: '已完成：程式繪製的子宮、卵巢與輸卵管示意模型，正常排卵與多囊卵巢濾泡的對照。尚未完成：真實女性解剖模型。',
  'uterine-fibroids': '已完成：程式繪製的子宮剖面示意模型，肌瘤在子宮壁生長的示意。尚未完成：真實女性解剖模型。',
  endometriosis: '已完成：程式繪製的子宮、卵巢、輸卵管、膀胱與腸道示意模型，內膜異位病灶的示意。尚未完成：真實女性解剖模型。',
  'cervical-cancer': '已完成：程式繪製的子宮頸示意模型，癌前病變與抹片刮取細胞的示意。尚未完成：真實女性解剖模型、HPV 疫苗說明。',
  'breast-cancer': '已完成：程式繪製的乳房示意模型（乳小葉、乳管），腫瘤與乳房 X 光攝影壓迫板的示意。尚未完成：真實女性解剖模型。',
  'varicose-veins': '已完成：真實右腿骨骼、肌肉與動脈，以及示意的表淺靜脈、瓣膜與血液回堵、靜脈腫脹扭曲。尚未完成：真實下肢靜脈模型。',
  dvt: '已完成：真實右腿動脈旁示意的深層靜脈，血栓形成與脫落往肺部的示意。尚未完成：肺栓塞的肺部動畫。',
  lymphedema: '已完成：真實右腿與皮膚，示意的淋巴管、淋巴回流受阻造成腫脹與壓力衣。尚未完成：手臂淋巴水腫。',
  glaucoma: '已完成：眼內液體循環、眼壓升高、視神經受損與周邊視野縮小的示意。尚未完成：隅角閉鎖型青光眼的動畫。',
};

const VIEW_OPACITY: LayerOpacity = { skin: 0.08, muscle: 0, skeleton: 0.12, organ: 1, vessel: 0.85, nerve: 0.6 };

function ClaimItem({ c }: { c: Claim }) {
  return (
    <li className={`claim ${c.check}`}>
      <p>{c.text}</p>
      <div className="claim-meta">
        <span className={`chk ${c.check}`}>{CHECK_LABEL[c.check]}</span>
        {c.src.map((s, i) => {
          const g = GUIDELINE_MAP[s.g];
          return g ? <a key={i} href={doiUrl(g)} target="_blank" rel="noreferrer">{g.short}{s.where ? `・${s.where}` : ''}</a> : null;
        })}
      </div>
    </li>
  );
}

/** 疾病衛教資料模組（3D 機制動畫完成前的版本） */
export default function DiseaseView({ id, onExit }: { id: string; onExit?(): void }) {
  const d = DISEASE_MAP[id];
  const setStory = useStore((s) => s.setStory);
  const [open, setOpen] = useState<string>('define');

  useEffect(() => {
    const prev = useStore.getState().opacity;
    // 疾病牽涉骨骼時，骨骼層清楚顯示、內臟淡化，標示才看得出來
    const op = d.organs.includes('bones') ? { ...VIEW_OPACITY, skeleton: 0.95, organ: 0.25, vessel: 0.3, nerve: 0 } : VIEW_OPACITY;
    useStore.setState({ opacity: op, peel: null, autoRotate: false });
    setStory({ focus: d.organs, spotlight: d.organs, flows: null });
    return () => { setStory({ spotlight: null, focus: null, flows: null }); useStore.setState({ opacity: prev }); };
  }, [d, setStory]);

  const sources = [...new Set(d.sections.flatMap((s) => s.claims.flatMap((c) => c.src.map((x) => x.g))))].map((g) => GUIDELINE_MAP[g]).filter(Boolean);
  const counts = d.sections.flatMap((s) => s.claims).reduce((a, c) => ({ ...a, [c.check]: (a[c.check] ?? 0) + 1 }), {} as Record<string, number>);

  return (
    <div className="disease">
      <div className="story-head">
        <div><b>{d.title}</b><small>{d.en}</small></div>
        {onExit && <button className="btn small ghost" onClick={onExit} aria-label="關閉">✕</button>}
      </div>
      {MOVIES[d.id] && (
        <section className="pxm-wrap">
          <h4>像素科普動畫・約 {Math.round(MOVIES[d.id].scenes.reduce((a, s) => a + (s.d ?? 5), 0))} 秒</h4>
          <Suspense fallback={<div className="pxm-skel" />}><PixelMovie movie={MOVIES[d.id]} /></Suspense>
          <p className="small">動畫為簡化示意，用來說明發病過程；字幕改寫自下方附來源的內容，詳細依據請看各段落的出處。</p>
        </section>
      )}
      <div className="review-badge">
        <b>{reviewStatus(d.review)}</b>
        <span>建議審閱：{d.specialty}・指引版本：{d.review.guidelineVersion}</span>
        <span>審閱紀錄以書面為準。</span>
      </div>
      <p className="small">{d.organs.length ? `3D 標示：${d.organs.map((o) => ORGAN_MAP[o]?.name).join('、')}。` : '真實解剖模型為成年男性，沒有可標示的女性器官；下方動畫為程式繪製的示意模型。'}本頁為衛教資料，不是診斷；不能用單一症狀判斷疾病。</p>
      <div className="chk-summary">
        {(['text', 'citation', 'general'] as const).map((k) => counts[k] ? <span key={k} className={`chk ${k}`}>{CHECK_LABEL[k]} {counts[k]}</span> : null)}
      </div>

      {d.sections.map((s) => (
        <div key={s.key} className={`acc ${open === s.key ? 'open' : ''}`}>
          <button className="acc-head" aria-expanded={open === s.key} onClick={() => setOpen(open === s.key ? '' : s.key)}>
            <span>{s.title}</span><i>{open === s.key ? '−' : '+'}</i>
          </button>
          {open === s.key && <ul className="acc-body claims">{s.claims.map((c, i) => <ClaimItem key={i} c={c} />)}</ul>}
        </div>
      ))}

      <div className="card anim-plan">
        <h4>3D 機制動畫</h4>
        {d.id === 'dry-eye' ? (
          <>
            <Suspense fallback={<p className="small">載入淚膜動畫…</p>}><TearFilm /></Suspense>
            <p className="small">已完成：眨眼、淚膜變薄與蒸發（示意）。尚未完成：淚膜各層的細部成分圖、眼表發炎機制。</p>
          </>
        ) : d.id === 'asthma' || d.id === 'copd' ? (
          <>
            <Suspense fallback={<p className="small">載入動畫…</p>}><LungAnims topic={d.id} /></Suspense>
            <p className="small">{ORGAN_ANIM_DONE[d.id]}</p>
          </>
        ) : d.id === 'atrial-fibrillation' || d.id === 'heart-failure' ? (
          <>
            <Suspense fallback={<p className="small">載入動畫…</p>}><HeartAnims topic={d.id} /></Suspense>
            <p className="small">{ORGAN_ANIM_DONE[d.id]}</p>
          </>
        ) : (VASC as readonly string[]).includes(d.id) ? (
          <>
            <Suspense fallback={<p className="small">載入動畫…</p>}><VascAnims topic={d.id as VT} /></Suspense>
            <p className="small">{ORGAN_ANIM_DONE[d.id]}</p>
          </>
        ) : (FEMALE as readonly string[]).includes(d.id) ? (
          <>
            <Suspense fallback={<p className="small">載入動畫…</p>}><FemaleAnims topic={d.id as FT} /></Suspense>
            <p className="small">{ORGAN_ANIM_DONE[d.id]}</p>
          </>
        ) : (BATCH5 as readonly string[]).includes(d.id) ? (
          <>
            <Suspense fallback={<p className="small">載入動畫…</p>}><Batch5Anims topic={d.id as B5} /></Suspense>
            <p className="small">{ORGAN_ANIM_DONE[d.id]}</p>
          </>
        ) : (BATCH4 as readonly string[]).includes(d.id) ? (
          <>
            <Suspense fallback={<p className="small">載入動畫…</p>}><Batch4Anims topic={d.id as B4} /></Suspense>
            <p className="small">{ORGAN_ANIM_DONE[d.id]}</p>
          </>
        ) : (BATCH3 as readonly string[]).includes(d.id) ? (
          <>
            <Suspense fallback={<p className="small">載入動畫…</p>}><Batch3Anims topic={d.id as B3} /></Suspense>
            <p className="small">{ORGAN_ANIM_DONE[d.id]}</p>
          </>
        ) : d.id === 'metabolic-syndrome' || d.id === 'depression' || d.id === 'menopause' ? (
          <>
            <Suspense fallback={<p className="small">載入動畫…</p>}><Batch1Anims topic={d.id} /></Suspense>
            <p className="small">{ORGAN_ANIM_DONE[d.id]}</p>
          </>
        ) : d.id === 'lung-cancer' || d.id === 'oral-cancer' || d.id === 'colorectal-cancer' ? (
          <>
            <Suspense fallback={<p className="small">載入動畫…</p>}><CancerAnims topic={d.id} /></Suspense>
            <p className="small">{ORGAN_ANIM_DONE[d.id]}</p>
          </>
        ) : d.id === 'dyslipidemia' ? (
          <>
            <Suspense fallback={<p className="small">載入動畫…</p>}><LipidAnims /></Suspense>
            <p className="small">{ORGAN_ANIM_DONE[d.id]}</p>
          </>
        ) : d.id === 'cataract' || d.id === 'glaucoma' ? (
          <>
            <Suspense fallback={<p className="small">載入動畫…</p>}><EyeAnims topic={d.id} /></Suspense>
            <p className="small">{ORGAN_ANIM_DONE[d.id]}</p>
          </>
        ) : d.id === 'stroke' || d.id === 'ckd' || d.id === 'osteoporosis' ? (
          <>
            <Suspense fallback={<p className="small">載入動畫…</p>}><OrganAnims topic={d.id} /></Suspense>
            <p className="small">{ORGAN_ANIM_DONE[d.id]}</p>
          </>
        ) : d.id === 't2dm' || d.id === 'fatty-liver' ? (
          <>
            <Suspense fallback={<p className="small">載入代謝動畫…</p>}><MetabolismAnim topic={d.id} /></Suspense>
            <p className="small">
              {d.id === 't2dm'
                ? '已完成：胰島素與葡萄糖進入細胞、胰島素阻抗、胰臟代償與長期高血糖（示意）。尚未完成：胰臟細胞的細部與微血管病變的影像。'
                : '已完成：肝細胞脂肪堆積、可能的發炎與纖維化（示意）。尚未完成：肝小葉結構與代謝路徑的細部。'}
            </p>
          </>
        ) : d.id === 'hypertension' || d.id === 'atherosclerosis' ? (
          <>
            <Suspense fallback={<p className="small">載入血管動畫…</p>}><VesselFlow topic={d.id} /></Suspense>
            <p className="small">
              {d.id === 'hypertension'
                ? '已完成：正常血管、血管收縮與血流阻力、長期血壓偏高的血管重塑（示意）。尚未完成：心臟、腦部與腎臟的相關風險動畫。'
                : '已完成：LDL 進入血管壁、泡沫細胞、斑塊形成與可能的破裂血栓（示意）。尚未完成：內皮細胞層的細部呈現。'}
            </p>
          </>
        ) : (
          <>
            <p><Pending>規劃中（P3）</Pending></p>
            <ol>{d.animPlan.map((a) => <li key={a}>{a}</li>)}</ol>
          </>
        )}
      </div>

      <div className="card">
        <h4>醫學參考來源</h4>
        <ol className="srcs">
          {sources.map((g) => (
            <li key={g.id}>
              <a href={doiUrl(g)} target="_blank" rel="noreferrer">{g.title}</a>
              <div className="small">{g.org}・{g.citation}{g.doi && `・DOI ${g.doi}`}</div>
              <div className="small">{g.status === 'verified' ? `✓ 已核對出版紀錄（${g.checkedAt}）` : g.status === 'user-verified' ? `✓ 已人工核對連結與版本（${g.checkedAt}）` : `⚠ 需人工核對（${g.checkedAt}）`}{g.note && `：${g.note}`}</div>
            </li>
          ))}
        </ol>
        <h4>修改紀錄</h4>
        <ul className="small">{d.review.changelog.map((c) => <li key={c.date + c.note}>{c.date}　{c.note}</li>)}</ul>
      </div>
    </div>
  );
}
