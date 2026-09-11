const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000/api";

const WS_URL =
  import.meta.env.VITE_WS_URL ||
  "ws://localhost:3000/ws/market";

export {
  API_URL,
  WS_URL,
};

export async function apiRequest(
  path,
  options = {}
) {
  const response = await fetch(
    `${API_URL}${path}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      credentials: "include",
    }
  );

  let data = null;

  try {
    data = await response.json();
  } catch (_) {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
        `Request failed with status ${response.status}`
    );
  }

  return data;
}