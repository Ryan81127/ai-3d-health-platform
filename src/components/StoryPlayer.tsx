import { useEffect, useRef, useState } from 'react';
import { ORGAN_MAP } from '../data/organs';
import { TOPIC_MAP, TOPICS } from '../data/topics';
import { DISEASE_MAP } from '../data/diseases';
import { useStore, type LayerOpacity } from '../store';
import MechanismAnim from './MechanismAnim';
import { EvidenceBadge, Sources } from './ui';

/** 故事播放時的圖層：皮膚與骨骼淡出，器官與血管清楚可見 */
const STORY_OPACITY: LayerOpacity = { skin: 0.08, muscle: 0, skeleton: 0.12, organ: 1, vessel: 0.85, nerve: 0 };
const STEP_MS = 9500;
const REVEAL_MS = 650;

export function TopicPicker({ value, onPick }: { value?: string; onPick(id: string): void }) {
  return (
    <div className="topic-picker">
      {TOPICS.map((t) => (
        <button key={t.id} className={`topic-chip ${t.id === value ? 'on' : ''}`} disabled={!t.ready && !DISEASE_MAP[t.id]} onClick={() => onPick(t.id)}>
          <span>{t.icon}</span>{t.title}{!t.ready && !DISEASE_MAP[t.id] && <small>尚未完成</small>}
        </button>
      ))}
    </div>
  );
}

function Quiz({ topicId, onReplay }: { topicId: string; onReplay(): void }) {
  const quiz = TOPIC_MAP[topicId].quiz;
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  if (i >= quiz.length) {
    return (
      <div className="quiz done">
        <div className="quiz-score">{score} / {quiz.length}</div>
        <p>{score === quiz.length ? '全部答對！' : '理解比分數重要，可以回頭再看一次動畫。'}</p>
        <p className="small">這是理解度小測驗，不是健康評分，也不代表任何人的健康狀況。</p>
        <div className="row-btns">
          <button className="btn small" onClick={onReplay}>↺ 重新觀看</button>
          <button className="btn small ghost" onClick={() => { setI(0); setPicked(null); setScore(0); }}>再測一次</button>
        </div>
      </div>
    );
  }
  const q = quiz[i];
  return (
    <div className="quiz">
      <div className="quiz-head"><span>小測驗 {i + 1} / {quiz.length}</span></div>
      <h4>{q.q}</h4>
      <div className="quiz-opts">
        {q.options.map((o, k) => (
          <button key={o} disabled={picked !== null}
            className={picked === null ? '' : k === q.answer ? 'right' : k === picked ? 'wrong' : 'dim'}
            onClick={() => { setPicked(k); if (k === q.answer) setScore(score + 1); }}>
            {o}{picked !== null && k === q.answer && ' ✓'}
          </button>
        ))}
      </div>
      {picked !== null && (
        <div className={`quiz-explain ${picked === q.answer ? 'right' : 'wrong'}`}>
          <b>{picked === q.answer ? '答對了' : '再想想'}</b>　{q.explain}
          <Sources refs={q.refs} />
          <button className="btn small primary" onClick={() => { setI(i + 1); setPicked(null); }}>{i + 1 < quiz.length ? '下一題 →' : '看結果'}</button>
        </div>
      )}
    </div>
  );
}

export default function StoryPlayer({ topicId, startAt = 0, onExit }: { topicId: string; startAt?: number; onExit?(): void }) {
  const topic = TOPIC_MAP[topicId];
  const setStory = useStore((s) => s.setStory);
  const reduce = useStore((s) => s.reduceMotion);
  const [i, setI] = useState(startAt);
  const [phase, setPhase] = useState<'story' | 'quiz'>('story');
  const [playing, setPlaying] = useState(!reduce);
  const [lit, setLit] = useState(0);
  const step = topic.steps[i];
  const saved = useRef<LayerOpacity | null>(null);

  // 進入故事：調整圖層讓器官清楚可見；離開時還原
  useEffect(() => {
    saved.current = useStore.getState().opacity;
    useStore.setState({ opacity: STORY_OPACITY, peel: null, autoRotate: false, hidden: [] });
    return () => {
      useStore.getState().setStory({ spotlight: null, focus: null, flows: null });
      if (saved.current) useStore.setState({ opacity: saved.current });
    };
  }, [topicId]);

  useEffect(() => { setI(startAt); setPhase('story'); }, [topicId, startAt]);
  useEffect(() => { if (phase === 'quiz') setStory({ spotlight: null, focus: null, flows: null }); }, [phase, setStory]);

  // 每一步：鏡頭框住相關器官 → 器官依序亮起 → 出現訊號路徑
  useEffect(() => {
    if (!step || phase !== 'story') return;
    const n = step.organs.length;
    if (reduce) {
      setLit(n);
      setStory({ focus: step.organs, spotlight: step.organs, flows: step.flow ?? null });
      return;
    }
    setLit(0);
    setStory({ focus: step.organs, spotlight: [], flows: null });
    const timers = step.organs.map((_, k) => setTimeout(() => { setLit(k + 1); setStory({ spotlight: step.organs.slice(0, k + 1) }); }, 500 + k * REVEAL_MS));
    timers.push(setTimeout(() => setStory({ flows: step.flow ?? null }), 500 + n * REVEAL_MS));
    return () => timers.forEach(clearTimeout);
  }, [step, phase, reduce, setStory]);

  // 自動播放下一步
  useEffect(() => {
    if (!playing || phase !== 'story') return;
    const last = i >= topic.steps.length - 1;
    const timer = setTimeout(() => (last ? setPlaying(false) : setI(i + 1)), STEP_MS);
    return () => clearTimeout(timer);
  }, [playing, i, phase, topic.steps.length]);

  if (!topic.ready) return <p className="empty">這個主題尚未完成。</p>;

  return (
    <div className="story">
      <div className="story-head">
        <span className="story-icon">{topic.icon}</span>
        <div><b>{topic.title}</b><small>{topic.hook}</small></div>
        {onExit && <button className="btn small ghost" onClick={onExit} aria-label="離開故事">✕</button>}
      </div>
      <p className="demo-note">衛教示意：呈現群體研究觀察到的可能機制，不是對個人的預測，也不代表一定會發生疾病或器官損傷。</p>

      <div className="timeline" role="tablist" aria-label="時間軸">
        {topic.steps.map((s, k) => (
          <button key={k} role="tab" aria-selected={phase === 'story' && k === i} className={phase === 'story' && k === i ? 'on' : k < i || phase === 'quiz' ? 'done' : ''}
            onClick={() => { setPhase('story'); setI(k); setPlaying(false); }} title={s.title}>
            <i>{k + 1}</i><span>{s.stage}</span>
          </button>
        ))}
        <button role="tab" aria-selected={phase === 'quiz'} className={phase === 'quiz' ? 'on' : ''} onClick={() => { setPhase('quiz'); setPlaying(false); }}><i>?</i><span>小測驗</span></button>
      </div>

      {phase === 'quiz' ? (
        <Quiz topicId={topicId} onReplay={() => { setPhase('story'); setI(0); setPlaying(!reduce); }} />
      ) : step && (
        <>
          <div className="story-step">
            <div className="item-head"><span className="tag stage">{step.stage}</span><strong>{step.title}</strong><EvidenceBadge level={step.evidence} /></div>
            <div className="lit-row" aria-live="polite">
              {step.organs.map((o, k) => <span key={o} className={`lit ${k < lit ? 'on' : ''}`}>{ORGAN_MAP[o].name}</span>)}
              {step.flow && lit >= step.organs.length && <span className="lit flow">光點＝訊號路徑（示意）</span>}
            </div>
          </div>
          <MechanismAnim anim={step.anim} caption={step.caption} />
          <details className="story-text">
            <summary>看文字說明與來源</summary>
            <p><b>一般狀況：</b>{step.normal}</p>
            <p><b>{step.stage === '改善方向' ? '可行的調整' : '可能的變化'}：</b>{step.change}</p>
            <Sources refs={step.refs} />
          </details>
          <div className="player">
            <button className="btn small ghost" disabled={i === 0} onClick={() => { setI(i - 1); setPlaying(false); }}>◀ 上一步</button>
            <button className="btn small" onClick={() => setPlaying(!playing)}>{playing ? '⏸ 暫停' : '▶ 播放'}</button>
            {i < topic.steps.length - 1
              ? <button className="btn small ghost" onClick={() => { setI(i + 1); setPlaying(false); }}>下一步 ▶</button>
              : <button className="btn small primary" onClick={() => { setPhase('quiz'); setPlaying(false); }}>小測驗 →</button>}
          </div>
          {playing && <div className="story-progress" key={`${i}-${playing}`} style={{ animationDuration: `${STEP_MS}ms` }} />}
        </>
      )}
    </div>
  );
}
