const API_URL = "http://localhost:5000/api";

type RequestMethod = "GET" | "POST" | "PUT" | "DELETE";

async function request<T>(
    method: RequestMethod,
    endpoint: string,
    body?: unknown,
    token?: string
): Promise<T> {
    const headers: HeadersInit = {};

    if (!(body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    } else {
        // Try to get from localStorage
        const storedToken = localStorage.getItem("neurapulse_token");
        if (storedToken) {
            headers["Authorization"] = `Bearer ${storedToken}`;
        }
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        method,
        headers,
        body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed: ${response.statusText}`);
    }

    return response.json();
}

export const api = {
    get: <T>(endpoint: string) => request<T>("GET", endpoint),
    post: <T>(endpoint: string, body: unknown) => request<T>("POST", endpoint, body),
    put: <T>(endpoint: string, body: unknown) => request<T>("PUT", endpoint, body),
    delete: <T>(endpoint: string) => request<T>("DELETE", endpoint),

    // Auth helpers
    setToken: (token: string) => localStorage.setItem("neurapulse_token", token),
    getToken: () => localStorage.getItem("neurapulse_token"),
    clearToken: () => localStorage.removeItem("neurapulse_token"),

    setRole: (role: string) => localStorage.setItem("neurapulse_role", role),
    getRole: () => localStorage.getItem("neurapulse_role"),
    clearRole: () => localStorage.removeItem("neurapulse_role"),
};
