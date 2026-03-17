import React, { useState, useRef, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { StripeService } from "../api/services/StripeService";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY ?? "pk_test_xxxxxx")
  .catch(() => null);

// ── 型定義 ────────────────────────────────────────────────────
export type PlanId = "free" | "paid";

export interface PlanSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  // ログイン中ユーザーのID（Stripe Customer作成に使用）
  userId: string;
  // 現在のプラン（設定画面からの変更時に使用）
  currentPlan?: PlanId;
  // プラン選択完了後のコールバック
  onComplete?: (plan: PlanId) => void;
}

// ── アイコン ────────────────────────────────────────────────
const CheckIcon = ({ color }: { color: string }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <circle cx="8" cy="8" r="8" fill={color} fillOpacity="0.12" />
    <path d="M4.5 8.5l2.5 2.5 4.5-5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <circle cx="8" cy="8" r="8" fill="#E5E7EB" />
    <rect x="5.5" y="8" width="5" height="4" rx="0.8" fill="#9CA3AF" />
    <path d="M6.5 8V6.5a1.5 1.5 0 1 1 3 0V8" stroke="#9CA3AF" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

// ── プランデータ ──────────────────────────────────────────────
const features = [
  { text: "マンダラ作成", free: true },
  { text: "損益管理（年次／月次）", free: true },
  { text: "メンターとの相談チャット", free: false },
  { text: "メンターからのアドバイス", free: false },
];

// ── Stripe決済フォーム（Elements内側） ───────────────────────
interface StripeFormProps {
  onReady: (handlers: {
    createConfirmationToken: () => Promise<{ tokenId?: string; error?: string }>;
  }) => void;
  onLoadError: (message: string) => void;
}

const StripeForm: React.FC<StripeFormProps> = ({ onReady, onLoadError }) => {
  const stripe = useStripe();
  const elements = useElements();

  useEffect(() => {
    if (!stripe || !elements) return;
    onReady({
      createConfirmationToken: async () => {
        const { error: submitError } = await elements.submit();
        if (submitError) {
          return { error: submitError.message ?? "決済情報の検証に失敗しました" };
        }
        const { confirmationToken, error } = await stripe.createConfirmationToken({ elements });
        if (error) {
          return { error: error.message ?? "決済情報の取得に失敗しました" };
        }
        return { tokenId: confirmationToken.id };
      },
    });
  }, [stripe, elements, onReady]);

  return (
    <div className="space-y-4">
      <PaymentElement
        options={{
          layout: "tabs",
          fields: { billingDetails: { name: "auto" } },
        }}
        onLoadError={(event) => {
          onLoadError(event.error?.message ?? "決済フォームの読み込みに失敗しました。システム管理者にお問い合わせください。");
        }}
      />
      <div
        className="flex items-start gap-2 rounded-lg p-3"
        style={{ background: "#F9FAFB", border: "1px solid #E5E7EB" }}
      >
        <svg width="14" height="14" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
          <path d="M9 1.5L2.25 4.5v4.5C2.25 12.6 5.19 16.05 9 17.25c3.81-1.2 6.75-4.65 6.75-8.25V4.5L9 1.5z" stroke="#9CA3AF" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M6.75 9l1.5 1.5 3-3" stroke="#13AE67" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="text-xs text-gray-500">
          お支払い情報はStripeによって保護されます。カード情報は当社サーバーには保存されません。
        </p>
      </div>
    </div>
  );
};

// ── メインモーダルコンポーネント ──────────────────────────────
const PlanSelectModal: React.FC<PlanSelectModalProps> = ({
  isOpen,
  onClose,
  userId,
  currentPlan = "free",
  onComplete,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<PlanId>(currentPlan);
  const [step, setStep] = useState<"select" | "payment" | "processing" | "done">("select");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [confirmationTokenId, setConfirmationTokenId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stripeHandlersRef = useRef<{
    createConfirmationToken: () => Promise<{ tokenId?: string; error?: string }>;
  } | null>(null);

  // モーダルが開くたびに初期化
  useEffect(() => {
    if (isOpen) {
      setSelectedPlan(currentPlan);
      setStep("select");
      setClientSecret(null);
      setConfirmationTokenId(null);
      setError(null);
    }
  }, [isOpen, currentPlan]);

  // ESCキーで閉じる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // 有料プランを選択して「次へ」
  const handleSelectPaid = async () => {
    if (selectedPlan === "free") {
      onComplete?.("free");
      onClose();
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const data = await StripeService.postApiStripeSubscriptionCreate(
        userId,
        { userId }
      );
      setClientSecret(data.clientSecret ?? null);
      setStep("payment");
    } catch (err: unknown) {
      if (err instanceof TypeError && err.message === "Failed to fetch") {
        setError("サーバーに接続できませんでした。システム管理者にお問い合わせください。");
      } else if (err && typeof err === "object" && "status" in err) {
        const apiError = err as { status: number };
        if (apiError.status === 409) {
          setError("既にサブスクリプションが存在します。システム管理者にお問い合わせください。");
        } else {
          setError("決済の初期化に失敗しました。システム管理者にお問い合わせください。");
        }
      } else {
        setError("決済の初期化に失敗しました。システム管理者にお問い合わせください。");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 決済情報確認して「登録する」
  const handlePayment = async () => {
    if (!stripeHandlersRef.current) {
      setError("決済フォームの準備ができていません。しばらくお待ちください。");
      return;
    }
    try {
      setIsLoading(true);
      setError(null);

      // ConfirmationToken作成
      const result = await stripeHandlersRef.current.createConfirmationToken();
      if (result.error) {
        setError(result.error);
        return;
      }
      setConfirmationTokenId(result.tokenId ?? null);

      // Stripe決済確定
      const stripeInstance = await stripePromise;
      if (!stripeInstance) {
        setError("決済システムの初期化に失敗しました。システム管理者にお問い合わせください。");
        return;
      }
      const { error: confirmError } = await stripeInstance.confirmPayment({
        clientSecret: clientSecret!,
        confirmParams: {
          return_url: window.location.origin,
          confirmation_token: result.tokenId!,
        },
        redirect: "if_required",
      });
      if (confirmError) {
        setError(confirmError.message ?? "決済に失敗しました。システム管理者にお問い合わせください。");
        return;
      }

      setStep("done");
      onComplete?.("paid");
    } catch {
      setError("決済処理に失敗しました。システム管理者にお問い合わせください。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // オーバーレイ
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full bg-white sm:rounded-2xl shadow-2xl overflow-hidden rounded-t-2xl"
        style={{ maxWidth: 520, maxHeight: "92vh", overflowY: "auto" }}
      >
        {/* ── ドラッグハンドル（スマホのみ） ── */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
        <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>
        {/* ── ヘッダー ── */}
        <div className="px-4 sm:px-6 pt-3 sm:pt-6 pb-3 sm:pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                {step === "select" && "プランを変更できるようになりました"}
                {step === "payment" && "お支払い情報の入力"}
                {step === "done" && "登録完了"}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
              {step === "select" && (
                <>
                    有料プランでは、メンターとの相談チャットや<br />
                    アドバイスが受け取れるようになります
                </>
                )}
                {step === "payment" && "有料プラン ¥2,480 / 月（税込）"}
                {step === "done" && "有料プランへのアップグレードが完了しました"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* ステップインジケーター */}
          {step !== "done" && (
            <div className="flex items-center gap-2 mt-4">
              {["select", "payment"].map((s, i) => (
                <React.Fragment key={s}>
                  <div
                    className="flex items-center gap-1.5"
                    style={{ opacity: step === s ? 1 : 0.4 }}
                  >
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{
                        background: step === s ? "#13AE67" : "#E5E7EB",
                        color: step === s ? "#fff" : "#9CA3AF",
                      }}
                    >
                      {i + 1}
                    </div>
                    <span className="text-xs text-gray-500">
                      {s === "select" ? "プラン選択" : "お支払い"}
                    </span>
                  </div>
                  {i === 0 && (
                    <div className="flex-1 h-px" style={{ background: "#E5E7EB" }} />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* ── コンテンツ ── */}
        <div className="px-4 sm:px-6 py-4 sm:py-5">

          {/* エラー表示 */}
          {error && (
            <div
              className="mb-4 p-3 rounded-xl flex items-start gap-2"
              style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="8" cy="8" r="8" fill="#EF4444" fillOpacity="0.12" />
                <path d="M8 4.5v4M8 10.5v.5" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          {/* ── STEP: プラン選択 ── */}
          {step === "select" && (
            <div className="space-y-3">
              {/* 無料プラン */}
              <button
                type="button"
                onClick={() => setSelectedPlan("free")}
                className="w-full text-left transition-all duration-200"
                style={{
                  border: `2px solid ${selectedPlan === "free" ? "#13AE67" : "#E5E7EB"}`,
                  borderRadius: 14,
                  padding: "12px 14px",
                  background: selectedPlan === "free" ? "rgba(19,174,103,0.03)" : "#fff",
                  boxShadow: selectedPlan === "free" ? "0 4px 16px rgba(19,174,103,0.12)" : "0 1px 4px rgba(0,0,0,0.06)",
                  cursor: "pointer",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      style={{
                        width: 18, height: 18, borderRadius: "50%",
                        border: `2px solid ${selectedPlan === "free" ? "#13AE67" : "#D1D5DB"}`,
                        background: selectedPlan === "free" ? "#13AE67" : "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, transition: "all 0.2s",
                      }}
                    >
                      {selectedPlan === "free" && (
                        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                          <path d="M1.5 4.5l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <span className="text-xs font-semibold rounded-full px-2 py-0.5" style={{ background: "#F3F4F6", color: "#6B7280" }}>FREE</span>
                      <p className="font-bold text-gray-900 text-sm mt-0.5">無料プラン</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-xl text-gray-800">¥0</span>
                    <span className="text-gray-400 text-xs"> / 月</span>
                  </div>
                </div>
                <ul className="space-y-1.5">
                  {features.map((f) => (
                    <li key={f.text} className="flex items-center gap-2">
                      {f.free ? <CheckIcon color="#13AE67" /> : <LockIcon />}
                      <span className="text-xs text-gray-600" style={{ opacity: f.free ? 1 : 0.4 }}>{f.text}</span>
                    </li>
                  ))}
                </ul>
              </button>

              {/* 有料プラン */}
              <button
                type="button"
                onClick={() => setSelectedPlan("paid")}
                className="w-full text-left transition-all duration-200 relative"
                style={{
                  border: `2px solid ${selectedPlan === "paid" ? "#F067A6" : "#E5E7EB"}`,
                  borderRadius: 14,
                  padding: "12px 14px",
                  background: selectedPlan === "paid"
                    ? "linear-gradient(135deg, #fff 0%, rgba(240,103,166,0.04) 100%)"
                    : "#fff",
                  boxShadow: selectedPlan === "paid" ? "0 4px 16px rgba(240,103,166,0.15)" : "0 1px 4px rgba(0,0,0,0.06)",
                  cursor: "pointer",
                }}
              >
                {/* おすすめバッジ */}
                <div
                  className="absolute top-0 right-0 text-white font-bold text-center"
                  style={{
                    fontSize: 10, background: "#F067A6",
                    padding: "3px 10px 5px",
                    borderBottomLeftRadius: 10, borderTopRightRadius: 12,
                    lineHeight: 1.4,
                  }}
                >
                  おすすめ ✨
                </div>

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      style={{
                        width: 18, height: 18, borderRadius: "50%",
                        border: `2px solid ${selectedPlan === "paid" ? "#F067A6" : "#D1D5DB"}`,
                        background: selectedPlan === "paid" ? "#F067A6" : "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, transition: "all 0.2s",
                      }}
                    >
                      {selectedPlan === "paid" && (
                        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                          <path d="M1.5 4.5l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <span className="text-xs font-semibold rounded-full px-2 py-0.5" style={{ background: "rgba(240,103,166,0.12)", color: "#F067A6" }}>PREMIUM</span>
                      <p className="font-bold text-gray-900 text-sm mt-0.5">有料プラン</p>
                    </div>
                  </div>
                  <div className="text-right" style={{ marginTop: 24 }}>
                    <span className="font-bold text-xl" style={{ color: "#F067A6" }}>¥2,480</span>
                    <span className="text-gray-400 text-xs"> / 月</span>
                  </div>
                </div>
                <ul className="space-y-1.5">
                  {features.map((f) => (
                    <li key={f.text} className="flex items-center gap-2">
                      <CheckIcon color="#F067A6" />
                      <span className="text-xs text-gray-600">{f.text}</span>
                      {!f.free && (
                        <span className="ml-auto text-xs font-semibold rounded-full px-1.5 py-0.5" style={{ background: "rgba(240,103,166,0.12)", color: "#F067A6", fontSize: 9 }}>NEW</span>
                      )}
                    </li>
                  ))}
                </ul>
              </button>

              <p className="text-center text-gray-400 text-xs">
                <span className="hidden sm:inline">※ 料金は税込表示です。有料プランはいつでもキャンセル可能です。</span>
                <span className="sm:hidden">※ 料金は税込表示です。<br />有料プランはいつでもキャンセル可能です。</span>
            </p>
            </div>
          )}

          {/* ── STEP: お支払い情報 ── */}
          {step === "payment" && clientSecret && (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: "stripe",
                  variables: {
                    colorPrimary: "#13AE67",
                    colorBackground: "#ffffff",
                    colorText: "#374151",
                    colorDanger: "#ef4444",
                    fontFamily: "ui-sans-serif, system-ui, sans-serif",
                    borderRadius: "6px",
                  },
                },
              }}
            >
              <StripeForm
                onReady={(handlers) => { stripeHandlersRef.current = handlers; }}
                onLoadError={(message) => setError(message)}
              />
            </Elements>
          )}

          {/* ── STEP: 完了 ── */}
          {step === "done" && (
            <div className="text-center py-6">
              <div
                className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ background: "rgba(19,174,103,0.1)" }}
              >
                <svg className="w-8 h-8" fill="none" stroke="#F067A6" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-bold text-gray-900 mb-1">有料プランへようこそ！</p>
              <p className="text-sm text-gray-500">メンターサポートなど全機能がご利用いただけます。</p>
            </div>
          )}
        </div>

        {/* ── フッター（ボタン） ── */}
        {step !== "done" && (
          <div className="px-4 sm:px-6 pb-4 sm:pb-6 flex flex-col gap-2">
            {step === "select" && (
              <>
                <button
                  onClick={handleSelectPaid}
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: selectedPlan === "paid"
                      ? "linear-gradient(135deg, #F067A6, #d44f8e)"
                      : "#13AE67",
                  }}
                >
                  {isLoading ? "処理中..." : selectedPlan === "paid" ? "有料プランにアップグレードする" : "無料プランのまま続ける"}
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  後で決める
                </button>
              </>
            )}

            {step === "payment" && (
              <>
                <button
                  onClick={handlePayment}
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg, #F067A6, #d44f8e)" }}
                >
                  {isLoading ? "処理中..." : "有料プランにアップグレードする"}
                </button>
                <button
                  onClick={() => { setStep("select"); setError(null); }}
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-xl text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  ← プラン選択に戻る
                </button>
              </>
            )}
          </div>
        )}

        {step === "done" && (
          <div className="px-4 sm:px-6 pb-4 sm:pb-6">
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white"
              style={{ background: "#F067A6" }}
            >
              HOME画面へ
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlanSelectModal;