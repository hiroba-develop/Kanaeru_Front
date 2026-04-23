import React, { useState, useEffect } from "react";
import tutorialStep1 from "../assets/tutorial/tutorial_step1.gif";
import tutorialStep2 from "../assets/tutorial/tutorial_step2.gif";
import tutorialStep3 from "../assets/tutorial/tutorial_step3.gif";
import tutorialStep4 from "../assets/tutorial/tutorial_step4.gif";

const STEPS = [
  {
    tag: "ど真ん中の目標",
    title: "まず「叶えたい夢」を真ん中に書こう",
    body: "マンダラチャートの中心は、あなたが本当に実現したい目標です。ここがすべてのスタートになります。",
    gif: tutorialStep1,
    tip: (
      <>
        <strong style={{ color: "#13AE67" }}>すでに起業している方</strong>は
        3年後のイメージを。
        <br />
        <strong style={{ color: "#13AE67" }}>個人事業主・独立したての方</strong>
        は、1年後が描きやすいでしょう。
      </>
    ),
  },
  {
    tag: "周囲の8つの目標（大目標）",
    title: "夢を支える「8つの分野」を決めよう",
    body: "大目標は、夢を実現するために大切な分野です。仕事だけでなく、人生全体のバランスを考えて設定しましょう。",
    gif: tutorialStep2,
    tip: (
      <>
        迷ったら、
        <strong style={{ color: "#13AE67" }}>「この分野がうまくいけば夢に近づく」</strong>
        という視点で考えてみてください。
      </>
    ),
    list: [
      "仕事・売上",
      "スキル・学習",
      "健康・体づくり",
      "家族・人間関係",
      "プライベート・趣味",
      "財務・資産形成",
      "環境・働き方",
      "社会貢献・ビジョン",
    ],
  },
  {
    tag: "大目標を具体的に（中目標）",
    title: "各分野で「どうなっていたいか」を考えよう",
    body: "中目標は、大目標が達成された状態を具体的にしたものです。「何をするか」ではなく「どうなっているか」で書くのがポイントです。",
    gif: tutorialStep3,
    tip: (
      <>
        例：
        <br />
        「売上を増やす」ではなく
        <br />
        <strong style={{ color: "#13AE67" }}>
          「毎月安定して受注できている」
        </strong>
      </>
    ),
  },
  {
    tag: "小目標（アクション）",
    title: "目標は「1時間でできる」レベルまで細かく",
    body: "小目標は、今すぐ行動できる具体的なタスクです。小さな達成を積み重ねることで、大きな目標に近づきます。",
    gif: tutorialStep4,
    tip: (
      <>
        目安は
        <strong style={{ color: "#13AE67" }}>
          「所要時間1時間あればできること」
        </strong>
        。
        <br />
        例：
        <br />
        ・顧客に1件連絡する
        <br />
        ・資料を1ページ作る
        <br />
        ・30分勉強する
      </>
    ),
  },
];

interface Props {
  onClose: () => void;
}

const TutorialModal: React.FC<Props> = ({ onClose }) => {
  const [step, setStep] = useState(0);
  const [isPC, setIsPC] = useState(window.innerWidth >= 768);
  const isLast = step === STEPS.length - 1;
  const s = STEPS[step];

  useEffect(() => {
    const handleResize = () => setIsPC(window.innerWidth >= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black opacity-50" />
      <div
        className="relative bg-white rounded-3xl shadow-xl flex flex-col"
        style={{
          width: "100%",
          maxWidth: isPC ? "680px" : "440px",
          maxHeight: "92vh",
          overflow: "hidden",
        }}
      >
        {/* スクロール可能エリア */}
        <div
          style={{
            overflowY: "auto",
            padding: isPC ? "32px 36px 0 36px" : "24px 24px 0 24px",
            flex: 1,
            minHeight: 0,
          }}
        >
          {/* ステップインジケーター */}
          <div style={{ display: "flex", gap: "6px", marginBottom: "20px" }}>
            {STEPS.map((_, i) => (
              <div
                key={i}
                style={{
                  height: "4px",
                  flex: 1,
                  borderRadius: "2px",
                  background: i <= step ? "#13AE67" : "#E5E7EB",
                  transition: "background 0.3s",
                }}
              />
            ))}
          </div>

          {/* タグ */}
          <div
            className="inline-block text-xs font-medium rounded-full px-3 py-1 mb-3"
            style={{ background: "#E1F5EE", color: "#0F6E56" }}
          >
            {s.tag}
          </div>

          {/* タイトル */}
          <h3
            className="font-bold text-gray-900 mb-2"
            style={{ fontSize: isPC ? "20px" : "17px", lineHeight: 1.4 }}
          >
            {s.title}
          </h3>

          {/* 本文 */}
          <p
            className="text-gray-500 leading-relaxed mb-4"
            style={{ fontSize: isPC ? "14px" : "13px" }}
          >
            {s.body}
          </p>

          {/* GIFアニメ */}
          <div
            style={{
              width: "100%",
              borderRadius: "12px",
              overflow: "hidden",
              marginBottom: "16px",
              background: "#F9FAFB",
              border: "1px solid #E5E7EB",
            }}
          >
            <img
              key={s.gif}
              src={s.gif}
              alt={`チュートリアル step ${step + 1}`}
              style={{
                width: "100%",
                display: "block",
                objectFit: "contain",
              }}
            />
          </div>

          {/* リスト（大目標ステップのみ） */}
          {"list" in s && s.list && (
            <ul
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "6px",
                paddingLeft: 0,
                listStyle: "none",
                marginBottom: "16px",
              }}
            >
              {s.list.map((item) => (
                <li
                  key={item}
                  style={{
                    background: "#F9FAFB",
                    borderRadius: "10px",
                    padding: "6px 12px",
                    fontSize: "13px",
                    color: "#374151",
                  }}
                >
                  {item}
                </li>
              ))}
            </ul>
          )}

          {/* Tip */}
          {s.tip && (
            <div
              style={{
                background: "#F9FAFB",
                borderLeft: "3px solid #13AE67",
                borderRadius: "0 8px 8px 0",
                padding: "10px 14px",
                color: "#6B7280",
                fontSize: isPC ? "14px" : "13px",
                lineHeight: 1.7,
                marginBottom: "16px",
              }}
            >
              {s.tip}
            </div>
          )}
        </div>

        {/* ボタンエリア（固定フッター） */}
        <div
          style={{
            padding: isPC ? "20px 36px 28px" : "16px 24px 24px",
            borderTop: "1px solid #F3F4F6",
            background: "#FFFFFF",
            flexShrink: 0,
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={onClose}
              style={{
                color: "#9CA3AF",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: isPC ? "14px" : "13px",
              }}
            >
              スキップ
            </button>
            <div style={{ display: "flex", gap: "8px" }}>
              {step > 0 && (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  style={{
                    border: "1px solid #E5E7EB",
                    color: "#6B7280",
                    background: "none",
                    cursor: "pointer",
                    borderRadius: "9999px",
                    fontSize: isPC ? "14px" : "13px",
                    fontWeight: 500,
                    padding: isPC ? "10px 24px" : "8px 20px",
                  }}
                >
                  戻る
                </button>
              )}
              <button
                onClick={() => (isLast ? onClose() : setStep((s) => s + 1))}
                style={{
                  background: "#13AE67",
                  border: "none",
                  cursor: "pointer",
                  borderRadius: "9999px",
                  fontSize: isPC ? "14px" : "13px",
                  fontWeight: 500,
                  padding: isPC ? "10px 28px" : "8px 20px",
                  color: "#FFFFFF",
                }}
              >
                {isLast ? "はじめる" : "次へ →"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorialModal;