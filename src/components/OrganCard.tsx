import { useState } from 'react';
import { ORGAN_MAP } from '../data/organs';
import { NUTRIENTS } from '../data/nutrients';
import { TOPICS } from '../data/topics';
import { MECHANISMS } from '../data/knowledge';
import { CATEGORIES } from '../data/symptoms';
import { LAYER_ZH } from '../data/partNames';
import { useStore } from '../store';
import { PART_MAP, partLabel } from '../three/anatomy';
import { EvidenceBadge, Pending, Sources } from './ui';

type Tab = 'normal' | 'effect' | 'action';

/** 與器官相關的「可能影響」：主題故事的步驟，以及症狀知識庫裡的機制 */
function effectsOf(organId: string) {
  const stories = TOPICS.flatMap((t) => t.steps.map((s, k) => ({ t, s, k }))).filter(({ s }) => s.organs.includes(organId) && s.stage !== '改善方向' && s.stage !== '生活因素');
  const mechIds = new Set(CATEGORIES.flatMap((c) => c.symptoms).filter((x) => x.organs.includes(organId)).flatMap((x) => x.mech));
  const mechs = MECHANISMS.filter((m) => mechIds.has(m.id));
  return { stories, mechs };
}

export default function OrganCard({ relatedReasons, onOpenStory }: { relatedReasons?: (organId: string) => string[] | undefined; onOpenStory?(topicId: string, step: number): void }) {
  const id = useStore((s) => s.selectedOrgan);
  const partId = useStore((s) => s.selectedPart);
  const [tab, setTab] = useState<Tab>('normal');
  const part = partId ? PART_MAP[partId] : null;

  if (!id && part) return (
    <div className="organ-card">
      <h3>{partLabel(part)}<span className="tag">{LAYER_ZH[part.layer]}</span></h3>
      <p className="small">英文解剖學名稱：{part.en}</p>
      <p>這個部位目前沒有對應的衛教內容。可用「隱藏此部位」看到它後方的構造。</p>
    </div>
  );
  if (!id) return <p className="empty">在 3D 人體上點選任一部位，或從器官清單、搜尋選擇，這裡會顯示它如何運作。</p>;

  const o = ORGAN_MAP[id];
  const reasons = relatedReasons?.(id);
  const { stories, mechs } = effectsOf(id);
  const nutrients = NUTRIENTS.filter((n) => n.organs.includes(id));
  const tabs: [Tab, string][] = [['normal', '正常運作'], ['effect', '可能影響'], ['action', '我能做什麼']];

  return (
    <div className="organ-card">
      <h3>{o.name}<span className="tag">{o.system}</span></h3>
      {part && <p className="small">點選的部位：{partLabel(part)}{partLabel(part) !== part.en && `（${part.en}）`}{part.schematic && '｜示意幾何，資料集未收錄此構造'}</p>}
      {reasons && <p className="relate">問卷中相關的項目：{reasons.join('、')}（僅表示功能上可能相關）</p>}
      <div className="seg" role="tablist">
        {tabs.map(([k, label]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{label}</button>)}
      </div>

      {tab === 'normal' && (
        <div className="seg-body">
          <p className="lead">{o.fn}</p>
          <p>{o.edu}</p>
          <p><Pending>組織與細胞層級放大（第三階段）</Pending></p>
        </div>
      )}

      {tab === 'effect' && (
        <div className="seg-body">
          <p className="demo-note">以下是文獻中「可能相關」的機制，不代表一定會發生，也不能用來判斷器官是否受損。</p>
          {stories.map(({ t, s, k }) => (
            <div key={`${t.id}-${k}`} className="effect story-link">
              <div className="item-head"><span className="tag stage">{t.icon} {t.title}</span><strong>{s.title}</strong><EvidenceBadge level={s.evidence} /></div>
              <p>{s.change}</p>
              {onOpenStory && <button className="btn small" onClick={() => onOpenStory(t.id, k)}>▶ 看對照動畫</button>}
            </div>
          ))}
          {mechs.map((m) => (
            <div key={m.id} className="effect">
              <div className="item-head"><strong>{m.title}</strong><EvidenceBadge level={m.evidence} /></div>
              <p>{m.text}</p>
              <Sources refs={m.refs} />
            </div>
          ))}
          {!stories.length && !mechs.length && <p className="empty">這個器官目前沒有整理好的相關機制。</p>}
        </div>
      )}

      {tab === 'action' && (
        <div className="seg-body">
          <p className="lead">{o.care}</p>
          {nutrients.length > 0 && <>
            <h4>相關營養素（食物優先）</h4>
            <div className="chips">{nutrients.map((n) => <span key={n.id} className="chip static" title={n.foods}>{n.name}</span>)}</div>
            <p className="small">營養素不是疾病的治療方式；使用補充品前請諮詢醫師、藥師或營養師。</p>
          </>}
          <p className="small">症狀持續、加重或出現就醫警訊時，請儘速就醫。</p>
        </div>
      )}
      <p className="small muted">3D 模型為 BodyParts3D 成年男性解剖模型，是通用教學模型，不是個案的影像。</p>
    </div>
  );
}
