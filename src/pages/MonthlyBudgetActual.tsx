import React, { useState, useEffect, useCallback } from "react";
import { Download, Save, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import plIcon from "../assets/icon_pl.png";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import * as pdfjs from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker?url";
import { useAuth } from "../contexts/AuthContext";
import { Service } from "../api/services/Service";
import { usePermission } from "../hooks/usePermission";

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface PlItem {
  line: string;
  isDataRow: boolean;
}

interface ConvertedFinancialData {
  売上高: { [key: string]: string };
  売上総損益金額: { [key: string]: string };
  営業損益金額: { [key: string]: string };
}

interface Sale {
  userId: string;
  year: number;
  month: number;
  saleTarget: number;
  saleResult: number;
}

interface Profit {
  userId: string;
  year: number;
  month: number;
  profitTarget: number;
  profitResult: number;
}

interface OperatingProfit {
  userId: string;
  year: number;
  month: number;
  operatingProfitTarget: number;
  operatingProfitResult: number;
}

interface MonthlyData {
  id: number;
  month: string;
  year: number;
  target: number;
  actual: number;
  profit: number;
  profitTarget: number;
  operatingProfit: number;
  operatingProfitTarget: number;
}

const MonthlyBudgetActual: React.FC = () => {
  const navigate = useNavigate();
  const { selectedUser } = useAuth();
  const { canEdit } = usePermission();
  const [sales, setSales] = useState<Sale[]>([]);
  const [profits, setProfits] = useState<Profit[]>([]);
  const [operatingProfits, setOperatingProfits] = useState<OperatingProfit[]>([]);
  const [userSettings, setUserSettings] = useState({
    fiscalYearStartMonth: 4,
    fiscalYearStartYear: new Date().getFullYear(),
  });

  const fiscalYearStart = userSettings.fiscalYearStartMonth;
  const fiscalYearStartYear = userSettings.fiscalYearStartYear;

  const currentDate = new Date();
  const currentCalendarYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  // 現在の会計年度を計算（初期値はcurrentCalendarYear）
  const [selectedYear, setSelectedYear] = useState(currentCalendarYear);
  const [selectedPeriod, setSelectedPeriod] = useState<"12" | "6H1" | "6H2">("12");

  const [activeChart, setActiveChart] = useState<"revenue" | "profit" | "operatingProfit">("revenue");
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);

  const [pendingEdits, setPendingEdits] = useState<{ [key: string]: number }>({});

  // ★ 追加：マンダラ更新確認ダイアログの状態
  const [mandalaUpdateDialog, setMandalaUpdateDialog] = useState<{
    isOpen: boolean;
    message: string;
    fiscalYear: number;
    goalType: 'revenue' | 'grossProfit' | 'operatingProfit';
    monthlyTotal: number;
    existingAmount: number;
    onConfirm: () => void;
    onCancel: () => void;
  }>({
    isOpen: false,
    message: '',
    fiscalYear: 0,
    goalType: 'revenue',
    monthlyTotal: 0,
    existingAmount: 0,
    onConfirm: () => {},
    onCancel: () => {}
  });

  type EditableField =
    | "target"
    | "actual"
    | "profitTarget"
    | "profit"
    | "operatingProfitTarget"
    | "operatingProfit";

    const generateMonthlyDataFromDemo = useCallback(
      (year: number) => {
        const months = [];
        const monthNames = [
          "1月",
          "2月",
          "3月",
          "4月",
          "5月",
          "6月",
          "7月",
          "8月",
          "9月",
          "10月",
          "11月",
          "12月",
        ];
    
        for (let i = 0; i < 12; i++) {
          const monthIndex = (fiscalYearStart - 1 + i) % 12;
          const month = monthIndex + 1;
    
          let actualYear = year;
          if (month < fiscalYearStart) {
            actualYear = year + 1;
          }
    
          const saleData = sales.find(
            (sale) => sale.year === actualYear && sale.month === month
          );
          const profitData = profits.find(
            (profit) => profit.year === actualYear && profit.month === month
          );
          const operatingProfitData = operatingProfits.find(
            (op) => op.year === actualYear && op.month === month
          );
    
          // ★★★ 追加：pendingEditsから編集中の値を取得 ★★★
          const targetKey = `${year}-${i}-target`;
          const actualKey = `${year}-${i}-actual`;
          const profitTargetKey = `${year}-${i}-profitTarget`;
          const profitKey = `${year}-${i}-profit`;
          const operatingProfitTargetKey = `${year}-${i}-operatingProfitTarget`;
          const operatingProfitKey = `${year}-${i}-operatingProfit`;
    
          months.push({
            id: i,
            month: monthNames[monthIndex],
            year: actualYear,
            target: targetKey in pendingEdits ? pendingEdits[targetKey] : (saleData?.saleTarget || 0),
            actual: actualKey in pendingEdits ? pendingEdits[actualKey] : (saleData?.saleResult || 0),
            profit: profitKey in pendingEdits ? pendingEdits[profitKey] : (profitData?.profitResult || 0),
            profitTarget: profitTargetKey in pendingEdits ? pendingEdits[profitTargetKey] : (profitData?.profitTarget || 0),
            operatingProfit: operatingProfitKey in pendingEdits ? pendingEdits[operatingProfitKey] : (operatingProfitData?.operatingProfitResult || 0),
            operatingProfitTarget: operatingProfitTargetKey in pendingEdits ? pendingEdits[operatingProfitTargetKey] : (operatingProfitData?.operatingProfitTarget || 0),
          });
        }
        return months;
      },
      [fiscalYearStart, sales, profits, operatingProfits, pendingEdits]
    );

  const getFiscalYearDisplay = useCallback(
    (year: number) => {
      const yearOffset = year - fiscalYearStartYear;
      const startYear = fiscalYearStartYear + yearOffset;
      const endYear = fiscalYearStart === 1 ? startYear : startYear + 1;
      const endMonth = fiscalYearStart === 1 ? 12 : fiscalYearStart - 1;
  
      // FY形式に変更
      if (fiscalYearStart === 1) {
        return `FY${year} (${startYear}年1月～${startYear}年12月)`;
      } else {
        return `FY${year} (${startYear}年${fiscalYearStart}月～${endYear}年${endMonth}月)`;
      }
    },
    [fiscalYearStart, fiscalYearStartYear]
  );

  const generateYearOptions = useCallback(() => {
    const years = [];
    for (let i = 0; i < 10; i++) {
      years.push(fiscalYearStartYear + i);
    }
    return years;
  }, [fiscalYearStartYear]);

  const [tableData, setTableData] = useState<MonthlyData[]>([]);

  useEffect(() => {
    setTableData(generateMonthlyDataFromDemo(selectedYear));
  }, [
    generateMonthlyDataFromDemo,
    selectedYear,
    sales,
    profits,
    operatingProfits,
  ]);

  // データロード用のuseEffectを追加
  useEffect(() => {
    const loadData = async () => {
      if (!selectedUser) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true); 
        // ユーザー設定を取得
        const settingResponse = await Service.getApiSettingUser(selectedUser.id);
        let fiscalYearStartMonth = 4;
        let fiscalYearStartYear = new Date().getFullYear();
        
        if (settingResponse.responseStatus === 1 && settingResponse.settingSchema) {
          fiscalYearStartMonth = settingResponse.settingSchema.fiscalYearStartMonth || 4;
          fiscalYearStartYear = settingResponse.settingSchema.fiscalYearStartYear || new Date().getFullYear();
          
          setUserSettings({
            fiscalYearStartMonth,
            fiscalYearStartYear,
          });
        }

        // 初期表示時は事業開始年度の開始月を使用してAPIを呼び出す
        const now = new Date();
        const currentCalendarYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        
        // 現在の会計年度を計算
        const currentFiscalYear = currentMonth >= fiscalYearStartMonth
          ? currentCalendarYear
          : currentCalendarYear - 1;

        // selectedYearを現在の会計年度に設定
        setSelectedYear(currentFiscalYear);

        // 月次データを取得（事業開始月を使用）
        const response = await Service.getApiMonthlyBudgetActual(
          selectedUser.id,
          currentFiscalYear,
          fiscalYearStartMonth.toString()
        );
        
        if (response.responseStatus === 1) {
          // 売上データ
          if (response.saleSchema && response.saleSchema.length > 0) {
            const salesData: Sale[] = response.saleSchema.map((item: any) => ({
              userId: selectedUser.id,
              year: item.year,
              month: item.month,
              saleTarget: item.saleTarget || 0,
              saleResult: item.saleResult || 0,
            }));
            setSales(salesData);
          } else {
            setSales([]);
          }

          // 粗利益データ
          if (response.grossProfitSchema && response.grossProfitSchema.length > 0) {
            const profitsData: Profit[] = response.grossProfitSchema.map((item: any) => ({
              userId: selectedUser.id,
              year: item.year,
              month: item.month,
              profitTarget: item.grossProfitTarget || 0,
              profitResult: item.grossProfitResult || 0,
            }));
            setProfits(profitsData);
          } else {
            setProfits([]);
          }

          // 営業利益データ
          if (response.operatingProfitSchema && response.operatingProfitSchema.length > 0) {
            const operatingProfitsData: OperatingProfit[] = response.operatingProfitSchema.map((item: any) => ({
              userId: selectedUser.id,
              year: item.year,
              month: item.month,
              operatingProfitTarget: item.operatingProfitTarget || 0,
              operatingProfitResult: item.operatingProfitResult || 0,
            }));
            setOperatingProfits(operatingProfitsData);
          } else {
            setOperatingProfits([]);
          }
        } else {
          // APIエラーの場合も空配列を設定
          setSales([]);
          setProfits([]);
          setOperatingProfits([]);
        }
      } catch (err) {
        console.error("データの読み込みエラー:", err);
        // エラー時も空配列を設定
        setSales([]);
        setProfits([]);
        setOperatingProfits([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [selectedUser?.id]);

  // selectedYearが変更されたときにデータを再取得
  useEffect(() => {
    const reloadData = async () => {
      if (!selectedUser || !userSettings.fiscalYearStartMonth) {
        return;
      }

      try {
        setIsLoading(true);
        // 選択された年度の月次データを取得
        const response = await Service.getApiMonthlyBudgetActual(
          selectedUser.id,
          selectedYear,
          userSettings.fiscalYearStartMonth.toString()
        );
        
        if (response.responseStatus === 1) {
          // 売上データ
          if (response.saleSchema && response.saleSchema.length > 0) {
            const salesData: Sale[] = response.saleSchema.map((item: any) => ({
              userId: selectedUser.id,
              year: item.year,
              month: item.month,
              saleTarget: item.saleTarget || 0,
              saleResult: item.saleResult || 0,
            }));
            setSales(salesData);
          } else {
            setSales([]);
          }

          // 粗利益データ
          if (response.grossProfitSchema && response.grossProfitSchema.length > 0) {
            const profitsData: Profit[] = response.grossProfitSchema.map((item: any) => ({
              userId: selectedUser.id,
              year: item.year,
              month: item.month,
              profitTarget: item.grossProfitTarget || 0,
              profitResult: item.grossProfitResult || 0,
            }));
            setProfits(profitsData);
          } else {
            setProfits([]);
          }

          // 営業利益データ
          if (response.operatingProfitSchema && response.operatingProfitSchema.length > 0) {
            const operatingProfitsData: OperatingProfit[] = response.operatingProfitSchema.map((item: any) => ({
              userId: selectedUser.id,
              year: item.year,
              month: item.month,
              operatingProfitTarget: item.operatingProfitTarget || 0,
              operatingProfitResult: item.operatingProfitResult || 0,
            }));
            setOperatingProfits(operatingProfitsData);
          } else {
            setOperatingProfits([]);
          }
        } else {
          // APIエラーの場合も空配列を設定
          setSales([]);
          setProfits([]);
          setOperatingProfits([]);
        }
      } catch (err) {
        console.error("年度変更時のデータ読み込みエラー:", err);
        // エラー時も空配列を設定
        setSales([]);
        setProfits([]);
        setOperatingProfits([]);
      } finally {
        setIsLoading(false);
      }
    };

    // userSettingsが初期化されていて、かつselectedUserが存在する場合のみ実行
    // 初回ロードは別のuseEffectで処理されるため、selectedYearの変更時のみ実行
    const isInitialLoad = selectedYear === currentCalendarYear && 
                          userSettings.fiscalYearStartYear === new Date().getFullYear() &&
                          userSettings.fiscalYearStartMonth === 4;
    
    if (userSettings.fiscalYearStartMonth && selectedUser && !isInitialLoad) {
      reloadData();
    }
  }, [selectedYear, selectedUser]);

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  const getDisplayData = () => {
    const graphData = generateMonthlyDataFromDemo(selectedYear);

    switch (selectedPeriod) {
      case "12":
        return graphData.slice(0, 12);
      case "6H1":
        return graphData.slice(0, 6);
      case "6H2":
        return graphData.slice(6, 12);
      default:
        return graphData.slice(0, 12);
    }
  };

  // グラフのY軸最大値を動的に計算
  const yAxisDomain = React.useMemo((): [number, number] => {
    const displayData = getDisplayData();
    
    if (displayData.length === 0) {
      return [0, 10000000]; // データがない場合は0〜1000万円
    }
    
    let maxValue = 0;
    displayData.forEach((data) => {
      if (activeChart === "revenue") {
        maxValue = Math.max(maxValue, data.target || 0, data.actual || 0);
      } else if (activeChart === "profit") {
        maxValue = Math.max(maxValue, data.profitTarget || 0, data.profit || 0);
      } else {
        maxValue = Math.max(maxValue, data.operatingProfitTarget || 0, data.operatingProfit || 0);
      }
    });
    
    // データがすべて0の場合
    if (maxValue === 0) {
      return [0, 10000000]; // 0〜1000万円
    }
    
    // 最大値に50%の余裕を持たせる
    const paddedMax = maxValue * 1.5;
    
    // 適切な単位で切り上げ
    let upperBound;
    if (paddedMax < 1000000) {
      // 100万円未満: 10万円単位で切り上げ
      upperBound = Math.ceil(paddedMax / 100000) * 100000;
    } else if (paddedMax < 10000000) {
      // 1000万円未満: 100万円単位で切り上げ
      upperBound = Math.ceil(paddedMax / 1000000) * 1000000;
    } else if (paddedMax < 100000000) {
      // 1億円未満: 1000万円単位で切り上げ
      upperBound = Math.ceil(paddedMax / 10000000) * 10000000;
    } else {
      // 1億円以上: 1億円単位で切り上げ
      upperBound = Math.ceil(paddedMax / 100000000) * 100000000;
    }
    
    return [0, upperBound];
  }, [activeChart, selectedPeriod, tableData]);

  const getTableDisplayData = () => {
    if (selectedPeriod === "12") {
      return tableData;
    } else if (selectedPeriod === "6H1") {
      return tableData.slice(0, 6);
    } else {
      return tableData.slice(6, 12);
    }
  };

  const handleCellUpdate = (
    id: number,
    field: EditableField,
    value: number
  ) => {
    const key = `${selectedYear}-${id}-${field}`;
    setPendingEdits((prev) => ({
      ...prev,
      [key]: value,
    }));
    setEditingCell(null);
  
    // ★★★ 追加：編集内容を即座にtableDataに反映 ★★★
    setTableData((prev) => {
      return prev.map((data) => {
        if (data.id === id) {
          return {
            ...data,
            [field]: value
          };
        }
        return data;
      });
    });
  };

  const handleCellDoubleClick = (id: number, field: EditableField) => {
    const key = `${selectedYear}-${id}-${field}`;
    setEditingCell(key);
  };

  // ★ 追加：年間合計を計算する関数
  const calculateYearlyTotal = (
    data: Sale[] | Profit[] | OperatingProfit[],
    fiscalYear: number,
    fiscalYearStartMonth: number
  ): number => {
    let total = 0;
    
    for (let i = 0; i < 12; i++) {
      const monthIndex = (fiscalYearStartMonth - 1 + i) % 12;
      const month = monthIndex + 1;
      
      let actualYear = fiscalYear;
      if (month < fiscalYearStartMonth) {
        actualYear = fiscalYear + 1;
      }
      
      const record = data.find((d: any) => d.year === actualYear && d.month === month);
      if (record) {
        if ('saleTarget' in record) {
          total += record.saleTarget || 0;
        } else if ('profitTarget' in record) {
          total += record.profitTarget || 0;
        } else if ('operatingProfitTarget' in record) {
          total += record.operatingProfitTarget || 0;
        }
      }
    }
    
    return total;
  };

  const checkAndUpdateMandalaGoal = async (
    fiscalYear: number,
    goalType: 'revenue' | 'grossProfit' | 'operatingProfit',
    monthlyTotal: number
  ) => {
    if (!selectedUser?.id) {
      return;
    }
    
    
    try {
      // マンダラチャートデータを取得
      const mandalaResponse = await Service.getApiMandalaCharts(selectedUser.id);
      
      if (mandalaResponse.responseStatus !== 1 || !mandalaResponse.charts) {
        return;
      }
      
      const activeChart = mandalaResponse.charts.find(chart => chart.is_active === true);
      if (!activeChart) {
        return;
      }
      
      // goal_typeを数値に変換
      const goalTypeNumber = goalType === 'revenue' ? 2 : goalType === 'grossProfit' ? 3 : 4;
      
      // ★ 中目標データも取得
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
              console.error('❌ 中目標取得エラー:', err);
            }
          }
        }
      }
      
      // 同じ年度・goal_typeの目標を検索（大目標と中目標）
      const matchingLargeGoals = activeChart.large_goals?.filter(
        (lg: any) => {
          return lg.goal_type === goalTypeNumber && lg.target_year === fiscalYear;
        }
      ) || [];
      
      const matchingMiddleGoals = allMiddleGoals.filter(
        (mg: any) => {
          return mg.goal_type === goalTypeNumber && mg.target_year === fiscalYear;
        }
      );
      
      const allMatchingGoals = [...matchingLargeGoals, ...matchingMiddleGoals];
      
      if (allMatchingGoals.length === 0) {
        return;
      }
      
      // ★★★ 修正：すべての該当目標の金額を確認 ★★★
      const allAmountsSame = allMatchingGoals.every(goal => goal.target_amount === monthlyTotal);
      if (allAmountsSame) {
        return;
      }
      // ★ 差分がある場合は確認ダイアログを表示
      const goalTypeLabel = goalType === 'revenue' ? '売上' : 
                           goalType === 'grossProfit' ? '粗利益' : '営業利益';
      
      const formatAmount = (amount: number): string => {
        const manyen = Math.round(amount / 10000);
        if (manyen >= 10000) {
          const oku = Math.floor(manyen / 10000);
          const man = manyen % 10000;
          if (man === 0) {
            return `${oku}億円`;
          } else {
            return `${oku}億${man}万円`; // ★ .toLocaleString() を削除
          }
        }
        return `${manyen}万円`; // ★ .toLocaleString() を削除
      };
      
      const existingAmount = allMatchingGoals[0].target_amount || 0;
      
      // ★ 修正：階層情報を追加
      let hierarchyInfo = '';
      const firstGoal = allMatchingGoals[0];
      
      if ('large_goal_id' in firstGoal && firstGoal.large_goal_id) {
        // 大目標の場合
        hierarchyInfo = `大目標：${firstGoal.goal_title || ''}`;
      } else if ('middle_goal_id' in firstGoal && firstGoal.middle_goal_id) {
        // 中目標の場合 - 紐づく大目標を探す
        const middleGoalData = allMiddleGoals.find(mg => mg.middle_goal_id === firstGoal.middle_goal_id);
        if (middleGoalData && activeChart.large_goals) {
          const parentLargeGoal = activeChart.large_goals.find((lg: any) => 
            lg.large_goal_id === middleGoalData.large_goal_id
          );
          if (parentLargeGoal?.goal_title) {
            hierarchyInfo = `大目標：${parentLargeGoal.goal_title}\n∟中目標：${firstGoal.goal_title || ''}`;
          } else {
            hierarchyInfo = `中目標：${firstGoal.goal_title || ''}`;
          }
        }
      }
      
      const message = `FY${fiscalYear}の${goalTypeLabel}の月次合計と\nマンダラの目標金額に差分があります。\n\n${hierarchyInfo}\n\nマンダラの目標金額を${formatAmount(monthlyTotal)}に更新しますか？`;      
      
      // ★ 修正：confirmの代わりにダイアログを表示し、Promiseで結果を待つ
      return new Promise<void>((resolve) => {
        setMandalaUpdateDialog({
          isOpen: true,
          message: message,
          fiscalYear: fiscalYear,
          goalType: goalType,
          monthlyTotal: monthlyTotal,
          existingAmount: existingAmount,
          onConfirm: async () => {
            setMandalaUpdateDialog(prev => ({ ...prev, isOpen: false }));
            
            // ★ すべての該当目標を更新
            try {
              for (const goal of allMatchingGoals) {
                
                // 大目標か中目標かを判定して適切なAPIを呼び出す
                if ('large_goal_id' in goal && goal.large_goal_id) {
                  // ★ タイトル内の金額を新しい金額に置換
                  let updatedGoalTitle = goal.goal_title || '';
                  const newAmountText = formatAmount(monthlyTotal).replace('円', '');
                  
                  // 正規表現で金額部分を置換
                  updatedGoalTitle = updatedGoalTitle.replace(
                    /(\d+(?:,\d+)*)億(\d+(?:,\d+)*)万|(\d+(?:,\d+)*)億|(\d+(?:,\d+)*)万/,
                    newAmountText
                  );
                  
                  // 大目標の更新（金額とタイトルを更新）
                  const updateData = {
                    chart_id: goal.chart_id,
                    position: goal.position,
                    goal_title: updatedGoalTitle, // ★ 金額部分を置換したタイトル
                    goal_type: goal.goal_type,
                    target_year: goal.target_year,
                    target_amount: monthlyTotal, // ★ 新しい金額
                  };
                  
                  const response = await Service.putApiLargeGoalsUpdate(goal.large_goal_id, updateData);
                } else if ('middle_goal_id' in goal && goal.middle_goal_id) {
                  // ★ タイトル内の金額を新しい金額に置換
                  let updatedGoalTitle = goal.goal_title || '';
                  const newAmountText = formatAmount(monthlyTotal).replace('円', '');
                  
                  // 正規表現で金額部分を置換
                  updatedGoalTitle = updatedGoalTitle.replace(
                    /(\d+(?:,\d+)*)億(\d+(?:,\d+)*)万|(\d+(?:,\d+)*)億|(\d+(?:,\d+)*)万/,
                    newAmountText
                  );
                  
                  // 中目標の更新（金額とタイトルを更新）
                  const updateData = {
                    position: goal.position,
                    goal_title: updatedGoalTitle, // ★ 金額部分を置換したタイトル
                    goal_type: goal.goal_type,
                    target_year: goal.target_year,
                    target_amount: monthlyTotal, // ★ 新しい金額
                  };
                  
                  const response = await Service.putApiMiddleGoalsUpdate(goal.middle_goal_id, updateData);
                }
              }
              
            } catch (error) {
              console.error('❌ マンダラ目標更新エラー:', error);
            }
            
            resolve();
          },
          onCancel: () => {
            setMandalaUpdateDialog(prev => ({ ...prev, isOpen: false }));
            resolve();
          }
        });
      });
      
    } catch (error) {
      console.error('❌ マンダラ目標更新エラー:', error);
    }
  };

  const handleTableSave = async () => {
    if (!selectedUser?.id) {
      alert('ユーザー情報が取得できませんでした');
      return;
    }
  
    const newSales = [...sales];
    const newProfits = [...profits];
    const newOperatingProfits = [...operatingProfits];
  
    // ★ 追加：年度ごとの目標金額の変更を追跡
    const yearlyTargetChanges: {
      [year: number]: {
        revenue?: number;
        grossProfit?: number;
        operatingProfit?: number;
      };
    } = {};
  
    Object.entries(pendingEdits).forEach(([itemKey, value]) => {
      const [yearStr, idStr, field] = itemKey.split("-");
      const year = parseInt(yearStr, 10);
      const id = parseInt(idStr, 10);
  
      const monthIndex = (fiscalYearStart - 1 + id) % 12;
      const month = monthIndex + 1;
  
      let actualYear = year;
      if (month < fiscalYearStart) {
        actualYear = year + 1;
      }
  
      if (field === "target") {
        const existingIndex = newSales.findIndex(
          (s) => s.year === actualYear && s.month === month
        );
        if (existingIndex >= 0) {
          newSales[existingIndex].saleTarget = value;
        } else {
          newSales.push({
            userId: selectedUser?.id || "",
            year: actualYear,
            month,
            saleTarget: value,
            saleResult: 0,
          });
        }
        
        // ★ 追加：売上目標の変更を記録
        if (!yearlyTargetChanges[year]) {
          yearlyTargetChanges[year] = {};
        }
        yearlyTargetChanges[year].revenue = -1;
      } else if (field === "actual") {
        const existingIndex = newSales.findIndex(
          (s) => s.year === actualYear && s.month === month
        );
        if (existingIndex >= 0) {
          newSales[existingIndex].saleResult = value;
        } else {
          newSales.push({
            userId: selectedUser?.id || "",
            year: actualYear,
            month,
            saleTarget: 0,
            saleResult: value,
          });
        }
      } else if (field === "profitTarget") {
        const existingIndex = newProfits.findIndex(
          (p) => p.year === actualYear && p.month === month
        );
        if (existingIndex >= 0) {
          newProfits[existingIndex].profitTarget = value;
        } else {
          newProfits.push({
            userId: selectedUser?.id || "",
            year: actualYear,
            month,
            profitTarget: value,
            profitResult: 0,
          });
        }
        
        if (!yearlyTargetChanges[year]) {
          yearlyTargetChanges[year] = {};
        }
        yearlyTargetChanges[year].grossProfit = -1;
      } else if (field === "profit") {
        const existingIndex = newProfits.findIndex(
          (p) => p.year === actualYear && p.month === month
        );
        if (existingIndex >= 0) {
          newProfits[existingIndex].profitResult = value;
        } else {
          newProfits.push({
            userId: selectedUser?.id || "",
            year: actualYear,
            month,
            profitTarget: 0,
            profitResult: value,
          });
        }
      } else if (field === "operatingProfitTarget") {
        const existingIndex = newOperatingProfits.findIndex(
          (op) => op.year === actualYear && op.month === month
        );
        if (existingIndex >= 0) {
          newOperatingProfits[existingIndex].operatingProfitTarget = value;
        } else {
          newOperatingProfits.push({
            userId: selectedUser?.id || "",
            year: actualYear,
            month,
            operatingProfitTarget: value,
            operatingProfitResult: 0,
          });
        }
        
        if (!yearlyTargetChanges[year]) {
          yearlyTargetChanges[year] = {};
        }
        yearlyTargetChanges[year].operatingProfit = -1;
      } else if (field === "operatingProfit") {
        const existingIndex = newOperatingProfits.findIndex(
          (op) => op.year === actualYear && op.month === month
        );
        if (existingIndex >= 0) {
          newOperatingProfits[existingIndex].operatingProfitResult = value;
        } else {
          newOperatingProfits.push({
            userId: selectedUser?.id || "",
            year: actualYear,
            month,
            operatingProfitTarget: 0,
            operatingProfitResult: value,
          });
        }
      }
    });
  
    // ★ 追加：月次PLデータをAPIに保存
    try {
      // マンダラとの差分チェックを先に実行（キャンセル可能）
      for (const [yearStr, changes] of Object.entries(yearlyTargetChanges)) {
        const year = parseInt(yearStr, 10);
        
        if (changes.revenue !== undefined) {
          const yearlyTotal = calculateYearlyTotal(newSales, year, fiscalYearStart);
          await checkAndUpdateMandalaGoal(year, 'revenue', yearlyTotal);
        }
        
        if (changes.grossProfit !== undefined) {
          const yearlyTotal = calculateYearlyTotal(newProfits, year, fiscalYearStart);
          await checkAndUpdateMandalaGoal(year, 'grossProfit', yearlyTotal);
        }
        
        if (changes.operatingProfit !== undefined) {
          const yearlyTotal = calculateYearlyTotal(newOperatingProfits, year, fiscalYearStart);
          await checkAndUpdateMandalaGoal(year, 'operatingProfit', yearlyTotal);
        }
      }
  
      // ★★★ マンダラチェック後に月次PLデータをAPIに保存 ★★★
      for (const [itemKey] of Object.entries(pendingEdits)) {
        const [yearStr, idStr, field] = itemKey.split("-");
        const year = parseInt(yearStr, 10);
        const id = parseInt(idStr, 10);
  
        const monthIndex = (fiscalYearStart - 1 + id) % 12;
        const month = monthIndex + 1;
  
        let actualYear = year;
        if (month < fiscalYearStart) {
          actualYear = year + 1;
        }
  
        // 売上データの保存
        if (field === "target" || field === "actual") {
          const saleData = newSales.find(
            (s) => s.year === actualYear && s.month === month
          );
          if (saleData) {
            await Service.putApiSaleUpdate({
              userId: selectedUser.id,
              year: actualYear,
              month: month,
              saleTarget: saleData.saleTarget,
              saleResult: saleData.saleResult,
            });
          }
        }
  
        // 粗利益データの保存
        if (field === "profitTarget" || field === "profit") {
          const profitData = newProfits.find(
            (p) => p.year === actualYear && p.month === month
          );
          if (profitData) {
            await Service.putApiGrossProfitUpdate({
              userId: selectedUser.id,
              year: actualYear,
              month: month,
              grossProfitTarget: profitData.profitTarget,
              grossProfitResult: profitData.profitResult,
            });
          }
        }
  
        // 営業利益データの保存
        if (field === "operatingProfitTarget" || field === "operatingProfit") {
          const operatingProfitData = newOperatingProfits.find(
            (op) => op.year === actualYear && op.month === month
          );
          if (operatingProfitData) {
            await Service.putApiOperatingProfitUpdate({
              userId: selectedUser.id,
              year: actualYear,
              month: month,
              operatingProfitTarget: operatingProfitData.operatingProfitTarget,
              operatingProfitResult: operatingProfitData.operatingProfitResult,
            });
          }
        }
      }
  
      // ★ 状態を更新
      setSales(newSales);
      setProfits(newProfits);
      setOperatingProfits(newOperatingProfits);
      
      setPendingEdits({});
      alert("データを保存しました。");
    } catch (error) {
      console.error('データ保存エラー:', error);
      alert("データの保存中にエラーが発生しました。");
    }
  };

  const detailedTableData = [
    {
      label: "売上",
      targetField: "target",
      actualField: "actual",
    },
    {
      label: "粗利益",
      targetField: "profitTarget",
      actualField: "profit",
    },
    {
      label: "営業利益",
      targetField: "operatingProfitTarget",
      actualField: "operatingProfit",
    },
  ];

  const renderEditableCell = (data: MonthlyData, field: EditableField) => {
    const key = `${selectedYear}-${data.id}-${field}`;
    const hasPendingEdit = key in pendingEdits;
    const displayValue = hasPendingEdit
      ? pendingEdits[key]
      : (data[field as keyof MonthlyData] as number);
  
    // ★ 追加：編集権限がない場合は閲覧のみのセルを返す
    if (!canEdit) {
      return (
        <td
          key={`${data.id}-${field}`}
          className="py-2 sm:py-3 px-1 sm:px-2 text-right text-xs sm:text-sm whitespace-nowrap"
          style={{
            position: 'relative',
            width: 'auto',
            minWidth: '80px'
          }}
        >
          {displayValue > 0 ? Number(displayValue).toLocaleString('ja-JP') : "-"}
        </td>
      );
    }
  
    // 編集可能な場合は既存のロジック
    return (
      <td
        key={`${data.id}-${field}`}
        className={`py-2 sm:py-3 px-1 sm:px-2 text-right text-xs sm:text-sm whitespace-nowrap cursor-pointer hover:bg-primary/5 transition-colors ${
          hasPendingEdit ? "bg-primary/5" : ""
        }`}
        onClick={() => handleCellDoubleClick(data.id, field)}
        title="クリックで編集"
        style={{
          position: 'relative',
          width: 'auto',
          minWidth: '80px'
        }}
      >
        {editingCell === key ? (
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
              handleCellUpdate(data.id, field, value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const value = Math.min(Math.max(Number(e.currentTarget.value), 0), 9999999999);
                handleCellUpdate(data.id, field, value);
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
          Number(displayValue).toLocaleString('ja-JP')
        ) : (
          "-"
        )}
      </td>
    );
  };

  const renderRateCellForTable = (
    data: MonthlyData,
    targetField: EditableField,
    actualField: EditableField
  ) => {
    const targetKey = `${selectedYear}-${data.id}-${targetField}`;
    const actualKey = `${selectedYear}-${data.id}-${actualField}`;

    const target =
      targetKey in pendingEdits
        ? pendingEdits[targetKey]
        : (data[targetField as keyof MonthlyData] as number);
    const actual =
      actualKey in pendingEdits
        ? pendingEdits[actualKey]
        : (data[actualField as keyof MonthlyData] as number);

    // 目標が未設定の場合は「-」を表示
    if (target <= 0) {
      return (
        <td
          key={`${data.id}-rate`}
          className="py-2 sm:py-3 px-1 sm:px-2 text-right font-medium text-xs sm:text-sm"
        >
          -
        </td>
      );
    }

    const rate = (actual / target) * 100;
    return (
      <td
        key={`${data.id}-rate`}
        className={`py-2 sm:py-3 px-1 sm:px-2 text-right font-medium text-xs sm:text-sm ${
          rate >= 100
            ? "text-success"
            : rate >= 90
            ? "text-warning"
            : "text-error"
        }`}
      >
        {actual > 0 ? `${rate.toFixed(1)}%` : "-"}
      </td>
    );
  };

  const handleDataExport = () => {
    try {
      interface ExportData {
        年: number;
        月: number;
        売上目標: number;
        売上実績: number;
        売上達成率: string;
        利益目標: number;
        利益実績: number;
        利益達成率: string;
      }

      const allYearsData: ExportData[] = [];
      const yearOptions = generateYearOptions();

      yearOptions.forEach((year) => {
        const yearData = generateMonthlyDataFromDemo(year);
        yearData.forEach((monthData) => {
          const monthIndex = (fiscalYearStart - 1 + monthData.id) % 12;
          const month = monthIndex + 1;

          let actualYear = year;
          if (month < fiscalYearStart) {
            actualYear = year + 1;
          }

          const revenueRate =
            monthData.target > 0
              ? ((monthData.actual / monthData.target) * 100).toFixed(1)
              : "0.0";
          const profitRate =
            monthData.profitTarget > 0
              ? ((monthData.profit / monthData.profitTarget) * 100).toFixed(1)
              : "0.0";

          allYearsData.push({
            年: actualYear,
            月: month,
            売上目標: monthData.target,
            売上実績: monthData.actual,
            売上達成率: `${revenueRate}%`,
            利益目標: monthData.profitTarget,
            利益実績: monthData.profit,
            利益達成率: `${profitRate}%`,
          });
        });
      });

      const headers = [
        "年",
        "月",
        "売上目標",
        "売上実績",
        "売上達成率",
        "利益目標",
        "利益実績",
        "利益達成率",
      ];

      const csvContent = [
        headers.join(","),
        ...allYearsData.map((row) =>
          [
            row.年,
            row.月,
            row.売上目標,
            row.売上実績,
            row.売上達成率,
            row.利益目標,
            row.利益実績,
            row.利益達成率,
          ].join(",")
        ),
      ].join("\n");

      const bom = "\uFEFF";
      const blob = new Blob([bom + csvContent], {
        type: "text/csv;charset=utf-8;",
      });

      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `予実管理データ_${new Date().toISOString().split("T")[0]}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("データ出力に失敗しました:", error);
      alert("データ出力中にエラーが発生しました。");
    }
  };

  const isNumeric = (str: string): boolean => {
    if (typeof str !== "string" || str.trim() === "") {
      return false;
    }
    let cleanStr = str.trim().replace(/,/g, "");
    if (cleanStr.startsWith("(") && cleanStr.endsWith(")")) {
      cleanStr = "-" + cleanStr.slice(1, -1);
    }
    if (cleanStr === "-" || cleanStr === "") {
      return false;
    }
    return !isNaN(Number(cleanStr)) && isFinite(Number(cleanStr));
  };

  const parsePLData = (text: string): PlItem[] => {
    const lines = text.split("\n").filter((line) => line.trim() !== "");
    const data: PlItem[] = [];

    for (const line of lines) {
      const parts = line.split(/\s{2,}/);

      for (const part of parts) {
        const trimmedPart = part.trim();
        if (trimmedPart) {
          if (trimmedPart.includes("年度")) {
          }
          if (trimmedPart == "売上高") {
          }
          data.push({
            line: trimmedPart,
            isDataRow: isNumeric(trimmedPart),
          });
        }
      }
    }
    return data;
  };

  const handlePLUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.type !== "application/pdf") {
      console.error("エラー: 選択されたファイルはPDFではありません。");
      alert("PDFファイルのみ選択できます。");
      return;
    }

    function convertFinancialData(inputData: PlItem[]): ConvertedFinancialData {
      const output: ConvertedFinancialData = {
        売上高: {},
        売上総損益金額: {},
        営業損益金額: {},
      };

      let fiscalYear = "";
      let fiscalStartMonth = 0;
      const monthColumns: string[] = [];

      for (const item of inputData) {
        const yearMatch = item.line.match(
          /(\d{4})年度（\d{4}\/(\d{2})\/\d{2} ～ \d{4}\/\d{2}\/\d{2}）/
        );
        if (yearMatch) {
          fiscalYear = yearMatch[1];
          fiscalStartMonth = parseInt(yearMatch[2], 10);
          break;
        }
      }

      if (!fiscalYear) {
        console.warn("年度情報がPDFから読み取れませんでした。");
        return output;
      }

      for (let i = 0; i < inputData.length; i++) {
        if (inputData[i].line === "勘定科目／補助科目") {
          let j = i + 1;
          while (j < inputData.length && inputData[j].line !== "期間残高") {
            const monthMatch = inputData[j].line.match(/(\d+)月度/);
            if (monthMatch) {
              monthColumns.push(monthMatch[1]);
            }
            j++;
          }

          if (monthColumns.length > 0) {
            break;
          }
        }
      }

      const targetIndicators = [
        { key: "売上高", pattern: /^売上高$/ },
        { key: "売上総損益金額", pattern: /^Σ 売上総損益金額$/ },
        { key: "営業損益金額", pattern: /^Σ 営業損益金額$/ },
      ];

      for (const indicator of targetIndicators) {
        for (let i = 0; i < inputData.length; i++) {
          if (indicator.pattern.test(inputData[i].line)) {

            let dataStartIndex = i + 1;

            while (
              dataStartIndex < inputData.length &&
              !inputData[dataStartIndex].isDataRow
            ) {
              dataStartIndex++;
            }

            for (let j = 0; j < monthColumns.length; j++) {
              if (
                dataStartIndex + j < inputData.length &&
                inputData[dataStartIndex + j].isDataRow
              ) {
                const monthStr = monthColumns[j];
                const month = parseInt(monthStr, 10);
                const value = inputData[dataStartIndex + j].line;

                const actualYear =
                  month < fiscalStartMonth
                    ? parseInt(fiscalYear, 10) + 1
                    : parseInt(fiscalYear, 10);
                const key = `${actualYear}年${month}月`;

                output[indicator.key as keyof ConvertedFinancialData][key] =
                  value;
              }
            }

            break;
          }
        }
      }

      return output;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        if (e.target?.result) {
          const typedArray = new Uint8Array(e.target.result as ArrayBuffer);
          const pdf = await pdfjs.getDocument({ data: typedArray }).promise;
          let fullText = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              .map((item: any) => ("str" in item ? item.str : ""))
              .join(" ");
            fullText += pageText + "\n";
          }

          const parsedData = parsePLData(fullText);

          try {
          } catch (conversionError) {
            console.error("財務データの変換に失敗しました:", conversionError);
          }
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error("PDFファイルの解析に失敗しました:", error);
      alert("PDFファイルの解析に失敗しました。");
    }
  };

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
          <h1 className="text-xl sm:text-2xl font-bold text-text">月次PL</h1>
          
          {/* タブ風ボタン */}
          <div className="flex items-center space-x-2 bg-gray-100 rounded-full p-1">
            <button
              onClick={() => navigate('/yearlyBudgetActual')}
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm text-gray-600 hover:text-gray-900 hover:bg-white/50 transition-colors"
            >
              年次
            </button>
            <button
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white shadow-sm font-semibold text-xs sm:text-sm text-primary"
            >
              月次
            </button>
          </div>
        </div>
        
        {/* 年度・期間選択プルダウン */}
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="text-sm border border-border rounded px-2 sm:px-3 py-1.5 sm:py-2 pr-8 appearance-none bg-background focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto"
            style={{
              backgroundImage: 'url(\'data:image/svg+xml;utf8,<svg fill="black" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/><path d="M0 0h24v24H0z" fill="none"/></svg>\')',
              backgroundRepeat: "no-repeat",
              backgroundPosition: "calc(100% - 4px) center",
              backgroundSize: "16px",
              minWidth: "280px",
            }}
          >
            {generateYearOptions().map((year) => (
              <option key={year} value={year}>
                {getFiscalYearDisplay(year)}
              </option>
            ))}
          </select>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as "12" | "6H1" | "6H2")}
            className="text-sm border border-border rounded px-2 sm:px-3 py-1.5 sm:py-2 pr-8 appearance-none bg-background focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-36"
            style={{
              backgroundImage: 'url(\'data:image/svg+xml;utf8,<svg fill="black" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/><path d="M0 0h24v24H0z" fill="none"/></svg>\')',
              backgroundRepeat: "no-repeat",
              backgroundPosition: "calc(100% - 4px) center",
              backgroundSize: "16px",
              minWidth: "120px",
            }}
          >
            <option value="12">12ヶ月</option>
            <option value="6H1">上半期</option>
            <option value="6H2">下半期</option>
          </select>
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
                {activeChart === "revenue" ? `月次売上推移（FY${selectedYear}）` : 
                activeChart === "profit" ? `月次粗利益推移（FY${selectedYear}）` : 
                `月次営業利益推移（FY${selectedYear}）`}
              </h3>
            </div>
            
            {/* プルダウンに変更 */}
            <select
              value={activeChart}
              onChange={(e) => setActiveChart(e.target.value as "revenue" | "profit" | "operatingProfit")}
              className="text-sm border border-border rounded px-2 sm:px-3 py-1.5 sm:py-2 pr-8 appearance-none bg-background focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto"
              style={{
                backgroundImage: 'url(\'data:image/svg+xml;utf8,<svg fill="black" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/><path d="M0 0h24v24H0z" fill="none"/></svg>\')',
                backgroundRepeat: "no-repeat",
                backgroundPosition: "calc(100% - 4px) center",
                backgroundSize: "16px",
                minWidth: "140px",
              }}
            >
              <option value="revenue">売上</option>
              <option value="profit">粗利益</option>
              <option value="operatingProfit">営業利益</option>
            </select>
          </div>

          {activeChart === "revenue" && (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={getDisplayData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis 
                  dataKey="month" 
                  stroke="#9CA3AF"
                  tick={{ fill: "#1E1F1F", fontSize: 14 }}
                />
                <YAxis
                  stroke="#9CA3AF"
                  tick={{ fill: "#1E1F1F", fontSize: 14 }}
                  domain={yAxisDomain} 
                  tickFormatter={(value) => {
                    const manyen = value / 10000;
                    if (manyen >= 10000) {
                      const oku = manyen / 10000;
                      return `${oku.toFixed(1)}億`;
                    }
                    return `${manyen.toLocaleString()}万`;
                  }}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${(value / 10000).toLocaleString()}万円`,
                    name === "target" ? "目標" : name === "actual" ? "実績" : name,
                  ]}
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0]) {
                      const data = payload[0].payload;
                      return `FY${selectedYear} ${data.year}年${label}`;
                    }
                    return `FY${selectedYear} ${label}`;
                  }}
                  labelStyle={{ color: "#1E1F1F", fontSize: 14 }}
                  contentStyle={{ fontSize: 14 }}
                />
                <Legend />
                <Bar dataKey="target" fill="#B3DBC0" name="目標" />
                <Bar dataKey="actual" fill="#13AE67" name="実績" />
              </BarChart>
            </ResponsiveContainer>
          )}

          {activeChart === "profit" && (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={getDisplayData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis 
                  dataKey="month" 
                  stroke="#9CA3AF"
                  tick={{ fill: "#1E1F1F", fontSize: 14 }}
                />
                <YAxis
                  stroke="#9CA3AF"
                  tick={{ fill: "#1E1F1F", fontSize: 14 }}
                  domain={yAxisDomain}
                  tickFormatter={(value) => {
                    const manyen = value / 10000;
                    if (manyen >= 10000) {
                      const oku = manyen / 10000;
                      return `${oku.toFixed(1)}億`;
                    }
                    return `${manyen.toLocaleString()}万`;
                  }}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${(value / 10000).toLocaleString()}万円`,
                    name === "profitTarget" ? "目標" : name === "profit" ? "実績" : name,
                  ]}
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0]) {
                      const data = payload[0].payload;
                      return `FY${selectedYear} ${data.year}年${label}`;
                    }
                    return `FY${selectedYear} ${label}`;
                  }}
                  labelStyle={{ color: "#1E1F1F", fontSize: 14 }}
                  contentStyle={{ fontSize: 14 }}
                />
                <Legend />
                <Bar dataKey="profitTarget" fill="#B3DBC0" name="目標" />
                <Bar dataKey="profit" fill="#13AE67" name="実績" />
              </BarChart>
            </ResponsiveContainer>
          )}

          {activeChart === "operatingProfit" && (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={getDisplayData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis 
                  dataKey="month" 
                  stroke="#9CA3AF"
                  tick={{ fill: "#1E1F1F", fontSize: 14 }}
                />
                <YAxis
                  stroke="#9CA3AF"
                  tick={{ fill: "#1E1F1F", fontSize: 14 }}
                  domain={yAxisDomain} 
                  tickFormatter={(value) => {
                    const manyen = value / 10000;
                    if (manyen >= 10000) {
                      const oku = manyen / 10000;
                      return `${oku.toFixed(1)}億`;
                    }
                    return `${manyen.toLocaleString()}万`;
                  }}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${(value / 10000).toLocaleString()}万円`,
                    name === "operatingProfitTarget" ? "目標" : name === "operatingProfit" ? "実績" : name,
                  ]}
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0]) {
                      const data = payload[0].payload;
                      return `FY${selectedYear} ${data.year}年${label}`;
                    }
                    return `FY${selectedYear} ${label}`;
                  }}
                  labelStyle={{ color: "#1E1F1F", fontSize: 14 }}
                  contentStyle={{ fontSize: 14 }}
                />
                <Legend />
                <Bar dataKey="operatingProfitTarget" fill="#B3DBC0" name="目標" />
                <Bar dataKey="operatingProfit" fill="#13AE67" name="実績" />
              </BarChart>
            </ResponsiveContainer>
          )}
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
            transitionDelay: '400ms'
          }}
        >
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <h3 className="text-base sm:text-lg font-semibold text-text">
                詳細比較表
              </h3>
              {canEdit && (
                <div className="text-xs text-text/70 leading-relaxed">
                  💡 空欄や数字部分は編集できます<br/>
                  💡 設定した数字は自動でグラフに反映されます
                </div>
              )}
            </div>
          </div>
          
          {Object.keys(pendingEdits).length > 0 && canEdit && (
            <div className="my-4 text-left">
              <button
                onClick={handleTableSave}
                className="btn-primary flex items-center space-x-2 text-sm sm:text-base px-4 py-2"
                style={{
                  borderRadius: '20px'
                }}
              >
                <Save className="h-4 w-4" />
                <span>変更を保存</span>
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
                  {getTableDisplayData().map((data) => (
                    <th
                      key={data.id}
                      className="text-right py-2 sm:py-3 px-1 sm:px-2 whitespace-nowrap font-medium text-xs sm:text-sm"
                      style={{
                        width: 'auto',
                        minWidth: '100px',
                        maxWidth: '120px'
                      }}
                    >
                      {data.month}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {detailedTableData.map((item) => (
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
                        renderEditableCell(
                          data,
                          item.targetField as EditableField
                        )
                      )}
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-2 sm:py-3 px-1 sm:px-2 font-medium whitespace-nowrap text-left text-xs sm:text-sm">
                        実績
                      </td>
                      {getTableDisplayData().map((data) =>
                        renderEditableCell(
                          data,
                          item.actualField as EditableField
                        )
                      )}
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-2 sm:py-3 px-1 sm:px-2 font-medium whitespace-nowrap text-left text-xs sm:text-sm">
                        達成率
                      </td>
                      {getTableDisplayData().map((data) =>
                        renderRateCellForTable(
                          data,
                          item.targetField as EditableField,
                          item.actualField as EditableField
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
            onClick={() => setMandalaUpdateDialog(prev => ({ ...prev, isOpen: false }))}
          />
          
          <div
            className="relative bg-white rounded-3xl shadow-xl mx-4 p-6"
            style={{
              width: '100%',
              maxWidth: '480px',
            }}
          >
            <h3
              style={{
                fontFamily: 'Inter',
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
                fontFamily: 'Inter',
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
                onClick={() => setMandalaUpdateDialog(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 py-3 rounded-full font-medium transition-all duration-300 hover:scale-105 hover:shadow-md"
                style={{
                  fontFamily: 'Inter',
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
                  fontFamily: 'Inter',
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
                  fontFamily: 'Inter',
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

export default MonthlyBudgetActual;