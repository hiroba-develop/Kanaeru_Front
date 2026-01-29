import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { OpenAPI } from "./api/core/OpenAPI";
import { GoogleOAuthProvider } from "@react-oauth/google";

// APIのURLを設定
OpenAPI.BASE = import.meta.env.VITE_API_BASE_URL;

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
