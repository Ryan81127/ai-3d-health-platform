#!/usr/bin/env python3
"""
從 Z-Anatomy（FBX，CC BY-SA 4.0）擷取 BodyParts3D 沒有的構造：
  - 周邊神經與脊髓（za-nerve.glb）
  - 甲狀腺、副甲狀腺、舌（za-organ.glb）

來源：https://github.com/LluisV/Z-Anatomy/tree/PC-Version/Resources/Models/FBX
授權：Z-Anatomy CC BY-SA 4.0；其中源自 BodyParts3D 的部分另需標示 BodyParts3D。
排除（授權限制或未載明）：內耳／耳蝸（CC BY-NC-SA 4.0）、腎臟（CC BY-NC 4.0）、
  大腦皮質與白質（Brainder／White matter，授權未載明）、腦神經（另有 CC BY 4.0 標示要求，暫不納入）。

用法：
  assimp export NervousSystem100.fbx /tmp/za_NervousSystem100.glb -f glb2
  assimp export VisceralSystem100.fbx /tmp/za_VisceralSystem100.glb -f glb2
  python3 scripts/build-za.py /tmp <輸出暫存目錄>
座標：Z-Anatomy 為公分、Y 軸朝上；以六個器官中心點對齊本專案座標（公尺），誤差約 1 公分。
"""
import json, re, sys, os
import numpy as np
import trimesh, fast_simplification

SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
SCALE, OFFSET = 0.009857354, np.array([-0.0037117, -0.0344484, -0.0002117])

EXCLUDE = re.compile(r'\.j$|cochle|ear\b|ear\'|tympan|semicircular|vestibul|kidney|\(I+V?X?I*\)|\((?:V|VI|VII|VIII|IX|X|XI|XII)\)|nucleus|gyrus|sulcus|lobule|tract|fasciculus|funiculus|commissure|cortex|ventricle|cerebell|lingual nerve|trigeminal|facial|optic|olfact|oculomotor|trochlear|abducens|vagus|glossopharyng|accessory nerve|hypoglossal|mandibular|maxillary|ophthalmic|ciliary|lacrimal|nasociliary|frontal nerve|choroid|pyramid|pyramis|buccal|alveolar|mental nerve|mylohyoid|horn of spinal', re.I)
NERVE = re.compile(r'nerve|plexus|spinal cord|rami|ramus|ganglion|cauda equina', re.I)
ORGAN = {'Thyroid gland': 'thyroid', 'Superior parathyroid gland': 'thyroid', 'Inferior parathyroid gland': 'thyroid', 'Tongue': 'mouth'}
BUDGET = {'nerve': 60_000, 'organ': 8_000}

def load(name):
    sc = trimesh.load(f'{SRC}/za_{name}.glb', force='scene')
    for node in sc.graph.nodes_geometry:
        T, g = sc.graph[node]
        yield node, sc.geometry[g], T

def clean(n):
    return re.sub(r'(_[0-9a-f]{6}|\.\d+)$', '', n).strip()

picked = {'nerve': [], 'organ': []}
for node, m, T in load('NervousSystem100'):
    n = clean(node)
    if NERVE.search(n) and not EXCLUDE.search(n) and len(m.faces) > 20:
        picked['nerve'].append((n, m, T, 'nerves'))
for node, m, T in load('VisceralSystem100'):
    n = clean(node)
    if n in ORGAN:
        picked['organ'].append((n, m, T, ORGAN[n]))

manifest = []
for layer, items in picked.items():
    total = sum(len(m.faces) for _, m, _, _ in items)
    ratio = min(1.0, BUDGET[layer] / max(1, total))
    scene, used, kept = trimesh.Scene(), {}, 0
    for n, m, T, organ in items:
        v = trimesh.transform_points(m.vertices, T) * SCALE + OFFSET
        f = np.asarray(m.faces)
        target = max(min(len(f), 120), int(len(f) * ratio))
        if target < len(f):
            v, f = fast_simplification.simplify(v.astype(np.float32), f, target_count=target, agg=7)
        k = used.get(n, 0); used[n] = k + 1
        pid = 'ZA-' + re.sub(r'[^A-Za-z0-9]+', '-', n).strip('-') + (f'-{k}' if k else '')
        scene.add_geometry(trimesh.Trimesh(v, f, process=False), node_name=pid, geom_name=pid)
        lo, hi = np.min(v, 0), np.max(v, 0)
        manifest.append({'id': pid, 'en': n, 'layer': layer, 'organ': organ, 'c': [round(float(x), 4) for x in (lo + hi) / 2],
                         'r': round(float(np.linalg.norm(hi - lo) / 2), 4), 'src': 'za'})
        kept += len(f)
    scene.export(f'{OUT}/za-{layer}.glb')
    print(f'za-{layer}: {len(items)} meshes, {kept} tris')
json.dump(manifest, open(f'{OUT}/za-manifest.json', 'w'), ensure_ascii=False, separators=(',', ':'))
