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
  label: 'BodyParts3D 解剖模型（成年男性）',
  credit: 'BodyParts3D, © The Database Center for Life Science, CC BY-SA 2.1 Japan',
  limits: '資料集只有男性模型，僅含軀幹主要血管；不含四肢血管、周邊神經、甲狀腺與舌。甲狀腺與神經走向以示意幾何補上。',
};

/** 女性解剖模型：資料集未提供 */
export const FEMALE_MODEL_AVAILABLE = false;
