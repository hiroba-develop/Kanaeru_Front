import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import CryptoJS from "crypto-js";
import { Service } from "../api/services/Service";

const Login: React.FC = () => {
  const { user, isLoading, login, sessionExpired, clearSessionExpired } = useAuth();
  const location = useLocation(); 
  const navigate = useNavigate();

  // マウント時点（useEffect より前）でログアウトフラグを取得する
  // useEffect が sessionStorage を削除するより先に読み取ることで
  // 「明示的なログアウト後のログイン」と「URLから直接アクセス」を正しく区別する
  const [wasLoggedOut] = useState(() => sessionStorage.getItem("loggedOut") === "true");

  // ログアウト後はstateをクリアする
  useEffect(() => {
    const loggedOut = sessionStorage.getItem("loggedOut");
    if (loggedOut) {
      sessionStorage.removeItem("loggedOut");
      // stateをクリアして同じURLに置き換え
      navigate("/login", { replace: true, state: null });
    }
  }, []);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState(""); // ★★★ 追加 ★★★
  const [showPassword, setShowPassword] = useState(false);

  // ★★★ Setup画面から渡されたstateを受け取る ★★★
  useEffect(() => {
    if (location.state) {
      const state = location.state as { email?: string; message?: string };
      
      if (state.email) {
        setEmail(state.email);
      }
      
      if (state.message) {
        setSuccessMessage(state.message);
        // 5秒後にメッセージを消す
        setTimeout(() => setSuccessMessage(""), 5000);
      }
    }
  }, [location.state]);

  // セッション期限切れメッセージを表示
  React.useEffect(() => {
    // URLクエリパラメータをチェック
    const searchParams = new URLSearchParams(location.search);
    const reason = searchParams.get('reason');
    
    // 退会処理後の場合はセッション期限切れメッセージを表示しない
    if (reason === 'withdrawal') {
      clearSessionExpired();
      return;
    }
    
    // セッション期限切れの場合のみメッセージを表示
    if (sessionExpired) {
      setError("セッションの有効期限が切れました。\n再度ログインしてください。");
      clearSessionExpired();
    }
  }, [sessionExpired, clearSessionExpired, location.search]);

  // パスワードをSHA-256でハッシュ化
  const sha256 = (text: string): string => {
    return CryptoJS.SHA256(text).toString(CryptoJS.enc.Hex);
  };

  // すでにログイン済みの場合はリダイレクト
  if (user && !isLoading) {
    const from = (location.state as { from?: { pathname: string; search: string } })?.from;
    // 明示的なログアウト後は from を無視する
    const isFromSupport = !wasLoggedOut && from?.pathname === '/support';
    // 管理者はパラメーターを含む元のURLへ
    const adminFromPath = isFromSupport
      ? `${from!.pathname}${from!.search}`
      : null;

    if (user.role === "1") {
      return <Navigate to={adminFromPath ?? "/userManagement"} replace />;
    } else if (user.role === "2") {
      return <Navigate to={adminFromPath ?? "/adminUserManagement"} replace />;
    } else if (user.role === "4") {
      // 有料一般ユーザーはサポート画面へのリンクから来た場合も自分の画面のみ
      return <Navigate to={isFromSupport ? "/support" : "/"} replace />;
    }
    // role:0/3（無料ユーザー）はサポート画面に入れないため from は無視
    return <Navigate to={user.isSetupComplete ? "/" : "/setup"} replace />;
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage(""); // ★★★ ログイン試行時にメッセージをクリア ★★★

    try {
      const passwordHash = sha256(password);
      const response = await Service.postApiAuthLogin(email, passwordHash);
      
      if (response.responseStatus === 1) {
        if (response.token) {
          const expires = new Date();
          expires.setTime(expires.getTime() + 24 * 60 * 60 * 1000);
          
          // HTTPSかどうかを判定
          const isSecure = window.location.protocol === 'https:';
          
          // SameSite=Laxに変更（StrictだとiOSで問題が発生する可能性がある）
          // HTTPS環境ではSecure属性を追加
          document.cookie = `authToken=${response.token};expires=${expires.toUTCString()};path=/;SameSite=Lax${isSecure ? ';Secure' : ''}`;
        }
               
        await login(
          email,
          passwordHash,
          response.userId,
          response.role,
          response.token,
          response.name,
          response.userImageUrl,
          response.termsAgreedAt,
          response.lastLoginAt
        );

        const from = (location.state as { from?: { pathname: string; search: string } })?.from;
        // 明示的なログアウト後は from を無視する（wasLoggedOut はマウント時に取得済み）
        const isFromSupport = !wasLoggedOut && from?.pathname === '/support';
        // 管理者（role:1/2）はパラメーターを含む元のURLへ、それ以外はパラメーター無し
        const adminFromPath = isFromSupport
          ? `${from!.pathname}${from!.search}`
          : null;

        if (response.role === "1") {
          navigate(adminFromPath ?? "/userManagement", { replace: true });
          return;
        } else if (response.role === "2") {
          navigate(adminFromPath ?? "/adminUserManagement", { replace: true });
          return;
        } else if (response.role === "4") {
          // 有料一般ユーザーはサポート画面へのリンクから来た場合も自分の画面のみ
          navigate(isFromSupport ? "/support" : "/", { replace: true });
          return;
        } else {
          // role:0/3（無料ユーザー）はサポート画面へのアクセス不可
          navigate("/", { replace: true });
          return;
        }
      } else {
        throw new Error("メールアドレスまたはパスワードが正しくありません");
      }
      
    } catch (err) {
      console.error("認証エラー:", err);
      
      if (err && typeof err === 'object' && 'body' in err) {
        console.error("エラーボディ:", err.body);
      }
      
      let errorMessage = "ログインに失敗しました";
      if (err instanceof Error) {
        if (err.message.includes("500")) {
          errorMessage = "サーバーエラーが発生しました。\nしばらく経ってから再度お試しください。";
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
            {/* ★★★ 成功メッセージ ★★★ */}
            {successMessage && (
              <div className="text-center text-sm text-green-600 bg-green-50 p-3 rounded-md">
                {successMessage}
              </div>
            )}

            {/* エラーメッセージ */}
            {error && (
              <div className="text-center text-sm text-red-500 whitespace-pre-line">{error}</div>
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
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              
              <div className="text-center text-sm">
                <Link
                  to="/password-reset-request"
                  className="text-primary hover:text-primary/80 hover:underline"
                >
                  パスワードをお忘れの方はこちら
                </Link>
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
                アカウントをお持ちでない方
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