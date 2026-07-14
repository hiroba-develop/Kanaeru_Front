import React, { useState, useEffect } from "react";
import { Save, User, Building, Lock, UserX, Link2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { Service } from "../api/services/Service";
import { StripeService } from "../api/services/StripeService";
import { SlackService } from "../api/services/SlackService";
import { withErrorHandling } from "../utils/apiErrorHandler";
import CryptoJS from "crypto-js";
import PlanselectModal, { type PlanId } from "../components/PlanselectModal";
import type {
  InitialSetup,
  CompanySize,
  Industry,
  FinancialKnowledge,
} from "../types";
import type { SubscriptionSchema } from "../api/models/SubscriptionSchema";

const Settings: React.FC = () => {
  const { user, updateUserSetup, updateUser, logout, handlePlanUpgrade } = useAuth();
  const isNotNormalAccount = user?.role === "1" || user?.role === "2";

  const [setupData, setSetupData] = useState<InitialSetup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionSchema | null>(null);

  const [userInfo, setUserInfo] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const [validationErrors, setValidationErrors] = useState<{
    userName?: string;
    email?: string;
  }>({});

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    newPasswordConfirm: "",
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showNewPasswordConfirm, setShowNewPasswordConfirm] = useState(false);

  // モーダル用state
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [showWithdrawalConfirmModal, setShowWithdrawalConfirmModal] = useState(false);

  // Slack 連携
  const [slackUserId, setSlackUserId]         = useState("");
  const [slackUserIdSaved, setSlackUserIdSaved] = useState("");
  const [slackSaveStatus, setSlackSaveStatus]  = useState<"idle" | "saving" | "saved" | "error" | "duplicate">("idle");

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

  const getFinancialKnowledgeFromNumber = (knowledge: number): FinancialKnowledge => {
    const mapping: { [key: number]: FinancialKnowledge } = {
      1: "初心者",
      2: "基本レベル",
      3: "中級レベル",
      4: "上級レベル",
    };
    return mapping[knowledge] || "初心者";
  };

  const getCompanySizeNumber = (size: string): number => {
    switch (size) {
      case "個人事業主": return 1;
      case "法人（従業員1-5名）": return 2;
      case "法人（従業員6-20名）": return 3;
      case "法人（従業員21名以上）": return 4;
      default: return 1;
    }
  };

  const getIndustryNumber = (industry: string): number => {
    switch (industry) {
      case "IT・ソフトウェア": return 1;
      case "製造業": return 2;
      case "小売業": return 3;
      case "飲食業": return 4;
      case "サービス業": return 5;
      case "建設業": return 6;
      case "医療・福祉": return 7;
      case "教育": return 8;
      case "金融・保険": return 9;
      case "不動産": return 10;
      case "その他": return 11;
      default: return 1;
    }
  };

  const getFinancialKnowledgeNumber = (knowledge: string): number => {
    switch (knowledge) {
      case "初心者": return 1;
      case "基本レベル": return 2;
      case "中級レベル": return 3;
      case "上級レベル": return 4;
      default: return 1;
    }
  };

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

  const sha256 = (text: string): string => {
    return CryptoJS.SHA256(text).toString(CryptoJS.enc.Hex);
  };

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

  const checkPasswordMatch = (): boolean => {
    return passwordData.newPassword === passwordData.newPasswordConfirm;
  };

  const validateUserName = (userName: string): { isValid: boolean; message: string } => {
    if (!userName.trim()) {
      return { isValid: false, message: "ユーザー名を入力してください" };
    }
    return { isValid: true, message: "" };
  };

  const validateEmail = (email: string): { isValid: boolean; message: string } => {
    if (!email.trim()) {
      return { isValid: false, message: "メールアドレスを入力してください" };
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return { isValid: false, message: "正しいメールアドレスを入力してください" };
    }
    return { isValid: true, message: "" };
  };

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

        setSubscriptionInfo(response.subscriptionSchema ?? null);

        setUserInfo({
          name: userSchema.name || "",
          email: userSchema.email || "",
          phone: "",
        });

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
          fiscalYearStartYear: settingSchema?.fiscalYearStartYear || new Date().getFullYear(),
          fiscalYearStartMonth: settingSchema?.fiscalYearStartMonth || 4,
          currentAssets: 0,
          financialKnowledge: settingSchema?.financialKnowledge
            ? getFinancialKnowledgeFromNumber(Number(settingSchema.financialKnowledge))
            : "初心者",
          capital: settingSchema?.capital || 0,
        };

        setSetupData(convertedSetupData);

        // Slack ユーザーID 取得（バックエンド未実装時はスキップ）
        if (user.role === "0" || user.role === "3" || user.role === "4") {
          try {
            const slackRes = await SlackService.getSlackUserMapping(user.id);
            if (slackRes.responseStatus === 1 && slackRes.slackUserId) {
              setSlackUserId(slackRes.slackUserId);
              setSlackUserIdSaved(slackRes.slackUserId);
            }
          } catch {
            // バックエンド実装前のためエラーは無視
          }
        }
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

    setValidationErrors({});

    const userNameToValidate = userInfo.name.trim() || setupData.userName.trim();
    const userNameValidation = validateUserName(userNameToValidate);
    if (!userNameValidation.isValid) {
      setValidationErrors({ userName: userNameValidation.message });
      alert(userNameValidation.message);
      return;
    }

    const emailToSend = userInfo.email.trim() || setupData.email || "";
    const emailValidation = validateEmail(emailToSend);
    if (!emailValidation.isValid) {
      setValidationErrors({ email: emailValidation.message });
      alert(emailValidation.message);
      return;
    }

    try {
      setLoading(true);

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
          financialKnowledge: getFinancialKnowledgeNumber(setupData.financialKnowledge).toString(),
          fiscalYearStartYear: setupData.fiscalYearStartYear,
          fiscalYearStartMonth: setupData.fiscalYearStartMonth,
        },
      };

      const response = await withErrorHandling(() =>
        Service.putApiSettingUpdateUser(requestBody)
      );

      if (response.responseStatus === 1) {
        if (setupData) {
          const updatedSetupData: InitialSetup = { ...setupData };

          if (response.userSchema) {
            const updatedEmail = response.userSchema.email || emailToSend;
            const updatedName = response.userSchema.name || nameToSend;
            const updatedCompany = response.userSchema.company || updatedSetupData.companyName;

            setUserInfo({ name: updatedName, email: updatedEmail, phone: userInfo.phone });

            updatedSetupData.userName = updatedName;
            updatedSetupData.email = updatedEmail;
            updatedSetupData.companyName = updatedCompany;

            updateUser({ name: updatedName, email: updatedEmail });
          }

          if (response.settingSchema) {
            updatedSetupData.companySize = response.settingSchema.companySize
              ? getCompanySizeFromNumber(Number(response.settingSchema.companySize))
              : updatedSetupData.companySize;
            updatedSetupData.industry = response.settingSchema.industry
              ? getIndustryFromNumber(Number(response.settingSchema.industry))
              : updatedSetupData.industry;
            updatedSetupData.capital = response.settingSchema.capital ?? updatedSetupData.capital;
            updatedSetupData.financialKnowledge = response.settingSchema.financialKnowledge
              ? getFinancialKnowledgeFromNumber(Number(response.settingSchema.financialKnowledge))
              : updatedSetupData.financialKnowledge;
            updatedSetupData.fiscalYearStartYear =
              response.settingSchema.fiscalYearStartYear ?? updatedSetupData.fiscalYearStartYear;
            updatedSetupData.fiscalYearStartMonth =
              response.settingSchema.fiscalYearStartMonth ?? updatedSetupData.fiscalYearStartMonth;
          }

          setSetupData(updatedSetupData);
          updateUserSetup(updatedSetupData);
        }

        alert("設定を保存しました");
      } else {
        throw new Error("設定の保存に失敗しました");
      }
    } catch (err) {
      console.error("設定保存エラー:", err);
      if (err instanceof Error && !err.message.includes("401")) {
        alert("設定の保存中にエラーが発生しました");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
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

      const token = getCookie("authToken");
      if (!token) {
        alert("認証トークンが取得できません。再度ログインしてください。");
        setLoading(false);
        return;
      }

      const currentPasswordHash = sha256(passwordData.currentPassword);
      const newPasswordHash = sha256(passwordData.newPassword);

      const response = await withErrorHandling(() =>
        Service.putApiAuthUpdatePassword({
          currentPasswordHash,
          newPasswordHash,
        })
      );

      if (response.responseStatus === 1) {
        alert("パスワードを変更しました");
        setPasswordData({ currentPassword: "", newPassword: "", newPasswordConfirm: "" });
      } else {
        const errorMessage = response.message || "パスワードの変更に失敗しました";
        throw new Error(errorMessage);
      }
    } catch (err) {
      console.error("パスワード変更エラー:", err);
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
    setShowWithdrawalConfirmModal(true);
  };

  const handleDeleteAccountConfirmed = async () => {
    setShowWithdrawalConfirmModal(false);
    if (!user?.id) return;
    try {
      setLoading(true);
      const response = await withErrorHandling(() =>
        Service.deleteApiDeleteAccount(user.id)
      );
      if (response.responseStatus === 1) {
        setShowWithdrawalModal(true);
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

  const handleSaveSlackUserId = async () => {
    if (!user?.id || !slackUserId.trim()) return;
    setSlackSaveStatus("saving");
    try {
      const res = await SlackService.updateSlackUserMapping({
        userId: user.id,
        slackUserId: slackUserId.trim(),
      });
      if (res.responseStatus === 1) {
        setSlackUserIdSaved(slackUserId.trim());
        setSlackSaveStatus("saved");
        setTimeout(() => setSlackSaveStatus("idle"), 3000);
      } else {
        const msg = (res as any).message ?? "";
        const isDuplicate = /duplicate|already|conflict|重複|使用済|登録済/i.test(msg);
        setSlackSaveStatus(isDuplicate ? "duplicate" : "error");
        setTimeout(() => setSlackSaveStatus("idle"), 4000);
      }
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      setSlackSaveStatus(status === 409 ? "duplicate" : "error");
      setTimeout(() => setSlackSaveStatus("idle"), 4000);
    }
  };

  const handlePlanComplete = async (plan: PlanId) => {
    if (plan === "paid") {
      handlePlanUpgrade();
      setShowUpgradeModal(true);
      setShowPlanModal(false); // キャンセルAPIは呼ばない
    } else {
      await handlePlanModalClose(); // 無料プランの場合はキャンセルAPI実行
    }
  };
  // 途中でキャンセルした場合
  const handlePlanModalClose = async () => {
    setShowPlanModal(false);
    // incomplete状態のサブスクリプションがあればキャンセル
    if (user) {
      try {
        await StripeService.postApiStripeSubscriptionCancelIncomplete(user.id);
      } catch (err: any) {
        // 404はサブスクリプション未作成のため無視
        if (err?.status !== 404) {
          console.error("Stripeキャンセルエラー:", err);
        }
      }
    }
  };
  // 解約モーダル
  const handleCancelSubscription = async () => {
    if (!user?.id) return;
    try {
      setCancelLoading(true);
      await StripeService.postApiStripeSubscriptionCancel(user.id);
      setShowCancelModal(false);
      
      // サブスクリプション情報を再取得
      const response = await Service.getApiSettingUser(user.id);
      setSubscriptionInfo(response.subscriptionSchema ?? null);
      
      alert("解約手続きが完了しました。現在の契約期間終了まで引き続きご利用いただけます。");
    } catch (err) {
      console.error("解約エラー:", err);
      alert("解約処理中にエラーが発生しました。");
    } finally {
      setCancelLoading(false);
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
            <button onClick={() => window.location.reload()} className="mt-4 btn-primary">
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
                <h3 className="text-base sm:text-lg font-semibold text-text">基本情報</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-text/70 mb-2">会社規模</label>
                  <select
                    value={setupData.companySize}
                    onChange={(e) => setSetupData({ ...setupData, companySize: e.target.value as CompanySize })}
                    className="input-field w-full pr-8 appearance-none bg-white"
                    style={{
                      backgroundImage: 'url(\'data:image/svg+xml;utf8,<svg fill="black" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/><path d="M0 0h24v24H0z" fill="none"/></svg>\')',
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "calc(100% - 4px) center",
                      backgroundSize: "16px",
                    }}
                    disabled={isNotNormalAccount}
                  >
                    {companyTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-text/70 mb-2">業界</label>
                  <select
                    value={setupData.industry}
                    onChange={(e) => setSetupData({ ...setupData, industry: e.target.value as Industry })}
                    className="input-field w-full pr-8 appearance-none bg-white"
                    style={{
                      backgroundImage: 'url(\'data:image/svg+xml;utf8,<svg fill="black" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/><path d="M0 0h24v24H0z" fill="none"/></svg>\')',
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "calc(100% - 4px) center",
                      backgroundSize: "16px",
                    }}
                    disabled={isNotNormalAccount}
                  >
                    {industries.map((industry) => (
                      <option key={industry} value={industry}>{industry}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-text/70 mb-2">財務知識レベル</label>
                  <select
                    value={setupData.financialKnowledge}
                    onChange={(e) => setSetupData({ ...setupData, financialKnowledge: e.target.value as FinancialKnowledge })}
                    className="input-field w-full pr-8 appearance-none bg-white"
                    style={{
                      backgroundImage: 'url(\'data:image/svg+xml;utf8,<svg fill="black" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/><path d="M0 0h24v24H0z" fill="none"/></svg>\')',
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "calc(100% - 4px) center",
                      backgroundSize: "16px",
                    }}
                    disabled={isNotNormalAccount}
                  >
                    {knowledgeOptions.map((knowledge) => (
                      <option key={knowledge} value={knowledge}>{knowledge}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-text/70 mb-2">事業年度開始年月</label>
                  <p className="text-text font-medium">
                    {setupData.fiscalYearStartYear || new Date().getFullYear()}年{setupData.fiscalYearStartMonth}月
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        <div className={`grid grid-cols-1 ${isNotNormalAccount ? "" : "xl:grid-cols-1"} gap-6`}>
          {!isNotNormalAccount && <></>}

          {/* ユーザー情報 */}
          <div className="card">
            <div className="flex items-center space-x-2 mb-4">
              <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <h3 className="text-base sm:text-lg font-semibold text-text">ユーザー情報</h3>
            </div>

            <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
              <div className="space-y-4">
                {user?.role === "0" && (
                  <div>
                    <label className="block text-sm text-text/70 mb-2">会社名</label>
                    <input
                      type="text"
                      name="company"
                      autoComplete="off"
                      value={setupData.companyName || ""}
                      onChange={(e) => setSetupData({ ...setupData, companyName: e.target.value })}
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
                      if (setupData) setSetupData({ ...setupData, userName: e.target.value });
                      if (validationErrors.userName) setValidationErrors({ ...validationErrors, userName: undefined });
                    }}
                    className={`input-field w-full ${validationErrors.userName ? "border-red-500" : ""}`}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1 text-right">
                    {userInfo.name?.length || 0}/50文字
                  </p>
                  {validationErrors.userName && (
                    <p className="text-xs text-red-600 mt-1">{validationErrors.userName}</p>
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
                      if (setupData) setSetupData({ ...setupData, email: e.target.value });
                      if (validationErrors.email) setValidationErrors({ ...validationErrors, email: undefined });
                    }}
                    className={`input-field w-full ${validationErrors.email ? "border-red-500" : ""}`}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1 text-right">
                    {userInfo.email?.length || 0}/100文字
                  </p>
                  {validationErrors.email && (
                    <p className="text-xs text-red-600 mt-1">{validationErrors.email}</p>
                  )}
                </div>
              </div>
            </form>
          </div>
        {/* Slack 連携 */}
        {(user?.role === "0" || user?.role === "3" || user?.role === "4") && (
          <div className="card">
            <div className="flex items-center space-x-2 mb-4">
              <Link2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <h3 className="text-base sm:text-lg font-semibold text-text">Slack 連携</h3>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-text/60">
                Slack で目標を投稿すると自動で取込まれます。あなたの Slack メンバー ID を登録してください。
              </p>

              <div>
                <label className="block text-sm text-text/70 mb-1">
                  Slack メンバー ID
                  <span className="text-xs text-gray-400 ml-2">（例: U012AB3CD）</span>
                </label>
                <div className="flex gap-3 items-start">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={slackUserId}
                      onChange={(e) => {
                        setSlackUserId(e.target.value);
                        if (slackSaveStatus !== "idle") setSlackSaveStatus("idle");
                      }}
                      className="input-field w-full font-mono"
                      placeholder="U012AB3CD"
                      maxLength={20}
                      spellCheck={false}
                    />
                    <p className="text-xs text-text/50 mt-1">
                      Slack アプリ → プロフィール → ⋮（その他） →「メンバー ID をコピー」
                    </p>
                    {(slackSaveStatus === "error" || slackSaveStatus === "duplicate") && (
                      <p className="text-xs text-red-500 mt-1">
                        {slackSaveStatus === "duplicate"
                          ? "このSlackメンバーIDはすでに別のアカウントで使用されています。"
                          : "保存に失敗しました。しばらくしてから再度お試しください。"}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveSlackUserId}
                    disabled={
                      slackSaveStatus === "saving" ||
                      slackUserId.trim() === slackUserIdSaved ||
                      !slackUserId.trim()
                    }
                    className="flex-shrink-0 flex items-center justify-center gap-1.5 text-sm px-4 py-2 rounded-full font-semibold transition-all disabled:cursor-not-allowed"
                    style={{
                      background:
                        slackSaveStatus === "saved"
                          ? "#13AE67"
                          : slackSaveStatus === "error" || slackSaveStatus === "duplicate"
                          ? "#EF4444"
                          : slackUserId.trim() && slackUserId.trim() !== slackUserIdSaved
                          ? "var(--color-primary, #13AE67)"
                          : "#E5E7EB",
                      color:
                        slackSaveStatus === "saved" || slackSaveStatus === "error" || slackSaveStatus === "duplicate" || (slackUserId.trim() && slackUserId.trim() !== slackUserIdSaved)
                          ? "#fff"
                          : "#9CA3AF",
                    }}
                  >
                    {slackSaveStatus === "saving" && (
                      <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeDashoffset="15" />
                      </svg>
                    )}
                    {slackSaveStatus === "saved" && (
                      <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                    {slackSaveStatus === "saving"
                      ? "保存中..."
                      : slackSaveStatus === "saved"
                      ? "保存済み"
                      : "保存する"}
                  </button>
                </div>
              </div>

              {slackUserIdSaved && (
                <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "#f0faf6", border: "1px solid #bbf7d0" }}>
                  <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6L5 9L10 3" stroke="#13AE67" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <p className="text-xs font-medium" style={{ color: "#065f46" }}>
                    連携中: <span className="font-mono">{slackUserIdSaved}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

{/* プランセクション */}
{(user?.role === "0" || user?.role === "3" || user?.role === "4") && (
          <div className="card">
            <div className="flex items-center space-x-2 mb-4">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="9" fill="#F067A6" fillOpacity="0.15" />
                <path d="M5 9l3 3 5-5" stroke="#F067A6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <h3 className="text-base sm:text-lg font-semibold text-text">プラン変更</h3>
            </div>

            <div
              className="flex items-center justify-between p-4 rounded-xl mb-4"
              style={{
                background: user?.role === "4" ? "rgba(240,103,166,0.06)" : "#F9FAFB",
                border: `1px solid ${user?.role === "4" ? "#F067A6" : "#E5E7EB"}`,
              }}
            >
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {user?.role === "4" ? "有料プラン" : "無料プラン"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {user?.role === "4" ? "¥2,480 / 月（税込）" : "無料でご利用中"}
                </p>
                {/* サブスクリプション詳細（有料会員のみ） */}
                {user?.role === "4" && subscriptionInfo && (() => {
                  const isCancelingOrCanceled =
                    subscriptionInfo.cancelAtPeriodEnd ||
                    subscriptionInfo.status === "canceled";
                  const periodEndDate = subscriptionInfo.currentPeriodEnd
                    ? new Date(subscriptionInfo.currentPeriodEnd)
                    : null;
                  const isBeforePeriodEnd = periodEndDate ? periodEndDate > new Date() : false;
                  const formatDateJP = (d: Date) =>
                    `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, "0")}月${String(d.getDate()).padStart(2, "0")}日`;

                  const statusLabel = (() => {
                    if (subscriptionInfo.cancelAtPeriodEnd) return "解約申請済み";
                    if (subscriptionInfo.status === "canceled") return "解約済み";
                    if (subscriptionInfo.status === "active") return "有効";
                    if (subscriptionInfo.status === "past_due") return "支払い遅延";
                    if (subscriptionInfo.status === "incomplete") return "支払い未完了";
                    if (subscriptionInfo.status === "incomplete_expired") return "支払い期限切れ";
                    if (subscriptionInfo.status === "unpaid") return "未払い";
                    if (subscriptionInfo.status === "paused") return "一時停止中";
                    return subscriptionInfo.status ?? "";
                  })();

                  return (
                    <div className="mt-2 space-y-0.5">
                      {subscriptionInfo.createdAt && (
                        <p className="text-xs text-gray-500">
                          申込日：{formatDateJP(new Date(subscriptionInfo.createdAt))}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        ステータス：{statusLabel}
                      </p>
                      {isCancelingOrCanceled && periodEndDate && isBeforePeriodEnd && (
                        <p className="text-xs font-medium text-orange-600 mt-1">
                          {formatDateJP(periodEndDate)}まで有効
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
              <span
                className="text-xs font-bold px-3 py-1 rounded-full"
                style={{
                  background: user?.role === "4" ? "#F067A6" : "#E5E7EB",
                  color: user?.role === "4" ? "#fff" : "#6B7280",
                }}
              >
                {user?.role === "4" ? "PREMIUM" : "FREE"}
              </span>
            </div>

            {(user?.role === "0" || user?.role === "3") && (
              <button
                onClick={() => setShowPlanModal(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm px-5 py-2.5 rounded-full font-semibold text-white"
                style={{ background: "linear-gradient(135deg, #F067A6, #d44f8e)" }}
              >
                有料プランにアップグレード
              </button>
            )}

            {user?.role === "4" && (() => {
              const isCancelingOrCanceled =
                subscriptionInfo?.cancelAtPeriodEnd ||
                subscriptionInfo?.status === "canceled";
              return (
                <button
                  onClick={() => setShowCancelModal(true)}
                  disabled={!!isCancelingOrCanceled}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm px-4 py-2 border-2 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 disabled:border-gray-300 disabled:text-gray-400 border-red-500 text-red-600 hover:bg-red-50"
                >
                  解約する
                </button>
              );
            })()}
          </div>
        )}

          {/* パスワード変更 */}
          <div className="card">
            <div className="flex items-center space-x-2 mb-4">
              <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <h3 className="text-base sm:text-lg font-semibold text-text">パスワード変更</h3>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleChangePassword(); }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-text/70 mb-2">現在のパスワード</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      name="current-password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
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
                  <p className="text-xs text-gray-500 mt-1 text-right">
                    {passwordData.currentPassword?.length || 0}/100文字
                  </p>
                </div>

                <div>
                  <label className="block text-sm text-text/70 mb-2">新しいパスワード</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      name="new-password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
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
                  <p className="text-xs text-gray-500 mt-1 text-right">
                    {passwordData.newPassword?.length || 0}/100文字
                  </p>
                  <p className="text-xs text-text/50 mt-1">8文字以上、英字と数字を含めて設定してください</p>
                </div>

                <div>
                  <label className="block text-sm text-text/70 mb-2">新しいパスワード(確認用)</label>
                  <div className="relative">
                    <input
                      type={showNewPasswordConfirm ? "text" : "password"}
                      name="new-password-confirm"
                      value={passwordData.newPasswordConfirm}
                      onChange={(e) => setPasswordData({ ...passwordData, newPasswordConfirm: e.target.value })}
                      className="input-field w-full pr-10"
                      placeholder="新しいパスワードを再入力"
                      autoComplete="new-password"
                      maxLength={100}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPasswordConfirm(!showNewPasswordConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showNewPasswordConfirm ? (
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
                  <p className="text-xs text-gray-500 mt-1 text-right">
                    {passwordData.newPasswordConfirm?.length || 0}/100文字
                  </p>
                  {passwordData.newPasswordConfirm && !checkPasswordMatch() && (
                    <p className="text-xs text-red-600 mt-1">パスワードが一致しません</p>
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

        {/* 退会セクション */}
        <div className="card border-2 border-red-100">
          <div className="flex items-center space-x-2 mb-4">
            <UserX className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
            <h3 className="text-base sm:text-lg font-semibold text-red-600">アカウントの削除</h3>
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
                <li>有料プランをご利用中の場合、即時解約されます</li>
                <li>利用期間が残っている場合でも返金はされません</li>
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

      {/* プラン選択モーダル */}
      {showPlanModal && user && (
        <PlanselectModal
          isOpen={showPlanModal}
          onClose={handlePlanModalClose}
          onComplete={handlePlanComplete}
          userId={user.id}
          currentPlan="free"
        />
      )}

      {/* 解約確認モーダル */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black opacity-50" onClick={() => setShowCancelModal(false)} />
          <div className="relative bg-white rounded-3xl shadow-xl p-8 text-center" style={{ width: "100%", maxWidth: "400px" }}>
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: "#FEF2F2" }}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path d="M16 10v8M16 21v1" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">解約の確認</h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              解約すると現在の契約期間終了後に<br />無料プランに移行します。<br />この操作は取り消せません。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-3 rounded-full text-sm font-medium"
                style={{ background: "#F3F4F6", color: "#6B7280" }}
              >
                キャンセル
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={cancelLoading}
                className="flex-1 py-3 rounded-full text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "#EF4444" }}
              >
                {cancelLoading ? "処理中..." : "解約する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* アップグレード完了モーダル */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black opacity-50" onClick={() => setShowUpgradeModal(false)} />
          <div className="relative bg-white rounded-3xl shadow-xl p-8 text-center" style={{ width: "100%", maxWidth: "400px" }}>
            <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-5" style={{ background: "rgba(240,103,166,0.1)" }}>
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <path d="M8 20l8 8 16-16" stroke="#F067A6" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">アップグレード完了！🎉</h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              有料プランへの移行が完了しました。<br />メンターとの相談チャットや<br />アドバイス機能がご利用いただけます。
            </p>
            <button
              onClick={() => {
                setShowUpgradeModal(false);
                window.location.reload();
              }}
              className="w-full py-3 rounded-full font-semibold text-sm text-white"
              style={{ background: "linear-gradient(135deg, #F067A6, #d44f8e)" }}
            >
              さっそく使ってみる
            </button>
          </div>
        </div>
      )}

      {/* 退会確認モーダル */}
      {showWithdrawalConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black opacity-50" onClick={() => setShowWithdrawalConfirmModal(false)} />
          <div className="relative bg-white rounded-3xl shadow-xl p-8 text-center" style={{ width: "100%", maxWidth: "400px" }}>
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: "#FEF2F2" }}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path d="M16 10v8M16 21v1" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">退会の確認</h3>
            <p className="text-sm text-gray-500 mb-2 leading-relaxed">
              本当に退会しますか？<br />この操作は取り消すことができません。
            </p>
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-6 text-left">
              <ul className="text-xs text-red-700 space-y-1 list-disc list-inside">
                <li>すべてのデータが削除されます</li>
                <li>マンダラチャート、目標、実績データが失われます</li>
                <li>再度利用する場合は、新規登録が必要です</li>
                <li>有料プランをご利用中の場合、即時解約されます</li>
                <li>利用期間が残っている場合でも返金はされません</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowWithdrawalConfirmModal(false)}
                className="flex-1 py-3 rounded-full text-sm font-medium"
                style={{ background: "#F3F4F6", color: "#6B7280" }}
              >
                キャンセル
              </button>
              <button
                onClick={handleDeleteAccountConfirmed}
                className="flex-1 py-3 rounded-full text-sm font-semibold text-white"
                style={{ background: "#EF4444" }}
              >
                退会する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 退会完了モーダル */}
      {showWithdrawalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black opacity-50" />
          <div className="relative bg-white rounded-3xl shadow-xl p-8 text-center" style={{ width: "100%", maxWidth: "400px" }}>
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: "#F3F4F6" }}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path d="M8 16l6 6 10-10" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">退会処理が完了しました</h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              ご利用ありがとうございました。<br />またのご利用をお待ちしております。
            </p>
            <button
              onClick={async () => {
                setShowWithdrawalModal(false);
                await logout();
                window.location.href = "/login?reason=withdrawal";
              }}
              className="w-full py-3 rounded-full font-semibold text-sm text-white"
              style={{ background: "#6B7280" }}
            >
              ログイン画面へ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;