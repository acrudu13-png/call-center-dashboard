export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || (typeof window !== "undefined" ? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws` : "ws://localhost:3457/ws");
export const TOKEN_KEY = "callqa_access_token";
export const REFRESH_KEY = "callqa_refresh_token";
export const LOCALE_KEY = "callqa_locale";
