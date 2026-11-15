import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Consult, SymptomDetail, Tri } from './types';
import { consultHash } from './engine/ruleEngine';
import { ORGAN_MAP } from './data/organs';

export type Step = 'setup' | 'work' | 'review';
/** home：首頁（人體為主角）；explore：自由探索；consult：健康諮詢流程 */
export type Mode = 'home' | 'explore' | 'consult';
export type Flow = [string, string];
export type LayerKey = 'skin' | 'muscle' | 'skeleton' | 'organ' | 'vessel' | 'nerve';
export type LayerOpacity = Record<LayerKey, number>;
/** 由外而內的剝離順序 */
export const PEEL_ORDER: LayerKey[] = ['skin', 'muscle', 'skeleton', 'organ', 'vessel', 'nerve'];
export const DEFAULT_OPACITY: LayerOpacity = { skin: 0.14, muscle: 0, skeleton: 0.3, organ: 1, vessel: 1, nerve: 0 };

export interface Snapshot { id: string; label: string; dataUrl: string }

const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2, 10);

export function newConsult(): Consult {
  return {
    id: uid(), caseCode: '', date: today(), managerName: '',
    consent: { education: false, localStorage: false, thirdPartyAI: false },
    ageRange: '', sex: '', symptoms: {}, lifestyle: [], lifestyleNote: '', redFlags: {},
    historyTags: [], history: '', medications: '',
    review: { excluded: [], note: '', reviewer: '', checks: [false, false, false] },
    audit: [{ at: now(), action: '建立諮詢' }], updatedAt: now(),
  };
}

interface State {
  consults: Record<string, Consult>;
  currentId: string;
  step: Step;
  mode: Mode;
  /** 自由探索要開啟的主題故事 */
  storyTopic: string | null;
  reduceMotion: boolean;
  /* 3D 檢視狀態（不持久化） */
  focusOrgans: string[] | null; // 鏡頭要框住的器官（主題故事用）
  flows: Flow[] | null; // 3D 中流動光點的訊號路徑（示意）
  autoRotate: boolean;
  selectedOrgan: string | null;
  selectedPart: string | null; // 模型部位 id（FMA 編號）
  hidden: string[]; // 被隱藏的部位 id
  spotlight: string[] | null; // 主題教學時暫時標示的器官
  opacity: LayerOpacity;
  peel: number | null; // 分層滑桿位置；個別調整圖層後為 null
  snapshots: Snapshot[];
  capture: (() => string | null) | null;

  setStep(s: Step): void;
  setMode(m: Mode, storyTopic?: string | null): void;
  setStory(v: { spotlight?: string[] | null; focus?: string[] | null; flows?: Flow[] | null }): void;
  setReduceMotion(v: boolean): void;
  setAutoRotate(v: boolean): void;
  update(fn: (c: Consult) => void, auditAction?: string): void;
  toggleSymptom(id: string): void;
  setSymptomDetail(id: string, patch: Partial<SymptomDetail>): void;
  setFollowup(id: string, fid: string, v: Tri): void;
  toggleLifestyle(id: string): void;
  setRedFlag(id: string, v: Tri): void;
  approve(): void;
  revoke(): void;
  log(action: string): void;
  startNew(): void;
  load(id: string): void;
  remove(id: string): void;
  removeAll(): void;
  selectOrgan(id: string | null): void;
  selectPart(partId: string, organId: string | null): void;
  hideSelected(): void;
  showAll(): void;
  setPeel(v: number): void;
  setLayerOpacity(k: LayerKey, v: number): void;
  resetView(): void;
  setSpotlight(ids: string[] | null): void;
  addSnapshot(label: string): boolean;
  removeSnapshot(id: string): void;
}

const first = newConsult();

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      consults: { [first.id]: first },
      currentId: first.id,
      step: 'setup',
      mode: 'home',
      storyTopic: null,
      reduceMotion: typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
      focusOrgans: null,
      flows: null,
      autoRotate: true,
      selectedOrgan: null,
      spotlight: null,
      selectedPart: null,
      hidden: [],
      opacity: DEFAULT_OPACITY,
      peel: null,
      snapshots: [],
      capture: null,

      setStep: (step) => set({ step }),
      setMode: (mode, storyTopic = null) => set({
        mode, storyTopic, selectedOrgan: null, selectedPart: null, spotlight: null, focusOrgans: null, flows: null,
        autoRotate: mode === 'home', hidden: [], opacity: DEFAULT_OPACITY, peel: null,
      }),
      setStory: (v) => set((s) => ({
        spotlight: v.spotlight !== undefined ? v.spotlight : s.spotlight,
        focusOrgans: v.focus !== undefined ? v.focus : s.focusOrgans,
        flows: v.flows !== undefined ? v.flows : s.flows,
        selectedOrgan: v.focus !== undefined ? null : s.selectedOrgan,
        selectedPart: v.focus !== undefined ? null : s.selectedPart,
      })),
      setReduceMotion: (reduceMotion) => set({ reduceMotion, autoRotate: reduceMotion ? false : get().autoRotate }),
      setAutoRotate: (autoRotate) => set({ autoRotate }),
      update: (fn, auditAction) =>
        set((s) => {
          const c: Consult = structuredClone(s.consults[s.currentId]);
          fn(c);
          c.updatedAt = now();
          if (auditAction) c.audit.push({ at: now(), action: auditAction });
          return { consults: { ...s.consults, [c.id]: c } };
        }),
      toggleSymptom: (id) => get().update((c) => { if (c.symptoms[id]) delete c.symptoms[id]; else c.symptoms[id] = { followups: {} }; }),
      setSymptomDetail: (id, patch) => get().update((c) => { if (c.symptoms[id]) Object.assign(c.symptoms[id], patch); }),
      setFollowup: (id, fid, v) => get().update((c) => { if (c.symptoms[id]) c.symptoms[id].followups[fid] = v; }),
      toggleLifestyle: (id) => get().update((c) => { c.lifestyle = c.lifestyle.includes(id) ? c.lifestyle.filter((x) => x !== id) : [...c.lifestyle, id]; }),
      setRedFlag: (id, v) => get().update((c) => { c.redFlags[id] = v; }),
      approve: () => get().update((c) => { c.review.approvedAt = now(); c.review.approvedHash = consultHash(c); }, `健康管理師審核通過（${get().consults[get().currentId].review.reviewer}）`),
      revoke: () => get().update((c) => { delete c.review.approvedAt; delete c.review.approvedHash; }, '撤回審核'),
      log: (action) => get().update(() => {}, action),
      startNew: () => { const c = newConsult(); set((s) => ({ consults: { ...s.consults, [c.id]: c }, currentId: c.id, step: 'setup', snapshots: [], selectedOrgan: null, selectedPart: null, hidden: [], spotlight: null })); },
      load: (id) => set({ currentId: id, step: 'work', snapshots: [], selectedOrgan: null, selectedPart: null, hidden: [], spotlight: null }),
      remove: (id) => set((s) => {
        const consults = { ...s.consults };
        delete consults[id];
        if (id !== s.currentId) return { consults };
        const c = newConsult();
        return { consults: { ...consults, [c.id]: c }, currentId: c.id, step: 'setup', snapshots: [] };
      }),
      removeAll: () => { const c = newConsult(); set({ consults: { [c.id]: c }, currentId: c.id, step: 'setup', snapshots: [] }); },
      // 選取器官時自動調整圖層，讓它不被外層遮住
      selectOrgan: (id) => set((s) => {
        if (!id) return { selectedOrgan: null, selectedPart: null };
        // 選取時停止自動旋轉
        const layer = ORGAN_MAP[id].layer as LayerKey;
        const op = { ...s.opacity };
        if (layer !== 'skin') op.skin = Math.min(op.skin, 0.14);
        if (layer !== 'skin' && layer !== 'muscle') { op.muscle = Math.min(op.muscle, 0); op.skeleton = Math.min(op.skeleton, 0.3); }
        if (layer !== 'organ') op[layer] = Math.max(op[layer], layer === 'skin' ? 0.9 : 1);
        return { selectedOrgan: id, selectedPart: null, opacity: op, peel: null, autoRotate: false };
      }),
      selectPart: (selectedPart, selectedOrgan) => set({ selectedPart, selectedOrgan, autoRotate: false }),
      hideSelected: () => set((s) => (s.selectedPart ? { hidden: [...s.hidden, s.selectedPart], selectedPart: null, selectedOrgan: null } : {})),
      showAll: () => set({ hidden: [] }),
      setPeel: (peel) => set({ peel, opacity: Object.fromEntries(PEEL_ORDER.map((k, i) => [k, Math.min(1, Math.max(0, i + 1 - peel))])) as LayerOpacity }),
      setLayerOpacity: (k, v) => set((s) => ({ peel: null, opacity: { ...s.opacity, [k]: v } })),
      resetView: () => set({ opacity: DEFAULT_OPACITY, peel: null, hidden: [], selectedOrgan: null, selectedPart: null }),
      setSpotlight: (spotlight) => set((s) => ({ spotlight, opacity: spotlight?.includes('muscles') && s.opacity.muscle < 0.2 ? { ...s.opacity, muscle: 0.22 } : s.opacity })),
      addSnapshot: (label) => {
        const url = get().capture?.();
        if (!url) return false;
        set((s) => ({ snapshots: [...s.snapshots, { id: uid(), label, dataUrl: url }].slice(-4) }));
        return true;
      },
      removeSnapshot: (id) => set((s) => ({ snapshots: s.snapshots.filter((x) => x.id !== id) })),
    }),
    {
      name: 'health-explorer-v1',
      // 只保存問卷與審核紀錄；3D 截圖不寫入儲存空間
      // 個案未同意本機儲存時，該筆諮詢只留在記憶體，關閉分頁即消失
      partialize: (s) => ({
        consults: Object.fromEntries(Object.entries(s.consults).filter(([, c]) => c.consent.localStorage)),
        currentId: s.currentId,
        step: s.step,
        reduceMotion: s.reduceMotion,
        // 諮詢進行中重新整理時留在諮詢流程；其他情況回到首頁
        mode: s.mode === 'consult' ? 'consult' : 'home',
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        const consults = { ...(p.consults ?? {}) };
        const rm = p.reduceMotion ?? current.reduceMotion;
        if (p.currentId && consults[p.currentId]) return { ...current, consults, currentId: p.currentId, step: p.step ?? 'setup', reduceMotion: rm, mode: p.mode ?? 'home', autoRotate: (p.mode ?? 'home') === 'home' };
        return { ...current, consults: { ...consults, ...current.consults }, step: 'setup', reduceMotion: rm };
      },
    },
  ),
);

export const useConsult = () => useStore((s) => s.consults[s.currentId]);

export function isApproved(c: Consult): boolean {
  return !!c.review.approvedAt && c.review.approvedHash === consultHash(c);
}
