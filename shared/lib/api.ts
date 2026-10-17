export async function callApi<T>(
  path: string,
  data?: unknown,
  token?: string,
  options: { signal?: AbortSignal } = {},
): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    keepalive: path === "progress/save",
    signal: options.signal,
    method: data === undefined ? "GET" : "POST",
    headers: {
      ...(data === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.message ?? "This action could not be completed.");
  return result as T;
}

export function readableTitle(title: string): string {
  const element = document.createElement("textarea");
  element.innerHTML = title;
  return element.value;
}
