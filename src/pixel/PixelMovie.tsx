import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import { FONT, G, H, W, drawFrame, totalTime, type Movie } from './engine';

/** 載入像素字型（俐方體11號，Cubic 11，免費字型授權，含 SIL OFL 1.1），畫布與字幕共用 */
let fontReady: Promise<void> | null = null;
function loadFont() {
  if (!fontReady) {
    const f = new FontFace(FONT, `url(${import.meta.env.BASE_URL}fonts/Cubic_11.woff2)`);
    fontReady = f.load().then((ff) => { document.fonts.add(ff); }).catch(() => undefined);
  }
  return fontReady;
}

/** 8-bit 打字音效（方波），預設關閉 */
let audio: AudioContext | null = null;
function blip() {
  try {
    audio ??= new AudioContext();
    const o = audio.createOscillator(), gn = audio.createGain();
    o.type = 'square'; o.frequency.value = 660 + Math.random() * 220;
    gn.gain.value = .025; gn.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + .05);
    o.connect(gn).connect(audio.destination); o.start(); o.stop(audio.currentTime + .05);
  } catch { /* 瀏覽器不支援時略過 */ }
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export default function PixelMovie({ movie }: { movie: Movie }) {
  const reduce = useStore((s) => s.reduceMotion);
  const cv = useRef<HTMLCanvasElement>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [sound, setSound] = useState(false);
  const total = useMemo(() => totalTime(movie), [movie]);
  const starts = useMemo(() => { let a = 0; return movie.scenes.map((s) => { const x = a; a += s.d ?? 5; return x; }); }, [movie]);
  const tRef = useRef(0), lastChars = useRef(0);

  useEffect(() => { loadFont().then(() => setReady(true)); }, []);
  useEffect(() => { tRef.current = 0; setTime(0); setPlaying(!reduce); }, [movie, reduce]);

  // 播放迴圈
  useEffect(() => {
    if (!ready) return;
    const ctx = cv.current?.getContext('2d'); if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    const g = new G(ctx);
    let raf = 0, prev = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(.1, (now - prev) / 1000); prev = now;
      if (playing) {
        tRef.current += dt;
        if (tRef.current >= total) { tRef.current = total - .001; setPlaying(false); }
      }
      drawFrame(g, movie, tRef.current);
      setTime(tRef.current);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ready, playing, movie, total]);

  let idx = starts.length - 1;
  while (idx > 0 && time < starts[idx]) idx--;
  const scene = movie.scenes[idx];
  const local = time - starts[idx];
  const full = reduce || !playing ? scene.cap.length : Math.min(scene.cap.length, Math.floor(local * 16));
  const shown = scene.cap.slice(0, full);
  useEffect(() => { if (sound && playing && full > lastChars.current && full < scene.cap.length && full % 2 === 0) blip(); lastChars.current = full; }, [full, sound, playing, scene.cap.length]);

  const seek = (t: number) => { tRef.current = Math.max(0, Math.min(total - .001, t)); setTime(tRef.current); };
  return (
    <figure className="pxm" aria-label={`${movie.title}：像素科普動畫`}>
      <div className="pxm-screen">
        <canvas ref={cv} width={W} height={H} role="img" aria-label={`${movie.title} 第 ${idx + 1} 幕：${scene.cap}`} onClick={() => setPlaying(!playing)} />
        <span className="pxm-badge">衛教示意</span>
        {!playing && time < .05 && (
          <button className="pxm-big" onClick={() => setPlaying(true)} aria-label="播放"><span>▶</span>{fmt(total)}</button>
        )}
      </div>
      <div className="pxm-dialog" aria-live="polite">
        <span className="pxm-who">{String(idx + 1).padStart(2, '0')}/{String(movie.scenes.length).padStart(2, '0')}</span>
        <p>{shown}<i className={full < scene.cap.length ? 'cur' : 'cur done'}>▌</i></p>
      </div>
      <div className="pxm-bar">
        <button className="pxm-btn" onClick={() => { if (time >= total - .01) seek(0); setPlaying(!playing); }} aria-label={playing ? '暫停' : '播放'}>{playing ? '❚❚' : '▶'}</button>
        <button className="pxm-btn" onClick={() => { seek(0); setPlaying(true); }} aria-label="重新播放">↺</button>
        <div className="pxm-track" role="slider" aria-label="播放進度" aria-valuemin={0} aria-valuemax={Math.round(total)} aria-valuenow={Math.round(time)} tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'ArrowRight') seek(time + 5); if (e.key === 'ArrowLeft') seek(time - 5); }}
          onPointerDown={(e) => { const r = e.currentTarget.getBoundingClientRect(); seek(((e.clientX - r.left) / r.width) * total); }}>
          <div className="pxm-fill" style={{ width: `${(time / total) * 100}%` }} />
          {starts.map((s, i) => <button key={i} className={`pxm-ch ${i === idx ? 'on' : ''} ${i < idx ? 'done' : ''}`} style={{ left: `${(s / total) * 100}%` }} onPointerDown={(e) => { e.stopPropagation(); seek(s + .01); }} aria-label={`第 ${i + 1} 幕`} />)}
        </div>
        <span className="pxm-time">{fmt(time)} / {fmt(total)}</span>
        <button className={`pxm-btn ${sound ? 'on' : ''}`} onClick={() => setSound(!sound)} aria-pressed={sound} title="8-bit 打字音效">{sound ? '♪' : '♪̸'}</button>
      </div>
    </figure>
  );
}
