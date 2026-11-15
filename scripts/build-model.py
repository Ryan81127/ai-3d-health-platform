#!/usr/bin/env python3
"""
把 BodyParts3D（v3.0，STL）轉成網頁用的分層 GLB 與部位清單。

來源：BodyParts3D, (c) The Database Center for Life Science, CC BY-SA 2.1 Japan
      https://github.com/Kevin-Mattheus-Moerman/BodyParts3D （STL 轉檔版）

用法：
  pip install trimesh fast-simplification embreex
  python3 scripts/build-model.py <BodyParts3D_data 目錄> <輸出暫存目錄> [只重建的圖層,以逗號分隔]
  再用 gltf-transform meshopt 壓縮（見 README）。

座標：來源為毫米、Z 軸朝上、-Y 為身體正面；輸出為公尺、Y 軸朝上、+Z 為正面、腳底在 y=0。
"""
import json, os, re, sys
import numpy as np
import trimesh
import fast_simplification

SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
names = dict(l.split('\t')[:2] for l in open(f'{SRC}/parts_list_e.txt', encoding='utf-8').read().splitlines()[1:])

BUDGET = {'skin': 70_000, 'muscle': 280_000, 'skeleton': 230_000, 'organ': 240_000, 'vessel': 70_000, 'nerve': 6_000}
MIN_TRIS = 300

BRAIN = r'gyr[ui]s?|occipital lobe|cerebellum|pons|medulla|midbrain|thalamus|colliculus|lateral ventricle|third ventricle|fourth ventricle|corpus callosum|fornix|commissure|internal capsule|nucleus|putamen|pallidus|amygdala|hippocampus|insula|habenula|geniculate|mammillary|pineal|pituitary|choroid plexus|aqueduct|septum pellucidum|stria |tuber cinereum|lamina terminalis|interpeduncular|interventricular foramen|white matter|peduncle|optic chiasm|optic tract|lobule'
BONE = r'bone|vertebra|\brib$|costal cartilage|sternum|manubrium|xiphoid|phalanx|mandible|maxilla|ethmoid|vomer|^atlas$|^axis$|sacrum|femur|^tibia$|^fibula$|humerus|^radius$|^ulna$|clavicle|scapula|patella|calcaneus|^talus$|capitate|hamate|lunate|pisiform|scaphoid|trapezium|trapezoid|triquetral|nasal concha|intervertebral disk'

def classify(full):
    n = re.sub(r'^(left|right) ', '', full)
    if n == 'skin' or 'hairs' in n or 'eyebrows' in n or n == 'ear': return 'skin', 'skin'
    if 'tooth' in n or 'gingiva' in n or 'labial part of mouth' in n: return 'organ', 'mouth'
    if 'optic nerve' in n or 'spinal cord' in n: return 'nerve', 'nerves'
    if re.search(r'wall of heart|valve|papillary muscle', n): return 'organ', 'heart'
    if re.search(r'artery|vein|aorta|vena cava|coronary sinus', n): return 'vessel', 'vessels'
    if re.search(BRAIN, n): return 'organ', 'brain'
    if 'eyeball' in n: return 'organ', 'eyes'
    if 'lung' in n: return 'organ', 'lungs'
    if re.search(r'trachea|bronchus|thyroid cartilage|nasal cartilages', n): return 'organ', 'airway'
    if n == 'liver': return 'organ', 'liver'
    if n in ('stomach', 'esophagus'): return 'organ', 'stomach'
    if 'pancrea' in n: return 'organ', 'pancreas'
    if n == 'kidney': return 'organ', 'kidneys'
    if re.search(r'duodenum|jejunum|ileum|colon|rectum|appendix|taenia', n): return 'organ', 'intestines'
    if re.search(r'urinary bladder|urethra|ureter', n): return 'organ', 'bladder'
    if re.search(r'gallbladder|spleen|adrenal|thymus|prostate|testis|epididymis|deferent|seminal|penis', n): return 'organ', None
    if re.search(BONE, n): return 'skeleton', None
    return 'muscle', 'muscles'

_DIRS = np.array([(x, y, z) for x in (-1, 0, 1) for y in (-1, 0, 1) for z in (-1, 0, 1) if (x, y, z) != (0, 0, 0)], float)
_DIRS /= np.linalg.norm(_DIRS, axis=1)[:, None]

def outer_shell(m):
    """皮膚網格含有大量內層表面；只保留從外面看得到的面（任一方向的射線不被擋住），再往外擴一圈補洞。"""
    cent, nrm = m.triangles_center, m.face_normals
    keep = np.zeros(len(cent), bool)
    for sign in (1.0, -1.0):
        origin = cent + sign * nrm * 1.5
        for d in _DIRS:
            keep |= ~m.ray.intersects_any(origin, np.tile(d, (len(origin), 1)))
    for _ in range(2):
        used = np.zeros(len(m.vertices), bool)
        used[m.faces[keep].ravel()] = True
        keep |= used[m.faces].all(axis=1)
    out = trimesh.Trimesh(vertices=m.vertices, faces=m.faces[keep], process=False)
    out.remove_unreferenced_vertices()
    return out

def to_app(v):
    return np.column_stack([v[:, 0], v[:, 2], -v[:, 1] - 100.0]) / 1000.0

parts = []
for f in sorted(os.listdir(f'{SRC}/stl')):
    pid = f[:-4]
    layer, organ = classify(names[pid])
    parts.append({'id': pid, 'en': names[pid], 'layer': layer, 'organ': organ, 'tris': (os.path.getsize(f'{SRC}/stl/{f}') - 84) // 50})

manifest = []
ONLY = sys.argv[3].split(',') if len(sys.argv) > 3 else list(BUDGET)
for layer, budget in BUDGET.items():
    if layer not in ONLY: continue
    group = [p for p in parts if p['layer'] == layer]
    if not group: continue
    ratio = min(1.0, budget / sum(p['tris'] for p in group))
    scene = trimesh.Scene()
    total = 0
    for p in group:
        m = trimesh.load(f"{SRC}/stl/{p['id']}.stl", process=True)
        m.merge_vertices()
        if p['en'] == 'skin':
            m = outer_shell(m)
            print('skin outer shell faces:', len(m.faces), flush=True)
        target = 90_000 if p['en'] == 'skin' else int(max(min(len(m.faces), MIN_TRIS), len(m.faces) * ratio))
        v, fcs = np.asarray(m.vertices, dtype=np.float32), np.asarray(m.faces)
        if target < len(fcs):
            for _ in range(4):  # 部分網格需要多做幾輪才會降到目標面數
                before = len(fcs)
                v, fcs = fast_simplification.simplify(v, fcs, target_count=target, agg=8)
                if len(fcs) <= target * 1.15 or len(fcs) > before * 0.9: break
        v = to_app(np.asarray(v, dtype=np.float64)).astype(np.float32)
        out = trimesh.Trimesh(vertices=v, faces=fcs, process=False)
        scene.add_geometry(out, node_name=p['id'], geom_name=p['id'])
        lo, hi = v.min(0), v.max(0)
        c = (lo + hi) / 2
        manifest.append({'id': p['id'], 'en': p['en'], 'layer': layer, 'organ': p['organ'],
                         'c': [round(float(x), 4) for x in c], 'r': round(float(np.linalg.norm(hi - lo) / 2), 4)})
        total += len(fcs)
    scene.export(f'{OUT}/{layer}.glb')
    print(f'{layer}: {len(group)} parts, {total} tris (ratio {ratio:.3f})', flush=True)

if len(ONLY) == len(BUDGET):
    json.dump(manifest, open(f'{OUT}/manifest.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print('parts:', len(manifest))
