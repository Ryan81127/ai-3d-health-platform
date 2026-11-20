import { useStore } from '../store';
import { TopicPicker } from './StoryPlayer';
import { CATEGORY_STATS } from '../data/categories';
import { PARTS } from '../three/anatomy';

const Arrow = () => <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden><path d="M4 10h11M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;

/** 首頁：大型 3D 人體是主角，選擇「自由探索」或「健康諮詢」 */
export default function Home() {
  const setMode = useStore((s) => s.setMode);
  return (
    <div className="hero" role="region" aria-label="開始">
      <span className="eyebrow"><i />健康管理師衛教平台</span>
      <h1>看見身體<br /><em>如何運作</em></h1>
      <p className="hero-lead">旋轉、放大、一層層透視真實的人體解剖構造，了解生活習慣可能影響哪些器官，以及可以從哪裡開始調整。</p>
      <div className="hero-cta">
        <button className="cta primary" onClick={() => setMode('explore')}>
          <span><b>自由探索</b><small>點選器官、分層透視、疾病 3D 動畫</small></span><Arrow />
        </button>
        <button className="cta" onClick={() => setMode('consult')}>
          <span><b>健康諮詢</b><small>健康管理師帶領：問卷、衛教分析、報告</small></span><Arrow />
        </button>
      </div>
      <dl className="hero-stats">
        <div><dt>{CATEGORY_STATS.total}</dt><dd>常見疾病模組</dd></div>
        <div><dt>{PARTS.length.toLocaleString()}</dt><dd>真實解剖部位</dd></div>
        <div><dt>100%</dt><dd>逐句附來源</dd></div>
      </dl>
      <div className="hero-topics">
        <span>從一個生活習慣開始</span>
        <TopicPicker onPick={(id) => setMode('explore', id)} />
      </div>
      <p className="hero-note">衛教用途，不提供疾病診斷。3D 模型：BodyParts3D 成年男性解剖模型、Z-Anatomy。</p>
    </div>
  );
}
