import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_URL = "http://127.0.0.1:3001";

export async function GET(request: NextRequest) {
  try {
    const backendUrl = new URL("/jobs", BACKEND_URL);
    request.nextUrl.searchParams.forEach((value, key) => {
      backendUrl.searchParams.append(key, value);
    });

    const response = await fetch(backendUrl, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : {};

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: payload?.message ?? "Backend không thể tải danh sách việc làm.",
        },
        { status: response.status },
      );
    }

    const source = Array.isArray(payload) ? payload : payload?.data;
    const jobs = Array.isArray(source)
      ? source.filter(
          (job) =>
            job?.status === "DA_DUYET" &&
            job?.displayStatus === "DANG_HIEN_THI",
        )
      : [];

    return NextResponse.json(
      { success: true, data: jobs },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? `Không kết nối được backend: ${error.message}`
            : "Không kết nối được backend tại cổng 3001.",
      },
      { status: 503 },
    );
  }
}
