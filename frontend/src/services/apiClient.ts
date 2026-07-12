import type { ApiResult } from "../types/auth";
import { nowLabel, parseResponseBody } from "../utils/authParsers";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type RequestOptions = {
  retryOn401?: boolean;
};

async function doRequest(path: string, method: HttpMethod, payload?: unknown): Promise<Response> {
  const headers: Record<string, string> = {};

  if (method === "POST" || method === "PUT" || method === "PATCH") {
    headers["Content-Type"] = "application/json";
  }

  return fetch(path, {
    method,
    credentials: "include",
    headers: Object.keys(headers).length > 0 ? headers : undefined,
    body:
      method === "POST" || method === "PUT" || method === "PATCH"
        ? JSON.stringify(payload ?? {})
        : undefined,
  });
}

async function toApiResult(response: Response): Promise<ApiResult> {
  const text = await response.text();

  return {
    status: response.status,
    body: parseResponseBody(text),
    receivedAt: nowLabel(),
  };
}

function isRefreshEndpoint(path: string): boolean {
  return path.startsWith("/api/auth/refresh");
}

async function tryRefreshSession(): Promise<boolean> {
  const response = await doRequest("/api/auth/refresh", "POST");
  return response.status >= 200 && response.status < 300;
}

export async function requestApi(
  path: string,
  method: HttpMethod,
  payload?: unknown,
  options: RequestOptions = {}
): Promise<ApiResult> {
  const retryOn401 = options.retryOn401 ?? false;

  let response = await doRequest(path, method, payload);

  if (response.status === 401 && retryOn401 && !isRefreshEndpoint(path)) {
    const refreshed = await tryRefreshSession();

    if (refreshed) {
      response = await doRequest(path, method, payload);
    }
  }

  return toApiResult(response);
}
