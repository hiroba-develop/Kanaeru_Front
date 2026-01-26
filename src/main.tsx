import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { OpenAPI } from "./api/core/OpenAPI";
import { GoogleOAuthProvider } from "@react-oauth/google";
import type { ApiRequestOptions } from "./api/core/ApiRequestOptions";

// Cookieからトークンを取得する関数
const getCookie = (name: string): string | null => {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

// APIのURLを設定
OpenAPI.BASE = import.meta.env.VITE_API_BASE_URL;
console.log(OpenAPI.BASE);

// トークンをCookieから動的に取得するように設定
OpenAPI.TOKEN = async (_options: ApiRequestOptions): Promise<string | undefined> => {
  const token = getCookie("authToken");
  return token || undefined;
};

// Vite React App のエントリーポイント
// id="root" のDOMに対してReactをマウントする
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <div className="w-full h-full">
        <App />
      </div>
    </GoogleOAuthProvider>
  </StrictMode>
);
