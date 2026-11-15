/**
 * 3D 模型來源。
 *
 * 目前使用 BodyParts3D v3.0（成年男性，934 個部位），經 scripts/build-model.py 減面並分層輸出為
 * public/models/*.glb，部位清單在 data/modelManifest.json。
 * 授權：BodyParts3D, (c) The Database Center for Life Science, CC BY-SA 2.1 Japan。
 *
 * 要換成其他授權模型時：輸出相同的分層 GLB（節點名稱 = 部位 id）與 manifest 即可，檢視器不需修改。
 */
export const MODEL_INFO = {
  label: 'BodyParts3D 解剖模型（成年男性）＋ Z-Anatomy 神經與甲狀腺',
  credit: 'BodyParts3D © DBCLS；Z-Anatomy CC BY-SA 4.0',
  limits: '只有成年男性模型；四肢靜脈僅有頭靜脈與貴要靜脈；神經與甲狀腺來自 Z-Anatomy，與主模型對齊誤差約 1 公分。',
};

/** 女性解剖模型：資料集未提供 */
export const FEMALE_MODEL_AVAILABLE = false;
