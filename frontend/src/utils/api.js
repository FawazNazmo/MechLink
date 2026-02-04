// frontend/src/utils/api.js

// Read the JWT from localStorage
export function getToken() {
  // We standardise on "token" – this is what LoginPage stores
  return localStorage.getItem("token");
}

// Generic API helper
export async function api(
  path,
  { method = "GET", body, headers = {} } = {}
) {
  const t = getToken();

  const res = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.message || res.statusText || "Request failed");
    // 👇 very important so we can check e.status in frontend
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}
