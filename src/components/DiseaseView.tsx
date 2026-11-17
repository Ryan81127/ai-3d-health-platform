import { Suspense, lazy, useEffect, useState } from 'react';
import { CHECK_LABEL, DISEASE_MAP, type Claim } from '../data/diseases';
import { GUIDELINE_MAP, doiUrl } from '../data/guidelines';
import { ORGAN_MAP } from '../data/organs';
import { reviewStatus } from '../data/reviewers';
import { useStore, type LayerOpacity } from '../store';
import { Pending } from './ui';

const TearFilm = lazy(() => import('./TearFilm'));
const VesselFlow = lazy(() => import('./VesselFlow'));
const MetabolismAnim = lazy(() => import('./MetabolismAnim'));
const OrganAnims = lazy(() => import('./OrganAnims'));
const LungAnims = lazy(() => import('./LungAnims'));
const HeartAnims = lazy(() => import('./HeartAnims'));
const EyeAnims = lazy(() => import('./EyeAnims'));
const ORGAN_ANIM_DONE: Record<string, string> = {
  stroke: '已完成：正常血流、缺血性中風（血塊阻塞）與出血性中風（血管破裂）的示意。尚未完成：三高與腦血管風險的動畫。',
  ckd: '已完成：腎絲球過濾、微血管受損、腎絲球硬化與廢物堆積的示意。尚未完成：腎元整體結構的細部。',
  osteoporosis: '已完成：骨小樑從骨量高峰到骨質疏鬆的變化示意。尚未完成：負重運動與鈣質作用的動畫。',
  asthma: '已完成：正常氣道、氣喘發作（發炎與肌肉收縮）、使用支氣管擴張劑後的示意。尚未完成：吸入藥物進入肺部的細部動畫。',
  copd: '已完成：正常氣道與肺泡、慢性支氣管炎、肺氣腫的示意。尚未完成：吸菸對呼吸道影響的動畫。',
  'atrial-fibrillation': '已完成：正常心律的電訊號、心房顫動時的不規則跳動、血液淤積與血塊往腦部的示意。尚未完成：心電圖波形對照。',
  'heart-failure': '已完成：正常打血、打血不足（心室擴大、收縮變弱）、血液回堵與肺部積水的示意。尚未完成：下肢水腫與右心衰竭的動畫。',
  cataract: '已完成：光線對焦、水晶體混濁造成的阻擋與散射、人工水晶體的示意，以及看到的畫面對照。尚未完成：手術過程動畫。',
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
      <div className="review-badge">
        <b>{reviewStatus(d.review)}</b>
        <span>建議審閱：{d.specialty}・指引版本：{d.review.guidelineVersion}</span>
        <span>審閱紀錄以書面為準。</span>
      </div>
      <p className="small">{d.organs.length ? `3D 標示：${d.organs.map((o) => ORGAN_MAP[o]?.name).join('、')}。` : '目前的 3D 模型為成年男性，沒有可標示的相關器官。'}本頁為衛教資料，不是診斷；不能用單一症狀判斷疾病。</p>
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
