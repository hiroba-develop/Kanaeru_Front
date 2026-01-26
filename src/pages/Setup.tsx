import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Navigate, Link, useNavigate } from "react-router-dom";
import CryptoJS from "crypto-js";
import { Service } from "../api/services/Service"; 

import type {
  InitialSetup,
  CompanySize,
  Industry,
  FinancialKnowledge,
  SetupStep,
} from "../types";

const Setup: React.FC = () => {
  const {
    user,
    completeSetup,
    isLoading: authLoading,
  } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // 1-12

  const [setupData, setSetupData] = useState<InitialSetup>({
    userName: "",
    email: "",
    companyName: "",
    phoneNumber: "",
    password: "",
    passwordConfirm: "",
    currentAssets: 0,
    companySize: "個人事業主",
    fiscalYearStartMonth: currentMonth, // 現在の月を初期値に
    fiscalYearStartYear: currentYear,   // 現在の年を初期値に
    industry: "IT・ソフトウェア",
    financialKnowledge: "初心者",
  });

  // 既にログイン済みの場合はダッシュボードへ
  if (user?.isSetupComplete) {
    return <Navigate to="/" replace />;
  }

  const steps: SetupStep[] = [
    {
      id: 0,
      title: "ユーザー情報",
      description: "あなたの基本情報を教えてください",
      completed: false,
    },
    {
      id: 1,
      title: "基本情報",
      description: "事業の基本情報を教えてください",
      completed: false,
    },
    {
      id: 2,
      title: "経験・知識",
      description: "あなたの事業経験を教えてください",
      completed: false,
    },
    {
      id: 3,
      title: "入力内容の確認",
      description: "",
      completed: false,
    },
  ];

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

  // パスワードをSHA-256でハッシュ化
  const sha256 = (text: string): string => {
    return CryptoJS.SHA256(text).toString(CryptoJS.enc.Hex);
  };

  // パスワードのバリデーション
  const validatePassword = (password: string): { isValid: boolean; message: string } => {
    if (password.length < 8) {
      return { isValid: false, message: "パスワードは8文字以上で入力してください" };
    }
    
    const hasNumber = /[0-9]/.test(password);
    const hasLetter = /[a-zA-Z]/.test(password);
    
    if (!hasNumber || !hasLetter) {
      return { isValid: false, message: "パスワードは英字と数字の両方を含む必要があります" };
    }
    
    return { isValid: true, message: "" };
  };

  // パスワードの一致チェック
  const checkPasswordMatch = (): boolean => {
    return setupData.password === setupData.passwordConfirm;
  };

  const handleNext = () => {
    // ステップ0（ユーザー情報）で必須チェックとパスワードの検証
    if (currentStep === 0) {
      // 必須項目チェック
      if (!setupData.userName.trim()) {
        alert("ユーザー名を入力してください");
        return;
      }
      
      if (!setupData.email.trim()) {
        alert("メールアドレスを入力してください");
        return;
      }
      
      // メールアドレスの形式チェック
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(setupData.email)) {
        alert("正しいメールアドレスを入力してください");
        return;
      }
      
      if (!setupData.password) {
        alert("パスワードを入力してください");
        return;
      }
      
      const validation = validatePassword(setupData.password);
      if (!validation.isValid) {
        alert(validation.message);
        return;
      }
      
      if (!checkPasswordMatch()) {
        alert("パスワードが一致しません");
        return;
      }
    }
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      setIsLoading(true);
  
      // パスワードをハッシュ化
      const passwordHash = sha256(setupData.password);
  
      // UserSchemaとSettingSchemaに分けてリクエストボディを作成
      const requestBody = {
        userSchema: {
          email: setupData.email,
          passwordHash: passwordHash,
          name: setupData.userName,
          company: setupData.companyName,
          role: "0", // 一般ユーザー
        },
        settingSchema: {
          companySize: getCompanySizeNumber(setupData.companySize).toString(),
          industry: getIndustryNumber(setupData.industry).toString(),
          capital: setupData.currentAssets,
          financialKnowledge: getFinancialKnowledgeNumber(setupData.financialKnowledge).toString(),
          fiscalYearStartYear: setupData.fiscalYearStartYear,
          fiscalYearStartMonth: setupData.fiscalYearStartMonth,
        },
      };
  
      console.log("送信データ（パスワードはハッシュ化済み）:", requestBody);
  
      // APIを呼び出してユーザー登録
      const response = await Service.postApiAuthRegistrationUser(requestBody);
  
      if (response.responseStatus === 1) {
        // 登録成功時、設定完了（ローカル状態の更新には元のsetupDataを使用）
        completeSetup(setupData);
        
        // 成功メッセージを表示
        alert("会員登録が完了しました。ログイン画面に移動します。");
        
        // ログイン画面に遷移
        navigate("/login");
      } else {
        throw new Error("登録に失敗しました");
      }
    } catch (error) {
      console.error("セットアップエラー:", error);
      alert("設定の保存中にエラーが発生しました。もう一度お試しください。");
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // ユーザー情報
      return (
        <form onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
          {/* ブラウザ用の隠しフィールド（パスワードマネージャーに正しく認識させる） */}
          <input
            type="email"
            name="username"
            autoComplete="username"
            value={setupData.email}
            onChange={(e) => setSetupData({ ...setupData, email: e.target.value })}
            style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px' }}
            tabIndex={-1}
            aria-hidden="true"
          />
          
          <div className="space-y-6">
            {/* ユーザー名（表示順は変更なし） */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ユーザー名<span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={setupData.userName}
                onChange={(e) =>
                  setSetupData({ ...setupData, userName: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                placeholder="お名前を入力してください"
                autoComplete="off"
                maxLength={50}
                required
              />
              <p className="text-xs text-gray-500 mt-1 text-right">
                {setupData.userName.length}/50文字
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
                value={setupData.email}
                onChange={(e) =>
                  setSetupData({ ...setupData, email: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                placeholder="example@example.com"
                autoComplete="email"
                maxLength={100}
                required
              />
              <p className="text-xs text-gray-500 mt-1 text-right">
                {setupData.email.length}/100文字
              </p>
            </div>

            {/* 会社名 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                会社名
              </label>
              <input
                type="text"
                name="organization"
                value={setupData.companyName}
                onChange={(e) =>
                  setSetupData({ ...setupData, companyName: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                placeholder="会社名を入力してください"
                autoComplete="off"
                maxLength={50}
              />
              <p className="text-xs text-gray-500 mt-1 text-right">
                {setupData.companyName.length}/50文字
              </p>
            </div>

            {/* 電話番号 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                電話番号
              </label>
              <input
                type="tel"
                name="tel"
                value={setupData.phoneNumber}
                onChange={(e) =>
                  setSetupData({ ...setupData, phoneNumber: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                placeholder="電話番号を入力してください"
                autoComplete="off"
                maxLength={15}
              />
              <p className="text-xs text-gray-500 mt-1 text-right">
                {setupData.phoneNumber.length}/15文字
              </p>
            </div>

            {/* パスワード */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                パスワード<span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={setupData.password}
                  onChange={(e) =>
                    setSetupData({ ...setupData, password: e.target.value })
                  }
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="パスワードを入力してください"
                  autoComplete="new-password"
                  maxLength={100}
                  required
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
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs text-gray-500">
                  8文字以上、英字と数字を含めて設定してください
                </p>
                <p className="text-xs text-gray-500">
                  {setupData.password.length}/100文字
                </p>
              </div>
            </div>

            {/* パスワード確認 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                パスワード（確認用）<span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPasswordConfirm ? "text" : "password"}
                  name="password-confirm"
                  value={setupData.passwordConfirm}
                  onChange={(e) =>
                    setSetupData({ ...setupData, passwordConfirm: e.target.value })
                  }
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="パスワードを再入力してください"
                  autoComplete="new-password"
                  maxLength={100}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPasswordConfirm ? (
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
              <div className="mt-1">
                {setupData.passwordConfirm && !checkPasswordMatch() && (
                  <p className="text-xs text-red-600">
                    パスワードが一致しません
                  </p>
                )}
                <p className="text-xs text-gray-500 text-right">
                  {setupData.passwordConfirm.length}/100文字
                </p>
              </div>
            </div>

            {/* 隠しsubmitボタン */}
            <button type="submit" style={{ display: 'none' }} />
          </div>
        </form>
      );

      case 1: // 基本情報
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                会社規模
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {companyTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() =>
                      setSetupData({ ...setupData, companySize: type })
                    }
                    className={`p-3 sm:p-4 border rounded-lg text-left transition-colors ${
                      setupData.companySize === type
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    <div className="text-sm sm:text-base font-medium">
                      {type}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              >
                {industries.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                事業年度開始年月
              </label>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={setupData.fiscalYearStartYear}
                  onChange={(e) =>
                    setSetupData({
                      ...setupData,
                      fiscalYearStartYear: parseInt(e.target.value),
                      // 年が変更された時、月の制限を考慮
                      fiscalYearStartMonth:
                        parseInt(e.target.value) === currentYear &&
                        setupData.fiscalYearStartMonth > currentMonth
                          ? currentMonth
                          : setupData.fiscalYearStartMonth,
                    })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                >
                  {Array.from(
                    { length: 11 },
                    (_, i) => currentYear - 10 + i
                  ).map((year) => (
                    <option key={year} value={year}>
                      {year}年
                    </option>
                  ))}
                </select>
                <select
                  value={setupData.fiscalYearStartMonth}
                  onChange={(e) =>
                    setSetupData({
                      ...setupData,
                      fiscalYearStartMonth: parseInt(e.target.value),
                    })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                >
                  {Array.from(
                    {
                      length:
                        setupData.fiscalYearStartYear === currentYear
                          ? currentMonth
                          : 12,
                    },
                    (_, i) => i + 1
                  ).map((month) => (
                    <option key={month} value={month}>
                      {month}月
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        );

      case 2: // 経験・知識
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                財務・会計の知識レベル
              </label>
              <div className="space-y-2">
                {knowledgeOptions.map((knowledge) => (
                  <label key={knowledge} className="flex items-center">
                    <input
                      type="radio"
                      name="knowledge"
                      value={knowledge}
                      checked={setupData.financialKnowledge === knowledge}
                      onChange={(e) =>
                        setSetupData({
                          ...setupData,
                          financialKnowledge: e.target
                            .value as FinancialKnowledge,
                        })
                      }
                      className="mr-3 text-primary focus:ring-primary"
                    />
                    <span>{knowledge}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );

        case 3: // 設定完了
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="h-8 w-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
              </div>
              <p className="text-gray-600">
                入力内容に問題がなければ会員登録ボタンを押して登録をしてください。<br/>
                ※まだ会員登録は完了していません
              </p>
            </div>
      
            <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
              <div className="space-y-2">
                <div>
                  <span className="text-gray-600">ユーザー名:</span>
                  <p className="break-words mt-1">{setupData.userName}</p>
                </div>
                <div>
                  <span className="text-gray-600">メールアドレス:</span>
                  <p className="break-all mt-1">{setupData.email}</p>
                </div>
                <div>
                  <span className="text-gray-600">会社名:</span>
                  <p className="break-words mt-1">{setupData.companyName}</p>
                </div>
                <div>
                  <span className="text-gray-600">電話番号:</span>
                  <p className="break-all mt-1">{setupData.phoneNumber}</p>
                </div>
                <div>
                  <span className="text-gray-600">パスワード:</span>
                  <p className="mt-1">●●●●●●●●</p>
                </div>
                <div>
                  <span className="text-gray-600">会社規模:</span>
                  <p className="break-words mt-1">{setupData.companySize}</p>
                </div>
                <div>
                  <span className="text-gray-600">業界:</span>
                  <p className="break-words mt-1">{setupData.industry}</p>
                </div>
                <div>
                  <span className="text-gray-600">財務知識:</span>
                  <p className="break-words mt-1">{setupData.financialKnowledge}</p>
                </div>
                <div>
                  <span className="text-gray-600">事業年度開始:</span>
                  <p className="break-words mt-1">
                    {setupData.fiscalYearStartYear}年
                    {setupData.fiscalYearStartMonth}月
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-600">
            {isLoading ? "設定を保存中..." : "読み込み中..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-accent/5 py-4 sm:py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-6 sm:mb-8">
          <Link to="/login" className="inline-block">
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
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            会員登録
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-2">
          あなたの事業に合わせて年次PLやマンダラを作成するための設定です
          </p>
        </div>

        {/* プログレスバー */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full text-xs sm:text-sm font-medium ${
                  index <= currentStep
                    ? "bg-primary text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {index + 1}
              </div>
            ))}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
          <p className="text-xs sm:text-sm text-gray-600 mt-2 text-center">
            ステップ {currentStep + 1} / {steps.length}:{" "}
            {steps[currentStep].title}
          </p>
        </div>

        {/* メインコンテンツ */}
        <div className="bg-white rounded-lg shadow-xl p-4 sm:p-8 mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
            {steps[currentStep].title}
          </h2>
          <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
            {steps[currentStep].description}
          </p>

          {renderStepContent()}
        </div>

        {/* ナビゲーションボタン */}
        <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0">
          {currentStep === 0 ? (
            <Link
              to="/login"
              className="px-4 sm:px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm sm:text-base text-center"
            >
              戻る
            </Link>
          ) : (
            <button
              onClick={handlePrev}
              className="px-4 sm:px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm sm:text-base"
            >
              戻る
            </button>
          )}

          {currentStep < steps.length - 1 ? (
            <button
              onClick={handleNext}
              className="px-4 sm:px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90 text-sm sm:text-base"
            >
              次へ
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={isLoading}
              className="px-4 sm:px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {isLoading ? "登録中..." : "会員登録"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Setup;