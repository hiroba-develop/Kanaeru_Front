import React, { useState, useEffect } from "react";
import { Save, User, Building, Lock, UserX } from "lucide-react"; 
import { useAuth } from "../contexts/AuthContext";
import { Service } from "../api/services/Service";
import { withErrorHandling } from "../utils/apiErrorHandler";
import { OpenAPI } from "../api/core/OpenAPI";
import CryptoJS from "crypto-js";
import type {
  InitialSetup,
  CompanySize,
  Industry,
  FinancialKnowledge,
} from "../types";

const Settings: React.FC = () => {
  const { user, updateUserSetup, updateUser  } = useAuth();
  const isNotNormalAccount = user?.role === "1" || user?.role === "2";

  // 初期設定データの状態管理
  const [setupData, setSetupData] = useState<InitialSetup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [userInfo, setUserInfo] = useState({
    name: "",
    email: "",
    phone: "",
  });

  // バリデーションエラー用のstate
  const [validationErrors, setValidationErrors] = useState<{
    userName?: string;
    email?: string;
  }>({});

  // パスワード変更用のstate
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    newPasswordConfirm: "",
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showNewPasswordConfirm, setShowNewPasswordConfirm] = useState(false);

  // オプション定義
  const companyTypes: CompanySize[] = [
    "個人事業主",
    "法人（従業員1-5名）",
    "法人（従業員6-20名）",
    "法人（従業員21名以上）",
  ];

  const industries: Industry[] = [
    "IT・ソフトウェア",
    "製造業",
    "小売業",
    "飲食業",
    "サービス業",
    "建設業",
    "医療・福祉",
    "教育",
    "金融・保険",
    "不動産",
    "その他",
  ];

  const knowledgeOptions: FinancialKnowledge[] = [
    "初心者",
    "基本レベル",
    "中級レベル",
    "上級レベル",
  ];

  // 数値から選択肢へのマッピング関数
  const getCompanySizeFromNumber = (size: number): CompanySize => {
    const mapping: { [key: number]: CompanySize } = {
      1: "個人事業主",
      2: "法人（従業員1-5名）",
      3: "法人（従業員6-20名）",
      4: "法人（従業員21名以上）",
    };
    return mapping[size] || "個人事業主";
  };

  const getIndustryFromNumber = (industry: number): Industry => {
    const mapping: { [key: number]: Industry } = {
      1: "IT・ソフトウェア",
      2: "製造業",
      3: "小売業",
      4: "飲食業",
      5: "サービス業",
      6: "建設業",
      7: "医療・福祉",
      8: "教育",
      9: "金融・保険",
      10: "不動産",
      11: "その他",
    };
    return mapping[industry] || "その他";
  };

  const getFinancialKnowledgeFromNumber = (
    knowledge: number
  ): FinancialKnowledge => {
    const mapping: { [key: number]: FinancialKnowledge } = {
      1: "初心者",
      2: "基本レベル",
      3: "中級レベル",
      4: "上級レベル",
    };
    return mapping[knowledge] || "初心者";
  };

  // 文字列を数値に変換するヘルパー関数
  const getCompanySizeNumber = (size: string): number => {
    switch (size) {
      case "個人事業主":
        return 1;
      case "法人（従業員1-5名）":
        return 2;
      case "法人（従業員6-20名）":
        return 3;
      case "法人（従業員21名以上）":
        return 4;
      default:
        return 1;
    }
  };

  const getIndustryNumber = (industry: string): number => {
    switch (industry) {
      case "IT・ソフトウェア":
        return 1;
      case "製造業":
        return 2;
      case "小売業":
        return 3;
      case "飲食業":
        return 4;
      case "サービス業":
        return 5;
      case "建設業":
        return 6;
      case "医療・福祉":
        return 7;
      case "教育":
        return 8;
      case "金融・保険":
        return 9;
      case "不動産":
        return 10;
      case "その他":
        return 11;
      default:
        return 1;
    }
  };

  const getFinancialKnowledgeNumber = (knowledge: string): number => {
    switch (knowledge) {
      case "初心者":
        return 1;
      case "基本レベル":
        return 2;
      case "中級レベル":
        return 3;
      case "上級レベル":
        return 4;
      default:
        return 1;
    }
  };

  // Cookieを操作するためのユーティリティ関数
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

  // パスワードをSHA-256でハッシュ化
  const sha256 = (text: string): string => {
    return CryptoJS.SHA256(text).toString(CryptoJS.enc.Hex);
  };

  // パスワードのバリデーション
  const validatePassword = (
    password: string
  ): { isValid: boolean; message: string } => {
    if (password.length < 8) {
      return {
        isValid: false,
        message: "パスワードは8文字以上で入力してください",
      };
    }

    const hasNumber = /[0-9]/.test(password);
    const hasLetter = /[a-zA-Z]/.test(password);

    if (!hasNumber || !hasLetter) {
      return {
        isValid: false,
        message: "パスワードは英字と数字の両方を含む必要があります",
      };
    }

    return { isValid: true, message: "" };
  };

  // パスワードの一致チェック
  const checkPasswordMatch = (): boolean => {
    return passwordData.newPassword === passwordData.newPasswordConfirm;
  };

  // 名前のバリデーション
  const validateUserName = (userName: string): { isValid: boolean; message: string } => {
    if (!userName.trim()) {
      return { isValid: false, message: "ユーザー名を入力してください" };
    }
    return { isValid: true, message: "" };
  };

  // メールアドレスのバリデーション
  const validateEmail = (email: string): { isValid: boolean; message: string } => {
    if (!email.trim()) {
      return { isValid: false, message: "メールアドレスを入力してください" };
    }

    // メールアドレスの形式チェック
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return { isValid: false, message: "正しいメールアドレスを入力してください" };
    }

    return { isValid: true, message: "" };
  };

  // 設定データを初期化
  useEffect(() => {
    const loadSettingData = async () => {
      if (!user?.id) {
        setError("ユーザー情報が取得できません");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const response = await Service.getApiSettingUser(user.id);

        if (!response.userSchema) {
          setError("ユーザー情報が取得できませんでした");
          return;
        }

        const userSchema = response.userSchema;
        const settingSchema = response.settingSchema;

        // ユーザー情報を設定
        setUserInfo({
          name: userSchema.name || "",
          email: userSchema.email || "",
          phone: "",
        });

        // 設定データを変換して設定
        const convertedSetupData: InitialSetup = {
          userName: userSchema.name || "",
          email: userSchema.email || "",
          companyName: userSchema.company || "",
          phoneNumber: "",
          password: "",
          passwordConfirm: "",
          companySize: settingSchema?.companySize
            ? getCompanySizeFromNumber(Number(settingSchema.companySize))
            : "個人事業主",
          industry: settingSchema?.industry
            ? getIndustryFromNumber(Number(settingSchema.industry))
            : "その他",
          fiscalYearStartYear:
            settingSchema?.fiscalYearStartYear || new Date().getFullYear(),
          fiscalYearStartMonth: settingSchema?.fiscalYearStartMonth || 4,
          currentAssets: 0,
          financialKnowledge: settingSchema?.financialKnowledge
            ? getFinancialKnowledgeFromNumber(
                Number(settingSchema.financialKnowledge)
              )
            : "初心者",
          capital: settingSchema?.capital || 0,
        };

        setSetupData(convertedSetupData);
      } catch (err) {
        console.error("設定データの読み込みエラー:", err);
        setError("設定データの読み込み中にエラーが発生しました");
      } finally {
        setLoading(false);
      }
    };

    loadSettingData();
  }, [user?.id]);

  const handleSaveSettings = async () => {
    if (!setupData || !user?.id) {
      alert("保存に必要な情報が不足しています");
      return;
    }

    // バリデーションエラーをクリア
    setValidationErrors({});

    // 名前のバリデーション（会員登録時と同じ）
    const userNameToValidate = userInfo.name.trim() || setupData.userName.trim();
    const userNameValidation = validateUserName(userNameToValidate);
    if (!userNameValidation.isValid) {
      setValidationErrors({ userName: userNameValidation.message });
      alert(userNameValidation.message);
      return;
    }

    // メールアドレスのバリデーション（会員登録時と同じ）
    const emailToSend = userInfo.email.trim() || setupData.email || "";
    const emailValidation = validateEmail(emailToSend);
    if (!emailValidation.isValid) {
      setValidationErrors({ email: emailValidation.message });
      alert(emailValidation.message);
      return;
    }

    try {
      setLoading(true);

      // UserSchemaとSettingSchemaに分けてリクエストボディを作成
      const nameToSend = userInfo.name.trim() || setupData.userName.trim();
      const requestBody = {
        userSchema: {
          userId: user.id,
          email: emailToSend,
          name: nameToSend,
          company: setupData.companyName || "",
        },
        settingSchema: {
          userId: user.id,
          companySize: getCompanySizeNumber(setupData.companySize).toString(),
          industry: getIndustryNumber(setupData.industry).toString(),
          capital: setupData.capital || 0,
          financialKnowledge: getFinancialKnowledgeNumber(
            setupData.financialKnowledge
          ).toString(),
          fiscalYearStartYear: setupData.fiscalYearStartYear,
          fiscalYearStartMonth: setupData.fiscalYearStartMonth,
        },
      };

      // APIを呼び出して設定を更新（エラーハンドリング付き）
      const response = await withErrorHandling(() =>
        Service.putApiSettingUpdateUser(requestBody)
      );

      if (response.responseStatus === 1) {
        // APIレスポンスから返ってきたデータで状態を更新
        if (setupData) {
          const updatedSetupData: InitialSetup = { ...setupData };
      
          // userSchemaの更新
          if (response.userSchema) {
            // APIレスポンスの値で更新
            const updatedEmail = response.userSchema.email || emailToSend;
            const updatedName = response.userSchema.name || nameToSend;
            const updatedCompany = response.userSchema.company || updatedSetupData.companyName;
            
            setUserInfo({
              name: updatedName,
              email: updatedEmail,
              phone: userInfo.phone,
            });
      
            // setupDataのuserSchema関連フィールドを更新
            updatedSetupData.userName = updatedName;
            updatedSetupData.email = updatedEmail;
            updatedSetupData.companyName = updatedCompany;
      
            // ★★★ 追加: AuthContextのユーザー情報を更新 ★★★
            updateUser({
              name: updatedName,
              email: updatedEmail,
            });
          }
      
          // settingSchemaの更新
          if (response.settingSchema) {
            updatedSetupData.companySize = response.settingSchema.companySize
              ? getCompanySizeFromNumber(
                  Number(response.settingSchema.companySize)
                )
              : updatedSetupData.companySize;
            updatedSetupData.industry = response.settingSchema.industry
              ? getIndustryFromNumber(Number(response.settingSchema.industry))
              : updatedSetupData.industry;
            updatedSetupData.capital =
              response.settingSchema.capital ?? updatedSetupData.capital;
            updatedSetupData.financialKnowledge =
              response.settingSchema.financialKnowledge
                ? getFinancialKnowledgeFromNumber(
                    Number(response.settingSchema.financialKnowledge)
                  )
                : updatedSetupData.financialKnowledge;
            updatedSetupData.fiscalYearStartYear =
              response.settingSchema.fiscalYearStartYear ??
              updatedSetupData.fiscalYearStartYear;
            updatedSetupData.fiscalYearStartMonth =
              response.settingSchema.fiscalYearStartMonth ??
              updatedSetupData.fiscalYearStartMonth;
          }
      
          // 状態を一度だけ更新
          setSetupData(updatedSetupData);
          updateUserSetup(updatedSetupData);
        }
      
        alert("設定を保存しました");
      } else {
        throw new Error("設定の保存に失敗しました");
      }
    } catch (err) {
      console.error("設定保存エラー:", err);
      // withErrorHandlingが既にエラーハンドリングを行っているため、
      // ここでは追加のエラーメッセージは不要
      if (err instanceof Error && !err.message.includes("401")) {
        alert("設定の保存中にエラーが発生しました");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    // パスワード変更のバリデーション
    if (!passwordData.currentPassword) {
      alert("現在のパスワードを入力してください");
      return;
    }

    if (!passwordData.newPassword) {
      alert("新しいパスワードを入力してください");
      return;
    }

    const validation = validatePassword(passwordData.newPassword);
    if (!validation.isValid) {
      alert(validation.message);
      return;
    }

    if (!checkPasswordMatch()) {
      alert("新しいパスワードが一致しません");
      return;
    }

    try {
      setLoading(true);

      // 認証トークンを取得してOpenAPIに設定
      const token = getCookie("authToken");
      if (!token) {
        alert("認証トークンが取得できません。再度ログインしてください。");
        setLoading(false);
        return;
      }

      // OpenAPIのTOKENを設定（API呼び出し時にAuthorizationヘッダーに自動的に追加される）
      OpenAPI.TOKEN = token;

      // パスワードをハッシュ化
      const currentPasswordHash = sha256(passwordData.currentPassword);
      const newPasswordHash = sha256(passwordData.newPassword);

      // APIを呼び出してパスワードを変更
      const response = await withErrorHandling(() =>
        Service.putApiAuthUpdatePassword({
          currentPasswordHash: currentPasswordHash,
          newPasswordHash: newPasswordHash,
        })
      );

      if (response.responseStatus === 1) {
        alert("パスワードを変更しました");

        // フォームをリセット
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          newPasswordConfirm: "",
        });
      } else {
        // responseStatusが0の場合、バックエンド側で処理が失敗
        const errorMessage = response.message || "パスワードの変更に失敗しました";
        throw new Error(errorMessage);
      }
    } catch (err) {
      console.error("パスワード変更エラー:", err);
      
      // ユーザーフレンドリーなエラーメッセージ
      let errorMessage = "パスワードの変更中にエラーが発生しました";
      if (err instanceof Error) {
        if (err.message.includes("401") || err.message.includes("403")) {
          errorMessage = "認証に失敗しました。現在のパスワードが正しくない可能性があります。";
        } else if (err.message.includes("400")) {
          errorMessage = "リクエストが不正です。入力内容を確認してください。";
        } else if (err.message.includes("500")) {
          errorMessage = "サーバーエラーが発生しました。しばらく経ってから再度お試しください。";
        } else {
          errorMessage = err.message || errorMessage;
        }
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user?.id) {
      alert("ユーザー情報が取得できません");
      return;
    }

    // 確認ダイアログ
    const confirmDelete  = window.confirm(
      "本当に退会しますか？\n\nこの操作は取り消すことができません。\nすべてのデータが削除されます。"
    );
  
    if (!confirmDelete) return;
  
    try {
      setLoading(true);
      console.log('=== アカウント削除処理開始 ===');
      console.log('削除対象ユーザーID:', user.id);
  
      // 退会API呼び出し
      const response = await withErrorHandling(() =>
        Service.deleteApiDeleteAccount(user.id)
      );
  
      console.log('deleteApiDeleteAccount レスポンス:', response);
  
      if (response.responseStatus === 1) {
        alert("退会処理が完了しました。ご利用ありがとうございました。");
        
        console.log('Cookieを削除します');
        // すべての関連Cookieを削除
        const cookies = ['authToken', 'userId', 'role', 'selectedUserId', 'userName', 'userImageUrl', 'userEmail'];
        cookies.forEach(cookieName => {
          document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
        });
        
        console.log('ログイン画面にリダイレクトします');
        // ログイン画面にリダイレクト
        window.location.href = "/login";
        console.log('=== アカウント削除処理完了 ===');
      } else {
        throw new Error("退会処理に失敗しました");
      }
    } catch (err) {
      console.error("退会処理エラー:", err);
      
      let errorMessage = "退会処理中にエラーが発生しました";
      if (err instanceof Error) {
        if (err.message.includes("401") || err.message.includes("403")) {
          errorMessage = "認証に失敗しました。再度ログインしてください。";
        } else if (err.message.includes("500")) {
          errorMessage = "サーバーエラーが発生しました。しばらく経ってから再度お試しください。";
        } else {
          errorMessage = err.message || errorMessage;
        }
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-500">設定データを読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-red-500">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 btn-primary"
            >
              再読み込み
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!setupData) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-gray-500">初期設定データを読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-text">設定</h1>
          <button
            onClick={handleSaveSettings}
            className="btn-primary flex items-center justify-center space-x-2 text-sm rounded-full"
          >
            <Save className="h-4 w-4" />
            <span>設定を保存</span>
          </button>
        </div>

        {!isNotNormalAccount && (
          <>
            {/* 基本情報 */}
            <div className="card mb-6">
              <div className="flex items-center space-x-2 mb-4">
                <Building className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <h3 className="text-base sm:text-lg font-semibold text-text">
                  基本情報
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-text/70 mb-2">
                    会社規模
                  </label>
                  <select
                    value={setupData.companySize}
                    onChange={(e) =>
                      setSetupData({
                        ...setupData,
                        companySize: e.target.value as CompanySize,
                      })
                    }
                    className="input-field w-full pr-8 appearance-none bg-white"
                    style={{
                      backgroundImage:
                        'url(\'data:image/svg+xml;utf8,<svg fill="black" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/><path d="M0 0h24v24H0z" fill="none"/></svg>\')',
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "calc(100% - 4px) center",
                      backgroundSize: "16px",
                    }}
                    disabled={isNotNormalAccount}
                  >
                    {companyTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-text/70 mb-2">
                    業界
                  </label>
                  <select
                    value={setupData.industry}
                    onChange={(e) =>
                      setSetupData({
                        ...setupData,
                        industry: e.target.value as Industry,
                      })
                    }
                    className="input-field w-full pr-8 appearance-none bg-white"
                    style={{
                      backgroundImage:
                        'url(\'data:image/svg+xml;utf8,<svg fill="black" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/><path d="M0 0h24v24H0z" fill="none"/></svg>\')',
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "calc(100% - 4px) center",
                      backgroundSize: "16px",
                    }}
                    disabled={isNotNormalAccount}
                  >
                    {industries.map((industry) => (
                      <option key={industry} value={industry}>
                        {industry}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-text/70 mb-2">
                    財務知識レベル
                  </label>
                  <select
                    value={setupData.financialKnowledge}
                    onChange={(e) =>
                      setSetupData({
                        ...setupData,
                        financialKnowledge: e.target.value as FinancialKnowledge,
                      })
                    }
                    className="input-field w-full pr-8 appearance-none bg-white"
                    style={{
                      backgroundImage:
                        'url(\'data:image/svg+xml;utf8,<svg fill="black" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/><path d="M0 0h24v24H0z" fill="none"/></svg>\')',
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "calc(100% - 4px) center",
                      backgroundSize: "16px",
                    }}
                    disabled={isNotNormalAccount}
                  >
                    {knowledgeOptions.map((knowledge) => (
                      <option key={knowledge} value={knowledge}>
                        {knowledge}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-text/70 mb-2">
                    事業年度開始年月
                  </label>
                  <p className="text-text font-medium">
                    {setupData.fiscalYearStartYear || new Date().getFullYear()}
                    年{setupData.fiscalYearStartMonth}月
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        <div
          className={`grid grid-cols-1 ${
            isNotNormalAccount ? "" : "xl:grid-cols-1"
          } gap-6`}
        >
          {!isNotNormalAccount && <></>}
          {/* ユーザー情報設定 */}
          <div className="card">
            <div className="flex items-center space-x-2 mb-4">
              <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <h3 className="text-base sm:text-lg font-semibold text-text">
                ユーザー情報
              </h3>
            </div>

            {/* ★★★ formタグで囲む（autocomplete="off"を追加） ★★★ */}
            <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-4">
              {user?.role === "0" && (
                <div>
                  <label className="block text-sm text-text/70 mb-2 ">
                    会社名
                  </label>
                  <input
                    type="text"
                    name="company"
                    autoComplete="off"
                    value={setupData.companyName || ""}
                    onChange={(e) =>
                      setSetupData({
                        ...setupData,
                        companyName: e.target.value,
                      })
                    }
                    className="input-field w-full"
                    placeholder="会社名を入力してください"
                    disabled={isNotNormalAccount}
                    maxLength={50}
                  />
                  <p className="text-xs text-gray-500 mt-1 text-right">
                    {setupData.companyName?.length || 0}/50文字
                  </p>
                </div>
              )}

                <div>
                  <label className="block text-sm text-text/70 mb-1">
                    お名前<span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="text"
                    name="username"
                    autoComplete="off"
                    value={userInfo.name}
                    maxLength={50}
                    onChange={(e) => {
                      setUserInfo({ ...userInfo, name: e.target.value });
                      if (setupData) {
                        setSetupData({ ...setupData, userName: e.target.value });
                      }
                      if (validationErrors.userName) {
                        setValidationErrors({ ...validationErrors, userName: undefined });
                      }
                    }}
                    className={`input-field w-full ${
                      validationErrors.userName ? "border-red-500" : ""
                    }`}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1 text-right">
                    {userInfo.name?.length || 0}/50文字
                  </p>
                  {validationErrors.userName && (
                    <p className="text-xs text-red-600 mt-1">
                      {validationErrors.userName}
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm text-text/70 mb-1">
                    メールアドレス<span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    value={userInfo.email}
                    maxLength={100}
                    onChange={(e) => {
                      setUserInfo({ ...userInfo, email: e.target.value });
                      if (setupData) {
                        setSetupData({ ...setupData, email: e.target.value });
                      }
                      if (validationErrors.email) {
                        setValidationErrors({ ...validationErrors, email: undefined });
                      }
                    }}
                    className={`input-field w-full ${
                      validationErrors.email ? "border-red-500" : ""
                    }`}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1 text-right">
                    {userInfo.email?.length || 0}/100文字
                  </p>
                  {validationErrors.email && (
                    <p className="text-xs text-red-600 mt-1">
                      {validationErrors.email}
                    </p>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* パスワード変更 */}
          <div className="card">
            <div className="flex items-center space-x-2 mb-4">
              <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <h3 className="text-base sm:text-lg font-semibold text-text">
                パスワード変更
              </h3>
            </div>

            {/* ★★★ formタグで囲む（パスワード保存を有効化） ★★★ */}
            <form onSubmit={(e) => { e.preventDefault(); handleChangePassword(); }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-text/70 mb-2">
                    現在のパスワード
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      name="current-password"
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          currentPassword: e.target.value,
                        })
                      }
                      className="input-field w-full pr-10"
                      placeholder="現在のパスワードを入力"
                      autoComplete="current-password"
                      maxLength={100}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showCurrentPassword ? (
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
                  <p className="text-xs text-gray-500 mt-1 text-right">
                    {passwordData.currentPassword?.length || 0}/100文字
                  </p>
                </div>

                <div>
                  <label className="block text-sm text-text/70 mb-2">
                    新しいパスワード
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      name="new-password"
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          newPassword: e.target.value,
                        })
                      }
                      className="input-field w-full pr-10"
                      placeholder="新しいパスワードを入力"
                      autoComplete="new-password"
                      maxLength={100}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showNewPassword ? (
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
                  <p className="text-xs text-gray-500 mt-1 text-right">
                    {passwordData.newPassword?.length || 0}/100文字
                  </p>
                  <p className="text-xs text-text/50 mt-1">
                    8文字以上、英字と数字を含めて設定してください
                  </p>
                </div>

                <div>
                  <label className="block text-sm text-text/70 mb-2">
                    新しいパスワード(確認用)
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPasswordConfirm ? "text" : "password"}
                      name="new-password-confirm"
                      value={passwordData.newPasswordConfirm}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          newPasswordConfirm: e.target.value,
                        })
                      }
                      className="input-field w-full pr-10"
                      placeholder="新しいパスワードを再入力"
                      autoComplete="new-password"
                      maxLength={100}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowNewPasswordConfirm(!showNewPasswordConfirm)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showNewPasswordConfirm ? (
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
                  <p className="text-xs text-gray-500 mt-1 text-right">
                    {passwordData.newPasswordConfirm?.length || 0}/100文字
                  </p>
                  {passwordData.newPasswordConfirm && !checkPasswordMatch() && (
                    <p className="text-xs text-red-600 mt-1">
                      パスワードが一致しません
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="btn-primary w-full sm:w-auto flex items-center rounded-full justify-center space-x-2 text-sm"
                >
                  <Lock className="h-4 w-4" />
                  <span>パスワードを変更</span>
                </button>
              </div>
            </form>
          </div>
        </div>
        {/* ★★★ 退会セクション ★★★ */}
        <div className="card border-2 border-red-100">
          <div className="flex items-center space-x-2 mb-4">
            <UserX className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
            <h3 className="text-base sm:text-lg font-semibold text-red-600">
              アカウントの削除
            </h3>
          </div>

          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 mb-2">
                <strong>注意：</strong>この操作は取り消すことができません。
              </p>
              <ul className="text-xs text-red-700 space-y-1 list-disc list-inside">
                <li>すべてのデータが削除されます</li>
                <li>マンダラチャート、目標、実績データが失われます</li>
                <li>再度利用する場合は、新規登録が必要です</li>
              </ul>
            </div>

            <button
              onClick={handleDeleteAccount}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 text-sm px-4 py-2 border-2 border-red-500 text-red-600 rounded-full hover:bg-red-50 transition-colors"
            >
              <UserX className="h-4 w-4" />
              <span>退会する</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
