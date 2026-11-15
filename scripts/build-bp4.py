#!/usr/bin/env python3
"""
從 BodyParts3D 4.0（partof_BP3D_4.0_obj_99.zip）補上 3.0 版沒有的構造：
  - 四肢動脈與部分淺層靜脈（bp4-vessel.glb）
  - 眼球細部與淚液系統：角膜、虹膜、水晶體、鞏膜、玻璃體、眼瞼瞼板、淚腺、淚小管、淚囊、鼻淚管（bp4-eye.glb）

來源：https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html
授權：官方授權頁（2025-02-27 更新）為 CC BY 4.0；4.0 版檔案標頭仍載明 CC BY-SA 2.1 JP。
      本專案同時遵守兩者：標示 BodyParts3D，且衍生模型檔以相同條款釋出。
用法：python3 scripts/build-bp4.py <解壓後的 partof_BP3D_4.0_obj_99 目錄> <3.0 版 manifest.json> <輸出暫存目錄>
座標：4.0 與 3.0 為同一人體座標系，誤差 1–2 公分；眼部構造以兩眼整體中心對齊 3.0 版眼球。
"""
import glob, json, os, re, sys
import numpy as np
import trimesh, fast_simplification

SRC, MANIFEST, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(OUT, exist_ok=True)
v3 = {m['en']: m for m in json.load(open(MANIFEST))}

def header(f):
    h = open(f, errors='replace').read(1500)
    return re.search(r'English name : (.*)', h).group(1).strip()

def to_app(v):
    return np.column_stack([v[:, 0], v[:, 2], -v[:, 1] - 100.0]) / 1000.0

VESSEL = re.compile(r'arter|vein|arch', re.I)
EYE = re.compile(r'cornea|iris|^(left|right) lens$|sclera|vitreous|tarsal plate|lacrimal (gland|canaliculus|sac|lake)|nasolacrimal|anterior chamber', re.I)
BUDGET = {'vessel': 40_000, 'eye': 16_000}

groups = {'vessel': [], 'eye': []}
for f in sorted(glob.glob(f'{SRC}/*.obj')):
    n = header(f)
    m = trimesh.load(f, process=True)
    v = to_app(np.asarray(m.vertices))
    c = (v.min(0) + v.max(0)) / 2
    if VESSEL.search(n) and (abs(c[0]) > 0.16 or c[1] < 0.78):
        groups['vessel'].append((n, v, np.asarray(m.faces)))
    elif EYE.search(n):
        groups['eye'].append((n, v, np.asarray(m.faces)))

def split_right(v, f):
    """4.0 版部分「Right …」眼部檔案同時包含兩眼；只保留身體右側（本模型為 -x）的面。"""
    if v[:, 0].max() - v[:, 0].min() < 0.05: return v, f
    keep = v[f].mean(axis=1)[:, 0] < 0
    f = f[keep]
    used = np.unique(f); remap = -np.ones(len(v), int); remap[used] = np.arange(len(used))
    return v[used], remap[f]

def eye_offset(items):
    """3.0 版兩眼是同一個 eyeball 網格；以 4.0 版兩眼的整體中心對齊它。"""
    sc = [v for n, v, _ in items if n.lower() in ('left sclera', 'right sclera')]
    eyes = [m for m in json.load(open(MANIFEST)) if m['en'] == 'eyeball']
    if not sc or not eyes: return np.zeros(3)
    allv = np.vstack(sc)
    return np.array(eyes[0]['c']) - (allv.min(0) + allv.max(0)) / 2

off = eye_offset(groups['eye'])
groups['eye'] = [(n, *split_right(v, f)) if n.lower().startswith('right') else (n, v, f) for n, v, f in groups['eye']]
print('eye offset (m):', off.round(4).tolist())

manifest = []
for key, items in groups.items():
    total = sum(len(f) for _, _, f in items)
    ratio = min(1.0, BUDGET[key] / max(1, total))
    scene, kept, used = trimesh.Scene(), 0, {}
    for n, v, f in items:
        if key == 'eye':
            v = v + off
        target = max(min(len(f), 150), int(len(f) * ratio))
        if target < len(f):
            v, f = fast_simplification.simplify(v.astype(np.float32), f, target_count=target, agg=7)
        k = used.get(n, 0); used[n] = k + 1
        pid = 'BP4-' + re.sub(r'[^A-Za-z0-9]+', '-', n).strip('-') + (f'-{k}' if k else '')
        scene.add_geometry(trimesh.Trimesh(v, f, process=False), node_name=pid, geom_name=pid)
        lo, hi = np.min(v, 0), np.max(v, 0)
        manifest.append({'id': pid, 'en': n[0].lower() + n[1:], 'layer': 'vessel' if key == 'vessel' else 'organ',
                         'organ': 'vessels' if key == 'vessel' else 'eyes',
                         'c': [round(float(x), 4) for x in (lo + hi) / 2], 'r': round(float(np.linalg.norm(hi - lo) / 2), 4), 'src': 'bp4'})
        kept += len(f)
    scene.export(f'{OUT}/bp4-{key}.glb')
    print(f'bp4-{key}: {len(items)} parts, {kept} tris')
json.dump(manifest, open(f'{OUT}/bp4-manifest.json', 'w'), ensure_ascii=False, separators=(',', ':'))
