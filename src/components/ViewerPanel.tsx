import { lazy, Suspense, useMemo, useState } from 'react';
import { ORGANS, ORGAN_MAP } from '../data/organs';
import { LAYER_ZH } from '../data/partNames';
import { PEEL_ORDER, useStore, type LayerKey } from '../store';
import { MODEL_INFO } from '../three/modelSource';
import { PART_MAP, partLabel, searchParts, type SearchHit } from '../three/anatomy';

const BodyViewer = lazy(() => import('../three/BodyViewer'));

export default function ViewerPanel({ flagged }: { flagged: string[] }) {
  const { selectedOrgan, selectedPart, selectOrgan, selectPart, hidden, hideSelected, showAll, opacity, peel, setPeel, setLayerOpacity, resetView, addSnapshot, snapshots, spotlight } = useStore();
  const [menu, setMenu] = useState(false);
  const [fine, setFine] = useState(false);
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState('');
  const hits = useMemo(() => searchParts(q), [q]);
  const part = selectedPart ? PART_MAP[selectedPart] : null;
  const current = part ? partLabel(part) : selectedOrgan ? ORGAN_MAP[selectedOrgan].name : '';

  // 個別調整圖層後，滑桿停在最接近目前狀態的位置
  const outer = PEEL_ORDER.findIndex((k) => opacity[k] > 0.01);
  const approxPeel = outer < 0 ? 5 : outer + (1 - opacity[PEEL_ORDER[outer]]);

  const snap = () => {
    setMsg(addSnapshot(current || '全身') ? `已加入報告（${Math.min(snapshots.length + 1, 4)}/4）` : '擷取失敗');
    setTimeout(() => setMsg(''), 2200);
  };
  const choose = (h: SearchHit) => {
    if (h.organId) selectOrgan(h.organId);
    else if (h.partId) {
      const p = PART_MAP[h.partId];
      if (opacity[p.layer] < 0.6) setLayerOpacity(p.layer, 1);
      for (const outer of PEEL_ORDER.slice(0, Math.min(2, PEEL_ORDER.indexOf(p.layer)))) if (opacity[outer] > 0.2) setLayerOpacity(outer, outer === 'skin' ? 0.14 : 0);
      selectPart(p.id, p.organ);
    }
    setQ('');
  };

  return (
    <div className="viewer">
      <div className="viewer-canvas">
        <Suspense fallback={<div className="loading">載入 3D 場景…</div>}>
          <BodyViewer flagged={flagged} />
        </Suspense>
        <div className="viewer-search">
          <input type="search" value={q} placeholder="搜尋部位（例：肝、股骨、aorta）" aria-label="搜尋部位" onChange={(e) => setQ(e.target.value)} />
          {q.trim() && (
            <ul>
              {hits.length === 0 && <li className="none">找不到符合的部位</li>}
              {hits.map((h) => <li key={h.partId ?? h.organId}><button onClick={() => choose(h)}><b>{h.label}</b><small>{h.sub}</small></button></li>)}
            </ul>
          )}
        </div>
        {current && (
          <div className="viewer-current">
            <b>{current}</b>
            {part && <small>{LAYER_ZH[part.layer]}{partLabel(part) !== part.en && `・${part.en}`}</small>}
            {part?.schematic && <small className="warn">示意幾何：資料集未收錄此構造</small>}
          </div>
        )}
        <div className="viewer-legend">
          {(spotlight ?? flagged).length > 0 && <><i className="dot flag" />{spotlight ? '主題教學標示' : '問卷相關器官'}　</>}
          <i className="dot sel" />目前選取
        </div>
        <div className="viewer-credit" title={MODEL_INFO.limits}><span className="how">拖曳旋轉・滾輪或雙指縮放・右鍵或雙指平移・點選部位<br /></span>{MODEL_INFO.credit}</div>
      </div>

      <div className="viewer-controls">
        <div className="row">
          <button className="btn small" aria-expanded={menu} onClick={() => setMenu(!menu)}>器官選單 {menu ? '▴' : '▾'}</button>
          <button className="btn small ghost" onClick={() => selectOrgan(null)} disabled={!selectedOrgan && !selectedPart}>回到全身</button>
          <button className="btn small ghost" onClick={hideSelected} disabled={!selectedPart}>隱藏此部位</button>
          <button className="btn small ghost" onClick={showAll} disabled={!hidden.length}>顯示全部{hidden.length ? `（${hidden.length}）` : ''}</button>
          <button className="btn small ghost" onClick={resetView}>重設</button>
          <button className="btn small ghost" onClick={snap}>📷 加入報告</button>
          {msg && <span className="ok">{msg}</span>}
        </div>
        {menu && (
          <div className="organ-menu">
            {ORGANS.map((o) => (
              <button key={o.id} className={`chip ${selectedOrgan === o.id && !selectedPart ? 'on' : ''} ${flagged.includes(o.id) ? 'flagged' : ''}`} onClick={() => selectOrgan(o.id)}>{o.name}</button>
            ))}
          </div>
        )}
        <div className="peel">
          <label htmlFor="peel">分層透視</label>
          <div className="peel-track">
            <input id="peel" type="range" min={0} max={5} step={0.02} value={peel ?? approxPeel} className={peel === null ? 'idle' : ''} onChange={(e) => setPeel(Number(e.target.value))} />
            <div className="peel-ticks">{PEEL_ORDER.map((k) => <span key={k}>{LAYER_ZH[k]}</span>)}</div>
          </div>
          <button className="btn small ghost" aria-expanded={fine} onClick={() => setFine(!fine)}>個別圖層 {fine ? '▴' : '▾'}</button>
        </div>
        {fine && (
          <div className="layer-grid">
            {PEEL_ORDER.map((k: LayerKey) => (
              <label key={k}><span>{LAYER_ZH[k]}{k === 'nerve' && '（示意）'}</span>
                <input type="range" min={0} max={1} step={0.02} value={opacity[k]} onChange={(e) => setLayerOpacity(k, Number(e.target.value))} />
                <button className={`chip ${opacity[k] > 0.01 ? 'on' : ''}`} aria-pressed={opacity[k] > 0.01} onClick={() => setLayerOpacity(k, opacity[k] > 0.01 ? 0 : 1)}>{opacity[k] > 0.01 ? '顯示' : '隱藏'}</button>
              </label>
            ))}
          </div>
        )}
        <div className="row pending-row">
          <span className="chip" title={MODEL_INFO.limits}>模型限制：{MODEL_INFO.limits}</span>
          <button className="chip" disabled>女性解剖模型（資料集未提供）</button>
          <button className="chip" disabled>組織・細胞微觀探索（第三階段，尚未完成）</button>
          <button className="chip" disabled>正常／異常動畫比較（第三階段，尚未完成）</button>
        </div>
      </div>
    </div>
  );
}
