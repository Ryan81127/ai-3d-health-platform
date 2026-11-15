import { Suspense, lazy, useEffect, useState } from 'react';
import { CHECK_LABEL, DISEASE_MAP, type Claim } from '../data/diseases';
import { GUIDELINE_MAP, doiUrl } from '../data/guidelines';
import { ORGAN_MAP } from '../data/organs';
import { reviewStatus } from '../data/reviewers';
import { useStore, type LayerOpacity } from '../store';
import { Pending } from './ui';

const TearFilm = lazy(() => import('./TearFilm'));

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
    useStore.setState({ opacity: VIEW_OPACITY, peel: null, autoRotate: false });
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
        {d.review.roles.map((r) => (
          <span key={r.role}>
            {r.role}{r.required ? '（必要）' : ''}：
            {r.records.length
              ? r.records.map((x) => `${x.name}（${x.credentials}）${x.reviewedAt}・${x.scope}`).join('；')
              : '尚未指派'}
          </span>
        ))}
      </div>
      <p className="small">3D 標示：{d.organs.map((o) => ORGAN_MAP[o]?.name).join('、')}。本頁為衛教資料，不是診斷；不能用單一症狀判斷疾病。</p>
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
              <div className="small">{g.status === 'verified' ? `✓ 已核對出版紀錄（${g.checkedAt}）` : `⚠ 需人工核對（${g.checkedAt}）`}{g.note && `：${g.note}`}</div>
            </li>
          ))}
        </ol>
        <h4>修改紀錄</h4>
        <ul className="small">{d.review.changelog.map((c) => <li key={c.date + c.note}>{c.date}　{c.note}</li>)}</ul>
      </div>
    </div>
  );
}
