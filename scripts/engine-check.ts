/** 規則引擎與知識庫的一致性檢查：npm test */
import assert from 'node:assert/strict';
import { CATEGORIES } from '../src/data/symptoms';
import { LIFESTYLE, MECHANISMS, RED_FLAGS } from '../src/data/knowledge';
import { NUTRIENT_MAP, NUTRIENTS } from '../src/data/nutrients';
import { ORGAN_MAP } from '../src/data/organs';
import { REF_MAP } from '../src/data/references';
import { TOPICS } from '../src/data/topics';
import { DISEASES } from '../src/data/diseases';
import { CATEGORIES as DISEASE_CATEGORIES } from '../src/data/categories';
import { reviewStatus } from '../src/data/reviewers';
import { GUIDELINE_MAP } from '../src/data/guidelines';
import manifest from '../src/data/modelManifest.json';
import { analyzeRules, consultHash } from '../src/engine/ruleEngine';
import { remoteAIProvider } from '../src/engine/provider';
import type { Consult } from '../src/types';

const mech = new Set(MECHANISMS.map((m) => m.id));
const life = new Set(LIFESTYLE.map((l) => l.id));
const ref = (ids: string[], where: string) => ids.forEach((r) => assert(REF_MAP[r], `未知的參考來源 ${r}（${where}）`));

for (const c of CATEGORIES) for (const s of c.symptoms) {
  s.organs.forEach((o) => assert(ORGAN_MAP[o], `${s.id} 未知器官 ${o}`));
  s.mech.forEach((m) => assert(mech.has(m), `${s.id} 未知機制 ${m}`));
  s.nutrients.forEach((n) => assert(NUTRIENT_MAP[n], `${s.id} 未知營養素 ${n}`));
}
MECHANISMS.forEach((m) => { ref(m.refs, m.id); m.lifestyle.forEach((l) => assert(life.has(l), `${m.id} 未知生活因素 ${l}`)); });
LIFESTYLE.forEach((l) => ref(l.advice.refs, l.id));
RED_FLAGS.forEach((r) => { ref(r.refs, r.id); r.organs.forEach((o) => assert(ORGAN_MAP[o], `${r.id} 未知器官 ${o}`)); });
NUTRIENTS.forEach((n) => { ref(n.refs, n.id); n.organs.forEach((o) => assert(ORGAN_MAP[o], `${n.id} 未知器官 ${o}`)); });
TOPICS.forEach((t) => {
  t.steps.forEach((s) => {
    ref(s.refs, t.id);
    s.organs.forEach((o) => assert(ORGAN_MAP[o], `${t.id} 未知器官 ${o}`));
    s.flow?.forEach(([a, b]) => assert(ORGAN_MAP[a]?.layer === 'organ' && ORGAN_MAP[b]?.layer === 'organ', `${t.id} 訊號路徑只能連接器官：${a}→${b}`));
  });
  t.quiz.forEach((q) => { ref(q.refs, t.id); assert(q.answer >= 0 && q.answer < q.options.length, `${t.id} 測驗答案超出選項：${q.q}`); });
  if (t.ready) assert(t.steps.length && t.quiz.length, `${t.id} 已標示完成但缺少步驟或測驗`);
});

const base = (): Consult => ({
  id: 't', caseCode: 'T-1', date: '2026-01-01', managerName: '', consent: { education: true, localStorage: false, thirdPartyAI: false },
  ageRange: '', sex: '', symptoms: {}, lifestyle: [], lifestyleNote: '', redFlags: {}, historyTags: [], history: '', medications: '',
  review: { excluded: [], note: '', reviewer: '', checks: [false, false, false] }, audit: [], updatedAt: '',
});

// 疾病模組：來源必須在指引登錄表內；未審閱前必須標示待醫學審閱
for (const d of DISEASES) {
  d.organs.forEach((o) => assert(ORGAN_MAP[o], `${d.id} 未知器官 ${o}`));
  assert(DISEASE_CATEGORIES.some((c) => c.diseases.some((x) => x.id === d.id)), `${d.id} 沒有放進任何疾病分類`);
  assert(d.review.roles.length > 0, `${d.id} 缺少審閱角色`);
  for (const r of d.review.roles) for (const x of r.records) {
    assert(x.name && x.credentials && x.scope, `${d.id} 審閱紀錄缺少姓名、證照或範圍`);
    assert(/^\d{4}-\d{2}-\d{2}$/.test(x.reviewedAt), `${d.id} 審閱日期格式錯誤：${x.reviewedAt}`);
  }
  assert(d.animPlan.length > 0, `${d.id} 缺少動畫規劃`);
  assert(['待醫學審閱', '已審閱'].includes(reviewStatus(d.review)), `${d.id} 審閱狀態異常`);
  for (const s of d.sections) for (const c of s.claims) {
    c.src.forEach((x) => assert(GUIDELINE_MAP[x.g], `${d.id} 未知指引 ${x.g}`));
    if (c.check !== 'general') assert(c.src.length > 0, `${d.id}「${c.text.slice(0, 20)}」標示已核對但沒有來源`);
  }
  assert(d.sections.some((s) => s.key === 'redflags'), `${d.id} 缺少就醫警訊`);
}
// 疾病分類：同一分類內不可重複
for (const c of DISEASE_CATEGORIES) assert(new Set(c.diseases.map((x) => x.id)).size === c.diseases.length, `${c.id} 有重複的疾病`);

// 3D 模型部位：對應的器官必須存在，id 不可重複
const ids = new Set<string>();
for (const p of manifest as { id: string; organ: string | null }[]) {
  assert(!ids.has(p.id), `模型部位 id 重複：${p.id}`); ids.add(p.id);
  if (p.organ) assert(ORGAN_MAP[p.organ], `模型部位 ${p.id} 對應未知器官 ${p.organ}`);
}

// 空問卷
assert(analyzeRules(base()).empty);

// 緊急警訊必須出現在 emergency
const e = base(); e.redFlags.rf_chest = 'yes';
assert.equal(analyzeRules(e).emergency.length, 1);
const f = base(); f.symptoms.chest_pain = { followups: { acute: 'yes' } };
assert(analyzeRules(f).emergency.some((x) => x.id === 'fu_chest_pain_acute'));

// 一般情境
const c = base();
c.symptoms.eye_dry = { followups: {}, severity: 8 };
c.symptoms.thirst = { followups: {} };
c.lifestyle = ['lateNight', 'screen'];
const a = analyzeRules(c);
assert(!a.empty && a.emergency.length === 0);
assert(a.organs.some((o) => o.organId === 'eyes') && a.organs.some((o) => o.organId === 'pancreas'));
assert(a.mechanisms.find((m) => m.id === 'mech_tearfilm')!.text.includes('長時間使用 3C'));
assert(a.medical.find((m) => m.id === 'med_eye_dry')!.text.includes('困擾程度高'));
assert(a.lifestyle.some((l) => l.id === 'life_lateNight'));
assert(a.questions.some((q) => q.id === 'q_redflags'));
// 不得出現確診或判定缺乏的措辭
const all = JSON.stringify(a);
for (const banned of ['確診', '你缺乏', '個案缺乏維生素', '已受損，', '罹患了']) assert(!all.includes(banned), `分析結果出現禁用措辭：${banned}`);

// 審核雜湊會隨內容改變
const h1 = consultHash(c); c.symptoms.cough = { followups: {} };
assert.notEqual(h1, consultHash(c));

// AI 介面未實作時必須明確拒絕，且未同意時不得送出
assert.equal(remoteAIProvider.available, false);
await assert.rejects(() => remoteAIProvider.analyze(base()), /未同意/);

console.log('engine-check：全部通過');
