import { useStore } from '../store';
import { TopicPicker } from './StoryPlayer';

/** 首頁：大型 3D 人體是主角，選擇「自由探索」或「健康諮詢」 */
export default function Home() {
  const setMode = useStore((s) => s.setMode);
  return (
    <div className="hero" role="region" aria-label="開始">
      <span className="eyebrow">健康管理師衛教平台</span>
      <h1>看見身體<br />如何運作</h1>
      <p>旋轉、放大、一層層透視真實的人體解剖構造，了解生活習慣可能影響哪些器官，以及可以從哪裡開始調整。</p>
      <div className="hero-cta">
        <button className="cta primary" onClick={() => setMode('explore')}>
          <b>自由探索</b><span>點選器官、分層透視，不需填資料</span>
        </button>
        <button className="cta" onClick={() => setMode('consult')}>
          <b>健康諮詢</b><span>健康管理師帶領：問卷、衛教分析、報告</span>
        </button>
      </div>
      <div className="hero-topics">
        <span>從一個生活習慣開始</span>
        <TopicPicker onPick={(id) => setMode('explore', id)} />
      </div>
      <p className="hero-note">衛教用途，不提供疾病診斷。3D 模型：BodyParts3D 成年男性解剖模型。</p>
    </div>
  );
}
