import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Navigate, Link, useNavigate } from "react-router-dom";
import CryptoJS from "crypto-js";
import { Service } from "../api/services/Service";
import { getCurrentJSTISOString } from "../utils/dateUtils";

import type {
  InitialSetup,
  CompanySize,
  Industry,
  FinancialKnowledge,
  SetupStep,
} from "../types";

// ── プランデータ ────────────────────────────────────────────────
type PlanId = "free" | "paid";

type Plan = {
  id: PlanId;
  label: string;
  badge: string;
  price: string;
  priceUnit: string;
  description: string;
  features: { text: string; included: boolean }[];
  recommended: boolean;
};

const plans: Plan[] = [
  {
    id: "free",
    label: "無料プラン",
    badge: "FREE",
    price: "¥0",
    priceUnit: "/ 月",
    description: "まずは気軽にはじめたい方へ",
    recommended: false,
    features: [
      { text: "マンダラ作成", included: true },
      { text: "損益管理（年次）", included: true },
      { text: "損益管理（月次）", included: true },
      { text: "メンターとの相談チャット", included: false },
      { text: "メンターからのアドバイス", included: false },
      { text: "画面カラーカスタマイズ", included: false },
    ],
  },
  {
    id: "paid",
    label: "有料プラン",
    badge: "PREMIUM",
    price: "¥2,480",
    priceUnit: "/ 月",
    description: "メンターサポートで成長を加速したい方へ",
    recommended: true,
    features: [
      { text: "マンダラ作成", included: true },
      { text: "損益管理（年次）", included: true },
      { text: "損益管理（月次）", included: true },
      { text: "メンターとの相談チャット", included: true },
      { text: "メンターからのアドバイス", included: true },
      { text: "画面カラーカスタマイズ", included: true },
    ],
  },
];

// ── アイコン ────────────────────────────────────────────────────
const CheckCircle = ({ color }: { color: string }) => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
    <circle cx="9" cy="9" r="9" fill={color} fillOpacity="0.12" />
    <path d="M5 9.5l3 3 5-5.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const LockCircle = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
    <circle cx="9" cy="9" r="9" fill="#E5E7EB" />
    <rect x="6" y="9" width="6" height="5" rx="1" fill="#9CA3AF" />
    <path d="M7 9V7a2 2 0 1 1 4 0v2" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// ── メインコンポーネント ────────────────────────────────────────
const Setup: React.FC = () => {
  const { user, completeSetup, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("free");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const [setupData, setSetupData] = useState<InitialSetup>({
    userName: "",
    email: "",
    companyName: "",
    phoneNumber: "",
    password: "",
    passwordConfirm: "",
    currentAssets: 0,
    companySize: "個人事業主",
    fiscalYearStartMonth: currentMonth,
    fiscalYearStartYear: currentYear,
    industry: "IT・ソフトウェア",
    financialKnowledge: "初心者",
  });

  if (user?.isSetupComplete) {
    return <Navigate to="/" replace />;
  }

  // ステップ定義（Stripe不要のシンプル5ステップ）
  const steps: SetupStep[] = [
    { id: 0, title: "ユーザー情報",   description: "あなたの基本情報を教えてください", completed: false },
    { id: 1, title: "基本情報",       description: "事業の基本情報を教えてください", completed: false },
    { id: 2, title: "経験・知識",     description: "あなたの事業経験を教えてください", completed: false },
    { id: 3, title: "入力内容の確認", description: "", completed: false },
  ];

  const companyTypes: CompanySize[] = [
    "個人事業主", "法人（従業員1-5名）", "法人（従業員6-20名）", "法人（従業員21名以上）",
  ];

  const industries: Industry[] = [
    "IT・ソフトウェア", "製造業", "小売業", "飲食業", "サービス業",
    "建設業", "医療・福祉", "教育", "金融・保険", "不動産", "その他",
  ];

  const knowledgeOptions: FinancialKnowledge[] = [
    "初心者", "基本レベル", "中級レベル", "上級レベル",
  ];

  const getCompanySizeNumber = (size: string): number => {
    const map: Record<string, number> = { "個人事業主": 1, "法人（従業員1-5名）": 2, "法人（従業員6-20名）": 3, "法人（従業員21名以上）": 4 };
    return map[size] ?? 1;
  };

  const getIndustryNumber = (industry: string): number => {
    const map: Record<string, number> = {
      "IT・ソフトウェア": 1, "製造業": 2, "小売業": 3, "飲食業": 4, "サービス業": 5,
      "建設業": 6, "医療・福祉": 7, "教育": 8, "金融・保険": 9, "不動産": 10, "その他": 11,
    };
    return map[industry] ?? 1;
  };

  const getFinancialKnowledgeNumber = (knowledge: string): number => {
    const map: Record<string, number> = { "初心者": 1, "基本レベル": 2, "中級レベル": 3, "上級レベル": 4 };
    return map[knowledge] ?? 1;
  };

  const sha256 = (text: string): string => CryptoJS.SHA256(text).toString(CryptoJS.enc.Hex);

  const validatePassword = (password: string): { isValid: boolean; message: string } => {
    if (password.length < 8) return { isValid: false, message: "パスワードは8文字以上で入力してください" };
    if (!/[0-9]/.test(password) || !/[a-zA-Z]/.test(password))
      return { isValid: false, message: "パスワードは英字と数字の両方を含む必要があります" };
    return { isValid: true, message: "" };
  };

  const checkPasswordMatch = (): boolean => setupData.password === setupData.passwordConfirm;

  const handleNext = async () => {
    if (currentStep === 1) {
      if (!setupData.userName.trim()) { alert("ユーザー名を入力してください"); return; }
      if (!setupData.email.trim()) { alert("メールアドレスを入力してください"); return; }
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(setupData.email)) { alert("正しいメールアドレスを入力してください"); return; }
      if (!setupData.password) { alert("パスワードを入力してください"); return; }
      const validation = validatePassword(setupData.password);
      if (!validation.isValid) { alert(validation.message); return; }
      if (!checkPasswordMatch()) { alert("パスワードが一致しません"); return; }
    }
    if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1);
  };

  const handlePrev = () => { if (currentStep > 0) setCurrentStep(currentStep - 1); };

  const handleComplete = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const passwordHash = sha256(setupData.password);
      const requestBody = {
        userSchema: {
          email: setupData.email,
          passwordHash,
          name: setupData.userName,
          company: setupData.companyName,
          role: "3", // 登録時は常に無料プラン（role=3）。有料化はPlanSelectModalで行う
          //termsAgreedAtはバックエンド側で設定
        },
        settingSchema: {
          companySize: getCompanySizeNumber(setupData.companySize).toString(),
          industry: getIndustryNumber(setupData.industry).toString(),
          capital: setupData.currentAssets,
          financialKnowledge: getFinancialKnowledgeNumber(setupData.financialKnowledge).toString(),
          fiscalYearStartYear: setupData.fiscalYearStartYear,
          fiscalYearStartMonth: setupData.fiscalYearStartMonth,
          plan: "free" as PlanId,
        },
      };

      const response = await Service.postApiAuthRegistrationUser(requestBody);
      if (response.responseStatus === 1) {
        completeSetup(setupData);
        // 登録完了後はダッシュボードへ遷移（PlanSelectModalはダッシュボード側で表示）
        navigate("/");
      } else {
        throw new Error("登録に失敗しました");
      }
    } catch (error: unknown) {
      console.error("セットアップエラー:", error);
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        setErrorMessage("サーバーに接続できませんでした。システム管理者にお問い合わせください。");
      } else if (error && typeof error === "object" && "status" in error) {
        const apiError = error as { status: number };
        if (apiError.status === 500) {
          setErrorMessage("サーバーエラーが発生しました。システム管理者にお問い合わせください。");
        } else {
          setErrorMessage("登録処理に失敗しました。システム管理者にお問い合わせください。");
        }
      } else {
        setErrorMessage("登録処理に失敗しました。システム管理者にお問い合わせください。");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── ステップ別コンテンツ ────────────────────────────────────
  const renderStepContent = () => {

    // ── 確認ステップ ──────────────────────────────────────────
    if (currentStep === steps.length - 1) {
      const selectedPlanData = plans.find((p) => p.id === selectedPlan)!;
      return (
        <div className="space-y-6">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-gray-600">
              入力内容に問題がなければ会員登録ボタンを押して登録をしてください。<br />
              ※まだ会員登録は完了していません
            </p>
          </div>
          {/* 入力内容確認 */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
            <div className="space-y-2">
              {[
                { label: "ユーザー名", value: setupData.userName },
                { label: "メールアドレス", value: setupData.email, breakAll: true },
                { label: "会社名", value: setupData.companyName },
                { label: "電話番号", value: setupData.phoneNumber },
                { label: "パスワード", value: "●●●●●●●●" },
                { label: "会社規模", value: setupData.companySize },
                { label: "業界", value: setupData.industry },
                { label: "財務知識", value: setupData.financialKnowledge },
                { label: "事業年度開始", value: `${setupData.fiscalYearStartYear}年${setupData.fiscalYearStartMonth}月` },
              ].map(({ label, value, breakAll }) => (
                <div key={label}>
                  <span className="text-gray-600">{label}:</span>
                  <p className={`mt-1 ${breakAll ? "break-all" : "break-words"}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 利用規約同意チェック */}
          <div
            className="flex items-start gap-3 rounded-xl p-4"
            style={{ background: "#F9FAFB", border: "1px solid #E5E7EB" }}
          >
            <input
              type="checkbox"
              id="terms-agree"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 cursor-pointer"
              style={{ accentColor: "#13AE67", flexShrink: 0 }}
            />
            <label
              htmlFor="terms-agree"
              className="text-sm text-gray-700 cursor-pointer leading-relaxed"
            >
              <Link to="/terms" target="_blank" className="font-medium underline" style={{ color: "#13AE67" }}>
                利用規約
              </Link>
              および
              <a
                href="https://etomoji.co.jp/privacy-policy/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline"
                style={{ color: "#13AE67" }}
              >
                プライバシーポリシー
              </a>
              に同意します<span className="text-red-500 ml-1">*</span>
            </label>
          </div>
        </div>
      );
    }

    switch (currentStep) {
      // ── STEP 0: ユーザー情報 ────────────────────────────────
      case 0:
        return (
          <form onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
            <input
              type="email" name="username" autoComplete="username"
              value={setupData.email}
              onChange={(e) => setSetupData({ ...setupData, email: e.target.value })}
              style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px" }}
              tabIndex={-1} aria-hidden="true"
            />
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ユーザー名<span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text" name="name" value={setupData.userName}
                  onChange={(e) => setSetupData({ ...setupData, userName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="お名前を入力してください" autoComplete="off" maxLength={50} required
                />
                <p className="text-xs text-gray-500 mt-1 text-right">{setupData.userName.length}/50文字</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  メールアドレス<span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="email" name="email" value={setupData.email}
                  onChange={(e) => setSetupData({ ...setupData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="example@example.com" autoComplete="email" maxLength={100} required
                />
                <p className="text-xs text-gray-500 mt-1 text-right">{setupData.email.length}/100文字</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">会社名</label>
                <input
                  type="text" name="organization" value={setupData.companyName}
                  onChange={(e) => setSetupData({ ...setupData, companyName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="会社名を入力してください" autoComplete="off" maxLength={50}
                />
                <p className="text-xs text-gray-500 mt-1 text-right">{setupData.companyName.length}/50文字</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">電話番号</label>
                <input
                  type="tel" name="tel" value={setupData.phoneNumber}
                  onChange={(e) => setSetupData({ ...setupData, phoneNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="電話番号を入力してください" autoComplete="off" maxLength={15}
                />
                <p className="text-xs text-gray-500 mt-1 text-right">{setupData.phoneNumber.length}/15文字</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  パスワード<span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"} name="password" value={setupData.password}
                    onChange={(e) => setSetupData({ ...setupData, password: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder="パスワードを入力してください" autoComplete="new-password" maxLength={100} required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
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
                  <p className="text-xs text-gray-500">8文字以上、英字と数字を含めて設定してください</p>
                  <p className="text-xs text-gray-500">{setupData.password.length}/100文字</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  パスワード（確認用）<span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPasswordConfirm ? "text" : "password"} name="password-confirm"
                    value={setupData.passwordConfirm}
                    onChange={(e) => setSetupData({ ...setupData, passwordConfirm: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder="パスワードを再入力してください" autoComplete="new-password" maxLength={100} required
                  />
                  <button type="button" onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
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
                    <p className="text-xs text-red-600">パスワードが一致しません</p>
                  )}
                  <p className="text-xs text-gray-500 text-right">{setupData.passwordConfirm.length}/100文字</p>
                </div>
              </div>
              <button type="submit" style={{ display: "none" }} />
            </div>
          </form>
        );

      // ── STEP 1: 基本情報 ────────────────────────────────────
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">会社規模</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {companyTypes.map((type) => (
                  <button key={type} onClick={() => setSetupData({ ...setupData, companySize: type })}
                    className={`p-3 sm:p-4 border rounded-lg text-left transition-colors ${
                      setupData.companySize === type ? "border-primary bg-primary/5 text-primary" : "border-gray-300 hover:border-gray-400"
                    }`}>
                    <div className="text-sm sm:text-base font-medium">{type}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">業界</label>
              <select value={setupData.industry}
                onChange={(e) => setSetupData({ ...setupData, industry: e.target.value as Industry })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary">
                {industries.map((industry) => (
                  <option key={industry} value={industry}>{industry}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">事業年度開始年月</label>
              <div className="grid grid-cols-2 gap-3">
                <select value={setupData.fiscalYearStartYear}
                  onChange={(e) => setSetupData({
                    ...setupData,
                    fiscalYearStartYear: parseInt(e.target.value),
                    fiscalYearStartMonth:
                      parseInt(e.target.value) === currentYear && setupData.fiscalYearStartMonth > currentMonth
                        ? currentMonth : setupData.fiscalYearStartMonth,
                  })}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary">
                  {Array.from({ length: 11 }, (_, i) => currentYear - 10 + i).map((year) => (
                    <option key={year} value={year}>{year}年</option>
                  ))}
                </select>
                <select value={setupData.fiscalYearStartMonth}
                  onChange={(e) => setSetupData({ ...setupData, fiscalYearStartMonth: parseInt(e.target.value) })}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary">
                  {Array.from(
                    { length: setupData.fiscalYearStartYear === currentYear ? currentMonth : 12 },
                    (_, i) => i + 1
                  ).map((month) => (
                    <option key={month} value={month}>{month}月</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        );

      // ── STEP 2: 経験・知識 ──────────────────────────────────
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">財務・会計の知識レベル</label>
              <div className="space-y-2">
                {knowledgeOptions.map((knowledge) => (
                  <label key={knowledge} className="flex items-center">
                    <input type="radio" name="knowledge" value={knowledge}
                      checked={setupData.financialKnowledge === knowledge}
                      onChange={(e) => setSetupData({ ...setupData, financialKnowledge: e.target.value as FinancialKnowledge })}
                      className="mr-3 text-primary focus:ring-primary"
                    />
                    <span>{knowledge}</span>
                  </label>
                ))}
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
          <p className="text-gray-600">{isLoading ? "設定を保存中..." : "読み込み中..."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-accent/5 py-4 sm:py-8 px-4">
      <div className="max-w-2xl mx-auto">

        {/* ── ヘッダー ── */}
        <div className="text-center mb-6 sm:mb-8">
          <Link to="/login" className="inline-block">
            <div className="mx-auto h-24 w-24 sm:h-40 sm:w-40 flex items-center justify-center mb-6">
              <div
                className="w-full h-full bg-contain bg-no-repeat bg-center"
                style={{ backgroundImage: "url(src/assets/header_icon.png)" }}
                role="img" aria-label="kanaeru"
              />
            </div>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">会員登録</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-2">
            あなたの事業に合わせて年次PLやマンダラを作成するための設定です
          </p>
        </div>

        {/* ── プログレスバー ── */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full text-xs sm:text-sm font-medium ${
                  index <= currentStep ? "bg-primary text-white" : "bg-gray-200 text-gray-600"
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
            ステップ {currentStep + 1} / {steps.length}: {steps[currentStep].title}
          </p>
        </div>

        {/* ── エラーメッセージ ── */}
        {errorMessage && (
          <div
            className="mb-4 p-4 rounded-xl flex items-start gap-3"
            style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="9" cy="9" r="9" fill="#EF4444" fillOpacity="0.12" />
              <path d="M9 5v4M9 12v1" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-700">{errorMessage}</p>
              <p className="text-xs text-red-500 mt-0.5">
                お問い合わせ先：<a href="mailto:kanaeru@etomoji.co.jp" className="underline">kanaeru@etomoji.co.jp</a>
              </p>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-600">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}

        {/* ── メインコンテンツ ── */}
        <div className="bg-white rounded-lg shadow-xl p-4 sm:p-8 mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
            {steps[currentStep].title}
          </h2>
          {steps[currentStep].description && (
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
              {steps[currentStep].description}
            </p>
          )}
          {renderStepContent()}
        </div>

        {/* ── ナビゲーションボタン ── */}
        <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0">
          {currentStep === 0 ? (
            <Link
              to="/login"
              className="px-4 sm:px-6 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm sm:text-base text-center"
              style={{ borderRadius: 9999 }}
            >
              戻る
            </Link>
          ) : (
            <button
              onClick={handlePrev}
              className="px-4 sm:px-6 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm sm:text-base"
              style={{ borderRadius: 9999 }}
            >
              戻る
            </button>
          )}

          {currentStep < steps.length - 1 ? (
            <button
              onClick={handleNext}
              disabled={isLoading}
              className="px-4 sm:px-6 py-2 text-white text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "#13AE67", borderRadius: 9999 }}
              onMouseEnter={(e) => !isLoading && (e.currentTarget.style.background = "#0f9457")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#13AE67")}
            >
              {isLoading ? "処理中..." : "次へ"}
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={isLoading || !agreedToTerms}
              className="px-4 sm:px-6 py-2 text-white disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              style={{
                background: agreedToTerms ? "#13AE67" : "#9CA3AF",
                borderRadius: 9999,
              }}
              onMouseEnter={(e) => agreedToTerms && (e.currentTarget.style.background = "#0f9457")}
              onMouseLeave={(e) => (e.currentTarget.style.background = agreedToTerms ? "#13AE67" : "#9CA3AF")}
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