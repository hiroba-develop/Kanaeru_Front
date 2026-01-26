import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Service } from "../api/services/Service";

const PasswordResetRequest: React.FC = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // パスワードリセットリクエストAPIを呼び出し
      const response = await Service.postApiAuthForgotPassword({
        email: email,
      });
      
      if (response.responseStatus === 1) {
        setSuccess(true);
      } else {
        throw new Error("リセットメールの送信に失敗しました");
      }
    } catch (err) {
      console.error("パスワードリセットリクエストエラー:", err);
      
      // セキュリティ上、メールアドレスの存在を推測されないようにする
      // 成功した場合と同じメッセージを表示することも検討
      setError("エラーが発生しました。\nしばらく経ってから再度お試しください。");
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
            パスワードリセット
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            登録されたメールアドレスを入力してください
          </p>
        </div>

        {/* フォーム */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          {success ? (
            // 送信完了メッセージ
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
                  メールを送信しました
                </h3>
                <p className="text-sm text-gray-600">
                  ご入力いただいたメールアドレスに、パスワードリセット用のリンクを送信しました。
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  メールが届かない場合は、迷惑メールフォルダをご確認ください。
                </p>
              </div>
              <div className="text-center">
                <Link
                  to="/login"
                  className="text-sm font-medium text-primary hover:text-primary/80 hover:underline"
                >
                  ログイン画面に戻る
                </Link>
              </div>
            </div>
          ) : (
            // メールアドレス入力フォーム
            <div className="space-y-6">
              {/* エラーメッセージ */}
              {error && (
                <div className="text-center text-sm text-red-500">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
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
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                  >
                    {isLoading ? "送信中..." : "リセットメールを送信"}
                  </button>
                </div>
              </form>

              {/* ログイン画面に戻るリンク */}
              <div className="text-center">
                <Link
                  to="/login"
                  className="text-sm font-medium text-primary hover:text-primary/80 hover:underline"
                >
                  ログイン画面に戻る
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PasswordResetRequest;