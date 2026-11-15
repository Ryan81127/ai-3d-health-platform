/**
 * 醫學審閱名單。審閱狀態由名單自動推算：每個必要角色至少要有一位審閱者，才會變成「已審閱」。
 * 不能直接把狀態改成已審閱。審閱者資料只能由健康管理平台的負責人依實際審閱紀錄填入。
 */
export interface ReviewRecord {
  name: string;        // 審閱者姓名
  credentials: string; // 執照或職稱（例：專科醫師證號後四碼、合格營養師證書號）
  reviewedAt: string;  // 審閱日期 YYYY-MM-DD
  scope: string;       // 審閱範圍（例：第 1–4 段與就醫警訊）
}

export interface ReviewRole {
  role: string;
  required: boolean;
  records: ReviewRecord[];
}

export interface ReviewState {
  guidelineVersion: string;
  changelog: { date: string; note: string }[];
  roles: ReviewRole[];
}

export type ReviewStatus = '待醫學審閱' | '已審閱';

export function reviewStatus(r: ReviewState): ReviewStatus {
  return r.roles.filter((x) => x.required).every((x) => x.records.length > 0) ? '已審閱' : '待醫學審閱';
}
