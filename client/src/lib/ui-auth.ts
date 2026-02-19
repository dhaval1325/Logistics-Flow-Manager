const AUTH_KEY = "lf-ui-auth";
const USER_KEY = "lf-ui-user";
const AUTH_EVENT = "lf-ui-auth-change";

type UiUser = {
  username: string;
  password?: string;
};

const DEFAULT_USERS: UiUser[] = [
  { username: "Dhaval" },
  { username: "harshad" },
  { username: "dev" },
  { username: "Harsh" },
];

function getConfiguredUsers(): UiUser[] {
  try {
    const envValue = (import.meta as any)?.env?.VITE_UI_USERS;
    if (typeof envValue === "string" && envValue.trim()) {
      const parsed = JSON.parse(envValue);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item) => typeof item?.username === "string")
          .map((item) => ({ username: String(item.username), password: item.password }));
      }
    }
  } catch (error) {
    console.warn("Invalid VITE_UI_USERS JSON. Falling back to default users.");
  }
  return DEFAULT_USERS;
}

export function getUiAuth(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(AUTH_KEY) === "1";
}

export function getUiUser(): string {
  if (typeof window === "undefined") return "Guest";
  return window.localStorage.getItem(USER_KEY) || "Guest";
}

export function setUiAuth(username?: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_KEY, "1");
  if (username?.trim()) {
    window.localStorage.setItem(USER_KEY, username.trim());
  } else if (!window.localStorage.getItem(USER_KEY)) {
    window.localStorage.setItem(USER_KEY, "Guest");
  }
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function clearUiAuth() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_KEY);
  window.localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function onUiAuthChange(handler: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const listener = () => handler();
  window.addEventListener(AUTH_EVENT, listener);
  return () => window.removeEventListener(AUTH_EVENT, listener);
}

export function validateUiLogin(username: string, password: string) {
  const normalized = username.trim();
  if (!normalized) {
    return { ok: false, message: "Username is required." };
  }
  const users = getConfiguredUsers();
  const match = users.find((user) => user.username.toLowerCase() === normalized.toLowerCase());
  if (!match) {
    return { ok: false, message: "User not found." };
  }
  if (match.password != null && match.password !== password) {
    return { ok: false, message: "Invalid password." };
  }
  if (!password.trim()) {
    return { ok: false, message: "Password is required." };
  }
  return { ok: true, user: match };
}
