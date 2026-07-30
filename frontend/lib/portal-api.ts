import {
  BACKEND_API_URL,
  getApiMessage,
  getAuthHeaders,
  handleUnauthorizedResponse,
} from './backend-api';

export async function portalFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  let response: Response;
  const isFormData =
    typeof FormData !== 'undefined' && init.body instanceof FormData;

  try {
    response = await fetch(`${BACKEND_API_URL}${path}`, {
      ...init,
      headers: {
        ...getAuthHeaders({ json: !isFormData }),
        ...(init.headers ?? {}),
      },
      cache: init.cache ?? 'no-store',
    });
  } catch {
    throw new Error(
      'Không thể kết nối đến backend. Vui lòng kiểm tra máy chủ API đang chạy ở http://localhost:3001.',
    );
  }

  handleUnauthorizedResponse(response);

  const payload = (await response.json()) as ApiResponsePayload<T>;
  if (!response.ok) {
    throw new Error(getApiMessage(payload, 'Không thể tải dữ liệu.'));
  }
  return payload.data as T;
}

export async function portalFetchBlob(
  path: string,
  init: RequestInit = {},
): Promise<{ blob: Blob; fileName: string | null }> {
  let response: Response;

  try {
    response = await fetch(`${BACKEND_API_URL}${path}`, {
      ...init,
      headers: {
        ...getAuthHeaders({ json: false }),
        ...(init.headers ?? {}),
      },
      cache: init.cache ?? 'no-store',
    });
  } catch {
    throw new Error(
      'Không thể kết nối đến backend. Vui lòng kiểm tra máy chủ API đang chạy ở http://localhost:3001.',
    );
  }

  handleUnauthorizedResponse(response);

  if (!response.ok) {
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      // Keep the domain-level fallback below when the response is not JSON.
    }
    throw new Error(getApiMessage(payload, 'Không thể tải file CV.'));
  }

  return {
    blob: await response.blob(),
    fileName: fileNameFromContentDisposition(
      response.headers.get('Content-Disposition'),
    ),
  };
}

type ApiResponsePayload<T> = {
  data?: T;
  code?: string;
  message?: string | string[];
  error?: { code?: string; message?: string | string[] };
};

function fileNameFromContentDisposition(value: string | null) {
  if (!value) return null;
  const encoded = value.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded);
    } catch {
      return encoded;
    }
  }
  return value.match(/filename="([^"]+)"/i)?.[1] ?? null;
}

export type ApiEmployerSummary = {
  id?: number;
  tenDonVi?: string | null;
  linhVuc?: { tenLinhVuc?: string | null } | null;
  diaChiTruSo?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  moTaDonVi?: string | null;
  trangThaiDuyet?: string | null;
  _count?: { tinTuyenDungs?: number };
};

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
  requiredEducation?: string | null;
  quantity?: number;
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
  editCount?: number;
  employer?: ApiEmployerSummary;
};

const workTypeLabels: Record<string, string> = {
  TOAN_THOI_GIAN: 'Toàn thời gian',
  BAN_THOI_GIAN: 'Bán thời gian',
  THUC_TAP: 'Thực tập',
  THOI_VU: 'Thời vụ',
  TU_XA: 'Từ xa',
};

export function salaryLabel(job: ApiJob) {
  if (job.negotiable) return 'Thỏa thuận';
  const from = Number(job.salaryFrom ?? 0) / 1_000_000;
  const to = Number(job.salaryTo ?? 0) / 1_000_000;
  if (from && to) return `${formatMillion(from)}–${formatMillion(to)} triệu`;
  if (from) return `Từ ${formatMillion(from)} triệu`;
  if (to) return `Đến ${formatMillion(to)} triệu`;
  return 'Thỏa thuận';
}

export function jobTypeLabel(type: string) {
  return workTypeLabels[type] ?? type;
}

function formatMillion(value: number) {
  return Number.isInteger(value)
    ? value.toLocaleString('vi-VN')
    : value.toLocaleString('vi-VN', { maximumFractionDigits: 1 });
}
