import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from 'react-router-dom';
import { usePermission } from "../hooks/usePermission";
import { Save  } from "lucide-react";
import plIcon from "../assets/icon_pl.png";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Label,
} from "recharts";
import { useAuth } from "../contexts/AuthContext";
import { Service } from "../api/services/Service";
import { withErrorHandling } from "../utils/apiErrorHandler";
import {
  onYearlyActualUpdate,
  loadPlPlan,
  loadPlActual,
  savePlActual,
  formatAmountToText,
} from "../utils/mandalaIntegration";
import type { SaleSchema } from "../api/models/SaleSchema";
import type { GrossProfitSchema } from "../api/models/GrossProfitSchema";
import type { OperatingProfitSchema } from "../api/models/OperatingProfitSchema";
import type { LargePLLinkedItemSchema } from "../api/models/LargePLLinkedItemSchema";
import type { MiddlePLLinkedItemSchema } from "../api/models/MiddlePLLinkedItemSchema";

interface YearlyData {
  year: number;
  // 純資産
  netWorthTarget: number;
  netWorthActual: number;
  // 売上
  revenueTarget: number;
  revenueActual: number;
  // 粗利益
  grossProfitTarget: number;
  grossProfitActual: number;
  // 営業利益
  operatingProfitTarget: number;
  operatingProfitActual: number;
  // フェーズ
  phase: string;
}


type EditableField =
  | "revenueTarget"
  | "revenueActual"
  | "grossProfitTarget"
  | "grossProfitActual"
  | "operatingProfitTarget"
  | "operatingProfitActual"
  | "netWorthTarget"
  | "netWorthActual";

// yearごとに変更を保持
type PendingEdits = Record<number, Partial<YearlyData>>;

const YearlyBudgetActual: React.FC = () => {
  const navigate = useNavigate();
  const { selectedUser, userSetup, loadUserSetup } = useAuth();
  const { canEdit } = usePermission();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const [targets, setTargets] = useState<YearlyData[]>([]);

  const [tableViewPeriod, setTableViewPeriod] = useState<"1-5" | "6-10">("1-5");
  const [editingCell, setEditingCell] = useState<string | null>(null);

  const [pendingEdits, setPendingEdits] = useState<PendingEdits>({});
  const [chartType, setChartType] = useState<"revenue" | "grossProfit" | "operatingProfit">("revenue");

  // 追加: 画面幅を管理するstate
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 640;
    }
    return false;
  });

  // 追加: 画面リサイズを検知
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  // グラフ用のデータ（pendingEditsの値を反映）
  const chartData = React.useMemo(() => {
    return targets.map((target) => {
      const edits = pendingEdits[target.year];
      if (edits) {
        return {
          ...target,
          revenueTarget: edits.revenueTarget ?? target.revenueTarget,
          revenueActual: edits.revenueActual ?? target.revenueActual,
          grossProfitTarget: edits.grossProfitTarget ?? target.grossProfitTarget,
          grossProfitActual: edits.grossProfitActual ?? target.grossProfitActual,
          operatingProfitTarget: edits.operatingProfitTarget ?? target.operatingProfitTarget,
          operatingProfitActual: edits.operatingProfitActual ?? target.operatingProfitActual,
        };
      }
      return target;
    });
  }, [targets, pendingEdits]);

  // グラフのY軸最大値を動的に計算（pendingEditsの値を考慮）
  const yAxisDomain = React.useMemo((): [number, number] => {
    if (targets.length === 0) {
      return [0, 10000000];
    }

    let minValue = 0;
    let maxValue = 0;
    chartData.forEach((t) => {
      if (chartType === "revenue") {
        maxValue = Math.max(maxValue, t.revenueTarget || 0, t.revenueActual || 0);
      } else if (chartType === "grossProfit") {
        minValue = Math.min(minValue, t.grossProfitTarget || 0, t.grossProfitActual || 0);
        maxValue = Math.max(maxValue, t.grossProfitTarget || 0, t.grossProfitActual || 0);
      } else {
        minValue = Math.min(minValue, t.operatingProfitTarget || 0, t.operatingProfitActual || 0);
        maxValue = Math.max(maxValue, t.operatingProfitTarget || 0, t.operatingProfitActual || 0);
      }
    });

    if (maxValue === 0 && minValue === 0) {
      return [0, 10000000];
    }

    // 上限：50%の余裕を持たせて単位切り上げ
    const paddedMax = maxValue > 0 ? maxValue * 1.5 : 1000000;
    let upperBound: number;
    if (paddedMax < 1000000) {
      upperBound = Math.ceil(paddedMax / 100000) * 100000;
    } else if (paddedMax < 10000000) {
      upperBound = Math.ceil(paddedMax / 1000000) * 1000000;
    } else if (paddedMax < 100000000) {
      upperBound = Math.ceil(paddedMax / 10000000) * 10000000;
    } else {
      upperBound = Math.ceil(paddedMax / 100000000) * 100000000;
    }

    // 下限：マイナスがある場合は50%の余裕を持たせて単位切り捨て
    let lowerBound = 0;
    if (minValue < 0) {
      const paddedMin = minValue * 1.5;
      if (paddedMin > -1000000) {
        lowerBound = Math.floor(paddedMin / 100000) * 100000;
      } else if (paddedMin > -10000000) {
        lowerBound = Math.floor(paddedMin / 1000000) * 1000000;
      } else if (paddedMin > -100000000) {
        lowerBound = Math.floor(paddedMin / 10000000) * 10000000;
      } else {
        lowerBound = Math.floor(paddedMin / 100000000) * 100000000;
      }
    }

    return [lowerBound, upperBound];
  }, [chartData, chartType]);

  // Y軸の目盛り（0を必ず含む）
  const yAxisTicks = React.useMemo((): number[] => {
    const [min, max] = yAxisDomain;
    const range = max - min;
    if (range === 0) return [0];

    // 5〜7本程度になるステップ幅を算出
    const roughStep = range / 6;
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
    const step = Math.ceil(roughStep / magnitude) * magnitude;

    const ticks: number[] = [];
    const start = Math.ceil(min / step) * step;
    for (let t = start; t <= max + step * 0.01; t += step) {
      ticks.push(Math.round(t));
    }
    // 0 が含まれていなければ強制追加
    if (min <= 0 && max >= 0 && !ticks.includes(0)) {
      ticks.push(0);
      ticks.sort((a, b) => a - b);
    }
    return ticks;
  }, [yAxisDomain]);

  // データロード
  useEffect(() => {
    const loadData = async () => {
      if (!selectedUser) {
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        setError(null);
        // ユーザー切り替え時に前のデータをクリア
        setTargets([]);
        setMandalaGoals([]);
        setPendingEdits({});

        // userSetupが読み込まれていない場合は読み込む
        let currentUserSetup = userSetup;
        if (!currentUserSetup) {
          await loadUserSetup();
          // loadUserSetup後、直接APIから取得する
          const setupResponse = await withErrorHandling(() => 
            Service.getApiSettingUser(selectedUser.id)
          );
          if (setupResponse.responseStatus === 1 && setupResponse.settingSchema) {
            currentUserSetup = {
              fiscalYearStartMonth: setupResponse.settingSchema.fiscalYearStartMonth || 4,
              fiscalYearStartYear: setupResponse.settingSchema.fiscalYearStartYear || new Date().getFullYear(),
            } as any;
          }
        }

        const fiscalYearStartMonth = currentUserSetup?.fiscalYearStartMonth || 4;
        const fiscalYearStartYear = currentUserSetup?.fiscalYearStartYear || new Date().getFullYear();

        // 年次データを取得（バックエンドで12ヶ月分を集計済み）
        const yearlyResponse = await withErrorHandling(() =>
          Service.getApiYearlyBudgetActual(selectedUser.id)
        );

        if (yearlyResponse.responseStatus === 1) {
          // 年ごとにデータを集計するマップ
          const yearlyDataMap = new Map<number, YearlyData>();

          // 10年分の年度を初期化
          for (let i = 0; i < 10; i++) {
            const fiscalYear = fiscalYearStartYear + i;
            yearlyDataMap.set(fiscalYear, {
              year: fiscalYear,
              revenueTarget: 0,
              revenueActual: 0,
              grossProfitTarget: 0,
              grossProfitActual: 0,
              operatingProfitTarget: 0,
              operatingProfitActual: 0,
              netWorthTarget: 0,
              netWorthActual: 0,
              phase: i < 3 ? "創業期" : i < 5 ? "転換期" : "成長期",
            });
          }

          // 売上データを年度ごとに集計
          if (yearlyResponse.saleSchema) {
            yearlyResponse.saleSchema.forEach((sale) => {
              if (sale.year === undefined || sale.month === undefined) return;
              
              // この月がどの会計年度に属するかを計算
              let fiscalYear;
              if (sale.month >= fiscalYearStartMonth) {
                fiscalYear = sale.year;
              } else {
                fiscalYear = sale.year - 1;
              }
              
              const yearlyData = yearlyDataMap.get(fiscalYear);
              if (yearlyData) {
                yearlyData.revenueTarget += sale.saleTarget || 0;
                yearlyData.revenueActual += sale.saleResult || 0;
              }
            });
          }

          // 粗利益データを年度ごとに集計
          if (yearlyResponse.grossProfitSchema) {
            yearlyResponse.grossProfitSchema.forEach((grossProfit) => {
              if (grossProfit.year === undefined || grossProfit.month === undefined) return;
              
              // この月がどの会計年度に属するかを計算
              let fiscalYear;
              if (grossProfit.month >= fiscalYearStartMonth) {
                fiscalYear = grossProfit.year;
              } else {
                fiscalYear = grossProfit.year - 1;
              }
              
              const yearlyData = yearlyDataMap.get(fiscalYear);
              if (yearlyData) {
                yearlyData.grossProfitTarget += grossProfit.grossProfitTarget || 0;
                yearlyData.grossProfitActual += grossProfit.grossProfitResult || 0;
              }
            });
          }

          // 営業利益データを年度ごとに集計
          if (yearlyResponse.operatingProfitSchema) {
            yearlyResponse.operatingProfitSchema.forEach((operatingProfit) => {
              if (operatingProfit.year === undefined || operatingProfit.month === undefined) return;
              
              // この月がどの会計年度に属するかを計算
              let fiscalYear;
              if (operatingProfit.month >= fiscalYearStartMonth) {
                fiscalYear = operatingProfit.year;
              } else {
                fiscalYear = operatingProfit.year - 1;
              }
              
              const yearlyData = yearlyDataMap.get(fiscalYear);
              if (yearlyData) {
                yearlyData.operatingProfitTarget += operatingProfit.operatingProfitTarget || 0;
                yearlyData.operatingProfitActual += operatingProfit.operatingProfitResult || 0;
              }
            });
          }

          // データロード部分で、yearを絶対年に変換
          const yearlyTargets = Array.from(yearlyDataMap.values())
            .sort((a, b) => a.year - b.year);

          // マンダラ連動のPL計画があれば純資産データを追加
          const plPlan = loadPlPlan();
          if (plPlan) {
            yearlyTargets.forEach((yearlyData) => {
              const planData = plPlan.yearly.find((y) => y.year === yearlyData.year);
              if (planData) {
                yearlyData.netWorthTarget = planData.netWorthTarget;
                // 実績値は既存のロジックから取得
                const plActual = loadPlActual();
                const actualData = plActual?.yearly.find((a) => a.year === yearlyData.year);
                yearlyData.netWorthActual = actualData?.netWorthActual || 0;
              }
            });
          }

          setTargets(yearlyTargets);

          // APIレスポンスから目標データを抽出（重複を除外）
          const goalsMap = new Map<string, {
            year: number;
            targetValue: number;
            metric: 'revenue' | 'grossProfit' | 'operatingProfit';
          }>();

          // 目標タイプをメトリックにマッピングする関数
          const goalTypeToMetric = (goalType: number | undefined): 'revenue' | 'grossProfit' | 'operatingProfit' | null => {
            if (goalType === 2) return 'revenue';
            if (goalType === 3) return 'grossProfit';
            if (goalType === 4) return 'operatingProfit';
            return null;
          };

          // 大目標から目標を抽出
          if (yearlyResponse.largePLLinkedItemSchema) {
            yearlyResponse.largePLLinkedItemSchema.forEach((item: LargePLLinkedItemSchema) => {
              if (item.goal_type && item.target_year !== undefined && item.target_amount !== undefined) {
                const metric = goalTypeToMetric(item.goal_type);
                if (metric) {
                  const key = `${metric}-${item.target_year}`;
                  // 既に同じキーが存在しない場合のみ追加
                  if (!goalsMap.has(key)) {
                    goalsMap.set(key, {
                      year: item.target_year,
                      targetValue: item.target_amount,
                      metric: metric,
                    });
                  }
                }
              }
            });
          }

          // 中目標から目標を抽出
          if (yearlyResponse.middlePLLinkedItemSchema) {
            yearlyResponse.middlePLLinkedItemSchema.forEach((item: MiddlePLLinkedItemSchema) => {
              if (item.goal_type && item.target_year !== undefined && item.target_amount !== undefined) {
                const metric = goalTypeToMetric(item.goal_type);
                if (metric) {
                  const key = `${metric}-${item.target_year}`;
                  // 既に同じキーが存在しない場合のみ追加
                  if (!goalsMap.has(key)) {
                    goalsMap.set(key, {
                      year: item.target_year,
                      targetValue: item.target_amount,
                      metric: metric,
                    });
                  }
                }
              }
            });
          }

          // MapからArrayに変換
          const goals = Array.from(goalsMap.values());

          setMandalaGoals(goals);
          
        } else {
          console.warn('APIレスポンスステータスが1ではありません');
          setError("データの取得に失敗しました");
          setTargets([]);
          setMandalaGoals([]);
        }
      } catch (err) {
        console.error("データの読み込みエラー:", err);
        setError("データの読み込みに失敗しました");
        setTargets([]);
        setMandalaGoals([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [selectedUser?.id]);

  const [mandalaGoals, setMandalaGoals] = useState<{
    year: number;
    targetValue: number;
    metric: 'revenue' | 'grossProfit' | 'operatingProfit';
  }[]>([]);

  // ★ 追加：マンダラ更新確認ダイアログの状態
  const [mandalaUpdateDialog, setMandalaUpdateDialog] = useState<{
    isOpen: boolean;
    message: string;
    fiscalYear: number;
    goalType: 'revenue' | 'grossProfit' | 'operatingProfit';
    yearlyTotal: number;
    existingAmount: number;
    onConfirm: () => void;
    onCancel: () => void;
  }>({
    isOpen: false,
    message: '',
    fiscalYear: 0,
    goalType: 'revenue',
    yearlyTotal: 0,
    existingAmount: 0,
    onConfirm: () => {},
    onCancel: () => {}
  });

  useEffect(() => {
    const handlePlPlanUpdate = () => {
      
      if (!selectedUser) return;
      
      setIsLoading(true);
      
      const loadData = async () => {
        try {
          await new Promise((resolve) => setTimeout(resolve, 300));
          
          const plPlan = loadPlPlan();
          const plActual = loadPlActual();
          
          if (plPlan) {
            const yearlyTargets: YearlyData[] = plPlan.yearly.map((y) => {
              const actualData = plActual?.yearly.find((a) => a.year === y.year);

              return {
                year: y.year,
                revenueTarget: y.revenueTarget,
                revenueActual: actualData?.revenueActual || 0,
                grossProfitTarget: y.grossProfitTarget,
                grossProfitActual: actualData?.grossProfitActual || 0,
                operatingProfitTarget: y.operatingProfitTarget,
                operatingProfitActual: actualData?.operatingProfitActual || 0,
                netWorthTarget: y.netWorthTarget,
                netWorthActual: actualData?.netWorthActual || 0,
                phase: y.year <= 3 ? "創業期" : y.year <= 5 ? "転換期" : "成長期",
              };
            });

            setTargets(yearlyTargets);
          } else {
            setTargets([]);
          }
        } catch (err) {
          console.error('Reload error:', err);
        } finally {
          setIsLoading(false);
        }
      };
      
      loadData();
    };

    window.addEventListener('pl-plan-updated', handlePlPlanUpdate);
    
    return () => {
      window.removeEventListener('pl-plan-updated', handlePlPlanUpdate);
    };
  }, [selectedUser]);

  // セル更新
  const handleCellUpdate = (
    year: number,
    field: EditableField,
    value: number
  ) => {
    setPendingEdits((prev) => ({
      ...prev,
      [year]: {
        ...(prev[year] || {}),
        [field]: value,
      },
    }));

    // UI 即時反映
    setTargets((prev) =>
      prev.map((target) =>
        target.year === year ? { ...target, [field]: value } : target
      )
    );

    setEditingCell(null);
  };

  const handleCellDoubleClick = (year: number, field: EditableField) => {
    const key = `${year}-${field}`;
    setEditingCell(key);
  };

  const hasChanges = (): boolean => {
    return Object.keys(pendingEdits).length > 0;
  };

  const handleSave = async () => {
    if (!hasChanges()) {
      alert("変更がありません");
      return;
    }
  
    try {
      setIsSaving(true);
      await new Promise((resolve) => setTimeout(resolve, 500));
  
      // マンダラ連動のため、実績データのみ読み込む
      let plActual = loadPlActual();
      
      if (!plActual) {
        plActual = { yearly: [] };
      }
  
      let mandalaUpdated = false;
  
      // pendingEditsを反映（マンダラ連動のため実績値のみ処理）
      Object.entries(pendingEdits).forEach(([yearStr, edits]) => {
        const year = parseInt(yearStr, 10);
        const currentData = targets.find((t) => t.year === year);
        if (!currentData) return;
  
        // 実績値の処理（マンダラ連動のため）
        const hasActualEdit =
          edits.revenueActual !== undefined ||
          edits.grossProfitActual !== undefined ||
          edits.operatingProfitActual !== undefined ||
          edits.netWorthActual !== undefined;
  
        if (hasActualEdit) {
          const updatedActual = {
            year,
            revenueActual: edits.revenueActual ?? currentData.revenueActual,
            grossProfitActual: edits.grossProfitActual ?? currentData.grossProfitActual,
            operatingProfitActual: edits.operatingProfitActual ?? currentData.operatingProfitActual,
            netWorthActual: edits.netWorthActual ?? currentData.netWorthActual,
          };
  
          const existingActualIndex = plActual!.yearly.findIndex((a) => a.year === year);
          if (existingActualIndex >= 0) {
            plActual!.yearly[existingActualIndex] = updatedActual;
          } else {
            plActual!.yearly.push(updatedActual);
          }
          const result = onYearlyActualUpdate(year, updatedActual);
          mandalaUpdated = true;
        }
      });
  
      // ★★★ ここから先を修正 ★★★
      // API呼び出し処理の前にマンダラチェック
      if (!selectedUser) {
        throw new Error("ユーザー情報が取得できませんでした");
      }
  
      let currentUserSetup = userSetup;
      if (!currentUserSetup) {
        await loadUserSetup();
        await new Promise(resolve => setTimeout(resolve, 100));
        const setupResponse = await withErrorHandling(() => 
          Service.getApiSettingUser(selectedUser.id)
        );
        if (setupResponse.responseStatus === 1 && setupResponse.settingSchema) {
          currentUserSetup = {
            fiscalYearStartMonth: setupResponse.settingSchema.fiscalYearStartMonth || 4,
            fiscalYearStartYear: setupResponse.settingSchema.fiscalYearStartYear || new Date().getFullYear(),
          } as any;
        }
      }
  
      const fiscalYearStartMonth = currentUserSetup?.fiscalYearStartMonth || 4;
  
      // ★★★ マンダラチェックを先に実行（目標値の変更がある場合のみ） ★★★
      let shouldProceed = true;
      
      for (const [yearStr, edits] of Object.entries(pendingEdits)) {
        const year = parseInt(yearStr, 10);
        const currentData = targets.find((t) => t.year === year);
        if (!currentData) continue;
  
        // 目標値の変更をチェック
        const hasTargetChange = 
          edits.revenueTarget !== undefined ||
          edits.grossProfitTarget !== undefined ||
          edits.operatingProfitTarget !== undefined;
  
        if (!hasTargetChange) continue;
  
        // マンダラチャートデータを取得
        const mandalaResponse = await withErrorHandling(() =>
          Service.getApiMandalaCharts(selectedUser.id)
        );
  
        if (mandalaResponse.responseStatus === 1 && mandalaResponse.charts) {
          const activeChart = mandalaResponse.charts.find(chart => chart.is_active === true);
          
          if (activeChart) {
            // 中目標をMapで管理して重複を防ぐ
            const middleGoalsMap = new Map();
            
            if (activeChart.large_goals) {
              for (const largeGoal of activeChart.large_goals) {
                if (largeGoal.large_goal_id) {
                  try {
                    const middleResponse = await Service.getApiMiddleGoals(largeGoal.large_goal_id);
                    if (middleResponse.responseStatus === 1 && middleResponse.middle_goals) {
                      // 中目標をMapに追加（middle_goal_idで一意性を確保）
                      middleResponse.middle_goals.forEach((mg: any) => {
                        if (mg.middle_goal_id) {
                          middleGoalsMap.set(mg.middle_goal_id, mg);
                        }
                      });
                    }
                  } catch (err) {
                    console.error('中目標取得エラー:', err);
                  }
                }
              }
            }
            
            // Mapから配列に変換
            const allMiddleGoals = Array.from(middleGoalsMap.values());
  
            // 各メトリックごとにチェック
            const metricsToCheck: Array<{
              metric: 'revenue' | 'grossProfit' | 'operatingProfit';
              editValue: number | undefined;
              goalType: number;
            }> = [
              { metric: 'revenue', editValue: edits.revenueTarget, goalType: 2 },
              { metric: 'grossProfit', editValue: edits.grossProfitTarget, goalType: 3 },
              { metric: 'operatingProfit', editValue: edits.operatingProfitTarget, goalType: 4 }
            ];
  
            for (const { metric, editValue, goalType } of metricsToCheck) {
              if (editValue === undefined) continue;
            
              const metricLabel = 
                metric === 'revenue' ? '売上' :
                metric === 'grossProfit' ? '粗利益' : '営業利益';
            
              // 該当する年度・メトリックの目標を取得
              const largeGoals = activeChart.large_goals?.filter(
                (lg: any) => lg.goal_type === goalType && lg.target_year === year
              ) || [];
              
              const middleGoals = allMiddleGoals.filter(
                (mg: any) => mg.goal_type === goalType && mg.target_year === year
              );
              
              // 重複を完全に除外
              const uniqueGoalsMap = new Map();
              
              largeGoals.forEach(lg => {
                if (lg.large_goal_id) {
                  uniqueGoalsMap.set(`large_${lg.large_goal_id}`, {
                    ...lg,
                    type: 'large'
                  });
                }
              });
              
              middleGoals.forEach(mg => {
                if (mg.middle_goal_id) {
                  uniqueGoalsMap.set(`middle_${mg.middle_goal_id}`, {
                    ...mg,
                    type: 'middle'
                  });
                }
              });
              
              const allGoals = Array.from(uniqueGoalsMap.values());
              
              if (allGoals.length === 0) continue;
            
              // すべての目標金額が新しい値と一致するかチェック
              const allAmountsSame = allGoals.every(goal => goal.target_amount === editValue);
              
              if (!allAmountsSame) {
                // 金額フォーマット関数
                const formatAmount = (amount: number): string => {
                  const manyen = Math.floor(amount / 10000); // Math.round ではなく Math.floor
                  if (manyen >= 10000) {
                    const oku = Math.floor(manyen / 10000);
                    const man = manyen % 10000;
                    if (man === 0) {
                      return `${oku}億円`;
                    } else {
                      return `${oku}億${man}万円`;
                    }
                  }
                  return `${manyen}万円`;
                };
              
                // 代表的な目標を取得
                const representativeGoal = allGoals[0];
                const existingAmount = representativeGoal?.target_amount || 0;
                
                // 階層情報を構築
                let hierarchyInfo = '';
                
                if (representativeGoal.type === 'large') {
                  // 大目標の場合
                  hierarchyInfo = `大目標：${representativeGoal.goal_title || ''}`;
                } else if (representativeGoal.type === 'middle') {
                  // 中目標の場合 - 紐づく大目標を探す
                  const parentLargeGoal = activeChart.large_goals?.find((lg: any) => 
                    lg.large_goal_id === representativeGoal.large_goal_id
                  );
                  if (parentLargeGoal?.goal_title) {
                    hierarchyInfo = `大目標：${parentLargeGoal.goal_title}\n∟中目標：${representativeGoal.goal_title || ''}`;
                  } else {
                    hierarchyInfo = `中目標：${representativeGoal.goal_title || ''}`;
                  }
                }
                
                // 月次PLと同じフォーマットのメッセージ
                const message = 
                  `FY${year}の${metricLabel}目標と\nマンダラの目標金額に差分があります。\n\n` +
                  `${hierarchyInfo}\n\n` +
                  `マンダラの目標金額を${formatAmount(editValue)}に更新しますか？`;
              
                // ★ Promiseで確認ダイアログの結果を待つ
                const userChoice = await new Promise<'confirm' | 'cancel' | 'skip'>((resolve) => {
                  setMandalaUpdateDialog({
                    isOpen: true,
                    message: message,
                    fiscalYear: year,
                    goalType: metric,
                    yearlyTotal: editValue,
                    existingAmount: existingAmount,  // ★ これで正しく動作する
                    onConfirm: () => {
                      setMandalaUpdateDialog(prev => ({ ...prev, isOpen: false }));
                      resolve('confirm');
                    },
                    onCancel: () => {
                      setMandalaUpdateDialog(prev => ({ ...prev, isOpen: false }));
                      resolve('skip');
                    }
                  });
              
                  // ★ ダイアログが閉じられた時のキャンセル処理
                  const checkDialogClosed = setInterval(() => {
                    if (!document.querySelector('[data-mandala-dialog]')) {
                      clearInterval(checkDialogClosed);
                    }
                  }, 100);
                });
              
                if (userChoice === 'confirm') {
                  for (const goal of allGoals) {
                    const formatAmountToText = (amount: number): string => {
                      const amountInt = Math.floor(amount);           // ★ 整数化
                      const manyen = Math.floor(amountInt / 10000);   // ★ Math.floor に変更
                      
                      if (manyen >= 10000) {
                        const oku = Math.floor(manyen / 10000);
                        const man = manyen % 10000;
                        if (man === 0) {
                          return `${oku}億`;
                        } else {
                          return `${oku}億${man}万`;
                        }
                      }
                      
                      if (manyen > 0) {
                        return `${manyen}万`;
                      }
                      
                      return '0';
                    };
              
                    if ('large_goal_id' in goal && goal.large_goal_id) {
                      let updatedGoalTitle = goal.goal_title || '';
                      const newAmountText = formatAmountToText(editValue);
                      
                      // ★ 最初に見つかった金額パターンを置換
                      const amountPattern = /(\d+)億(\d+)万|(\d+)億|(\d+)万/;
                      
                      if (amountPattern.test(updatedGoalTitle)) {
                        updatedGoalTitle = updatedGoalTitle.replace(amountPattern, newAmountText);
                      } else {
                        // 金額が見つからない場合は末尾に追加
                        updatedGoalTitle = `${updatedGoalTitle}${newAmountText}`;
                      }
                      
                      await withErrorHandling(() =>
                        Service.putApiLargeGoalsUpdate(goal.large_goal_id!, {
                          target_amount: editValue,
                          goal_title: updatedGoalTitle,
                        })
                      );
                    }
                    
                    else if ('middle_goal_id' in goal && goal.middle_goal_id) {
                      let updatedGoalTitle = goal.goal_title || '';
                      const newAmountText = formatAmountToText(editValue);
                      
                      // ★ 最初に見つかった金額パターンを置換
                      const amountPattern = /(\d+)億(\d+)万|(\d+)億|(\d+)万/;
                      
                      if (amountPattern.test(updatedGoalTitle)) {
                        updatedGoalTitle = updatedGoalTitle.replace(amountPattern, newAmountText);
                      } else {
                        // 金額が見つからない場合は末尾に追加
                        updatedGoalTitle = `${updatedGoalTitle}${newAmountText}`;
                      }
                      
                      await withErrorHandling(() =>
                        Service.putApiMiddleGoalsUpdate(goal.middle_goal_id!, {
                          target_amount: editValue,
                          goal_title: updatedGoalTitle,
                        })
                      );
                    }
                  }
                } else if (userChoice === 'skip') {
                  // ★ 「いいえ」が選択された場合：マンダラは更新しない（PLのみ保存）
                  // 何もしない（後続の処理でPLは保存される）
                }
                // ★ キャンセルボタンを押した場合は、外側のtry-catchでキャッチされる
              }
            }
          }
        }
      }
  
      // ★★★ ここから通常のAPI呼び出し処理（変更なし） ★★★
      const apiUpdatePromises: Promise<void>[] = [];
  
      for (const [yearStr, edits] of Object.entries(pendingEdits)) {
        const year = parseInt(yearStr, 10);
        const currentData = targets.find((t) => t.year === year);
        if (!currentData) continue;
  
        const dataYear = year;
        const dataMonth = fiscalYearStartMonth;
  
        const hasSaleChange = edits.revenueTarget !== undefined;
  
        if (hasSaleChange) {
          const revenueTarget = edits.revenueTarget ?? currentData.revenueTarget;
          
          const existingResponse = await withErrorHandling(() =>
            Service.getApiMonthlyBudgetActual(selectedUser.id, dataYear, dataMonth.toString())
          );
          const existingActual = existingResponse.saleSchema?.find(
            (s: any) => s.year === dataYear && s.month === dataMonth
          )?.saleResult || 0;
  
          const saleSchema: SaleSchema = {
            userId: selectedUser.id,
            year: dataYear,
            month: dataMonth,
            saleTarget: revenueTarget,
            saleResult: existingActual,
          };
  
          apiUpdatePromises.push(
            withErrorHandling(() => Service.putApiSaleUpdate(saleSchema)).then(
              (response) => {
                if (response.responseStatus !== 1) {
                  throw new Error(`売上更新に失敗しました（${year}年）`);
                }
              }
            )
          );
        }
  
        const hasGrossProfitChange = edits.grossProfitTarget !== undefined;
  
        if (hasGrossProfitChange) {
          const grossProfitTarget = edits.grossProfitTarget ?? currentData.grossProfitTarget;
          
          const existingResponse = await withErrorHandling(() =>
            Service.getApiMonthlyBudgetActual(selectedUser.id, dataYear, dataMonth.toString())
          );
          const existingActual = existingResponse.grossProfitSchema?.find(
            (g: any) => g.year === dataYear && g.month === dataMonth
          )?.grossProfitResult || 0;
  
          const grossProfitSchema: GrossProfitSchema = {
            userId: selectedUser.id,
            year: dataYear,
            month: dataMonth,
            grossProfitTarget: grossProfitTarget,
            grossProfitResult: existingActual,
          };
  
          apiUpdatePromises.push(
            withErrorHandling(() =>
              Service.putApiGrossProfitUpdate(grossProfitSchema)
            ).then((response) => {
              if (response.responseStatus !== 1) {
                throw new Error(`粗利益更新に失敗しました（${year}年）`);
              }
            })
          );
        }
  
        const hasOperatingProfitChange = edits.operatingProfitTarget !== undefined;
  
        if (hasOperatingProfitChange) {
          const operatingProfitTarget = edits.operatingProfitTarget ?? currentData.operatingProfitTarget;
          
          const existingResponse = await withErrorHandling(() =>
            Service.getApiMonthlyBudgetActual(selectedUser.id, dataYear, dataMonth.toString())
          );
          const existingActual = existingResponse.operatingProfitSchema?.find(
            (o: any) => o.year === dataYear && o.month === dataMonth
          )?.operatingProfitResult || 0;
  
          const operatingProfitSchema: OperatingProfitSchema = {
            userId: selectedUser.id,
            year: dataYear,
            month: dataMonth,
            operatingProfitTarget: operatingProfitTarget,
            operatingProfitResult: existingActual,
          };
  
          apiUpdatePromises.push(
            withErrorHandling(() =>
              Service.putApiOperatingProfitUpdate(operatingProfitSchema)
            ).then((response) => {
              if (response.responseStatus !== 1) {
                throw new Error(`営業利益更新に失敗しました（${year}年）`);
              }
            })
          );
        }
      }
  
      if (apiUpdatePromises.length > 0) {
        await Promise.all(apiUpdatePromises);
      }
  
      // 年次データを月次に12分割してDBに登録
      const monthlyUpdatePromises: Promise<void>[] = [];
  
      for (const [yearStr, edits] of Object.entries(pendingEdits)) {
        const year = parseInt(yearStr, 10);
        const currentData = targets.find((t) => t.year === year);
        if (!currentData) continue;
  
        const hasSaleChange = edits.revenueTarget !== undefined;
        if (hasSaleChange) {
          const yearlyTarget = edits.revenueTarget ?? currentData.revenueTarget;
          
          const monthlyTarget = Math.floor(yearlyTarget / 12);
          const remainderTarget = yearlyTarget - (monthlyTarget * 12);
          
          for (let i = 0; i < 12; i++) {
            const monthIndex = (fiscalYearStartMonth - 1 + i) % 12;
            const month = monthIndex + 1;
            
            let actualYear = year;
            if (month < fiscalYearStartMonth) {
              actualYear = year + 1;
            }
            
            const adjustedTarget = i === 0 ? monthlyTarget + remainderTarget : monthlyTarget;
            
            monthlyUpdatePromises.push(
              (async () => {
                const existingResponse = await withErrorHandling(() =>
                  Service.getApiMonthlyBudgetActual(selectedUser.id, actualYear, month.toString())
                );
                const existingActual = existingResponse.saleSchema?.find(
                  (s: any) => s.year === actualYear && s.month === month
                )?.saleResult || 0;
                
                const saleSchema: SaleSchema = {
                  userId: selectedUser.id,
                  year: actualYear,
                  month: month,
                  saleTarget: adjustedTarget,
                  saleResult: existingActual,
                };
                
                const response = await withErrorHandling(() => Service.putApiSaleUpdate(saleSchema));
                if (response.responseStatus !== 1) {
                  console.error(`月次売上更新に失敗（${actualYear}年${month}月）`);
                }
              })()
            );
          }
        }
  
        const hasGrossProfitChange = edits.grossProfitTarget !== undefined;
        if (hasGrossProfitChange) {
          const yearlyTarget = edits.grossProfitTarget ?? currentData.grossProfitTarget;
          
          const monthlyTarget = Math.floor(yearlyTarget / 12);
          const remainderTarget = yearlyTarget - (monthlyTarget * 12);
          
          for (let i = 0; i < 12; i++) {
            const monthIndex = (fiscalYearStartMonth - 1 + i) % 12;
            const month = monthIndex + 1;
            
            let actualYear = year;
            if (month < fiscalYearStartMonth) {
              actualYear = year + 1;
            }
            
            const adjustedTarget = i === 0 ? monthlyTarget + remainderTarget : monthlyTarget;
            
            monthlyUpdatePromises.push(
              (async () => {
                const existingResponse = await withErrorHandling(() =>
                  Service.getApiMonthlyBudgetActual(selectedUser.id, actualYear, month.toString())
                );
                const existingActual = existingResponse.grossProfitSchema?.find(
                  (g: any) => g.year === actualYear && g.month === month
                )?.grossProfitResult || 0;
                
                const grossProfitSchema: GrossProfitSchema = {
                  userId: selectedUser.id,
                  year: actualYear,
                  month: month,
                  grossProfitTarget: adjustedTarget,
                  grossProfitResult: existingActual,
                };
                
                const response = await withErrorHandling(() => Service.putApiGrossProfitUpdate(grossProfitSchema));
                if (response.responseStatus !== 1) {
                  console.error(`月次粗利益更新に失敗（${actualYear}年${month}月）`);
                }
              })()
            );
          }
        }
  
        const hasOperatingProfitChange = edits.operatingProfitTarget !== undefined;
        if (hasOperatingProfitChange) {
          const yearlyTarget = edits.operatingProfitTarget ?? currentData.operatingProfitTarget;
          
          const monthlyTarget = Math.floor(yearlyTarget / 12);
          const remainderTarget = yearlyTarget - (monthlyTarget * 12);
          
          for (let i = 0; i < 12; i++) {
            const monthIndex = (fiscalYearStartMonth - 1 + i) % 12;
            const month = monthIndex + 1;
            
            let actualYear = year;
            if (month < fiscalYearStartMonth) {
              actualYear = year + 1;
            }
            
            const adjustedTarget = i === 0 ? monthlyTarget + remainderTarget : monthlyTarget;
            
            monthlyUpdatePromises.push(
              (async () => {
                const existingResponse = await withErrorHandling(() =>
                  Service.getApiMonthlyBudgetActual(selectedUser.id, actualYear, month.toString())
                );
                const existingActual = existingResponse.operatingProfitSchema?.find(
                  (o: any) => o.year === actualYear && o.month === month
                )?.operatingProfitResult || 0;
                
                const operatingProfitSchema: OperatingProfitSchema = {
                  userId: selectedUser.id,
                  year: actualYear,
                  month: month,
                  operatingProfitTarget: adjustedTarget,
                  operatingProfitResult: existingActual,
                };
                
                const response = await withErrorHandling(() => Service.putApiOperatingProfitUpdate(operatingProfitSchema));
                if (response.responseStatus !== 1) {
                  console.error(`月次営業利益更新に失敗（${actualYear}年${month}月）`);
                }
              })()
            );
          }
        }
      }
  
      if (monthlyUpdatePromises.length > 0) {
        await Promise.all(monthlyUpdatePromises);
      }
  
      if (mandalaUpdated) {
        savePlActual(plActual);
      }
  
      setPendingEdits({});
  
      alert("保存しました!");
    } catch (err) {
      console.error("保存エラー:", err);
      alert("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const getTableDisplayData = useCallback(() => {
    if (tableViewPeriod === "1-5") {
      return targets.slice(0, 5);
    } else {
      return targets.slice(5, 10);
    }
  }, [targets, tableViewPeriod]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-text/70">
            {selectedUser?.name} さんのデータを読み込み中...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-sm text-error mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  const negativeAllowedFields: EditableField[] = [
    "grossProfitTarget", "grossProfitActual",
    "operatingProfitTarget", "operatingProfitActual",
  ];

  const renderDataCell = (
    data: YearlyData,
    field: keyof YearlyData,
    isEditable: boolean
  ) => {
    const key = `${data.year}-${field}`;
    const displayValue = data[field as EditableField] as number;
  
    const hasEditForCell =
      !!pendingEdits[data.year] &&
      (pendingEdits[data.year] as any)[field] !== undefined;
  
    // ★ 追加：実績フィールドかどうかを判定
    const isActualField = field === 'revenueActual' || 
                          field === 'grossProfitActual' || 
                          field === 'operatingProfitActual' || 
                          field === 'netWorthActual';
  
    // ★ 修正：実績フィールドは編集不可
    const canEditCell = isEditable && canEdit && !isActualField;
  
    // ★ 追加：ツールチップメッセージ
    const getTooltipMessage = () => {
      if (isActualField) {
        return "実績入力は月次PL画面から更新できます";
      }
      if (canEditCell) {
        return "クリックで編集";
      }
      return "";
    };
  
    return (
      <td
        key={data.year}
        className={`py-2 sm:py-3 px-1 sm:px-2 text-right text-xs sm:text-sm whitespace-nowrap ${
          canEditCell
            ? "cursor-pointer hover:bg-primary/5 transition-colors"
            : isActualField
            ? "cursor-text opacity-75"
            : ""
        } ${canEditCell && hasEditForCell ? "bg-primary/5" : ""}`}
        onClick={() =>
          canEditCell && handleCellDoubleClick(data.year, field as EditableField)
        }
        title={getTooltipMessage()}
        style={{
          position: 'relative',
          width: 'auto',
          minWidth: '80px'
        }}
      >
        {canEditCell && editingCell === key ? (
          <input
            type="number"
            defaultValue={displayValue}
            max={9999999999}
            min={negativeAllowedFields.includes(field as EditableField) ? -9999999999 : 0}
            onInput={(e) => {
              const input = e.currentTarget;
              const raw = input.value;
              const digits = raw.startsWith("-") ? raw.length - 1 : raw.length;
              if (digits > 10) {
                input.value = raw.slice(0, raw.startsWith("-") ? 11 : 10);
              }
              if (!negativeAllowedFields.includes(field as EditableField) && Number(input.value) < 0) {
                input.value = '0';
              }
            }}
            onBlur={(e) => {
              const raw = Number(e.target.value);
              const value = negativeAllowedFields.includes(field as EditableField)
                ? Math.min(Math.max(raw, -9999999999), 9999999999)
                : Math.min(Math.max(raw, 0), 9999999999);
              handleCellUpdate(
                data.year,
                field as EditableField,
                value
              );
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const raw = Number(e.currentTarget.value);
                const value = negativeAllowedFields.includes(field as EditableField)
                  ? Math.min(Math.max(raw, -9999999999), 9999999999)
                  : Math.min(Math.max(raw, 0), 9999999999);
                handleCellUpdate(
                  data.year,
                  field as EditableField,
                  value
                );
              } else if (e.key === "Escape") {
                setEditingCell(null);
              }
            }}
            className="text-right border border-primary rounded focus:outline-none focus:ring-2 focus:ring-primary text-xs sm:text-sm"
            style={{
              background: '#fff',
              boxSizing: 'border-box',
              padding: 'clamp(2px, 0.5vw, 4px)',
              margin: '0',
              height: 'auto',
              minHeight: '24px',
              width: '100%',
              maxWidth: '120px',
              minWidth: '80px'
            }}
            autoFocus
            onFocus={(e) => e.target.select()}
          />
        ) : displayValue !== 0 ? (
          Number(displayValue).toLocaleString('ja-JP')
        ) : (
          "-"
        )}
      </td>
    );
  };

  const renderRateCell = (
    data: YearlyData,
    targetField: keyof YearlyData,
    actualField: keyof YearlyData
  ) => {
    const targetValue = data[targetField] as number;
    const actualValue = data[actualField] as number;
    
    if (targetValue === 0) {
      return (
        <td
          key={data.year}
          className="py-2 sm:py-3 px-1 sm:px-2 text-right font-medium text-xs sm:text-sm"
        >
          -
        </td>
      );
    }
    
    const rate = (actualValue / targetValue) * 100;
    return (
      <td
        key={data.year}
        className={`py-2 sm:py-3 px-1 sm:px-2 text-right font-medium text-xs sm:text-sm ${
          rate >= 100
            ? "text-success"
            : rate >= 90
            ? "text-warning"
            : "text-error"
        }`}
      >
        {actualValue !== 0 ? `${rate.toFixed(1)}%` : "-"}
      </td>
    );
  };

  const tableData = [
    {
      label: "売上",
      targetField: "revenueTarget",
      actualField: "revenueActual",
    },
    {
      label: "粗利益",
      targetField: "grossProfitTarget",
      actualField: "grossProfitActual",
    },
    {
      label: "営業利益",
      targetField: "operatingProfitTarget",
      actualField: "operatingProfitActual",
    },
  ];

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8 py-6" style={{ maxWidth: '100vw', overflow: 'hidden' }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src={plIcon}
            alt="PL"
            className="inline-block"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              objectFit: 'cover'
            }}
          />
          <h1 className="text-xl sm:text-2xl font-bold text-text">年次PL</h1>
          
          <div className="flex items-center space-x-2 bg-gray-100 rounded-full p-1">
            <button
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white shadow-sm font-semibold text-xs sm:text-sm text-primary"
            >
              年次
            </button>
            <button
              onClick={() => navigate("/monthlyBudgetActual")}
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm text-gray-600 hover:text-gray-900 hover:bg-white/50 transition-colors"
            >
              月次
            </button>
          </div>
        </div>
      </div>

      <div className="w-full" style={{ maxWidth: '100%' }}>
        <div 
          className={`card w-full transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'
          }`}
          style={{ 
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)', 
            overflow: 'hidden',
            transitionDelay: '200ms'
          }}
        >
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
            <div className="flex flex-col gap-1">
              <h3 className="text-base sm:text-lg font-semibold text-text">
                {chartType === "revenue" ? "売上推移予測" : 
                chartType === "grossProfit" ? "粗利益推移予測" : 
                "営業利益推移予測"}
              </h3>
            </div>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value as "revenue" | "grossProfit" | "operatingProfit")}
              className="text-sm border border-border rounded px-2 sm:px-3 py-1.5 sm:py-2 pr-8 appearance-none bg-background focus:outline-none focus:ring-2 focus:ring-primary w-32 sm:w-36"
              style={{
                backgroundImage: 'url(\'data:image/svg+xml;utf8,<svg fill="black" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/><path d="M0 0h24v24H0z" fill="none"/></svg>\')',
                backgroundRepeat: "no-repeat",
                backgroundPosition: "calc(100% - 4px) center",
                backgroundSize: "16px",
              }}
            >
              <option value="revenue">売上</option>
              <option value="grossProfit">粗利益</option>
              <option value="operatingProfit">営業利益</option>
            </select>
          </div>
            
            <ResponsiveContainer width="100%" height={isMobile ? 300 : 400}>          
              <LineChart 
                data={chartData} 
                margin={{ 
                  top: isMobile ? 20 : 30, 
                  right: isMobile ? 10 : 30, 
                  left: isMobile ? 5 : 30, 
                  bottom: isMobile ? 5 : 5 
                }}
              >
                <CartesianGrid stroke="#E5E7EB" />
                
                <XAxis
                  dataKey="year"
                  stroke="#E5E7EB"
                  tick={{ 
                    fill: "#1E1F1F", 
                    fontSize: isMobile ? 10 : 14, 
                    fontFamily: "system-ui, -apple-system, sans-serif" 
                  }}
                  tickFormatter={(value) => {
                    const fiscalYear = value;
                    return isMobile ? `'${fiscalYear.toString().slice(-2)}` : `FY${fiscalYear}`;
                  }}
                  dy={10}
                />
                <YAxis
                  stroke="#E5E7EB"
                  tick={{ 
                    fill: "#1E1F1F", 
                    fontSize: isMobile ? 10 : 14, 
                    fontFamily: "system-ui, -apple-system, sans-serif" 
                  }}
                  domain={yAxisDomain}
                  ticks={yAxisTicks}
                  tickFormatter={(value) => {
                    if (value === 0) return "0";
                    const manyen = value / 10000;
                    
                    if (isMobile) {
                      if (Math.abs(manyen) >= 10000) {
                        const oku = manyen / 10000;
                        return `${oku.toFixed(1)}億`;
                      } else if (Math.abs(manyen) >= 1000) {
                        const sen = manyen / 1000;
                        return `${sen.toFixed(0)}千万`;
                      }
                      return `${manyen.toFixed(0)}万`;
                    }
                    
                    if (Math.abs(manyen) >= 10000) {
                      const oku = Math.floor(Math.abs(manyen) / 10000);
                      const man = Math.abs(manyen) % 10000;
                      const sign = manyen < 0 ? "-" : "";
                      return man === 0 ? `${sign}${oku}億` : `${sign}${oku}億${man.toLocaleString()}万`;
                    }
                    return `${manyen.toLocaleString()}万`;
                  }}
                  width={isMobile ? 60 : 100}
                />
                <Tooltip
                  formatter={(value: number, name: string, props: any) => {
                    const currentYear = props.payload.year;
                    const goalInfo = mandalaGoals.find(
                      goal => goal.metric === chartType && goal.year === currentYear
                    );
                    
                    return [
                      `${(value / 10000).toLocaleString()}万円`,
                      name + (goalInfo ? ` (FY${goalInfo.year}期限)` : '')
                    ];
                  }}
                    labelFormatter={(label) => {
                      const year = label;
                      const startMonth = userSetup?.fiscalYearStartMonth || 4;
                      const startYear = year;
                      const endYear = year + 1;
                      const endMonth = startMonth === 1 ? 12 : startMonth - 1;
                     
                      return `FY${year} (${startYear}/${startMonth}〜${endYear}/${endMonth})`;
                    }}
                  labelStyle={{ 
                    color: "#1E1F1F", 
                    fontSize: isMobile ? 11 : 14, 
                    fontFamily: "system-ui, -apple-system, sans-serif" 
                  }}
                  contentStyle={{ 
                    fontSize: isMobile ? 11 : 14, 
                    fontFamily: "system-ui, -apple-system, sans-serif" 
                  }}
                />
                
                <Line
                  type="monotone"
                  dataKey="revenueTarget"
                  stroke="#9CA3AF"
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  dot={{ fill: "white", stroke: "#9CA3AF", strokeWidth: 2, r: 3, strokeDasharray: "0" }}
                  name="売上目標"
                  hide={chartType !== "revenue"}
                />
                <Line
                  type="monotone"
                  dataKey="revenueActual"
                  stroke="#13AE67"
                  strokeWidth={3}
                  name="売上実績"
                  hide={chartType !== "revenue"}
                />
                
                <Line
                  type="monotone"
                  dataKey="grossProfitTarget"
                  stroke="#9CA3AF"
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  dot={{ fill: "white", stroke: "#9CA3AF", strokeWidth: 2, r: 3, strokeDasharray: "0" }}
                  name="粗利益目標"
                  hide={chartType !== "grossProfit"}
                />
                <Line
                  type="monotone"
                  dataKey="grossProfitActual"
                  stroke="#13AE67"
                  strokeWidth={3}
                  name="粗利益実績"
                  hide={chartType !== "grossProfit"}
                />
                
                <Line
                  type="monotone"
                  dataKey="operatingProfitTarget"
                  stroke="#9CA3AF"
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  dot={{ fill: "white", stroke: "#9CA3AF", strokeWidth: 2, r: 3, strokeDasharray: "0" }}
                  name="営業利益目標"
                  hide={chartType !== "operatingProfit"}
                />
                <Line
                  type="monotone"
                  dataKey="operatingProfitActual"
                  stroke="#13AE67"
                  strokeWidth={3}
                  name="営業利益実績"
                  hide={chartType !== "operatingProfit"}
                />

              <ReferenceLine y={0} stroke="#6B7280" strokeWidth={0.5} />

              {mandalaGoals
              .filter(goal => goal.metric === chartType)
              .map((goal, index) => {
                const fiscalYearStartYear = userSetup?.fiscalYearStartYear || 2025;
                const relativeYear = goal.year - fiscalYearStartYear + 1;
                
                return (
                  <ReferenceLine 
                    key={`goal-${goal.year}-${index}`}
                    x={goal.year} 
                    stroke="#0051BB" 
                    strokeWidth={3}
                    strokeDasharray="5 5"
                  >
                    {!isMobile && (
                      <Label
                        value={`${relativeYear}年目期限`}
                        position="top"
                        fill="#0051BB"
                        fontSize={12}
                        offset={10}
                      />
                    )}
                  </ReferenceLine>
                );
              })}
              </LineChart>
            </ResponsiveContainer>
        </div>
      </div>

      <div className="w-full">
      <div 
        className={`card w-full transition-all duration-700 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
        style={{ 
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)', 
          maxWidth: '100%', 
          overflow: 'hidden',
          transitionDelay: '600ms'
        }}
      >
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <h3 className="text-base sm:text-lg font-semibold text-text">
                10年間の目標設定
              </h3>
              <div className="text-xs text-text/70 leading-relaxed">
                💡 空欄や数字部分は編集できます<br/>
                💡 設定した数字は自動でグラフに反映されます
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <select
                value={tableViewPeriod}
                onChange={(e) =>
                  setTableViewPeriod(e.target.value as "1-5" | "6-10")
                }
                className="text-sm border border-border rounded px-2 py-1 pr-8 appearance-none bg-background"
                style={{
                  backgroundImage:
                    'url(\'data:image/svg+xml;utf8,<svg fill="black" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/><path d="M0 0h24v24H0z" fill="none"/></svg>\')',
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "calc(100% - 4px) center",
                  backgroundSize: "16px",
                }}
              >
                <option value="1-5">1〜5年</option>
                <option value="6-10">6〜10年</option>
              </select>
            </div>
          </div>

          {hasChanges() && canEdit && (
            <div className="my-4 text-left">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="btn-primary flex items-center space-x-2 text-sm sm:text-base px-4 py-2"
                style={{
                  borderRadius: '20px'
                }}
              >
                <Save className="h-4 w-4" />
                <span>{isSaving ? "保存中..." : "変更を保存"}</span>
              </button>
            </div>
          )}
          <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="text-sm w-full" style={{ minWidth: '600px' }}>
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 sm:py-3 px-1 sm:px-2 font-medium text-xs sm:text-sm w-16 sm:w-24"></th>
                  <th className="text-left py-2 sm:py-3 px-1 sm:px-2 font-medium text-xs sm:text-sm">
                    項目
                  </th>
                  {getTableDisplayData().map((data) => {
                    const fiscalYear = data.year;
                    return (
                      <th
                        key={data.year}
                        className="text-right py-2 sm:py-3 px-1 sm:px-2 whitespace-nowrap font-medium text-xs sm:text-sm"
                        style={{
                          width: 'auto',
                          minWidth: '100px',
                          maxWidth: '120px'
                        }}
                      >
                        FY{fiscalYear}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {tableData.map((item) => (
                  <React.Fragment key={item.label}>
                    <tr className="border-b border-border/50">
                      <td
                        rowSpan={3}
                        className="py-2 sm:py-3 px-1 sm:px-2 font-medium whitespace-nowrap text-left align-middle border-r border-border/50 text-xs sm:text-sm"
                      >
                        {item.label}
                      </td>
                      <td className="py-2 sm:py-3 px-1 sm:px-2 font-medium whitespace-nowrap text-left text-xs sm:text-sm">
                        目標
                      </td>
                      {getTableDisplayData().map((data) =>
                        renderDataCell(
                          data,
                          item.targetField as EditableField,
                          true
                        )
                      )}
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-2 sm:py-3 px-1 sm:px-2 font-medium whitespace-nowrap text-left text-xs sm:text-sm">
                        実績
                      </td>
                      {getTableDisplayData().map((data) =>
                        renderDataCell(
                          data,
                          item.actualField as keyof YearlyData,
                          true
                        )
                      )}
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-2 sm:py-3 px-1 sm:px-2 font-medium whitespace-nowrap text-left text-xs sm:text-sm">
                        達成率
                      </td>
                      {getTableDisplayData().map((data) =>
                        renderRateCell(
                          data,
                          item.targetField as keyof YearlyData,
                          item.actualField as keyof YearlyData,
                        )
                      )}
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table> 
          </div>
        </div>
      </div>
    {/* ★ 追加：マンダラ更新確認ダイアログ */}
      {mandalaUpdateDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black opacity-50"
            onClick={(e) => {
              e.stopPropagation();
              // ★ 背景クリックでは閉じない（明示的にボタンを押させる）
            }}
          />
          
          <div
            className="relative bg-white rounded-3xl shadow-xl mx-4 p-6"
            data-mandala-dialog
            style={{
              width: '100%',
              maxWidth: '480px',
            }}
          >
            <h3
              style={{
                fontWeight: 600,
                fontSize: 'clamp(16px, 4vw, 20px)',
                color: '#F59E0B',
                marginBottom: '16px'
              }}
            >
              ⚠️ マンダラ目標金額の更新確認
            </h3>
            
            <p
              style={{
                fontWeight: 400,
                fontSize: 'clamp(13px, 3vw, 15px)',
                color: '#1E1F1F',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
                marginBottom: '24px'
              }}
            >
              {mandalaUpdateDialog.message}
            </p>
            
            <div className="flex gap-3">
              {/* キャンセルボタン */}
              <button
                onClick={() => {
                  setMandalaUpdateDialog(prev => ({ ...prev, isOpen: false }));
                  setIsSaving(false);
                  // ★ 保存処理全体を中止
                }}
                className="flex-1 py-3 rounded-full font-medium transition-all duration-300 hover:scale-105 hover:shadow-md"
                style={{
                  fontSize: 'clamp(14px, 3.5vw, 16px)',
                  color: '#9CA3AF',
                  background: '#F9FAFB',
                  border: '1px solid #E5E7EB'
                }}
              >
                キャンセル
              </button>
              
              {/* いいえボタン */}
              <button
                onClick={mandalaUpdateDialog.onCancel}
                className="flex-1 py-3 rounded-full font-medium transition-all duration-300 hover:scale-105 hover:shadow-md"
                style={{
                  fontSize: 'clamp(14px, 3.5vw, 16px)',
                  color: '#6B7280',
                  background: '#F3F4F6',
                }}
              >
                いいえ
              </button>
              
              {/* 更新するボタン */}
              <button
                onClick={mandalaUpdateDialog.onConfirm}
                className="flex-1 py-3 rounded-full font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg"
                style={{
                  fontSize: 'clamp(14px, 3.5vw, 16px)',
                  color: '#FFFFFF',
                  background: '#13AE67',
                }}
              >
                更新する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default YearlyBudgetActual;