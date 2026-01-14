// TODO: ルーティングに組み込む際は /simulation パスにこのコンポーネントを割り当てる

import React, { useState, useMemo, useEffect } from "react";
import { TrendingUp, Copy } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { TooltipProps } from "recharts";

// ========================================
// 型定義
// ========================================

type MotivationType = "STABLE" | "GROWTH" | "IMPACT";

// フリーランス用の入力変数
export interface FreelanceSimulationVariables {
  initialNetWorth: number; // 初期純資産（円）
  hourlyRate: number; // 時給（売上単価：円/時間）
  monthlyWorkHours: number; // 月間労働時間（時間）
  monthlyBusinessCost: number; // 月間の事業経費（円）
  monthlyLivingCost: number; // 月間の生活費（円）
  targetNetWorth: number; // 10年後に目標とする純資産（円）
}

interface Scenario {
  id: "A" | "B";
  name: string;
  variables: FreelanceSimulationVariables;
}

// 年次ポイント（グラフ用）
interface YearlyPoint {
  yearIndex: number; // 0〜10
  netWorth: number; // その年末時点の純資産（円）
  cashFlow: number; // その年の手残りキャッシュ（円）
}

interface ChartRow {
  yearIndex: number;
  netWorthA: number;
  netWorthB: number;
}

// ========================================
// プリセット取得関数
// ========================================

const getPresetVariables = (
  type: MotivationType
): FreelanceSimulationVariables => {
  switch (type) {
    case "STABLE":
      // 安定コツコツ型：控えめな時給・短めの労働時間・低リスク
      return {
        initialNetWorth: 1000000,
        hourlyRate: 2500,
        monthlyWorkHours: 120,
        monthlyBusinessCost: 15000,
        monthlyLivingCost: 150000,
        targetNetWorth: 15000000,
      };
    case "GROWTH":
      // 成長チャレンジ型：高めの時給・長めの労働時間・高リターン
      return {
        initialNetWorth: 1000000,
        hourlyRate: 5000,
        monthlyWorkHours: 160,
        monthlyBusinessCost: 30000,
        monthlyLivingCost: 180000,
        targetNetWorth: 30000000,
      };
    case "IMPACT":
      // 価値・貢献重視型：中程度の時給・バランスの取れた働き方
      return {
        initialNetWorth: 1000000,
        hourlyRate: 3500,
        monthlyWorkHours: 140,
        monthlyBusinessCost: 20000,
        monthlyLivingCost: 160000,
        targetNetWorth: 20000000,
      };
    default:
      return {
        initialNetWorth: 1000000,
        hourlyRate: 3000,
        monthlyWorkHours: 120,
        monthlyBusinessCost: 20000,
        monthlyLivingCost: 150000,
        targetNetWorth: 20000000,
      };
  }
};

// ========================================
// シミュレーションロジック
// ========================================

const YEARS = 10;

export const simulateFreelanceScenario = (
  vars: FreelanceSimulationVariables,
  motivationType?: MotivationType
): YearlyPoint[] => {
  // まず通常のシミュレーションで最終純資産を計算
  const points: YearlyPoint[] = [];
  const initialNetWorth = vars.initialNetWorth;

  // 年間キャッシュフローを計算
  const annualRevenue = vars.hourlyRate * vars.monthlyWorkHours * 12;
  const annualBusinessCost = vars.monthlyBusinessCost * 12;
  const annualLivingCost = vars.monthlyLivingCost * 12;
  const cashFlow = annualRevenue - annualBusinessCost - annualLivingCost;

  // 10年後の最終純資産を計算（線形成長ベース）
  const finalNetWorth = initialNetWorth + cashFlow * YEARS;
  const totalGrowth = finalNetWorth - initialNetWorth;

  // 成長率パターンを適用（タイプ別）
  const getGrowthPattern = (year: number, type?: MotivationType): number => {
    if (year === 0) return 0;
    if (year === YEARS) return 1; // 10年目は必ず100%（最終純資産は同じ）

    const t = year / YEARS; // 0から1の正規化された時間

    if (!type) type = "GROWTH"; // デフォルトはGROWTH

    switch (type) {
      case "STABLE":
        // 線形成長（安定してコツコツ）
        // 毎年ほぼ同じペースで成長（直線に近い曲線）
        return t;

      case "GROWTH":
        // 初期急成長型（チャレンジ型）
        // 最初の方が成長率が高く、後半は緩やかになる
        // 平方根関数を使用：最初に大きく伸びて後で落ち着く
        return Math.sqrt(t);

      case "IMPACT":
        // 後半加速型（貢献重視型）
        // 最初は緩やかで、後半の成長率が高い
        // 2乗関数を使用：最初は緩やかで後半に急成長
        return Math.pow(t, 2.0);

      default:
        return t;
    }
  };

  // 各年の純資産を成長パターンに基づいて計算
  for (let year = 0; year <= YEARS; year++) {
    const growthRatio = getGrowthPattern(year, motivationType);
    const currentNetWorth = initialNetWorth + totalGrowth * growthRatio;

    // その年のキャッシュフロー（前年との差分）
    const prevNetWorth =
      year > 0
        ? initialNetWorth +
          totalGrowth * getGrowthPattern(year - 1, motivationType)
        : initialNetWorth;
    const yearCashFlow = currentNetWorth - prevNetWorth;

    points.push({
      yearIndex: year,
      netWorth: currentNetWorth,
      cashFlow: yearCashFlow,
    });
  }

  return points;
};

// ========================================
// 必要時給を逆算する関数
// ========================================

const calculateRequiredHourlyRate = (
  vars: FreelanceSimulationVariables
): number | null => {
  // 月間労働時間が0以下のときは計算不可
  if (vars.monthlyWorkHours <= 0) return null;

  const annualBusinessCost = vars.monthlyBusinessCost * 12;
  const annualLivingCost = vars.monthlyLivingCost * 12;

  // 目標純資産までの差分を10年で均等に積み上げる前提で必要な年間キャッシュフローを逆算
  const requiredTotalIncrease = vars.targetNetWorth - vars.initialNetWorth;
  const requiredAnnualCashFlow = requiredTotalIncrease / YEARS;

  // 目標純資産 ≦ 初期純資産なら必要時給は現在のままでOKとして null を返す
  if (requiredAnnualCashFlow <= 0) return null;

  // 必要な年間売上＝必要な年間キャッシュフロー＋事業経費＋生活費
  const requiredAnnualRevenue =
    requiredAnnualCashFlow + annualBusinessCost + annualLivingCost;

  // 時給＝年間売上 ÷（月間労働時間×12）
  const requiredHourlyRate =
    requiredAnnualRevenue / (vars.monthlyWorkHours * 12);

  return requiredHourlyRate;
};

// ========================================
// カスタムTooltip
// ========================================

const CustomTooltip: React.FC<TooltipProps<number, string>> = ({
  active,
  payload,
}) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as ChartRow;
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-teal-200 rounded-lg p-3 shadow-lg">
        <p className="text-sm font-semibold text-text mb-2">
          {data.yearIndex}年目
        </p>
        <div className="space-y-1">
          <p className="text-sm text-text/70">
            <span className="inline-block w-2 h-2 bg-[#67BACA] rounded-full mr-1"></span>
            シナリオ A:{" "}
            <span className="font-bold text-[#67BACA]">
              {(data.netWorthA / 10000).toLocaleString()}万円
            </span>
          </p>
          <p className="text-sm text-text/70">
            <span className="inline-block w-2 h-2 bg-[#F97316] rounded-full mr-1"></span>
            シナリオ B:{" "}
            <span className="font-bold text-[#F97316]">
              {(data.netWorthB / 10000).toLocaleString()}万円
            </span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

// ========================================
// メインコンポーネント
// ========================================

export const SimulationScreen: React.FC = () => {
  const [motivationType, setMotivationType] =
    useState<MotivationType>("GROWTH");
  const [isInitialized, setIsInitialized] = useState(false);

  const [scenarioA, setScenarioA] = useState<Scenario>({
    id: "A",
    name: "シナリオ A",
    variables: getPresetVariables("GROWTH"),
  });

  const [scenarioB, setScenarioB] = useState<Scenario>({
    id: "B",
    name: "シナリオ B",
    variables: {
      ...getPresetVariables("GROWTH"),
      hourlyRate: 4000,
      monthlyWorkHours: 140,
    },
  });

  // 起業動機タイプが変更された場合にプリセットを適用
  useEffect(() => {
    if (!isInitialized) {
      setIsInitialized(true);
      return;
    }

    const basePreset = getPresetVariables(motivationType);
    setScenarioA({
      id: "A",
      name: "シナリオ A",
      variables: basePreset,
    });
    setScenarioB({
      id: "B",
      name: "シナリオ B",
      variables: {
        ...basePreset,
        hourlyRate: basePreset.hourlyRate * 1.3,
        monthlyWorkHours: Math.round(basePreset.monthlyWorkHours * 1.2),
      },
    });
  }, [motivationType, isInitialized]);

  // シミュレーション結果を計算（motivationTypeを渡す）
  const resultsA = useMemo(
    () => simulateFreelanceScenario(scenarioA.variables, motivationType),
    [scenarioA.variables, motivationType]
  );
  const resultsB = useMemo(
    () => simulateFreelanceScenario(scenarioB.variables, motivationType),
    [scenarioB.variables, motivationType]
  );

  // チャートデータを作成
  const chartData: ChartRow[] = useMemo(() => {
    const maxLength = Math.max(resultsA.length, resultsB.length);
    const data: ChartRow[] = [];

    for (let i = 0; i < maxLength; i++) {
      const pointA = resultsA[i];
      const pointB = resultsB[i];

      data.push({
        yearIndex: i,
        netWorthA: pointA?.netWorth || 0,
        netWorthB: pointB?.netWorth || 0,
      });
    }

    return data;
  }, [resultsA, resultsB]);

  // 10年後の純資産
  const finalNetWorthA =
    resultsA.length > 0 ? resultsA[resultsA.length - 1].netWorth : 0;
  const finalNetWorthB =
    resultsB.length > 0 ? resultsB[resultsB.length - 1].netWorth : 0;

  // 必要時給を計算
  const requiredHourlyA = useMemo(
    () => calculateRequiredHourlyRate(scenarioA.variables),
    [scenarioA.variables]
  );

  const requiredHourlyB = useMemo(
    () => calculateRequiredHourlyRate(scenarioB.variables),
    [scenarioB.variables]
  );

  // 何年目に目標純資産を超えるかを計算
  const reachYearA = useMemo(() => {
    const hit = resultsA.find(
      (p) => p.netWorth >= scenarioA.variables.targetNetWorth
    );
    return hit ? hit.yearIndex : null;
  }, [resultsA, scenarioA.variables.targetNetWorth]);

  const reachYearB = useMemo(() => {
    const hit = resultsB.find(
      (p) => p.netWorth >= scenarioB.variables.targetNetWorth
    );
    return hit ? hit.yearIndex : null;
  }, [resultsB, scenarioB.variables.targetNetWorth]);

  // シナリオBにシナリオAをコピー
  const handleCopyAtoB = () => {
    setScenarioB({
      ...scenarioB,
      variables: { ...scenarioA.variables },
    });
  };

  // シナリオAにシナリオBをコピー
  const handleCopyBtoA = () => {
    setScenarioA({
      ...scenarioA,
      variables: { ...scenarioB.variables },
    });
  };

  // 変数更新ハンドラー
  const updateScenarioVariable = (
    scenarioId: "A" | "B",
    field: keyof FreelanceSimulationVariables,
    value: number
  ) => {
    if (scenarioId === "A") {
      setScenarioA({
        ...scenarioA,
        variables: { ...scenarioA.variables, [field]: value },
      });
    } else {
      setScenarioB({
        ...scenarioB,
        variables: { ...scenarioB.variables, [field]: value },
      });
    }
  };

  // 起業動機タイプのラベルと説明を取得
  const getMotivationTypeInfo = (type: MotivationType) => {
    switch (type) {
      case "STABLE":
        return {
          label: "安定コツコツ型",
          description: "安定を重視して、無理せずコツコツ積み上げたいタイプ",
          growthPattern: "毎年ほぼ同じペースで着実に成長していく直線的な曲線",
        };
      case "GROWTH":
        return {
          label: "成長チャレンジ型",
          description:
            "成長やチャレンジを重視して、リターンを取りにいきたいタイプ",
          growthPattern: "最初に大きく成長し、後半は緩やかになる曲線",
        };
      case "IMPACT":
        return {
          label: "価値・貢献重視型",
          description:
            "自分の価値提供や貢献を重視しながら、収入も伸ばしたいタイプ",
          growthPattern: "最初は緩やかで、後半に急成長する曲線",
        };
    }
  };

  const motivationTypeInfo = getMotivationTypeInfo(motivationType);

  return (
    <div className="space-y-6">
      {/* ========================================
          ヘッダー
          ======================================== */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center space-x-3">
          <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-text">
              純資産シミュレーション
            </h1>
            <p className="text-sm text-text/70 mt-2 leading-relaxed">
              今の働き方のままで進んだとき、10年後にどれくらい「お金の余裕」があるのか。
              <br className="hidden sm:block" />
              条件を調整しながら、「自分が本当に叶えたい状態」に近い設計を探してみましょう。
            </p>
          </div>
        </div>

        {/* 起業動機診断タイプ選択 */}
        <div className="card">
          <label className="block text-sm font-medium text-text mb-2">
            起業動機診断タイプ
          </label>
          <select
            value={motivationType}
            onChange={(e) =>
              setMotivationType(e.target.value as MotivationType)
            }
            className="w-full px-4 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white appearance-none"
            style={{
              backgroundImage:
                'url(\'data:image/svg+xml;utf8,<svg fill="black" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/><path d="M0 0h24v24H0z" fill="none"/></svg>\')',
              backgroundRepeat: "no-repeat",
              backgroundPosition: "calc(100% - 8px) center",
              backgroundSize: "20px",
            }}
          >
            <option value="STABLE">安定コツコツ型</option>
            <option value="GROWTH">成長チャレンジ型</option>
            <option value="IMPACT">価値・貢献重視型</option>
          </select>
          <div className="mt-3 px-3 py-3 bg-primary/5 rounded-lg space-y-1">
            <p className="text-xs sm:text-sm text-primary/80">
              <span className="font-semibold">{motivationTypeInfo.label}</span>
              ：{motivationTypeInfo.description}
            </p>
            <p className="text-xs text-primary/70 flex items-start">
              <span className="mr-1">📈</span>
              <span>成長パターン：{motivationTypeInfo.growthPattern}</span>
            </p>
          </div>
        </div>
      </div>

      {/* ========================================
          グラフエリア
          ======================================== */}
      <div className="card">
        <h3 className="text-base sm:text-lg font-semibold text-text mb-2">
          純資産推移比較（10年間）
        </h3>
        <div className="mb-4 space-y-2">
          <p className="text-xs sm:text-sm text-text/70 leading-relaxed">
            起業タイプ：
            <span className="font-semibold text-primary">
              {motivationTypeInfo.label}
            </span>{" "}
            の設定だと、このまま進んだ場合の10年後の純資産は
            <span className="font-semibold text-[#67BACA]">
              {(finalNetWorthA / 10000).toLocaleString()}万円
            </span>
            です。
          </p>
          <p className="text-xs text-text/60 flex items-start">
            <span className="mr-1">📊</span>
            <span>
              このタイプは「{motivationTypeInfo.growthPattern}」で成長します。
              <br className="hidden sm:block" />
              目標までのギャップを見ながら、条件を少しずつ調整してみましょう。
            </span>
          </p>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
            <XAxis
              dataKey="yearIndex"
              stroke="#333333"
              tickFormatter={(value) => `${value}年目`}
            />
            <YAxis
              stroke="#333333"
              domain={["auto", "auto"]}
              tickFormatter={(value) => `${(value / 10000).toFixed(0)}万`}
            />
            <Tooltip content={<CustomTooltip />} />
            {/* 目標純資産ライン A */}
            <Line
              type="monotone"
              dataKey={() => scenarioA.variables.targetNetWorth}
              stroke="#9CA3AF"
              strokeDasharray="4 4"
              dot={false}
              name="目標純資産A"
              strokeWidth={2}
            />
            {/* 目標純資産ライン B */}
            <Line
              type="monotone"
              dataKey={() => scenarioB.variables.targetNetWorth}
              stroke="#D1D5DB"
              strokeDasharray="4 4"
              dot={false}
              name="目標純資産B"
              strokeWidth={2}
            />
            {/* シナリオ A の純資産 */}
            <Line
              type="monotone"
              dataKey="netWorthA"
              stroke="#67BACA"
              strokeWidth={3}
              dot={{ fill: "#67BACA", strokeWidth: 2, r: 4 }}
              name="シナリオA"
            />
            {/* シナリオ B の純資産 */}
            <Line
              type="monotone"
              dataKey="netWorthB"
              stroke="#F97316"
              strokeWidth={3}
              dot={{ fill: "#F97316", strokeWidth: 2, r: 4 }}
              name="シナリオB"
            />
          </LineChart>
        </ResponsiveContainer>

        {/* グラフ凡例 */}
        <div className="flex flex-wrap justify-center mt-4 gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-[#67BACA] rounded-full"></div>
            <span className="text-sm text-text/70">シナリオ A</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-[#F97316] rounded-full"></div>
            <span className="text-sm text-text/70">シナリオ B</span>
          </div>
          <div className="flex items-center space-x-2">
            <div
              className="w-3 h-0.5 bg-gray-400"
              style={{ borderTop: "2px dashed #9CA3AF" }}
            ></div>
            <span className="text-sm text-text/70">目標純資産</span>
          </div>
        </div>
      </div>

      {/* ========================================
          KPIカード
          ======================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* シナリオ A KPI */}
        <div className="card">
          <h4 className="font-semibold text-text mb-3 flex items-center space-x-2">
            <div className="w-3 h-3 bg-[#67BACA] rounded-full"></div>
            <span>シナリオ A</span>
          </h4>

          <div className="space-y-2">
            <p className="text-sm text-text/70">
              10年後の予測純資産:{" "}
              <span className="font-bold text-text text-base">
                {(finalNetWorthA / 10000).toLocaleString()}万円
              </span>
            </p>
            <p className="text-sm text-text/70">
              目標純資産:{" "}
              <span className="font-bold text-text text-base">
                {(scenarioA.variables.targetNetWorth / 10000).toLocaleString()}
                万円
              </span>
            </p>
            <div className="pt-2">
              {finalNetWorthA >= scenarioA.variables.targetNetWorth ? (
                <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                  ✓ 目標達成
                </span>
              ) : (
                <span className="inline-block px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full">
                  ✗ 目標未達
                </span>
              )}
            </div>

            {/* ギャップと処方箋メッセージ */}
            <div className="pt-3 border-t border-border/50 mt-3">
              {(() => {
                const gapA =
                  scenarioA.variables.targetNetWorth - finalNetWorthA;
                if (gapA > 0 && requiredHourlyA) {
                  // 目標未達の場合
                  return (
                    <p className="text-xs sm:text-sm text-text/80 leading-relaxed">
                      このままの条件だと、10年後の目標まで
                      <span className="font-semibold text-red-600">
                        {(gapA / 10000).toLocaleString()}万円
                      </span>
                      足りません。
                      <br />
                      目標に届くひとつの目安は、
                      <span className="font-semibold">
                        時給 {Math.round(requiredHourlyA).toLocaleString()} 円
                      </span>
                      （いまより{" "}
                      <span className="font-semibold text-primary">
                        +
                        {Math.max(
                          0,
                          Math.round(
                            requiredHourlyA - scenarioA.variables.hourlyRate
                          )
                        ).toLocaleString()}
                        円
                      </span>
                      ）です。
                    </p>
                  );
                } else if (reachYearA !== null && reachYearA <= YEARS) {
                  // 目標達成の場合
                  return (
                    <p className="text-xs sm:text-sm text-text/80 leading-relaxed">
                      この条件なら、
                      <span className="font-semibold text-primary">
                        {reachYearA}年目
                      </span>
                      に目標純資産を達成できます。その後は「余裕」のゾーンに入っていく設計です。
                    </p>
                  );
                } else {
                  return (
                    <p className="text-xs sm:text-sm text-text/80 leading-relaxed">
                      条件を調整して、目標に近づけてみましょう。
                    </p>
                  );
                }
              })()}
            </div>
          </div>
        </div>

        {/* シナリオ B KPI */}
        <div className="card">
          <h4 className="font-semibold text-text mb-3 flex items-center space-x-2">
            <div className="w-3 h-3 bg-[#F97316] rounded-full"></div>
            <span>シナリオ B</span>
          </h4>

          <div className="space-y-2">
            <p className="text-sm text-text/70">
              10年後の予測純資産:{" "}
              <span className="font-bold text-text text-base">
                {(finalNetWorthB / 10000).toLocaleString()}万円
              </span>
            </p>
            <p className="text-sm text-text/70">
              目標純資産:{" "}
              <span className="font-bold text-text text-base">
                {(scenarioB.variables.targetNetWorth / 10000).toLocaleString()}
                万円
              </span>
            </p>
            <div className="pt-2">
              {finalNetWorthB >= scenarioB.variables.targetNetWorth ? (
                <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                  ✓ 目標達成
                </span>
              ) : (
                <span className="inline-block px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full">
                  ✗ 目標未達
                </span>
              )}
            </div>

            {/* ギャップと処方箋メッセージ */}
            <div className="pt-3 border-t border-border/50 mt-3">
              {(() => {
                const gapB =
                  scenarioB.variables.targetNetWorth - finalNetWorthB;
                if (gapB > 0 && requiredHourlyB) {
                  // 目標未達の場合
                  return (
                    <p className="text-xs sm:text-sm text-text/80 leading-relaxed">
                      このままの条件だと、10年後の目標まで
                      <span className="font-semibold text-red-600">
                        {(gapB / 10000).toLocaleString()}万円
                      </span>
                      足りません。
                      <br />
                      目標に届くひとつの目安は、
                      <span className="font-semibold">
                        時給 {Math.round(requiredHourlyB).toLocaleString()} 円
                      </span>
                      （いまより{" "}
                      <span className="font-semibold text-primary">
                        +
                        {Math.max(
                          0,
                          Math.round(
                            requiredHourlyB - scenarioB.variables.hourlyRate
                          )
                        ).toLocaleString()}
                        円
                      </span>
                      ）です。
                    </p>
                  );
                } else if (reachYearB !== null && reachYearB <= YEARS) {
                  // 目標達成の場合
                  return (
                    <p className="text-xs sm:text-sm text-text/80 leading-relaxed">
                      この条件なら、
                      <span className="font-semibold text-primary">
                        {reachYearB}年目
                      </span>
                      に目標純資産を達成できます。その後は「余裕」のゾーンに入っていく設計です。
                    </p>
                  );
                } else {
                  return (
                    <p className="text-xs sm:text-sm text-text/80 leading-relaxed">
                      条件を調整して、目標に近づけてみましょう。
                    </p>
                  );
                }
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================
          シナリオ設定フォーム
          ======================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* シナリオ A 設定 */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-text flex items-center space-x-2">
                <div className="w-3 h-3 bg-[#67BACA] rounded-full"></div>
                <span>シナリオ A</span>
              </h3>
            </div>
            <button
              onClick={handleCopyBtoA}
              className="flex items-center space-x-1 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-sm rounded transition-colors"
              title="シナリオ B をコピー"
            >
              <Copy className="h-4 w-4" />
              <span>B をコピー</span>
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-text/70 mb-1">
                初期純資産（円）
              </label>
              <input
                type="number"
                value={scenarioA.variables.initialNetWorth}
                onChange={(e) =>
                  updateScenarioVariable(
                    "A",
                    "initialNetWorth",
                    Number(e.target.value)
                  )
                }
                className="w-full px-2 py-1 text-sm border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text/70 mb-1">
                  時給（円/時間）
                </label>
                <input
                  type="number"
                  value={scenarioA.variables.hourlyRate}
                  onChange={(e) =>
                    updateScenarioVariable(
                      "A",
                      "hourlyRate",
                      Number(e.target.value)
                    )
                  }
                  className="w-full px-2 py-1 text-sm border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text/70 mb-1">
                  月間労働時間（時間）
                </label>
                <input
                  type="number"
                  value={scenarioA.variables.monthlyWorkHours}
                  onChange={(e) =>
                    updateScenarioVariable(
                      "A",
                      "monthlyWorkHours",
                      Number(e.target.value)
                    )
                  }
                  className="w-full px-2 py-1 text-sm border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text/70 mb-1">
                  月間事業経費（円）
                </label>
                <input
                  type="number"
                  value={scenarioA.variables.monthlyBusinessCost}
                  onChange={(e) =>
                    updateScenarioVariable(
                      "A",
                      "monthlyBusinessCost",
                      Number(e.target.value)
                    )
                  }
                  className="w-full px-2 py-1 text-sm border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text/70 mb-1">
                  月間生活費（円）
                </label>
                <input
                  type="number"
                  value={scenarioA.variables.monthlyLivingCost}
                  onChange={(e) =>
                    updateScenarioVariable(
                      "A",
                      "monthlyLivingCost",
                      Number(e.target.value)
                    )
                  }
                  className="w-full px-2 py-1 text-sm border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text/70 mb-1">
                目標純資産（円）
              </label>
              <input
                type="number"
                value={scenarioA.variables.targetNetWorth}
                onChange={(e) =>
                  updateScenarioVariable(
                    "A",
                    "targetNetWorth",
                    Number(e.target.value)
                  )
                }
                className="w-full px-2 py-1 text-sm border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* シナリオ B 設定 */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-text flex items-center space-x-2">
                <div className="w-3 h-3 bg-[#F97316] rounded-full"></div>
                <span>シナリオ B</span>
              </h3>
            </div>
            <button
              onClick={handleCopyAtoB}
              className="flex items-center space-x-1 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-sm rounded transition-colors"
              title="シナリオ A をコピー"
            >
              <Copy className="h-4 w-4" />
              <span>A をコピー</span>
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-text/70 mb-1">
                初期純資産（円）
              </label>
              <input
                type="number"
                value={scenarioB.variables.initialNetWorth}
                onChange={(e) =>
                  updateScenarioVariable(
                    "B",
                    "initialNetWorth",
                    Number(e.target.value)
                  )
                }
                className="w-full px-2 py-1 text-sm border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text/70 mb-1">
                  時給（円/時間）
                </label>
                <input
                  type="number"
                  value={scenarioB.variables.hourlyRate}
                  onChange={(e) =>
                    updateScenarioVariable(
                      "B",
                      "hourlyRate",
                      Number(e.target.value)
                    )
                  }
                  className="w-full px-2 py-1 text-sm border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text/70 mb-1">
                  月間労働時間（時間）
                </label>
                <input
                  type="number"
                  value={scenarioB.variables.monthlyWorkHours}
                  onChange={(e) =>
                    updateScenarioVariable(
                      "B",
                      "monthlyWorkHours",
                      Number(e.target.value)
                    )
                  }
                  className="w-full px-2 py-1 text-sm border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text/70 mb-1">
                  月間事業経費（円）
                </label>
                <input
                  type="number"
                  value={scenarioB.variables.monthlyBusinessCost}
                  onChange={(e) =>
                    updateScenarioVariable(
                      "B",
                      "monthlyBusinessCost",
                      Number(e.target.value)
                    )
                  }
                  className="w-full px-2 py-1 text-sm border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text/70 mb-1">
                  月間生活費（円）
                </label>
                <input
                  type="number"
                  value={scenarioB.variables.monthlyLivingCost}
                  onChange={(e) =>
                    updateScenarioVariable(
                      "B",
                      "monthlyLivingCost",
                      Number(e.target.value)
                    )
                  }
                  className="w-full px-2 py-1 text-sm border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text/70 mb-1">
                目標純資産（円）
              </label>
              <input
                type="number"
                value={scenarioB.variables.targetNetWorth}
                onChange={(e) =>
                  updateScenarioVariable(
                    "B",
                    "targetNetWorth",
                    Number(e.target.value)
                  )
                }
                className="w-full px-2 py-1 text-sm border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimulationScreen;
