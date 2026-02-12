import React, { useState, useEffect } from "react";
import { Service } from "../api/services/Service";
import { withErrorHandling } from "../utils/apiErrorHandler";
import { useAuth } from "../contexts/AuthContext";

interface ContactForm {
  title: string;
  userName: string;
  email: string;
  content: string;
}

const Contact: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<ContactForm>({
    title: "",
    userName: "",
    email: "",
    content: "",
  });

  const [errors, setErrors] = useState<Partial<ContactForm>>({});

    // ユーザー情報を自動入力
    useEffect(() => {
        if (user) {
            setFormData(prev => ({
            ...prev,
            userName: user.name || "",
            email: user.email || "",
            }));
        }
        }, [user]);

  // バリデーション
  const validateForm = (): boolean => {
    const newErrors: Partial<ContactForm> = {};

    if (!formData.title.trim()) {
      newErrors.title = "件名を入力してください";
    }

    if (!formData.userName.trim()) {
      newErrors.userName = "お名前を入力してください";
    }

    if (!formData.email.trim()) {
      newErrors.email = "メールアドレスを入力してください";
    } else {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(formData.email)) {
        newErrors.email = "正しいメールアドレスを入力してください";
      }
    }

    if (!formData.content.trim()) {
      newErrors.content = "お問い合わせ内容を入力してください";
    } else if (formData.content.trim().length < 10) {
      newErrors.content = "お問い合わせ内容は10文字以上入力してください";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);

      // API呼び出し
      await withErrorHandling(() => Service.postApiContactsSend({
        title: formData.title,
        userName: formData.userName,
        email: formData.email,
        content: formData.content,
      }));

      alert(
        "お問い合わせを受け付けました。\n" +
        "ご入力いただいたメールアドレス宛に確認メールをお送りしました。\n" +
        "通常、2-3営業日以内にご返信いたします。"
      );

      // フォームをリセット
      setFormData({
        title: "",
        userName: user?.name || "",
        email: user?.email || "",
        content: "",
      });
      setErrors({});
    } catch (error) {
      console.error("送信エラー:", error);
      alert("送信中にエラーが発生しました。もう一度お試しください。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // エラーをクリア
    if (errors[name as keyof ContactForm]) {
      setErrors({ ...errors, [name]: undefined });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-accent/5 py-4 sm:py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="mx-auto h-24 w-24 sm:h-40 sm:w-40 flex items-center justify-center mb-6">
            <div
              className="w-full h-full bg-contain bg-no-repeat bg-center"
              style={{
                backgroundImage: "url(src/assets/header_icon.png)",
              }}
              role="img"
              aria-label="kanaeru"
            />
          </div>
          
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            お問い合わせ
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-2">
            ご質問やご要望がございましたら、お気軽にお問い合わせください
          </p>
        </div>

        {/* メインコンテンツ */}
        <div className="bg-white rounded-lg shadow-xl p-4 sm:p-8 mb-6 sm:mb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 件名 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                件名<span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-primary focus:border-primary ${
                  errors.title ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="お問い合わせの件名を入力してください"
                maxLength={100}
              />
              {errors.title && (
                <p className="text-xs text-red-600 mt-1">{errors.title}</p>
              )}
              <p className="text-xs text-gray-500 mt-1 text-right">
                {formData.title.length}/100文字
              </p>
            </div>

            {/* お名前 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                お名前<span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                name="userName"
                value={formData.userName}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-primary focus:border-primary ${
                  errors.userName ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="お名前を入力してください"
                autoComplete="name"
                maxLength={50}
              />
              {errors.userName && (
                <p className="text-xs text-red-600 mt-1">{errors.userName}</p>
              )}
              <p className="text-xs text-gray-500 mt-1 text-right">
                {formData.userName.length}/50文字
              </p>
            </div>

            {/* メールアドレス */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                メールアドレス<span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-primary focus:border-primary ${
                  errors.email ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="example@example.com"
                autoComplete="email"
                maxLength={100}
              />
              {errors.email && (
                <p className="text-xs text-red-600 mt-1">{errors.email}</p>
              )}
              <p className="text-xs text-gray-500 mt-1 text-right">
                {formData.email.length}/100文字
              </p>
            </div>

            {/* お問い合わせ内容 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                お問い合わせ内容<span className="text-red-500 ml-1">*</span>
              </label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleChange}
                rows={8}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-primary focus:border-primary resize-none ${
                  errors.content ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="お問い合わせ内容を詳しくご記入ください"
                maxLength={2000}
              />
              {errors.content && (
                <p className="text-xs text-red-600 mt-1">{errors.content}</p>
              )}
              <p className="text-xs text-gray-500 mt-1 text-right">
                {formData.content.length}/2000文字
              </p>
            </div>

            {/* 注意事項 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <svg
                  className="h-5 w-5 text-blue-400 mr-3 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">お問い合わせについて</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>通常、2-3営業日以内にご返信いたします</li>
                    <li>
                      お急ぎの場合は、お問い合わせ内容にその旨をご記載ください
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 送信ボタン */}
            <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0">
              <button
                type="button"
                onClick={() => window.close()}
                className="px-4 sm:px-6 py-2 border border-gray-300 rounded-full text-gray-700 hover:bg-gray-50 text-sm sm:text-base text-center"
              >
                閉じる
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 sm:px-6 py-2 bg-primary text-white rounded-full hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    送信中...
                  </>
                ) : (
                  "送信する"
                )}
              </button>
            </div>
          </form>
        </div>

      {/* フッター情報 */}
      <div className="text-center text-xs sm:text-sm text-gray-600">
        <p>
          個人情報の取り扱いについては
          <a 
            href="https://etomoji.co.jp/privacy-policy/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline ml-1"
          >
            プライバシーポリシー
          </a>
          をご確認ください
        </p>
      </div>
    </div>
  </div>
);
};
export default Contact;