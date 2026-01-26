import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import CryptoJS from "crypto-js";
import { Service } from "../api/services/Service";
import { validatePassword } from "../utils/passwordUtils";
import { useAuth } from "../contexts/AuthContext"; // ★★★ 追加 ★★★

const PasswordReset: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { logout } = useAuth(); // ★★★ 追加 ★★★
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // トークンが存在しない場合はログイン画面にリダイレクト
  useEffect(() => {
    if (!token) {
      navigate("/login");
    }
  }, [token, navigate]);

  // ★★★ パスワード変更時のバリデーション（リアルタイム） ★★★
  useEffect(() => {
    if (password) {
      const errors = validatePassword(password);
      setPasswordErrors(errors);
    } else {
      setPasswordErrors([]);
    }
  }, [password]);

  // パスワードをSHA-256でハッシュ化
  const sha256 = (text: string): string => {
    return CryptoJS.SHA256(text).toString(CryptoJS.enc.Hex);
  };

  // ★★★ パスワードバリデーション（送信時） ★★★
  const validatePasswordOnSubmit = (): boolean => {
    // パスワードポリシーチェック
    const errors = validatePassword(password);
    if (errors.length > 0) {
      setError(errors.join("、"));
      return false;
    }

    // パスワード一致チェック
    if (password !== confirmPassword) {
      setError("パスワードが一致しません");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
  
    if (!validatePasswordOnSubmit()) {
      return;
    }
  
    setIsLoading(true);
  
    try {
      // パスワードをハッシュ化
      const passwordHash = sha256(password);
  
      // パスワードリセットAPIを呼び出し
      const response = await Service.postApiAuthResetPassword({
        token: token!,
        newPasswordHash: passwordHash,
      });
  
      // ★ 修正: responseStatusで成功/失敗を判定
      if (response.responseStatus === 1) {
        // ★★★ 既存のセッションをクリア ★★★
        logout();
        
        // ★★★ Cookie も明示的に削除 ★★★
        document.cookie = "authToken=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;";
        
        setSuccess(true);
        
        // 3秒後にログイン画面へリダイレクト
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      } else {
        // ★ 修正: responseStatusが1以外の場合のエラーハンドリング
        console.error("パスワードリセット失敗:", response);
        
        // レスポンスメッセージを確認
        let errorMessage = "パスワードのリセットに失敗しました";

        // responseStatusによるエラーメッセージの決定
        if (response.responseStatus === 0) {
          errorMessage = "パスワードリセットのURLが無効または期限切れです。\n再度リセット申請を行ってください。";
        }
        
        setError(errorMessage);
      }
    } catch (err) {
      console.error("パスワードリセットエラー:", err);
  
      let errorMessage = "パスワードのリセットに失敗しました";
      if (err instanceof Error) {
        // HTTPエラーの場合
        if (err.message.includes("400") || err.message.includes("invalid")) {
          errorMessage = "パスワードリセットのURLが無効または期限切れです。\n再度リセット申請を行ってください。";
        } else if (err.message.includes("500")) {
          errorMessage = "サーバーエラーが発生しました。\nしばらく経ってから再度お試しください。";
        } else {
          errorMessage = err.message;
        }
      }
  
      setError(errorMessage);
    } finally {
      setIsLoading(false);
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
          <h2 className="text-3xl font-bold text-gray-900">
            新しいパスワードの設定
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            新しいパスワードを入力してください
          </p>
        </div>

        {/* フォーム */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          {success ? (
            // 成功メッセージ
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                  <svg
                    className="h-6 w-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  パスワードを変更しました
                </h3>
                <p className="text-sm text-gray-600">
                  新しいパスワードでログインできます。
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  3秒後にログイン画面へ移動します...
                </p>
              </div>
              <div className="text-center">
                <Link
                  to="/login"
                  className="text-sm font-medium text-primary hover:text-primary/80 hover:underline"
                >
                  ログイン画面へ
                </Link>
              </div>
            </div>
          ) : (
            // パスワード入力フォーム
            <div className="space-y-6">
              {/* エラーメッセージ */}
              {error && (
                <div className="text-center text-sm text-red-500">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 新しいパスワード */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700"
                  >
                    新しいパスワード
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
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
                  
                  {/* ★★★ リアルタイムバリデーション表示 ★★★ */}
                  {password && passwordErrors.length > 0 && (
                    <div className="mt-2 text-xs text-red-500 space-y-1">
                      {passwordErrors.map((err, index) => (
                        <div key={index} className="flex items-start">
                          <span className="mr-1">•</span>
                          <span>{err}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* パスワード確認 */}
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-gray-700"
                  >
                    パスワード確認
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="mt-1 appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                      placeholder="パスワードを再入力"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmPassword ? (
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
                  
                  {/* ★★★ パスワード不一致表示 ★★★ */}
                  {confirmPassword && password !== confirmPassword && (
                    <div className="mt-2 text-xs text-red-500">
                      パスワードが一致しません
                    </div>
                  )}
                </div>

                {/* ★★★ パスワード要件（更新） ★★★ */}
                <div className="text-xs text-gray-500">
                  <p className="font-medium mb-1">パスワードの要件：</p>
                  <ul className="space-y-1">
                    <li className={password.length >= 8 ? "text-green-600" : ""}>
                      {password.length >= 8 ? "✓" : "•"} 8文字以上
                    </li>
                    <li className={/[a-zA-Z]/.test(password) ? "text-green-600" : ""}>
                      {/[a-zA-Z]/.test(password) ? "✓" : "•"} 半角英字を1文字以上
                    </li>
                    <li className={/[0-9]/.test(password) ? "text-green-600" : ""}>
                      {/[0-9]/.test(password) ? "✓" : "•"} 半角数字を1文字以上
                    </li>
                  </ul>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isLoading || passwordErrors.length > 0 || password !== confirmPassword}
                    className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "変更中..." : "パスワードを変更"}
                  </button>
                </div>
              </form>

              {/* パスワードリセット再申請リンク */}
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">
                  リンクが無効または期限切れの場合
                </p>
                <Link
                  to="/password-reset-request"
                  className="text-sm font-medium text-primary hover:text-primary/80 hover:underline"
                >
                  パスワードリセットを再申請
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PasswordReset;