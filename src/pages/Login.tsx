import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Navigate, Link } from "react-router-dom";
import CryptoJS from "crypto-js";
import { Service } from "../api/services/Service";

const Login: React.FC = () => {
  const { user, isLoading, login, sessionExpired, clearSessionExpired } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false); 

  // セッション期限切れメッセージを表示
  React.useEffect(() => {
    if (sessionExpired) {
      setError("セッションの有効期限が切れました。再度ログインしてください。");
      clearSessionExpired();
    }
  }, [sessionExpired, clearSessionExpired]); 

  // パスワードをSHA-256でハッシュ化
  const sha256 = (text: string): string => {
    return CryptoJS.SHA256(text).toString(CryptoJS.enc.Hex);
  };

  // すでにログイン済みの場合はリダイレクト
  if (user && !isLoading) {
    return (
      <Navigate
        to={user.isSetupComplete ? "/mandalaChart" : "/setup"}
        replace
      />
    );
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      // パスワードをハッシュ化
      const passwordHash = sha256(password);
      
      console.log("ログイン試行:", { email, passwordHash });
      
      // APIを呼び出してログイン
      const response = await Service.postApiAuthLogin(email, passwordHash);
      
      console.log("ログインレスポンス:", response);
      
      // レスポンスステータスが1（成功）の場合のみログイン処理を続行
      if (response.responseStatus === 1) {
        // トークンをCookieに保存
        if (response.token) {
          const expires = new Date();
          expires.setTime(expires.getTime() + 24 * 60 * 60 * 1000); // 24時間
          document.cookie = `authToken=${response.token};expires=${expires.toUTCString()};path=/;SameSite=Strict`;
        }
        
        // ユーザーIDとロールをAuthContextのlogin関数に渡す
        await login(
          email,
          passwordHash,
          response.userId,
          response.role,
          response.token,
          response.name
        );
      } else {
        throw new Error("メールアドレスまたはパスワードが正しくありません");
      }
      
    } catch (err) {
      console.error("認証エラー:", err);
      
      // エラーの詳細を表示
      if (err && typeof err === 'object' && 'body' in err) {
        console.error("エラーボディ:", err.body);
      }
      
      // ユーザーフレンドリーなエラーメッセージ
      let errorMessage = "ログインに失敗しました";
      if (err instanceof Error) {
        if (err.message.includes("500")) {
          errorMessage = "サーバーエラーが発生しました。しばらく経ってから再度お試しください。";
        } else if (err.message.includes("404")) {
          errorMessage = "ログインAPIが見つかりません。";
        } else if (err.message.includes("401") || err.message.includes("403")) {
          errorMessage = "メールアドレスまたはパスワードが正しくありません。";
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/5 px-4">
      <div className="max-w-md w-full space-y-8">
        {/* ロゴとタイトル */}
        <div className="text-center">
         <div className="mx-auto h-24 w-24 sm:h-40 sm:w-40 flex items-center justify-center mb-6">
            <div
              className="w-full h-full bg-contain bg-no-repeat bg-center"
              style={{
                backgroundImage: "url(src/assets/header_icon.png)",
              }}
              role="img"
              aria-label="Kanaeru"
            />
          </div>
        </div>

        {/* ログインフォーム */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="space-y-6">
            {/* エラーメッセージ */}
            {error && (
              <div className="text-center text-sm text-red-500">{error}</div>
            )}

            {/* メールログインフォーム */}
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700"
                >
                  メールアドレス
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                  placeholder="example@example.com"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  パスワード
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                    placeholder="パスワードを入力"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
                      // 目を開いたアイコン（パスワード表示中）
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    ) : (
                      // 目を閉じたアイコン（パスワード非表示中）
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                >
                  {isLoading ? "ログイン中..." : "ログイン"}
                </button>
              </div>
            </form>

            {/* 会員登録リンク */}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                アカウントをお持ちでない方は
              </p>
              <Link
                to="/setup"
                className="text-sm font-medium text-primary hover:text-primary/80 hover:underline"
              >
                会員登録はこちら
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;