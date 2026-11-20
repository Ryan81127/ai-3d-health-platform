import { useEffect, useState } from 'react';
import { ORGANS } from '../data/organs';
import { TOPIC_MAP } from '../data/topics';
import { useStore } from '../store';
import OrganCard from './OrganCard';
import StoryPlayer, { TopicPicker } from './StoryPlayer';
import { CATEGORIES, CATEGORY_STATS, isReady } from '../data/categories';
import { DISEASE_MAP } from '../data/diseases';
import DiseaseView from './DiseaseView';

const SYSTEM_ORDER = ['神經系統', '感覺系統', '消化系統', '呼吸系統', '內分泌系統', '心血管系統', '消化與代謝系統', '消化與內分泌系統', '泌尿系統', '肌肉骨骼系統', '皮膚系統'];

/** 自由探索：3D 人體佔滿畫面，左側為主題與器官清單，右側為故事或器官資訊 */
export function ExploreLeft({ onStory }: { onStory(id: string): void }) {
  const { selectedOrgan, selectOrgan } = useStore();
  const [tab, setTab] = useState<'topic' | 'disease' | 'organ'>('topic');
  const [openCat, setOpenCat] = useState<string | null>(null);
  const groups = SYSTEM_ORDER.map((sys) => [sys, ORGANS.filter((o) => o.system === sys)] as const).filter(([, l]) => l.length);
  return (
    <div className="dock-body">
      <div className="seg" role="tablist">
        <button role="tab" aria-selected={tab === 'topic'} className={tab === 'topic' ? 'on' : ''} onClick={() => setTab('topic')}>主題故事</button>
        <button role="tab" aria-selected={tab === 'disease'} className={tab === 'disease' ? 'on' : ''} onClick={() => setTab('disease')}>疾病分類</button>
        <button role="tab" aria-selected={tab === 'organ'} className={tab === 'organ' ? 'on' : ''} onClick={() => setTab('organ')}>器官</button>
      </div>
      {tab === 'disease' ? (
        <div className="cat-list">
          <p className="small">{CATEGORY_STATS.total} 種常見疾病，依健康管理師課程分為 {CATEGORIES.length} 類；每種都有衛教內容與 3D 動畫。</p>
          {CATEGORIES.map((c) => {
            const done = c.diseases.filter((x) => isReady(x.id)).length;
            return (
              <div key={c.id} className={`acc ${openCat === c.id ? 'open' : ''}`}>
                <button className="acc-head" aria-expanded={openCat === c.id} onClick={() => setOpenCat(openCat === c.id ? null : c.id)}>
                  <span className="cat-ico" aria-hidden>{c.icon}</span><span>{c.title}</span><b className="count">{done === c.diseases.length ? c.diseases.length : `${done}/${c.diseases.length}`}</b><i>{openCat === c.id ? '−' : '+'}</i>
                </button>
                {openCat === c.id && (
                  <div className="acc-body topic-picker">
                    {c.diseases.map((x) => (
                      <button key={x.id} className="topic-chip" disabled={!isReady(x.id)} onClick={() => onStory(x.id)}>
                        {x.title}{!isReady(x.id) && <small>整理中</small>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : tab === 'topic' ? (
        <>
          <p className="small">選一個生活習慣，看看身體裡可能發生什麼。</p>
          <TopicPicker onPick={onStory} />
        </>
      ) : (
        <div className="organ-list">
          {groups.map(([sys, list]) => (
            <div key={sys}>
              <h4>{sys}</h4>
              {list.map((o) => <button key={o.id} className={selectedOrgan === o.id ? 'on' : ''} onClick={() => selectOrgan(o.id)}><i style={{ background: o.color }} />{o.name}</button>)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ExploreRight({ story, setStory }: { story: { topic: string; step: number } | null; setStory(s: { topic: string; step: number } | null): void }) {
  const selectedOrgan = useStore((s) => s.selectedOrgan);
  const selectedPart = useStore((s) => s.selectedPart);
  const [tab, setTab] = useState<'story' | 'organ'>(story ? 'story' : 'organ');
  useEffect(() => { if (story) setTab('story'); }, [story]);
  useEffect(() => { if (selectedOrgan || selectedPart) setTab('organ'); }, [selectedOrgan, selectedPart]);
  return (
    <div className="dock-body">
      {story && (
        <div className="seg" role="tablist">
          <button role="tab" aria-selected={tab === 'story'} className={tab === 'story' ? 'on' : ''} onClick={() => setTab('story')}>{TOPIC_MAP[story.topic]?.icon ?? '📘'} {TOPIC_MAP[story.topic]?.title ?? DISEASE_MAP[story.topic]?.title}</button>
          <button role="tab" aria-selected={tab === 'organ'} className={tab === 'organ' ? 'on' : ''} onClick={() => setTab('organ')}>器官資訊</button>
        </div>
      )}
      {story && <div hidden={tab !== 'story'}>
        {TOPIC_MAP[story.topic]?.ready
          ? <StoryPlayer topicId={story.topic} startAt={story.step} onExit={() => setStory(null)} />
          : <DiseaseView key={story.topic} id={story.topic} onExit={() => setStory(null)} />}
      </div>}
      {(!story || tab === 'organ') && <OrganCard onOpenStory={(topic, step) => setStory({ topic, step })} />}
    </div>
  );
}
