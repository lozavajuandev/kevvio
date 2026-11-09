export async function api(path: string, method = "GET", data?: unknown) {
  const isForm = data instanceof FormData;
  const response = await fetch("/api/" + path, {
    method,
    headers:
      data && !isForm ? { "Content-Type": "application/json" } : undefined,
    body: data ? (isForm ? data : JSON.stringify(data)) : undefined,
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(
      "La aplicación no respondió. Revisa la conexión e inténtalo de nuevo.",
    );
  }
  if (!response.ok)
    throw new Error(
      result.error + (result.details ? " " + result.details.join(" · ") : ""),
    );
  return result;
}
