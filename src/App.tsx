import { useEffect, useMemo, useState } from 'react';
import { analyzeRules } from './engine/ruleEngine';
import { isApproved, useConsult, useStore, type Mode, type Step } from './store';
import Setup from './components/Setup';
import Questionnaire from './components/Questionnaire';
import ViewerPanel from './components/ViewerPanel';
import RightPanel, { EmergencyBanner } from './components/RightPanel';
import Review from './components/Review';
import Home from './components/Home';
import { ExploreLeft, ExploreRight } from './components/Explore';

const STEPS: [Step, string][] = [['setup', '① 建立諮詢'], ['work', '② 問卷・3D・分析'], ['review', '③ 審核與匯出']];
const MODES: [Mode, string][] = [['home', '首頁'], ['explore', '自由探索'], ['consult', '健康諮詢']];
type Pane = 'form' | 'viewer' | 'analysis';

export default function App() {
  const c = useConsult();
  const { step, setStep, startNew, mode, setMode, storyTopic, reduceMotion, setReduceMotion } = useStore();
  const [pane, setPane] = useState<Pane>('form');
  const [story, setStory] = useState<{ topic: string; step: number } | null>(null);
  const analysis = useMemo(() => analyzeRules(c), [c]);
  const flagged = useMemo(() => analysis.organs.map((o) => o.organId), [analysis]);
  const ready = c.consent.education && !!c.caseCode.trim();
  const current: Step = ready ? step : 'setup';
  const go = (s: Step) => { if (s === 'setup' || ready) setStep(s); };
  const nSym = Object.keys(c.symptoms).length;
  useEffect(() => { if (mode === 'explore') setStory(storyTopic ? { topic: storyTopic, step: 0 } : null); }, [mode, storyTopic]);

  const stage = mode === 'home' || mode === 'explore';

  return (
    <div className={`app mode-${mode}`}>
      <header className="top no-print">
        <button className="brand" onClick={() => setMode('home')} aria-label="回到首頁"><span className="logo">✚</span><div><b>3D 人體健康探索</b><small>健康管理師衛教平台</small></div></button>
        <nav className="modes" aria-label="模式">
          {MODES.map(([m, label]) => <button key={m} className={mode === m ? 'on' : ''} aria-current={mode === m ? 'page' : undefined} onClick={() => mode !== m && setMode(m)}>{label}</button>)}
        </nav>
        <div className="top-right">
          <button className={`btn small ghost toggle ${reduceMotion ? 'on' : ''}`} aria-pressed={reduceMotion} onClick={() => setReduceMotion(!reduceMotion)} title="關閉自動旋轉與動畫">減少動態</button>
          {mode === 'consult' && ready && <span className="case">{c.caseCode}{isApproved(c) && ' ✓'}</span>}
          {mode === 'consult' && <button className="btn small ghost" onClick={() => confirm('建立新的諮詢？目前這筆若已同意本機儲存會保留。') && startNew()}>＋ 新諮詢</button>}
        </div>
      </header>
      {mode === 'consult' && (
        <nav className="steps no-print" aria-label="諮詢流程">
          {STEPS.map(([s, label]) => (
            <button key={s} className={current === s ? 'on' : ''} aria-current={current === s ? 'step' : undefined} disabled={s !== 'setup' && !ready} onClick={() => go(s)}>{label}</button>
          ))}
        </nav>
      )}
      <div className="disclaimer no-print">衛教用途，不提供疾病診斷，不能取代醫療專業判斷。</div>

      {stage && (
        <main className={`stage-wrap ${mode}`}>
          <div className="stage-3d"><ViewerPanel flagged={[]} variant="stage" showControls={mode === 'explore'} /></div>
          {mode === 'home' && <div className="stage-overlay"><Home /></div>}
          {mode === 'explore' && <>
            <aside className="dock dock-r" aria-label="說明"><ExploreRight story={story} setStory={setStory} /></aside>
            <aside className="dock dock-l" aria-label="主題與器官"><ExploreLeft onStory={(topic) => setStory({ topic, step: 0 })} /></aside>
          </>}
        </main>
      )}

      {mode === 'consult' && <div className="no-print"><EmergencyBanner a={analysis} /></div>}
      {mode === 'consult' && current === 'setup' && <main className="main"><Setup /></main>}

      {mode === 'consult' && current === 'work' && (
        <>
          <nav className="mtabs no-print" role="tablist">
            {([['form', `問卷${nSym ? `（${nSym}）` : ''}`], ['viewer', '3D 人體'], ['analysis', '分析與衛教']] as [Pane, string][]).map(([p, label]) => (
              <button key={p} role="tab" aria-selected={pane === p} className={pane === p ? 'on' : ''} onClick={() => setPane(p)}>{label}</button>
            ))}
          </nav>
          <main className={`work show-${pane}`}>
            <section className="col col-form"><h2 className="col-title">症狀問卷與生活因素</h2><div className="col-scroll"><Questionnaire /></div></section>
            <section className="col col-viewer"><ViewerPanel flagged={flagged} /></section>
            <section className="col col-analysis"><RightPanel a={analysis} /></section>
          </main>
          <footer className="bottom no-print">
            <button className="btn ghost" onClick={() => setStep('setup')}>← 諮詢資料</button>
            <span className="small">已勾選 {nSym} 項症狀、{c.lifestyle.length} 項生活因素</span>
            <button className="btn primary" onClick={() => setStep('review')}>健康管理師審核 →</button>
          </footer>
        </>
      )}

      {mode === 'consult' && current === 'review' && <main className="main"><Review a={analysis} /></main>}
    </div>
  );
}
