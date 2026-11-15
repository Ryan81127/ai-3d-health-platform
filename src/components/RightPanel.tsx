import { useEffect, useMemo, useState } from 'react';
import type { AnalysisResult } from '../types';
import { ORGAN_MAP } from '../data/organs';
import { NUTRIENTS, type Nutrient } from '../data/nutrients';
import { CONTENT_VERSION } from '../data/references';
import { PROVIDERS } from '../engine/provider';
import { useStore } from '../store';
import OrganCard from './OrganCard';
import StoryPlayer, { TopicPicker } from './StoryPlayer';
import DiseaseView from './DiseaseView';
import { TOPIC_MAP } from '../data/topics';
import { EvidenceBadge, ItemCard, Pending, Sources } from './ui';

type Tab = 'analysis' | 'organ' | 'topic' | 'nutrient';

export function EmergencyBanner({ a }: { a: AnalysisResult }) {
  if (!a.emergency.length) return null;
  return (
    <div className="emergency" role="alert">
      <h3>⚠ 請優先處理：可能需要緊急就醫</h3>
      {a.emergency.map((e) => <p key={e.id}><b>{e.title}</b>：{e.text}</p>)}
      <p className="small">此提醒依個案自述產生，請立即協助個案就醫，不要等待完成問卷。</p>
    </div>
  );
}

function Analysis({ a }: { a: AnalysisResult }) {
  const selectOrgan = useStore((s) => s.selectOrgan);
  const [sec, setSec] = useState('mech');
  const sections: [string, string, number][] = [
    ['mech', '機制與生活因素', a.mechanisms.length], ['ask', '待確認', a.questions.length], ['med', '醫療評估', a.medical.length],
    ['life', '生活方向', a.lifestyle.length], ['nut', '營養衛教', a.nutrition.length], ['fu', '追蹤', a.followup.length],
  ];
  return (
    <div>
      <div className="engine">
        <label>分析引擎
          <select value={a.engine.id} onChange={() => {}}>
            {PROVIDERS.map((p) => <option key={p.id} value={p.id} disabled={!p.available}>{p.name}{p.available ? '' : '（尚未完成）'}</option>)}
          </select>
        </label>
        <p className="small">目前結果由<b>固定規則比對知識庫</b>產生，不是 AI 模型。知識庫 {CONTENT_VERSION.version}：{CONTENT_VERSION.status}。</p>
      </div>
      {a.empty ? <p className="empty">請在問卷勾選症狀或就醫警訊，這裡會即時整理相關的衛教資訊。</p> : (
        <>
          <div className="card">
            <h4>1. 主要症狀摘要</h4>
            {a.summary.length ? <ul>{a.summary.map((s) => <li key={s}>{s}</li>)}</ul> : <p>未勾選症狀。</p>}
            <h4>2. 可能相關的器官與生理系統</h4>
            <div className="chips">
              {a.organs.map((o) => <button key={o.organId} className="chip flagged" title={`相關：${o.reasons.join('、')}`} onClick={() => selectOrgan(o.organId)}>{ORGAN_MAP[o.organId].name}</button>)}
            </div>
            <p className="small">系統：{a.systems.join('、') || '—'}。點選器官可在 3D 檢視。列出器官代表「功能上可能相關」，不代表器官受損。</p>
          </div>
          <div className="subtabs" role="tablist">
            {sections.map(([id, label, n]) => <button key={id} role="tab" aria-selected={sec === id} className={sec === id ? 'on' : ''} onClick={() => setSec(id)}>{label}<i>{n}</i></button>)}
          </div>
          {sec === 'mech' && a.mechanisms.map((m) => <ItemCard key={m.id} item={m} />)}
          {sec === 'ask' && a.questions.map((m) => <ItemCard key={m.id} item={m} />)}
          {sec === 'med' && a.medical.map((m) => <ItemCard key={m.id} item={m} tone={m.tags?.includes('儘速就醫') ? 'warn' : undefined} />)}
          {sec === 'life' && (a.lifestyle.length ? a.lifestyle.map((m) => <ItemCard key={m.id} item={m} />) : <p className="empty">尚未勾選生活習慣。</p>)}
          {sec === 'nut' && (<>
            <p className="small">以下為與相關生理功能有關的營養衛教，以食物來源為優先；<b>不代表個案缺乏這些營養素，也不是治療方式</b>。</p>
            {a.nutrition.length ? a.nutrition.map((m) => <ItemCard key={m.id} item={m} />) : <p className="empty">目前勾選的症狀沒有對應的營養衛教條目。</p>}
          </>)}
          {sec === 'fu' && a.followup.map((m) => <ItemCard key={m.id} item={m} />)}
          <div className="card uncertain">
            <h4>不確定性與限制</h4>
            <ul>{a.uncertainty.map((u) => <li key={u}>{u}</li>)}</ul>
          </div>
        </>
      )}
    </div>
  );
}

function OrganInfo({ a, openStory }: { a: AnalysisResult; openStory(topic: string, step: number): void }) {
  return <OrganCard relatedReasons={(id) => a.organs.find((x) => x.organId === id)?.reasons} onOpenStory={openStory} />;
}

function TopicTab({ story, setStory }: { story: { topic: string; step: number }; setStory(s: { topic: string; step: number }): void }) {
  return (
    <div>
      <TopicPicker value={story.topic} onPick={(topic) => setStory({ topic, step: 0 })} />
      {TOPIC_MAP[story.topic].ready ? <StoryPlayer topicId={story.topic} startAt={story.step} /> : <DiseaseView key={story.topic} id={story.topic} />}
    </div>
  );
}

function NutrientDB() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const list = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return NUTRIENTS;
    return NUTRIENTS.filter((n) => [n.name, n.fn, n.foods, n.group, n.risk, n.caution, ...n.organs.map((o) => ORGAN_MAP[o]?.name)].join(' ').toLowerCase().includes(k));
  }, [q]);
  const row = (label: string, text: string) => <><dt>{label}</dt><dd>{text}</dd></>;
  const detail = (n: Nutrient) => (
    <dl>
      {row('主要生理功能', n.fn)}{row('食物來源', n.foods)}{row('消化、吸收與代謝', n.metabolism)}
      {row('相關器官', n.organs.map((o) => ORGAN_MAP[o].name).join('、'))}{row('細胞層級作用', n.cell)}
      {row('一般建議攝取量', n.intake)}{row('不足或過量的風險', n.risk)}{row('疾病與藥物注意事項', n.caution)}
    </dl>
  );
  return (
    <div>
      <input className="search" type="search" placeholder="搜尋營養素、食物或器官（例：鐵、深綠色蔬菜、眼睛）" value={q} onChange={(e) => setQ(e.target.value)} aria-label="搜尋營養素" />
      <p className="small">建議攝取量為一般健康成人參考值，請以國健署最新公告為準。營養素不是疾病的治療方式；補充品使用前請諮詢醫師、藥師或營養師。</p>
      {list.length === 0 && <p className="empty">找不到符合的營養素。</p>}
      {list.map((n) => (
        <div key={n.id} className={`acc ${open === n.id ? 'open' : ''}`}>
          <button className="acc-head" aria-expanded={open === n.id} onClick={() => setOpen(open === n.id ? null : n.id)}><span>{n.name}</span><span className="tag">{n.group}</span><i>{open === n.id ? '−' : '+'}</i></button>
          {open === n.id && <div className="acc-body">{detail(n)}<Sources refs={n.refs} /><p><Pending>營養素作用動畫（第三階段）</Pending></p></div>}
        </div>
      ))}
    </div>
  );
}

export default function RightPanel({ a }: { a: AnalysisResult }) {
  const selected = useStore((s) => s.selectedOrgan);
  const [tab, setTab] = useState<Tab>('analysis');
  const selectedPart = useStore((s) => s.selectedPart);
  useEffect(() => { if ((selected || selectedPart) && tab !== 'topic') setTab('organ'); }, [selected, selectedPart]); // eslint-disable-line
  const [story, setStory] = useState({ topic: 'late-night', step: 0 });
  const openStory = (topic: string, step: number) => { setStory({ topic, step }); setTab('topic'); };
  const tabs: [Tab, string][] = [['analysis', '分析'], ['organ', '器官'], ['topic', '機制主題'], ['nutrient', '營養資料庫']];
  return (
    <div className="right">
      <div className="tabs" role="tablist">
        {tabs.map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>)}
      </div>
      <div className="tabbody">
        {tab === 'analysis' && <Analysis a={a} />}
        {tab === 'organ' && <OrganInfo a={a} openStory={openStory} />}
        {tab === 'topic' && <TopicTab story={story} setStory={setStory} />}
        {tab === 'nutrient' && <NutrientDB />}
      </div>
    </div>
  );
}
