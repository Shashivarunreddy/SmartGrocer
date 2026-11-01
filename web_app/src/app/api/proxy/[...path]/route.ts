import { NextRequest, NextResponse } from "next/server";

const BACKEND_BASE_URL =
  process.env.BACKEND_INTERNAL_URL || "http://65.0.242.245:5000/api/v1";

async function handleProxy(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await context.params;
    const targetPath = "/" + (path || []).join("/");
    const url = new URL(req.url);
    const targetUrl = `${BACKEND_BASE_URL}${targetPath}${url.search}`;

    const headers = new Headers();
    req.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (!["host", "connection", "content-length"].includes(lower)) {
        headers.set(key, value);
      }
    });

    const method = req.method;
    const body =
      ["GET", "HEAD"].includes(method) ? undefined : await req.arrayBuffer();

    const backendRes = await fetch(targetUrl, {
      method,
      headers,
      body,
      cache: "no-store",
    });

    const resHeaders = new Headers();
    backendRes.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (!["content-encoding", "content-length", "transfer-encoding"].includes(lower)) {
        resHeaders.set(key, value);
      }
    });

    const resData = await backendRes.arrayBuffer();

    return new NextResponse(resData, {
      status: backendRes.status,
      statusText: backendRes.statusText,
      headers: resHeaders,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: "Backend proxy unreachable",
        message: err.message,
      },
      { status: 502 }
    );
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;
