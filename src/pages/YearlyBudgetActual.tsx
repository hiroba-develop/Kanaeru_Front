import React, { useState, useEffect, useCallback } from "react";
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
  const { selectedUser, userSetup, loadUserSetup } = useAuth();

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
      console.log('targets is empty');
      return [0, 70000000];
    }
    
    let maxValue = 0;
    chartData.forEach((t) => {
      if (chartType === "revenue") {
        maxValue = Math.max(maxValue, t.revenueTarget || 0, t.revenueActual || 0);
      } else if (chartType === "grossProfit") {
        maxValue = Math.max(maxValue, t.grossProfitTarget || 0, t.grossProfitActual || 0);
      } else {
        maxValue = Math.max(maxValue, t.operatingProfitTarget || 0, t.operatingProfitActual || 0);
      }
    });
    
    console.log('maxValue:', maxValue);
    
    // 最大値に50%の余裕を持たせる（マンダラ目標も表示できるように）
    const upperBound = Math.ceil(maxValue * 1.5 / 1000000) * 1000000;
    const finalBound = Math.max(upperBound, 10000000); // 最低でも1000万
    
    console.log('finalBound:', finalBound);
    return [0, finalBound];
  }, [chartData, chartType]);

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

        // userSetupが読み込まれていない場合は読み込む
        if (!userSetup) {
          await loadUserSetup();
        }

        // APIからデータを取得
        const response = await withErrorHandling(() =>
          Service.getApiYearlyBudgetActual(selectedUser.id)
        );

        if (response.responseStatus === 1) {
          // 年ごとにデータを集計
          const yearlyDataMap = new Map<number, YearlyData>();

          // 売上データを集計
          if (response.saleSchema) {
            response.saleSchema.forEach((sale) => {
              if (sale.year === undefined) return;
              
              if (!yearlyDataMap.has(sale.year)) {
                yearlyDataMap.set(sale.year, {
                  year: sale.year,
                  revenueTarget: 0,
                  revenueActual: 0,
                  grossProfitTarget: 0,
                  grossProfitActual: 0,
                  operatingProfitTarget: 0,
                  operatingProfitActual: 0,
                  netWorthTarget: 0,
                  netWorthActual: 0,
                  phase: sale.year <= 3 ? "創業期" : sale.year <= 5 ? "転換期" : "成長期",
                });
              }
              
              const yearlyData = yearlyDataMap.get(sale.year)!;
              yearlyData.revenueTarget += sale.saleTarget || 0;
              yearlyData.revenueActual += sale.saleResult || 0;
            });
          }

          // 粗利益データを集計
          if (response.grossProfitSchema) {
            response.grossProfitSchema.forEach((grossProfit) => {
              if (grossProfit.year === undefined) return;
              
              if (!yearlyDataMap.has(grossProfit.year)) {
                yearlyDataMap.set(grossProfit.year, {
                  year: grossProfit.year,
                  revenueTarget: 0,
                  revenueActual: 0,
                  grossProfitTarget: 0,
                  grossProfitActual: 0,
                  operatingProfitTarget: 0,
                  operatingProfitActual: 0,
                  netWorthTarget: 0,
                  netWorthActual: 0,
                  phase: grossProfit.year <= 3 ? "創業期" : grossProfit.year <= 5 ? "転換期" : "成長期",
                });
              }
              
              const yearlyData = yearlyDataMap.get(grossProfit.year)!;
              yearlyData.grossProfitTarget += grossProfit.grossProfitTarget || 0;
              yearlyData.grossProfitActual += grossProfit.grossProfitResult || 0;
            });
          }

          // 営業利益データを集計
          if (response.operatingProfitSchema) {
            response.operatingProfitSchema.forEach((operatingProfit) => {
              if (operatingProfit.year === undefined) return;
              
              if (!yearlyDataMap.has(operatingProfit.year)) {
                yearlyDataMap.set(operatingProfit.year, {
                  year: operatingProfit.year,
                  revenueTarget: 0,
                  revenueActual: 0,
                  grossProfitTarget: 0,
                  grossProfitActual: 0,
                  operatingProfitTarget: 0,
                  operatingProfitActual: 0,
                  netWorthTarget: 0,
                  netWorthActual: 0,
                  phase: operatingProfit.year <= 3 ? "創業期" : operatingProfit.year <= 5 ? "転換期" : "成長期",
                });
              }
              
              const yearlyData = yearlyDataMap.get(operatingProfit.year)!;
              yearlyData.operatingProfitTarget += operatingProfit.operatingProfitTarget || 0;
              yearlyData.operatingProfitActual += operatingProfit.operatingProfitResult || 0;
            });
          }

          // データロード部分で、yearを絶対年に変換
          const yearlyTargets = Array.from(yearlyDataMap.values())
          .sort((a, b) => a.year - b.year)
          .map((target, index) => ({
            ...target,
            year: (userSetup?.fiscalYearStartYear || 2025) + index  // 絶対年に変換
          }));

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

          // APIレスポンスから目標データを抽出
          const goals: {
            year: number;
            targetValue: number;
            metric: 'revenue' | 'grossProfit' | 'operatingProfit';
          }[] = [];

          // 目標タイプをメトリックにマッピングする関数
          const goalTypeToMetric = (goalType: number | undefined): 'revenue' | 'grossProfit' | 'operatingProfit' | null => {
            if (goalType === 2) return 'revenue';
            if (goalType === 3) return 'grossProfit';
            if (goalType === 4) return 'operatingProfit';
            return null;
          };

          // 大目標から目標を抽出
          if (response.largePLLinkedItemSchema) {
            response.largePLLinkedItemSchema.forEach((item: LargePLLinkedItemSchema) => {
              if (item.goal_type && item.target_year !== undefined && item.target_amount !== undefined) {
                const metric = goalTypeToMetric(item.goal_type);
                if (metric) {
                  goals.push({
                    year: item.target_year,
                    targetValue: item.target_amount,
                    metric: metric,
                  });
                }
              }
            });
          }

          // 中目標から目標を抽出
          if (response.middlePLLinkedItemSchema) {
            response.middlePLLinkedItemSchema.forEach((item: MiddlePLLinkedItemSchema) => {
              if (item.goal_type && item.target_year !== undefined && item.target_amount !== undefined) {
                const metric = goalTypeToMetric(item.goal_type);
                if (metric) {
                  goals.push({
                    year: item.target_year,
                    targetValue: item.target_amount,
                    metric: metric,
                  });
                }
              }
            });
          }

          setMandalaGoals(goals);
        } else {
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
  }, [selectedUser, userSetup, loadUserSetup]);

  const [mandalaGoals, setMandalaGoals] = useState<{
    year: number;
    targetValue: number;
    metric: 'revenue' | 'grossProfit' | 'operatingProfit';
  }[]>([]);

  useEffect(() => {
    const handlePlPlanUpdate = () => {
      console.log('pl-plan-updated event received, reloading...');
      
      if (!selectedUser) return;
      
      setIsLoading(true);
      
      const loadData = async () => {
        try {
          await new Promise((resolve) => setTimeout(resolve, 300));
          
          const plPlan = loadPlPlan();
          const plActual = loadPlActual();
          
          console.log('Reloaded plPlan:', plPlan);
          console.log('Reloaded plActual:', plActual);

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
  
          // pl_actual_v1に保存（マンダラ連動のため）
          const existingActualIndex = plActual!.yearly.findIndex((a) => a.year === year);
          if (existingActualIndex >= 0) {
            plActual!.yearly[existingActualIndex] = updatedActual;
          } else {
            plActual!.yearly.push(updatedActual);
          }
          // マンダラ連動
          console.log('=== Mandala Update Debug ===');
          console.log('Year:', year);
          console.log('Updated Actual:', updatedActual);
          const result = onYearlyActualUpdate(year, updatedActual);
          console.log('Update Result:', result);
          console.log('===========================');
          mandalaUpdated = true;
        }
      });
  
      // API呼び出し処理
      if (!selectedUser) {
        throw new Error("ユーザー情報が取得できませんでした");
      }

      // userSetupが読み込まれていない場合は読み込む
      let currentUserSetup = userSetup;
      if (!currentUserSetup) {
        await loadUserSetup();
        // loadUserSetup後、userSetupが更新されるまで少し待つ
        // 注意: この方法は理想的ではないが、useEffectの依存配列でuserSetupが更新されるのを待つ
        await new Promise(resolve => setTimeout(resolve, 100));
        // 再度userSetupを取得（useAuthから）
        // ただし、この時点ではまだ更新されていない可能性があるため、
        // 直接APIから取得する方が確実
        const { Service } = await import("../api/services/Service");
        const { withErrorHandling: withErrorHandlingForSetup } = await import("../utils/apiErrorHandler");
        const setupResponse = await withErrorHandlingForSetup(() => 
          Service.getApiSettingUser(selectedUser.id)
        );
        if (setupResponse.responseStatus === 1 && setupResponse.settingSchema) {
          currentUserSetup = {
            fiscalYearStartMonth: setupResponse.settingSchema.fiscalYearStartMonth || 4,
            fiscalYearStartYear: setupResponse.settingSchema.fiscalYearStartYear || new Date().getFullYear(),
          } as any;
        }
      }

      // 事業開始年月を取得（userSetupから取得、デフォルトは4月）
      const fiscalYearStartMonth = currentUserSetup?.fiscalYearStartMonth || 4;

      const apiUpdatePromises: Promise<void>[] = [];

      // pendingEditsをループして、変更があった項目を判別してAPIを呼び出す
      Object.entries(pendingEdits).forEach(([yearStr, edits]) => {
        const year = parseInt(yearStr, 10);
        const currentData = targets.find((t) => t.year === year);
        if (!currentData) return;

        // 年次データの月を計算（事業開始年月に基づく）
        // FY2025の場合、事業開始年月が2025年2月なら、2025年2月に送信
        const dataYear = year;
        const dataMonth = fiscalYearStartMonth;

        // 売上項目の変更をチェック
        const hasSaleChange =
          edits.revenueTarget !== undefined || edits.revenueActual !== undefined;

        if (hasSaleChange) {
          // 年次データを事業開始年月に基づいて送信
          const revenueTarget = edits.revenueTarget ?? currentData.revenueTarget;
          const revenueActual = edits.revenueActual ?? currentData.revenueActual;

          const saleSchema: SaleSchema = {
            userId: selectedUser.id,
            year: dataYear,
            month: dataMonth,
            saleTarget: revenueTarget,
            saleResult: revenueActual,
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

        // 粗利益項目の変更をチェック
        const hasGrossProfitChange =
          edits.grossProfitTarget !== undefined ||
          edits.grossProfitActual !== undefined;

        if (hasGrossProfitChange) {
          const grossProfitTarget =
            edits.grossProfitTarget ?? currentData.grossProfitTarget;
          const grossProfitActual =
            edits.grossProfitActual ?? currentData.grossProfitActual;

          const grossProfitSchema: GrossProfitSchema = {
            userId: selectedUser.id,
            year: dataYear,
            month: dataMonth,
            grossProfitTarget: grossProfitTarget,
            grossProfitResult: grossProfitActual,
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

        // 営業利益項目の変更をチェック
        const hasOperatingProfitChange =
          edits.operatingProfitTarget !== undefined ||
          edits.operatingProfitActual !== undefined;

        if (hasOperatingProfitChange) {
          const operatingProfitTarget =
            edits.operatingProfitTarget ?? currentData.operatingProfitTarget;
          const operatingProfitActual =
            edits.operatingProfitActual ?? currentData.operatingProfitActual;

          const operatingProfitSchema: OperatingProfitSchema = {
            userId: selectedUser.id,
            year: dataYear,
            month: dataMonth,
            operatingProfitTarget: operatingProfitTarget,
            operatingProfitResult: operatingProfitActual,
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
      });

      // 全てのAPI呼び出しを実行
      if (apiUpdatePromises.length > 0) {
        await Promise.all(apiUpdatePromises);
      }

      // マンダラチャートの目標金額も更新する
      let mandalaGoalUpdated = false;
      try {
        console.log('=== マンダラチャート連動処理開始 ===');
        console.log('pendingEdits:', pendingEdits);
        
        // マンダラチャートデータを取得
        const mandalaResponse = await withErrorHandling(() =>
          Service.getApiMandalaCharts(selectedUser.id)
        );
        console.log('マンダラチャート取得結果:', mandalaResponse);

        if (mandalaResponse.responseStatus === 1 && mandalaResponse.charts) {
          const activeChart = mandalaResponse.charts.find(chart => chart.is_active === true);
          console.log('アクティブなマンダラチャート:', activeChart);
          
          if (activeChart) {
            console.log('大目標一覧:', activeChart.large_goals);
            
            // ★ 追加: 中目標データも取得
            const allMiddleGoals: any[] = [];
            if (activeChart.large_goals) {
              for (const largeGoal of activeChart.large_goals) {
                if (largeGoal.large_goal_id) {
                  try {
                    const middleResponse = await Service.getApiMiddleGoals(largeGoal.large_goal_id);
                    if (middleResponse.responseStatus === 1 && middleResponse.middle_goals) {
                      allMiddleGoals.push(...middleResponse.middle_goals);
                    }
                  } catch (err) {
                    console.error('中目標取得エラー:', err);
                  }
                }
              }
            }
            console.log('中目標一覧:', allMiddleGoals);
            
            // 目標金額が変更された項目をループ
            for (const [yearStr, edits] of Object.entries(pendingEdits)) {
              const year = parseInt(yearStr, 10);
              console.log(`年度${year}の編集内容:`, edits);
              
              // 売上目標の変更をチェック
              if (edits.revenueTarget !== undefined) {
                console.log(`売上目標の変更を検出: ${year}年, ${edits.revenueTarget}円`);
                
                // 同じ年度・goal_typeの大目標をすべて取得
                const largeGoals = activeChart.large_goals?.filter(
                  (lg: any) => lg.goal_type === 2 && lg.target_year === year
                ) || [];
                
                // 同じ年度・goal_typeの中目標をすべて取得
                const middleGoals = allMiddleGoals.filter(
                  (mg: any) => mg.goal_type === 2 && mg.target_year === year
                );
                
                console.log(`売上目標更新対象: 大目標${largeGoals.length}件, 中目標${middleGoals.length}件`);
                
                let updated = false;
                
                // すべての大目標を更新
                for (const largeGoal of largeGoals) {
                  if (largeGoal?.large_goal_id) {
                    let updatedGoalTitle = largeGoal.goal_title || '';
                    const newAmountText = formatAmountToText(edits.revenueTarget);
                    updatedGoalTitle = updatedGoalTitle.replace(/(\d+(?:,\d+)*)億(\d+(?:,\d+)*)万円?|(\d+(?:,\d+)*)億円?|(\d+(?:,\d+)*)万円?/, `${newAmountText}円`);
                    
                    console.log(`売上の大目標を更新: ${year}年, large_goal_id: ${largeGoal.large_goal_id}, title: "${largeGoal.goal_title}"`);
                    const updateResponse = await withErrorHandling(() =>
                      Service.putApiLargeGoalsUpdate(largeGoal.large_goal_id!, {
                        target_amount: edits.revenueTarget,
                        goal_title: updatedGoalTitle,
                      })
                    );
                    console.log('売上の大目標更新レスポンス:', updateResponse);
                    updated = true;
                  }
                }
                
                // すべての中目標を更新
                for (const middleGoal of middleGoals) {
                  if (middleGoal?.middle_goal_id) {
                    let updatedGoalTitle = middleGoal.goal_title || '';
                    const newAmountText = formatAmountToText(edits.revenueTarget);
                    updatedGoalTitle = updatedGoalTitle.replace(/(\d+(?:,\d+)*)億(\d+(?:,\d+)*)万円?|(\d+(?:,\d+)*)億円?|(\d+(?:,\d+)*)万円?/, `${newAmountText}円`);
                    
                    console.log(`売上の中目標を更新: ${year}年, middle_goal_id: ${middleGoal.middle_goal_id}, title: "${middleGoal.goal_title}"`);
                    const updateResponse = await withErrorHandling(() =>
                      Service.putApiMiddleGoalsUpdate(middleGoal.middle_goal_id!, {
                        target_amount: edits.revenueTarget,
                        goal_title: updatedGoalTitle,
                      })
                    );
                    console.log('売上の中目標更新レスポンス:', updateResponse);
                    updated = true;
                  }
                }
                
                if (updated) {
                  mandalaGoalUpdated = true;
                } else {
                  console.log(`売上の目標は未設定（${year}年）- 年次PLのみで管理中`);
                }
              }

              // 粗利益目標の変更をチェック
              if (edits.grossProfitTarget !== undefined) {
                console.log(`粗利益目標の変更を検出: ${year}年, ${edits.grossProfitTarget}円`);
                
                // 同じ年度・goal_typeの大目標をすべて取得
                const largeGoals = activeChart.large_goals?.filter(
                  (lg: any) => lg.goal_type === 3 && lg.target_year === year
                ) || [];
                
                // 同じ年度・goal_typeの中目標をすべて取得
                const middleGoals = allMiddleGoals.filter(
                  (mg: any) => mg.goal_type === 3 && mg.target_year === year
                );
                
                console.log(`粗利益目標更新対象: 大目標${largeGoals.length}件, 中目標${middleGoals.length}件`);
                
                let updated = false;
                
                // すべての大目標を更新
                for (const largeGoal of largeGoals) {
                  if (largeGoal?.large_goal_id) {
                    let updatedGoalTitle = largeGoal.goal_title || '';
                    const newAmountText = formatAmountToText(edits.grossProfitTarget);
                    updatedGoalTitle = updatedGoalTitle.replace(/(\d+(?:,\d+)*)億(\d+(?:,\d+)*)万円?|(\d+(?:,\d+)*)億円?|(\d+(?:,\d+)*)万円?/, `${newAmountText}円`);
                    
                    console.log(`粗利益の大目標を更新: ${year}年, large_goal_id: ${largeGoal.large_goal_id}, title: "${largeGoal.goal_title}"`);
                    const updateResponse = await withErrorHandling(() =>
                      Service.putApiLargeGoalsUpdate(largeGoal.large_goal_id!, {
                        target_amount: edits.grossProfitTarget,
                        goal_title: updatedGoalTitle,
                      })
                    );
                    console.log('粗利益の大目標更新レスポンス:', updateResponse);
                    updated = true;
                  }
                }
                
                // すべての中目標を更新
                for (const middleGoal of middleGoals) {
                  if (middleGoal?.middle_goal_id) {
                    let updatedGoalTitle = middleGoal.goal_title || '';
                    const newAmountText = formatAmountToText(edits.grossProfitTarget);
                    updatedGoalTitle = updatedGoalTitle.replace(/(\d+(?:,\d+)*)億(\d+(?:,\d+)*)万円?|(\d+(?:,\d+)*)億円?|(\d+(?:,\d+)*)万円?/, `${newAmountText}円`);
                    
                    console.log(`粗利益の中目標を更新: ${year}年, middle_goal_id: ${middleGoal.middle_goal_id}, title: "${middleGoal.goal_title}"`);
                    const updateResponse = await withErrorHandling(() =>
                      Service.putApiMiddleGoalsUpdate(middleGoal.middle_goal_id!, {
                        target_amount: edits.grossProfitTarget,
                        goal_title: updatedGoalTitle,
                      })
                    );
                    console.log('粗利益の中目標更新レスポンス:', updateResponse);
                    updated = true;
                  }
                }
                
                if (updated) {
                  mandalaGoalUpdated = true;
                } else {
                  console.log(`粗利益の目標は未設定（${year}年）- 年次PLのみで管理中`);
                }
              }

              // 営業利益目標の変更をチェック
              if (edits.operatingProfitTarget !== undefined) {
                console.log(`営業利益目標の変更を検出: ${year}年, ${edits.operatingProfitTarget}円`);
                
                // 同じ年度・goal_typeの大目標をすべて取得
                const largeGoals = activeChart.large_goals?.filter(
                  (lg: any) => lg.goal_type === 4 && lg.target_year === year
                ) || [];
                
                // 同じ年度・goal_typeの中目標をすべて取得
                const middleGoals = allMiddleGoals.filter(
                  (mg: any) => mg.goal_type === 4 && mg.target_year === year
                );
                
                console.log(`営業利益目標更新対象: 大目標${largeGoals.length}件, 中目標${middleGoals.length}件`);
                
                let updated = false;
                
                // すべての大目標を更新
                for (const largeGoal of largeGoals) {
                  if (largeGoal?.large_goal_id) {
                    let updatedGoalTitle = largeGoal.goal_title || '';
                    const newAmountText = formatAmountToText(edits.operatingProfitTarget);
                    updatedGoalTitle = updatedGoalTitle.replace(/(\d+(?:,\d+)*)億(\d+(?:,\d+)*)万円?|(\d+(?:,\d+)*)億円?|(\d+(?:,\d+)*)万円?/, `${newAmountText}円`);
                    
                    console.log(`営業利益の大目標を更新: ${year}年, large_goal_id: ${largeGoal.large_goal_id}, title: "${largeGoal.goal_title}"`);
                    const updateResponse = await withErrorHandling(() =>
                      Service.putApiLargeGoalsUpdate(largeGoal.large_goal_id!, {
                        target_amount: edits.operatingProfitTarget,
                        goal_title: updatedGoalTitle,
                      })
                    );
                    console.log('営業利益の大目標更新レスポンス:', updateResponse);
                    updated = true;
                  }
                }
                
                // すべての中目標を更新
                for (const middleGoal of middleGoals) {
                  if (middleGoal?.middle_goal_id) {
                    let updatedGoalTitle = middleGoal.goal_title || '';
                    const newAmountText = formatAmountToText(edits.operatingProfitTarget);
                    updatedGoalTitle = updatedGoalTitle.replace(/(\d+(?:,\d+)*)億(\d+(?:,\d+)*)万円?|(\d+(?:,\d+)*)億円?|(\d+(?:,\d+)*)万円?/, `${newAmountText}円`);
                    
                    console.log(`営業利益の中目標を更新: ${year}年, middle_goal_id: ${middleGoal.middle_goal_id}, title: "${middleGoal.goal_title}"`);
                    const updateResponse = await withErrorHandling(() =>
                      Service.putApiMiddleGoalsUpdate(middleGoal.middle_goal_id!, {
                        target_amount: edits.operatingProfitTarget,
                        goal_title: updatedGoalTitle,
                      })
                    );
                    console.log('営業利益の中目標更新レスポンス:', updateResponse);
                    updated = true;
                  }
                }
                
                if (updated) {
                  mandalaGoalUpdated = true;
                } else {
                  console.log(`営業利益の目標は未設定（${year}年）- 年次PLのみで管理中`);
                }
              }
            }
          } else {
            console.warn('アクティブなマンダラチャートが見つかりませんでした');
          }
        } else {
          console.warn('マンダラチャート取得に失敗または charts が空です');
        }
        console.log('=== マンダラチャート連動処理終了 ===');
      } catch (mandalaError) {
        console.error("マンダラチャート更新エラー:", mandalaError);
        // マンダラチャートの更新に失敗してもPL更新は成功として扱う
      }

      // マンダラ連動のため、plActualの更新処理は残す
      if (mandalaUpdated) {
        savePlActual(plActual);
      }
  
      // pendingEditsをクリア
      setPendingEdits({});
  
      if (mandalaGoalUpdated) {
        alert("保存しました!\n\n✨ マンダラチャートの目標も自動更新されました!");
      } else {
        alert("保存しました!");
      }
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
  
    return (
      <td
        key={data.year}
        className={`py-2 sm:py-3 px-1 sm:px-2 text-right text-xs sm:text-sm whitespace-nowrap ${
          isEditable
            ? "cursor-pointer hover:bg-primary/5 transition-colors"
            : ""
        } ${isEditable && hasEditForCell ? "bg-primary/5" : ""}`}
        onClick={() =>
          isEditable && handleCellDoubleClick(data.year, field as EditableField)
        }
        title={isEditable ? "クリックで編集" : ""}
        style={{
          position: 'relative',
          width: 'auto',
          minWidth: '80px'
        }}
      >
        {isEditable && editingCell === key ? (
          <input
            type="number"
            defaultValue={displayValue}
            max={9999999999}
            onInput={(e) => {
              const input = e.currentTarget;
              const value = input.value;
              if (value.length > 10) {
                input.value = value.slice(0, 10);
              }
              if (Number(input.value) < 0) {
                input.value = '0';
              }
            }}
            onBlur={(e) => {
              const value = Math.min(Math.max(Number(e.target.value), 0), 9999999999);
              handleCellUpdate(
                data.year,
                field as EditableField,
                value
              );
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const value = Math.min(Math.max(Number(e.currentTarget.value), 0), 9999999999);
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
        ) : displayValue > 0 ? (
          Number(displayValue).toLocaleString('ja-JP')  // ← ここを修正！
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
    
    // ★ 修正: 目標が未設定の場合は「-」を表示
    if (targetValue <= 0) {
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
        {actualValue > 0 ? `${rate.toFixed(1)}%` : "-"}
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
      {/* タイトル */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
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
        </div>
      </div>

      <div className="w-full" style={{ maxWidth: '100%' }}>
        {/* 推移予測グラフ */}
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
    
          {/* ↓↓↓ ここに追加 ↓↓↓ */}
          {(() => {
            console.log('📊 Chart Debug Info:');
            console.log('- chartType:', chartType);
            console.log('- targets:', targets);
            console.log('- Sample target data:', targets[0]);
            console.log('- Operating Profit Targets:', targets.map(t => ({
              year: t.year,
              target: t.operatingProfitTarget,
              actual: t.operatingProfitActual
            })));
            return null;
          })()}
            
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
                  tickFormatter={(value) => {
                    const manyen = value / 10000; // 円を万円に変換
                    
                    if (isMobile) {
                      // モバイル: 億・千万・万の単位で表示
                      if (manyen >= 10000) {
                        const oku = manyen / 10000;
                        return `${oku.toFixed(1)}億`;
                      } else if (manyen >= 1000) {
                        const sen = manyen / 1000;
                        return `${sen.toFixed(0)}千万`;
                      }
                      return `${manyen.toFixed(0)}万`;
                    }
                    
                    // PC: 億円表記に対応
                    if (manyen >= 10000) {
                      const oku = Math.floor(manyen / 10000);
                      const man = manyen % 10000;
                      if (man === 0) {
                        return `${oku}億`;
                      } else {
                        return `${oku}億${man.toLocaleString()}万`;
                      }
                    }
                    return `${manyen.toLocaleString()}万`;
                  }}
                  width={isMobile ? 60 : 100}
                />
                <Tooltip
                  formatter={(value: number, name: string, props: any) => {
                    // マンダラ目標の期限情報を取得
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
                      // ★事業年度期間を表示
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
                
                {/* 売上 */}
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
                
                {/* 粗利益 */}
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
                
                {/* 営業利益 */}
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

              {/* マンダラ目標の参照線 - 全ての目標を表示 */}
              {mandalaGoals
              .filter(goal => goal.metric === chartType)
              .map((goal, index) => {
                // ★ 事業開始年度から相対年を計算
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
                        value={`${relativeYear}年目期限`}  // ★ 変更
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

      {/* 10年間の目標設定テーブル */}
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

          {hasChanges() && (
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
                          item.actualField as keyof YearlyData
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
    </div>
  );
};

export default YearlyBudgetActual;