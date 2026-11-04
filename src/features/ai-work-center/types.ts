export type ResearchTaskStatus = "queued" | "running" | "succeeded" | "partial" | "failed" | "cancelled";
export type ResearchTaskType = "google_trends" | "keyword_research";
export type ResearchTask = {
  id: string;
  organization_id: string;
  created_by: string;
  actor_id: string;
  actor_run_id: string | null;
  dataset_id: string | null;
  status: ResearchTaskStatus;
  task_type: ResearchTaskType;
  title: string;
  input_snapshot: Record<string, any>;
  raw_items?: any[];
  kv_records?: any[];
  key_value_store_id?: string | null;
  result_count: number;
  actor_meta: Record<string, any>;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  deleted_at: string | null;
  tags: string[];
};
export type ResearchTaskExecution = {
  id: string;
  task_id: string;
  organization_id: string;
  created_by: string;
  attempt_number: number;
  actor_id: string;
  actor_run_id: string | null;
  status: ResearchTaskStatus;
  input_snapshot: Record<string, any>;
  dataset_id: string | null;
  key_value_store_id: string | null;
  raw_items: any[];
  kv_records: any[];
  result_count: number;
  actor_meta: Record<string, any>;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};
export const taskStatusLabel: Record<ResearchTaskStatus, string> = {
  queued: "排队中",
  running: "运行中",
  succeeded: "已完成",
  partial: "部分完成",
  failed: "失败",
  cancelled: "已取消"
};
export const taskTypeLabel: Record<ResearchTaskType, string> = {
  google_trends: "市场趋势",
  keyword_research: "关键词研究"
};
