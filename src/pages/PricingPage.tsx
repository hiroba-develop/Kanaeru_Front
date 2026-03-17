import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// ── アイコン（インライン SVG） ──────────────────────────────────
const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="9" r="9" fill="#F067A6" fillOpacity="0.12" />
    <path d="M5 9.5l3 3 5-5.5" stroke="#F067A6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="9" r="9" fill="#E5E7EB" />
    <rect x="6" y="9" width="6" height="5" rx="1" fill="#9CA3AF" />
    <path d="M7 9V7a2 2 0 1 1 4 0v2" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const StarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M10 2l2.4 5.1 5.6.5-4.1 3.9 1.2 5.5L10 14.3l-5.1 2.7 1.2-5.5L2 7.6l5.6-.5L10 2z"
      fill="#F067A6" stroke="#F067A6" strokeWidth="1" strokeLinejoin="round" />
  </svg>
);

// ── データ ────────────────────────────────────────────────────
type Feature = {
  label: string;
  free: boolean;
  paid: boolean;
};

const features: Feature[] = [
  { label: "マンダラ作成", free: true, paid: true },
  { label: "損益管理（年次）", free: true, paid: true },
  { label: "損益管理（月次）", free: true, paid: true },
  { label: "メンターとの相談チャット", free: false, paid: true },
  { label: "メンターからのアドバイス", free: false, paid: true },
  { label: "画面カラーカスタマイズ", free: false, paid: true },
];

// ── メインコンポーネント ────────────────────────────────────────
const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  // カード共通フェードイン
  const fadeIn = (delay: string) => ({
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? "translateY(0)" : "translateY(24px)",
    transition: `opacity 0.7s ease ${delay}, transform 0.7s ease ${delay}`,
  });

  return (
    <div className="min-h-screen bg-background">
      <div
        className="max-w-7xl mx-auto space-y-6"
        style={{ padding: "clamp(12px, 3vw, 24px)" }}
      >

        {/* ── ヘッダー ── */}
        <div
          className="bg-background rounded-card-lg text-center"
          style={{
            boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
            padding: "clamp(24px, 5vw, 40px) clamp(16px, 4vw, 32px)",
            ...fadeIn("0ms"),
          }}
        >
          {/* バッジ */}
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-4"
            style={{ background: "rgba(240,103,166,0.1)" }}>
            <StarIcon />
            <span className="font-semibold text-primary" style={{ fontSize: "clamp(11px, 2.5vw, 13px)" }}>
              料金プラン
            </span>
          </div>

          <h1
            className="font-bold text-text"
            style={{ fontSize: "clamp(22px, 5vw, 32px)", marginBottom: "clamp(8px, 2vw, 12px)" }}
          >
            あなたに合ったプランを選ぼう
          </h1>
          <p className="text-text" style={{ fontSize: "clamp(13px, 2.8vw, 15px)", opacity: 0.6, maxWidth: 480, margin: "0 auto" }}>
            無料プランはいつでも利用可能。有料プランへのアップグレードでメンターサポートと
            カスタマイズ機能が解放されます。
          </p>
        </div>

        {/* ── プランカード ── */}
        <div
          className="grid grid-cols-1 md:grid-cols-2"
          style={{ gap: "clamp(12px, 3vw, 20px)" }}
        >

          {/* 無料プラン */}
          <div
            className="bg-background rounded-card-lg"
            style={{
              boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
              padding: "clamp(20px, 4vw, 32px)",
              ...fadeIn("200ms"),
            }}
          >
            {/* プランヘッダー */}
            <div style={{ marginBottom: "clamp(16px, 3vw, 24px)" }}>
              <span
                className="inline-block text-text rounded-full font-semibold"
                style={{
                  fontSize: "clamp(10px, 2vw, 11px)",
                  background: "#F3F4F6",
                  padding: "4px 12px",
                  marginBottom: "clamp(10px, 2vw, 14px)",
                }}
              >
                FREE
              </span>
              <h2
                className="font-bold text-text"
                style={{ fontSize: "clamp(18px, 4vw, 24px)", marginBottom: 6 }}
              >
                無料プラン
              </h2>
              <p className="text-text" style={{ fontSize: "clamp(11px, 2.5vw, 13px)", opacity: 0.55 }}>
                まずは気軽にはじめたい方へ
              </p>
            </div>

            {/* 価格 */}
            <div
              className="flex items-end gap-1"
              style={{ marginBottom: "clamp(20px, 4vw, 28px)" }}
            >
              <span
                className="font-bold text-text"
                style={{ fontSize: "clamp(36px, 8vw, 48px)", lineHeight: 1 }}
              >
                ¥0
              </span>
              <span className="text-text pb-1" style={{ fontSize: "clamp(12px, 2.5vw, 14px)", opacity: 0.5 }}>
                / 月
              </span>
            </div>

            {/* 機能リスト */}
            <ul style={{ listStyle: "none", padding: 0, margin: 0, marginBottom: "clamp(24px, 5vw, 32px)" }}>
              {features.map((f) => (
                <li
                  key={f.label}
                  className="flex items-center gap-3"
                  style={{
                    padding: "clamp(8px, 2vw, 10px) 0",
                    borderBottom: "1px solid rgba(0,0,0,0.05)",
                    opacity: f.free ? 1 : 0.38,
                  }}
                >
                  {f.free ? <CheckIcon /> : <LockIcon />}
                  <span
                    className="text-text"
                    style={{
                      fontSize: "clamp(12px, 2.8vw, 14px)",
                      textDecoration: f.free ? "none" : "none",
                    }}
                  >
                    {f.label}
                  </span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <button
              className="w-full font-bold transition-all duration-200 hover:opacity-80 active:scale-95"
              style={{
                fontSize: "clamp(13px, 2.8vw, 15px)",
                padding: "clamp(12px, 3vw, 14px)",
                background: "#F3F4F6",
                color: "#374151",
                border: "none",
                cursor: "pointer",
                borderRadius: 9999,
              }}
              onClick={() => navigate("/")}
            >
              現在のプラン
            </button>
          </div>

          {/* 有料プラン */}
          <div
            className="rounded-card-lg relative overflow-hidden"
            style={{
              background: "linear-gradient(145deg, #fff 0%, rgba(240,103,166,0.04) 100%)",
              boxShadow: "0 4px 24px rgba(240,103,166,0.18), 0 2px 12px rgba(0,0,0,0.08)",
              padding: "clamp(20px, 4vw, 32px)",
              border: "2px solid rgba(240,103,166,0.3)",
              ...fadeIn("400ms"),
            }}
          >
            {/* おすすめバッジ */}
            <div
              className="absolute top-0 right-0 font-bold text-white"
              style={{
                background: "#F067A6",
                fontSize: "clamp(9px, 2vw, 11px)",
                padding: "6px 16px",
                borderBottomLeftRadius: 16,
                borderTopRightRadius: 14,
              }}
            >
              おすすめ ✨
            </div>

            {/* プランヘッダー */}
            <div style={{ marginBottom: "clamp(16px, 3vw, 24px)" }}>
              <span
                className="inline-block font-semibold rounded-full"
                style={{
                  fontSize: "clamp(10px, 2vw, 11px)",
                  background: "rgba(240,103,166,0.12)",
                  color: "#F067A6",
                  padding: "4px 12px",
                  marginBottom: "clamp(10px, 2vw, 14px)",
                }}
              >
                PREMIUM
              </span>
              <h2
                className="font-bold text-text"
                style={{ fontSize: "clamp(18px, 4vw, 24px)", marginBottom: 6 }}
              >
                有料プラン
              </h2>
              <p className="text-text" style={{ fontSize: "clamp(11px, 2.5vw, 13px)", opacity: 0.55 }}>
                メンターサポートで成長を加速したい方へ
              </p>
            </div>

            {/* 価格 */}
            <div
              className="flex items-end gap-1"
              style={{ marginBottom: "clamp(20px, 4vw, 28px)" }}
            >
              <span
                className="font-bold"
                style={{ fontSize: "clamp(36px, 8vw, 48px)", lineHeight: 1, color: "#F067A6" }}
              >
                ¥2,480
              </span>
              <span className="text-text pb-1" style={{ fontSize: "clamp(12px, 2.5vw, 14px)", opacity: 0.5 }}>
                / 月
              </span>
            </div>

            {/* 機能リスト */}
            <ul style={{ listStyle: "none", padding: 0, margin: 0, marginBottom: "clamp(24px, 5vw, 32px)" }}>
              {features.map((f) => (
                <li
                  key={f.label}
                  className="flex items-center gap-3"
                  style={{
                    padding: "clamp(8px, 2vw, 10px) 0",
                    borderBottom: "1px solid rgba(240,103,166,0.08)",
                  }}
                >
                  <CheckIcon />
                  <span
                    className="text-text font-medium"
                    style={{ fontSize: "clamp(12px, 2.8vw, 14px)" }}
                  >
                    {f.label}
                  </span>
                  {!f.free && (
                    <span
                      className="ml-auto font-semibold rounded-full"
                      style={{
                        fontSize: "clamp(9px, 1.8vw, 10px)",
                        background: "rgba(240,103,166,0.12)",
                        color: "#F067A6",
                        padding: "2px 8px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      NEW
                    </span>
                  )}
                </li>
              ))}
            </ul>

            {/* CTA */}
            <button
              className="w-full font-bold text-white transition-all duration-200 active:scale-95"
              style={{
                fontSize: "clamp(13px, 2.8vw, 15px)",
                padding: "clamp(12px, 3vw, 14px)",
                background: "#13AE67",
                border: "none",
                cursor: "pointer",
                borderRadius: 9999,
                boxShadow: "0 4px 16px rgba(19,174,103,0.35)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#0f9457")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#13AE67")}
            >
              アップグレードする →
            </button>
          </div>
        </div>

        {/* ── 比較テーブル（補足） ── */}
        <div
          className="bg-background rounded-card-lg overflow-hidden"
          style={{
            boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
            ...fadeIn("600ms"),
          }}
        >
          <div
            className="font-bold text-text"
            style={{
              fontSize: "clamp(14px, 3vw, 16px)",
              padding: "clamp(16px, 3vw, 20px) clamp(16px, 4vw, 28px)",
              borderBottom: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            機能の詳細比較
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(0,0,0,0.025)" }}>
                  <th
                    className="text-left text-text font-semibold"
                    style={{
                      padding: "clamp(10px, 2vw, 12px) clamp(16px, 4vw, 28px)",
                      fontSize: "clamp(11px, 2.5vw, 13px)",
                      opacity: 0.6,
                    }}
                  >
                    機能
                  </th>
                  <th
                    className="text-center text-text font-semibold"
                    style={{
                      padding: "clamp(10px, 2vw, 12px) 16px",
                      fontSize: "clamp(11px, 2.5vw, 13px)",
                      opacity: 0.6,
                      minWidth: 90,
                    }}
                  >
                    無料
                  </th>
                  <th
                    className="text-center font-semibold"
                    style={{
                      padding: "clamp(10px, 2vw, 12px) 16px",
                      fontSize: "clamp(11px, 2.5vw, 13px)",
                      color: "#F067A6",
                      minWidth: 90,
                    }}
                  >
                    有料
                  </th>
                </tr>
              </thead>
              <tbody>
                {features.map((f, i) => (
                  <tr
                    key={f.label}
                    style={{
                      borderTop: "1px solid rgba(0,0,0,0.05)",
                      background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.012)",
                    }}
                  >
                    <td
                      className="text-text"
                      style={{
                        padding: "clamp(10px, 2vw, 14px) clamp(16px, 4vw, 28px)",
                        fontSize: "clamp(12px, 2.8vw, 14px)",
                      }}
                    >
                      {f.label}
                    </td>
                    <td className="text-center" style={{ padding: "clamp(10px, 2vw, 14px) 16px" }}>
                      {f.free ? (
                        <span style={{ color: "#F067A6", fontSize: 18, fontWeight: 700 }}>✓</span>
                      ) : (
                        <span style={{ color: "#D1D5DB", fontSize: 16 }}>—</span>
                      )}
                    </td>
                    <td className="text-center" style={{ padding: "clamp(10px, 2vw, 14px) 16px" }}>
                      <span style={{ color: "#F067A6", fontSize: 18, fontWeight: 700 }}>✓</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── 注意書き ── */}
        <p
          className="text-center text-text opacity-40"
          style={{
            fontSize: "clamp(10px, 2vw, 12px)",
            paddingBottom: "clamp(16px, 4vw, 24px)",
            ...fadeIn("800ms"),
          }}
        >
          ※ 料金は税込表示です。有料プランはいつでもキャンセル可能です。
        </p>
      </div>
    </div>
  );
};

export default PricingPage;