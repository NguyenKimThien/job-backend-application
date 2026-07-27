import {
  BACKEND_API_URL,
  getApiMessage,
  getAuthHeaders,
} from "./backend-api";

export async function portalFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${BACKEND_API_URL}${path}`, {
    ...init,
    headers: {
      ...getAuthHeaders(),
      ...(init.headers ?? {}),
    },
    cache: init.cache ?? "no-store",
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(getApiMessage(payload, "Không thể tải dữ liệu."));
  }
  return payload.data as T;
}

export type ApiJob = {
  id: number;
  title: string;
  companyId: number;
  company: string;
  companyLogo?: string | null;
  location: string;
  category: string;
  categoryId: number;
  salaryFrom?: string | number | null;
  salaryTo?: string | number | null;
  negotiable: boolean;
  experience?: string | number | null;
  type: string;
  description: string;
  requirements: string;
  benefits?: string | null;
  deadline: string;
  status: string;
  displayStatus: string;
  rejectionReason?: string | null;
  postedAt: string;
  skills: string[];
  applicantCount?: number;
  employer?: Record<string, unknown>;
};

const workTypeLabels: Record<string, string> = {
  TOAN_THOI_GIAN: "Toàn thời gian",
  BAN_THOI_GIAN: "Bán thời gian",
  THUC_TAP: "Thực tập",
  THOI_VU: "Thời vụ",
  TU_XA: "Từ xa",
};

export function salaryLabel(job: ApiJob) {
  if (job.negotiable) return "Thỏa thuận";
  const from = Number(job.salaryFrom ?? 0) / 1_000_000;
  const to = Number(job.salaryTo ?? 0) / 1_000_000;
  if (from && to) return `${from} - ${to} triệu`;
  if (from) return `Từ ${from} triệu`;
  if (to) return `Đến ${to} triệu`;
  return "Thỏa thuận";
}

export function jobTypeLabel(type: string) {
  return workTypeLabels[type] ?? type;
}
