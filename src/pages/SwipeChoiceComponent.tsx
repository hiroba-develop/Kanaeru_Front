import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronDown, RotateCcw, Play, Package } from "lucide-react";

/* ========= 型定義 ========= */

interface Choice {
  id: string;
  text: string;
  category: string;
}

interface QuestionPair {
  left: Choice;
  right: Choice;
}

interface Result {
  choice: Choice | null;
  skipped: boolean;
}

/* ========= 定数定義 ========= */

const TOTAL_TIME_MS = 5000; // タイマーの全体時間（ミリ秒）
const TICK_MS = 50; // タイマーのTick間隔（ミリ秒）
const MAX_DRAG_DISTANCE = 250; // ドラッグ中の最大移動距離
const ANIMATION_DURATION_MS = 300; // カードが箱に吸い込まれるアニメーションの時間

// Box の見た目に関する定数（将来の当たり判定実装用）
const BOX_WIDTH = 128;
const BOX_HEIGHT = 80;
const BOX_TOP = 8;

// 起業理由の選択肢データ（コンポーネント外に出して再生成を防止）
const QUESTION_PAIRS: QuestionPair[] = [
  {
    left: {
      id: "freedom_time",
      text: "時間と場所の自由がほしい",
      category: "freedom",
    },
    right: {
      id: "achievement_challenge",
      text: "自分の実力でどこまでいけるか試したい",
      category: "achievement",
    },
  },
  {
    left: {
      id: "money_security",
      text: "経済的な安定を手に入れたい",
      category: "money",
    },
    right: {
      id: "impact_society",
      text: "社会に大きな影響を与えたい",
      category: "impact",
    },
  },
  {
    left: {
      id: "recognition_fame",
      text: "多くの人に認められたい",
      category: "recognition",
    },
    right: {
      id: "helping_others",
      text: "困っている人を助けたい",
      category: "helping",
    },
  },
  {
    left: {
      id: "innovation_create",
      text: "新しいものを生み出したい",
      category: "innovation",
    },
    right: {
      id: "family_provide",
      text: "家族により良い生活を提供したい",
      category: "family",
    },
  },
  {
    left: {
      id: "independence_boss",
      text: "誰にも指図されたくない",
      category: "independence",
    },
    right: {
      id: "team_build",
      text: "最高のチームを作りたい",
      category: "team",
    },
  },
  {
    left: {
      id: "legacy_history",
      text: "歴史に名前を残したい",
      category: "legacy",
    },
    right: {
      id: "growth_personal",
      text: "人間として成長し続けたい",
      category: "growth",
    },
  },
  {
    left: {
      id: "excitement_thrill",
      text: "スリルと興奮を味わいたい",
      category: "excitement",
    },
    right: {
      id: "stability_peace",
      text: "将来への不安をなくしたい",
      category: "stability",
    },
  },
  {
    left: {
      id: "power_control",
      text: "物事をコントロールしたい",
      category: "power",
    },
    right: {
      id: "creativity_expression",
      text: "自分らしさを表現したい",
      category: "creativity",
    },
  },
  {
    left: {
      id: "competition_win",
      text: "競争で勝ちたい",
      category: "competition",
    },
    right: {
      id: "collaboration_connect",
      text: "人とのつながりを大切にしたい",
      category: "collaboration",
    },
  },
  {
    left: {
      id: "luxury_lifestyle",
      text: "贅沢な暮らしがしたい",
      category: "luxury",
    },
    right: {
      id: "purpose_meaning",
      text: "人生に意味を見出したい",
      category: "purpose",
    },
  },
];

const TOTAL_QUESTIONS = QUESTION_PAIRS.length;

// カテゴリ名マップ
const CATEGORY_NAME_MAP: Record<string, string> = {
  freedom: "自由への憧れ",
  achievement: "達成への渇望",
  money: "経済的成功",
  impact: "社会的影響",
  recognition: "承認欲求",
  helping: "貢献意識",
  innovation: "創造性",
  family: "家族愛",
  independence: "独立心",
  team: "協調性",
  legacy: "遺産意識",
  growth: "成長志向",
  excitement: "刺激追求",
  stability: "安定志向",
  power: "支配欲",
  creativity: "表現欲求",
  competition: "競争心",
  collaboration: "協力重視",
  luxury: "物質的欲求",
  purpose: "人生の意味",
};

/* ========= ヘルパー関数 ========= */

const calculateRotation = (xPosition: number): number => {
  const angle = xPosition / 10;
  return Math.max(-10, Math.min(10, angle));
};

// ★ 現状はデバッグ用：常に true（将来的に実際の当たり判定に差し替え）
const checkCollisionWithBox = (
  cardPosition: { x: number; y: number },
  cardSide: "left" | "right",
  containerSize: { width: number; height: number }
): boolean => {
  return true;
};

const getCategoryName = (category: string): string =>
  CATEGORY_NAME_MAP[category] || category;

const analyzeResults = (results: Result[]) => {
  const categoryCount: Record<string, number> = {};
  let totalChoices = 0;

  results.forEach((result) => {
    if (!result.skipped && result.choice) {
      categoryCount[result.choice.category] =
        (categoryCount[result.choice.category] || 0) + 1;
      totalChoices++;
    }
  });

  const sortedCategories = Object.entries(categoryCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  // 起業動機タイプの判定
  const motivationType = determineMotivationType(categoryCount);

  return {
    sortedCategories,
    totalChoices,
    skippedCount: results.length - totalChoices,
    motivationType,
  };
};

// 起業動機タイプ判定関数
const determineMotivationType = (
  categoryCount: Record<string, number>
): string => {
  // 各タイプに属するカテゴリとそのスコア
  const stableScore =
    (categoryCount["stability"] || 0) * 2 +
    (categoryCount["money"] || 0) * 1.5 +
    (categoryCount["family"] || 0) * 1.5 +
    (categoryCount["freedom"] || 0) * 1;

  const growthScore =
    (categoryCount["achievement"] || 0) * 2 +
    (categoryCount["growth"] || 0) * 2 +
    (categoryCount["excitement"] || 0) * 1.5 +
    (categoryCount["competition"] || 0) * 1.5 +
    (categoryCount["innovation"] || 0) * 1 +
    (categoryCount["power"] || 0) * 1;

  const impactScore =
    (categoryCount["impact"] || 0) * 2 +
    (categoryCount["helping"] || 0) * 2 +
    (categoryCount["purpose"] || 0) * 1.5 +
    (categoryCount["collaboration"] || 0) * 1.5 +
    (categoryCount["team"] || 0) * 1;

  // 最も高いスコアのタイプを返す
  const maxScore = Math.max(stableScore, growthScore, impactScore);

  if (maxScore === 0) {
    return "成長チャレンジ型"; // デフォルト
  }

  if (stableScore === maxScore) {
    return "安定コツコツ型";
  } else if (growthScore === maxScore) {
    return "成長チャレンジ型";
  } else {
    return "価値・貢献重視型";
  }
};

/* ========= 結果画面コンポーネント ========= */

const ResultScreen: React.FC<{
  results: Result[];
  onRestart: () => void;
  onComplete?: () => void;
}> = ({ results, onRestart, onComplete }) => {
  const analysis = analyzeResults(results);

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-6 border border-teal-200">
        <h2 className="text-xl sm:text-2xl font-bold text-center mb-6 text-teal-800">
          🎯 あなたの起業動機
        </h2>

        <div className="space-y-4 mb-6">
          <div className="text-center">
            <p className="text-sm text-teal-600">
              {analysis.totalChoices}/{TOTAL_QUESTIONS}問に回答
              {analysis.skippedCount > 0 &&
                `（${analysis.skippedCount}問スキップ）`}
            </p>
          </div>

          {/* 起業動機診断タイプの表示 */}
          {analysis.sortedCategories.length > 0 && (
            <div className="bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl p-4 text-center shadow-lg">
              <p className="text-white text-sm mb-1">あなたのタイプは</p>
              <p className="text-white text-xl sm:text-2xl font-bold">
                {analysis.motivationType}
              </p>
            </div>
          )}

          {analysis.sortedCategories.length > 0 ? (
            <div className="space-y-3">
              <h3 className="font-semibold text-teal-800">上位の動機:</h3>
              {analysis.sortedCategories.map(([category, count], index) => (
                <div
                  key={category}
                  className="flex justify-between items-center bg-teal-50 rounded-lg p-3 border border-teal-200"
                >
                  <span className="font-medium text-teal-800 text-sm sm:text-base">
                    {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}{" "}
                    {getCategoryName(category)}
                  </span>
                  <span className="text-sm text-teal-600">{count}回選択</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-teal-600 text-base mb-2">
                選択された回答がありません
              </p>
              <p className="text-teal-500 text-sm">
                もう一度チャレンジしてみましょう！
              </p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {onComplete && (
            <button
              onClick={onComplete}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold rounded-xl hover:scale-105 transition-transform flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
            >
              <span>マンダラチャートへ進む</span>
            </button>
          )}
          <button
            onClick={onRestart}
            className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold rounded-xl hover:scale-105 transition-transform flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
          >
            <RotateCcw className="h-5 w-5" />
            <span>もう一度診断する</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/* ========= メインコンポーネント ========= */

interface SwipeChoiceComponentProps {
  onComplete?: () => void;
}

const SwipeChoiceComponent: React.FC<SwipeChoiceComponentProps> = ({
  onComplete,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME_MS);
  const [isActive, setIsActive] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [leftCardPosition, setLeftCardPosition] = useState({ x: 0, y: 0 });
  const [rightCardPosition, setRightCardPosition] = useState({ x: 0, y: 0 });
  const [touchStart, setTouchStart] = useState<{
    x: number;
    y: number;
    card: "left" | "right";
  } | null>(null);
  const [isDragging, setIsDragging] = useState<"left" | "right" | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedCard, setSelectedCard] = useState<"left" | "right" | null>(
    null
  );
  const [showResults, setShowResults] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const answeredRef = useRef(false); // 重複実行防止フラグ

  const currentPair = QUESTION_PAIRS[currentIndex];

  /* ----- コンテナサイズ取得 ----- */

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  /* ----- タイマー制御 ----- */

  const handleTimeout = useCallback(() => {
    if (answeredRef.current) return;
    answeredRef.current = true;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsActive(false);

    // スキップとして記録
    setResults((prev) => [...prev, { choice: null, skipped: true }]);

    setTimeout(() => {
      setLeftCardPosition({ x: 0, y: 0 });
      setRightCardPosition({ x: 0, y: 0 });

      if (currentIndex < TOTAL_QUESTIONS - 1) {
        setCurrentIndex((prev) => prev + 1);
        answeredRef.current = false;
        setTimeLeft(TOTAL_TIME_MS);
        setIsActive(true);

        timerRef.current = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev <= TICK_MS) {
              handleTimeout();
              return 0;
            }
            return prev - TICK_MS;
          });
        }, TICK_MS);
      } else {
        setShowResults(true);
      }
    }, 500);
  }, [currentIndex]);

  const startTimer = useCallback(
    (initialTime: number = TOTAL_TIME_MS) => {
      if (timerRef.current) clearInterval(timerRef.current);

      answeredRef.current = false;

      setTimeLeft(initialTime);
      setIsActive(true);

      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= TICK_MS) {
            handleTimeout();
            return 0;
          }
          return prev - TICK_MS;
        });
      }, TICK_MS);
    },
    [handleTimeout]
  );

  /* ----- 選択処理 ----- */

  const handleChoice = useCallback(
    (choice: Choice, fromCard: "left" | "right") => {
      if (answeredRef.current) {
        return;
      }
      answeredRef.current = true;

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsActive(false);
      setIsAnimating(true);
      setSelectedCard(fromCard);

      if (fromCard === "left") {
        setLeftCardPosition({ x: 0, y: -180 });
      } else {
        setRightCardPosition({ x: 0, y: -180 });
      }

      setResults((prev) => [...prev, { choice, skipped: false }]);

      setTimeout(() => {
        setLeftCardPosition({ x: 0, y: 0 });
        setRightCardPosition({ x: 0, y: 0 });
        setIsAnimating(false);
        setSelectedCard(null);

        if (currentIndex < TOTAL_QUESTIONS - 1) {
          setCurrentIndex((prev) => prev + 1);
          startTimer(TOTAL_TIME_MS);
        } else {
          setShowResults(true);
        }
      }, ANIMATION_DURATION_MS + 100);
    },
    [currentIndex, startTimer]
  );

  /* ----- ドラッグ処理（共通） ----- */

  const handleDragStart = (
    clientX: number,
    clientY: number,
    card: "left" | "right"
  ) => {
    if (!isActive || isAnimating || answeredRef.current) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setTouchStart({ x: clientX, y: clientY, card });
    setIsDragging(card);
  };

  const handleDragMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDragging || !touchStart || !isActive || answeredRef.current)
        return;

      const deltaX = clientX - touchStart.x;
      const deltaY = clientY - touchStart.y;

      const clampedX = Math.max(
        -MAX_DRAG_DISTANCE,
        Math.min(MAX_DRAG_DISTANCE, deltaX)
      );
      const clampedY = Math.max(
        -MAX_DRAG_DISTANCE,
        Math.min(MAX_DRAG_DISTANCE, deltaY)
      );

      if (isDragging === "left") {
        setLeftCardPosition({ x: clampedX, y: clampedY });
      } else {
        setRightCardPosition({ x: clampedX, y: clampedY });
      }
    },
    [isDragging, touchStart, isActive]
  );

  const handleDragEnd = useCallback(() => {
    if (!isDragging || !isActive || !touchStart || answeredRef.current) {
      return;
    }

    const currentPos =
      isDragging === "left" ? leftCardPosition : rightCardPosition;

    const isCollidingWithBox = checkCollisionWithBox(
      currentPos,
      isDragging,
      containerSize
    );

    if (isCollidingWithBox) {
      const choice =
        isDragging === "left" ? currentPair.left : currentPair.right;
      handleChoice(choice, isDragging);
    } else {
      if (isDragging === "left") {
        setLeftCardPosition({ x: 0, y: 0 });
      } else {
        setRightCardPosition({ x: 0, y: 0 });
      }

      if (timeLeft > 0 && !answeredRef.current) {
        startTimer(timeLeft);
      }
    }

    setIsDragging(null);
    setTouchStart(null);
  }, [
    isDragging,
    isActive,
    touchStart,
    leftCardPosition,
    rightCardPosition,
    containerSize,
    currentPair,
    timeLeft,
    handleChoice,
    startTimer,
  ]);

  /* ----- タッチ／マウスイベントラッパ ----- */

  const handleTouchStart = (e: React.TouchEvent, card: "left" | "right") => {
    const touch = e.touches[0];
    handleDragStart(touch.clientX, touch.clientY, card);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !touchStart || !isActive) return;
    e.preventDefault();
    const currentTouch = e.touches[0];
    handleDragMove(currentTouch.clientX, currentTouch.clientY);
  };

  const handleTouchEnd = () => {
    handleDragEnd();
  };

  const handleMouseDown = (e: React.MouseEvent, card: "left" | "right") => {
    handleDragStart(e.clientX, e.clientY, card);
  };

  /* ----- グローバルマウスイベント ----- */

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleDragMove(e.clientX, e.clientY);
      }
    };

    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleDragEnd();
      }
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleGlobalMouseMove);
      window.addEventListener("mouseup", handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  /* ----- リスタート ----- */

  const handleRestart = () => {
    setCurrentIndex(0);
    setResults([]);
    setShowResults(false);
    setLeftCardPosition({ x: 0, y: 0 });
    setRightCardPosition({ x: 0, y: 0 });
    setTimeLeft(TOTAL_TIME_MS);
    setIsActive(false);
    answeredRef.current = false;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  /* ----- クリーンアップ ----- */

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  /* ========= レンダリング ========= */

  if (showResults) {
    return (
      <ResultScreen
        results={results}
        onRestart={handleRestart}
        onComplete={onComplete}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 flex flex-col relative overflow-hidden">
      {/* 背景の装飾 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-5 w-16 h-16 sm:w-32 sm:h-32 sm:top-20 sm:left-10 bg-teal-200 rounded-full opacity-20 animate-pulse" />
        <div className="absolute bottom-16 right-8 w-12 h-12 sm:w-24 sm:h-24 sm:bottom-32 sm:right-16 bg-cyan-200 rounded-full opacity-20 animate-bounce" />
        <div className="absolute top-1/3 left-1/4 w-8 h-8 sm:w-16 sm:h-16 sm:top-1/2 bg-teal-300 rounded-full opacity-20 animate-ping" />
      </div>

      {/* 固定ヘッダー */}
      <div className="bg-gradient-to-r from-teal-500 to-cyan-500 p-3 sm:p-4 shadow-lg">
        <p className="text-white text-center font-medium text-sm sm:text-base">
          起業したい理由に近い方を、直感で選んでください（5秒以内）
        </p>
      </div>

      {/* 進捗とタイマー */}
      <div className="p-3 sm:p-4">
        <div className="max-w-lg mx-auto">
          <div className="flex justify-between items-center mb-3">
            <span className="text-teal-800 text-sm font-medium">
              {currentIndex + 1} / {TOTAL_QUESTIONS}
            </span>
            <span className="text-teal-800 text-sm font-medium">
              {(timeLeft / 1000).toFixed(1)}秒
            </span>
          </div>

          <div className="w-full bg-teal-100 rounded-full h-2 sm:h-3 overflow-hidden border border-teal-200">
            <div
              className={`h-full transition-all duration-75 ${
                timeLeft > TOTAL_TIME_MS * (2 / 3)
                  ? "bg-teal-500"
                  : timeLeft > TOTAL_TIME_MS * (1 / 3)
                  ? "bg-yellow-400"
                  : "bg-red-400"
              }`}
              style={{ width: `${(timeLeft / TOTAL_TIME_MS) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 flex items-center justify-center p-3 sm:p-4">
        <div className="max-w-lg mx-auto w-full relative">
          {/* スタートボタン（初回のみ） */}
          {!isActive && currentIndex === 0 && results.length === 0 && (
            <div className="text-center">
              <button
                onClick={() => startTimer()}
                className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold py-3 px-6 sm:py-4 sm:px-8 rounded-2xl text-lg sm:text-xl shadow-2xl hover:scale-105 transition-transform flex items-center justify-center space-x-2 mx-auto hover:shadow-3xl"
              >
                <Play className="h-5 w-5 sm:h-6 sm:w-6" />
                <span>スタート</span>
              </button>
            </div>
          )}

          {/* ゲームエリア */}
          {isActive && (
            <div
              ref={containerRef}
              className="relative"
              style={{ height: "320px" }}
            >
              {/* 上部中央の箱 */}
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-24 h-16 sm:w-32 sm:h-20 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl sm:rounded-2xl border-2 sm:border-4 border-teal-300 shadow-2xl flex flex-col items-center justify-center">
                <Package className="h-5 w-5 sm:h-6 sm:w-6 text-white mb-1" />
                <span className="text-white font-bold text-xs sm:text-sm">
                  選択BOX
                </span>
                <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-white animate-bounce" />
              </div>

              {/* 左下のカード */}
              <div
                className={`absolute bottom-4 left-0 w-32 h-24 sm:w-36 sm:h-28 sm:left-2 bg-gradient-to-br from-teal-400 to-teal-500 border-2 sm:border-3 border-teal-600 rounded-xl sm:rounded-2xl shadow-xl cursor-pointer touch-none transition-all duration-300 ease-out ${
                  isDragging === "left" ? "shadow-2xl" : "hover:scale-105"
                } ${
                  isAnimating && selectedCard === "left"
                    ? "opacity-0 scale-90"
                    : "opacity-100"
                }`}
                style={{
                  transform: `translate(${leftCardPosition.x}px, ${
                    leftCardPosition.y
                  }px) rotate(${calculateRotation(leftCardPosition.x)}deg)`,
                }}
                onTouchStart={(e) => handleTouchStart(e, "left")}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={(e) => handleMouseDown(e, "left")}
              >
                <div className="h-full flex flex-col items-center justify-center p-2 sm:p-3 text-center">
                  <div className="text-xs text-teal-100 font-semibold mb-1 sm:mb-2">
                    💙 選択肢A
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-white leading-tight">
                    {currentPair.left.text}
                  </div>
                </div>
              </div>

              {/* 右下のカード */}
              <div
                className={`absolute bottom-4 right-0 w-32 h-24 sm:w-36 sm:h-28 sm:right-2 bg-gradient-to-br from-cyan-400 to-cyan-500 border-2 sm:border-3 border-cyan-600 rounded-xl sm:rounded-2xl shadow-xl cursor-pointer touch-none transition-all duration-300 ease-out ${
                  isDragging === "right" ? "shadow-2xl" : "hover:scale-105"
                } ${
                  isAnimating && selectedCard === "right"
                    ? "opacity-0 scale-90"
                    : "opacity-100"
                }`}
                style={{
                  transform: `translate(${rightCardPosition.x}px, ${
                    rightCardPosition.y
                  }px) rotate(${calculateRotation(rightCardPosition.x)}deg)`,
                }}
                onTouchStart={(e) => handleTouchStart(e, "right")}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={(e) => handleMouseDown(e, "right")}
              >
                <div className="h-full flex flex-col items-center justify-center p-2 sm:p-3 text-center">
                  <div className="text-xs text-cyan-100 font-semibold mb-1 sm:mb-2">
                    💚 選択肢B
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-white leading-tight">
                    {currentPair.right.text}
                  </div>
                </div>
              </div>

              {/* 操作ヒント */}
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2">
                <p className="text-teal-700 text-xs sm:text-sm text-center bg-white/80 rounded-lg px-3 py-1 sm:px-4 sm:py-2 backdrop-blur-sm border border-teal-200">
                  カードをBOXに重ねて離すと選択
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SwipeChoiceComponent;
