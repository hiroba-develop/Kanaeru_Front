import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import CenterGoalModal from "../components/CenterGoalModal";  
import GoalInputModal from "../components/GoalInputModal";
import AchievementPopup from "../components/AchievementPopup";
import level1Icon from "../assets/mandalaLevelIcon/level1.png";
import level2Icon from "../assets/mandalaLevelIcon/level2.png";
import level3Icon from "../assets/mandalaLevelIcon/level3.png";
import {type MandalaCell, type PlMetric} from "../utils/mandalaIntegration";
import { ArrowLeft } from "lucide-react";
import complate_icon from "../assets/complate_icon.png";
import heart_icon from "../assets/heart_icon.png";
import { useAuth } from "../contexts/AuthContext";
import { Service } from "../api/services/Service";
import { withErrorHandling } from "../utils/apiErrorHandler";
import type { SaleSchema } from "../api/models/SaleSchema";
import type { GrossProfitSchema } from "../api/models/GrossProfitSchema";
import type { OperatingProfitSchema } from "../api/models/OperatingProfitSchema";
type GoalType = 'qualitative' | 'revenue' | 'grossProfit' | 'operatingProfit';

type MultiRingProgressProps = {
  totalRings: number;
  filledRings: number;
  isCompleted: boolean;
  size?: number;
  offsetY?: number;
};

type LargeRingProgressProps = {
  ringRatios: number[];
  size?: number;
  offsetY?: number;
};

const formatTitleWithLineBreaks = (title: string, chunkSize = 7): string => {
  if (!title) return "";
  const chars = Array.from(title);
  const chunks: string[] = [];
  for (let i = 0; i < chars.length; i += chunkSize) {
    chunks.push(chars.slice(i, i + chunkSize).join(""));
  }
  return chunks.join("<br>");
};

const LargeRingProgress: React.FC<LargeRingProgressProps> = ({
  ringRatios,
  size = 190,
  offsetY = 0,
}) => {
  const [ringSize, setRingSize] = useState(size);
  
  useEffect(() => {
    const updateSize = () => {
      if (window.innerWidth < 768) {
        const padding = 32;
        const gap = Math.max(4, Math.min(window.innerWidth * 0.02, 16));
        const cellWidth = (window.innerWidth - padding - gap * 2) / 3;
        const cellPadding = Math.max(8, Math.min(window.innerWidth * 0.02, 16));
        setRingSize((cellWidth - cellPadding * 2) * 0.85);
      } else {
        setRingSize(size);
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [size]);

  const strokeWidth = window.innerWidth < 768 ? 2 : 3;
  const gap = window.innerWidth < 768 ? 0.5 : 1.0;
  const cx = ringSize / 2;
  const cy = ringSize / 2;

  const circles: React.ReactNode[] = [];

  const minRadius = ringSize * 0.29;
  const maxRadius = ringSize / 2 - strokeWidth / 2 - (window.innerWidth < 768 ? 3 : 5);
  const radiusDecrement = strokeWidth + gap;

  ringRatios.forEach((ratio, index) => {
    if (ratio <= 0) return;

    const radius = maxRadius - index * radiusDecrement;
    if (radius < minRadius) return;

    const circumference = 2 * Math.PI * radius;
    const dashArray = circumference;
    const dashOffset = -circumference * (1 - ratio);

    circles.push(
      <circle
        key={index}
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke="#d9f2e7"
        strokeWidth={strokeWidth}
        strokeDasharray={dashArray}
        strokeDashoffset={dashOffset}
        transform={`rotate(-90 ${cx} ${cy})`}
        strokeLinecap="round"
      />
    );
  });

  return (
    <svg
      width={ringSize}
      height={ringSize}
      className="absolute pointer-events-none z-10"
      style={{
        top: '50%',
        left: '50%',
        transform: `translate(-50%, calc(-50% + ${offsetY}px))`
      }}
    >
      {circles}
    </svg>
  );
};

const MultiRingProgress: React.FC<MultiRingProgressProps> = ({
  totalRings,
  filledRings,
  size = 120,
  offsetY = 0,
}) => {
  const [ringSize, setRingSize] = useState(size);
  
  useEffect(() => {
    const updateSize = () => {
      if (window.innerWidth < 768) {
        const padding = 32;
        const gap = Math.max(4, Math.min(window.innerWidth * 0.02, 16));
        const cellWidth = (window.innerWidth - padding - gap * 2) / 3;
        const cellPadding = Math.max(8, Math.min(window.innerWidth * 0.02, 16));
        setRingSize((cellWidth - cellPadding * 2) * 0.85);
      } else {
        setRingSize(size);
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [size]);

  const strokeWidth = window.innerWidth < 768 ? 2 : 3;
  const cx = ringSize / 2;
  const cy = ringSize / 2;
  const radius = ringSize / 2 - strokeWidth / 2 - (window.innerWidth < 768 ? 3 : 5);

  const ratio = totalRings > 0 ? filledRings / totalRings : 0;
  
  const circumference = 2 * Math.PI * radius;
  const dashArray = circumference;
  const dashOffset = -circumference * (1 - ratio);

  return (
    <svg
      width={ringSize}
      height={ringSize}
      className="absolute pointer-events-none"
      style={{
        top: '50%',
        left: '50%',
        transform: `translate(-50%, calc(-50% + ${offsetY}px))`
      }}
    >
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke="#d9f2e7"
        strokeWidth={strokeWidth}
        strokeDasharray={dashArray}
        strokeDashoffset={dashOffset}
        transform={`rotate(-90 ${cx} ${cy})`}
        strokeLinecap="round"
      />
    </svg>
  );
};

interface MandalaCellFrameProps {
  status: "not_started" | "in_progress" | "achieved";
  visualStatus?: "not_started" | "in_progress" | "achieved";
  children: React.ReactNode;
  isHoverable?: boolean;
}

const MandalaCellFrame: React.FC<MandalaCellFrameProps> = ({
  children,
  isHoverable = false,
}) => {

  const base =
    "aspect-square flex flex-col transition-all relative";

  const hoverClass = isHoverable
    ? "hover:shadow-lg"
    : "";

  return (
    <div 
      className={`${base} ${hoverClass}`}
      style={{
        width: '100%',
        height: '100%',
        padding: 'clamp(6px, 1.5vw, 16px)',
        borderRadius: 'clamp(10px, 3vw, 20px)',
        boxShadow: '0px 4px 12px 0px rgba(72, 82, 84, 0.1)',
        border: 'none',
        background: '#FFFFFF'
      }}
    >
      <div className="relative z-10 h-full flex flex-col">{children}</div>
    </div>
  );
};

interface MandalaSubChart {
  centerId: string;
  centerTitle: string;
  cells: MandalaCell[];
}

// MandalaChart コンポーネントの外側（ファイルの上部）に移動
interface LevelIndicatorProps {
  level: ViewLevel;
}

const LevelIndicator: React.FC<LevelIndicatorProps> = React.memo(({ level }) => {
  const getLevelIcon = () => {
    switch (level) {
      case "large":
        return level1Icon;
      case "middle":
        return level2Icon;
      case "small":
        return level3Icon;
      default:
        return level1Icon;
    }
  };

  return (
    <div 
      style={{ 
        width: '34px',
        height: '32px',
        opacity: 1,
        flexShrink: 0
      }}
    >
      <img 
        src={getLevelIcon()} 
        alt={`${level} level`}
        className="w-full h-full object-contain"
      />
    </div>
  );
});

LevelIndicator.displayName = 'LevelIndicator';

type ViewLevel = "large" | "middle" | "small";

const MandalaChart: React.FC = () => {
  const { selectedUser, userSetup, loadUserSetup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [viewLevel, setViewLevel] = useState<ViewLevel>("large");
  const [selectedLargeCellId, setSelectedLargeCellId] = useState<string | null>(null);
  const [selectedMiddleCellId, setSelectedMiddleCellId] = useState<string | null>(null);
  const [hoveredCellId, setHoveredCellId] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false); // アニメーション用

  const [savedSmallCharts, setSavedSmallCharts] = useState<{[key: string]: MandalaSubChart}>({});

  const [goalInputModal, setGoalInputModal] = useState<{
    isOpen: boolean;
    cellId: string;
    cellType: 'center' | 'large' | 'middle' | 'small';
    currentValue: string;
    currentGoalType: GoalType | null;
  }>({
    isOpen: false,
    cellId: '',
    cellType: 'center',
    currentValue: '',
    currentGoalType: null
  });

  const [centerStartDate, setCenterStartDate] = useState("");

  const [centerGoalModalOpen, setCenterGoalModalOpen] = useState(false);

  const [centerGoal, setCenterGoal] = useState("");


  const currentChartIdRef = useRef<string | null>(null);

  const [largeCells, setLargeCells] = useState<MandalaCell[]>(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      id: `large_${i + 1}`,
      title: "",
      achievement: 0,
      status: "not_started" as const,
      largeGoalId: undefined,
    }));
  });

  const [middleCharts, setMiddleCharts] = useState<{
    [key: string]: MandalaSubChart;
  }>(() => {
    const charts: { [key: string]: MandalaSubChart } = {};
    largeCells.forEach((cell) => {
      charts[cell.id] = {
        centerId: cell.id,
        centerTitle: cell.title,
        cells: Array.from({ length: 8 }, (_, i) => ({
          id: `${cell.id}_middle_${i + 1}`,
          title: "",
          achievement: 0,
          status: "not_started" as const,
        })),
      };
    });
    return charts;
  });

  const [smallCharts, setSmallCharts] = useState<{
    [key: string]: MandalaSubChart;
  }>(() => {
    const charts: { [key: string]: MandalaSubChart } = {};
    Object.values(middleCharts).forEach((middleChart) => {
      middleChart.cells.forEach((cell) => {
        charts[cell.id] = {
          centerId: cell.id,
          centerTitle: cell.title,
          cells: Array.from({ length: 10 }, (_, i) => ({
            id: `${cell.id}_small_${i + 1}`,
            title: "",
            achievement: 0,
            status: "not_started" as const,
            isChecked: false,
          })),
        };
      });
    });
    return charts;
  });

  const [achievementPopup, setAchievementPopup] = useState<{
    isOpen: boolean;
    goalTitle: string;
    level: "large" | "middle" | "small";
  }>({
    isOpen: false,
    goalTitle: "",
    level: "small",
  });

  const [plConflictDialog, setPlConflictDialog] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
  }>({
    isOpen: false,
    message: '',
    onConfirm: () => {},
    onCancel: () => {}
  });

  // ユーザー切り替え時に状態をリセット
  useEffect(() => {
    // viewLevelとナビゲーション状態をリセット
    setViewLevel("large");
    setSelectedLargeCellId(null);
    setSelectedMiddleCellId(null);
    setHoveredCellId(null);
    
    // 中心目標をリセット
    setCenterGoal("");
    setCenterStartDate("");
    currentChartIdRef.current = null;
    
    // 大目標を初期化
    setLargeCells(Array.from({ length: 8 }, (_, i) => ({
      id: `large_${i + 1}`,
      title: "",
      achievement: 0,
      status: "not_started" as const,
      largeGoalId: undefined,
    })));
    
    // 中目標を初期化
    const newMiddleCharts: { [key: string]: MandalaSubChart } = {};
    Array.from({ length: 8 }, (_, i) => {
      const cellId = `large_${i + 1}`;
      newMiddleCharts[cellId] = {
        centerId: cellId,
        centerTitle: "",
        cells: Array.from({ length: 8 }, (_, j) => ({
          id: `${cellId}_middle_${j + 1}`,
          title: "",
          achievement: 0,
          status: "not_started" as const,
        })),
      };
    });
    setMiddleCharts(newMiddleCharts);
    
    // 小目標を初期化
    const newSmallCharts: { [key: string]: MandalaSubChart } = {};
    Object.values(newMiddleCharts).forEach((middleChart) => {
      middleChart.cells.forEach((cell) => {
        newSmallCharts[cell.id] = {
          centerId: cell.id,
          centerTitle: "",
          cells: Array.from({ length: 10 }, (_, i) => ({
            id: `${cell.id}_small_${i + 1}`,
            title: "",
            achievement: 0,
            status: "not_started" as const,
            isChecked: false,
          })),
        };
      });
    });
    setSmallCharts(newSmallCharts);
    setSavedSmallCharts(newSmallCharts);
    
    // activePlGoalsをリセット
    setActivePlGoals({});
    
    // アニメーション状態をリセット
    setIsVisible(false);
    setTimeout(() => {
      setIsVisible(true);
    }, 100);
    
  }, [selectedUser?.id]); 


  // アニメーション制御
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const [activePlGoals, setActivePlGoals] = useState<{
    [key: string]: {
      cellId: string;
      cellType: 'large' | 'middle';
      amount: number;
    }
  }>({});

  // viewLevelが変わったときにアニメーションをリセット
  useEffect(() => {
    // URL変更による復元の場合はアニメーションをスキップ
    const params = new URLSearchParams(location.search);
    const urlLevel = params.get('level');
    
    if (urlLevel === viewLevel) {
      // URLから復元された場合はアニメーションなし
      setIsVisible(true);
      return;
    }
    
    // ユーザー操作による遷移の場合はアニメーション実行
    setIsVisible(false);
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 50);
    return () => clearTimeout(timer);
  }, [viewLevel, location.search]);

  const updateSavedState = useCallback(() => {
    setSavedSmallCharts(JSON.parse(JSON.stringify(smallCharts)));
  }, [smallCharts]);

  useEffect(() => {
    setSavedSmallCharts(JSON.parse(JSON.stringify(smallCharts)));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleGoalUpdate = () => {
      updateSavedState();
    };

    window.addEventListener('mandalaGoalUpdated', handleGoalUpdate);

    return () => {
      window.removeEventListener('mandalaGoalUpdated', handleGoalUpdate);
    };
  }, [updateSavedState]);

  useEffect(() => {
    largeCells.forEach((cell) => {
      const element = document.querySelector(`[data-cell-id="${cell.id}"]`);
      if (element && cell.title) {
        element.innerHTML = formatTitleWithLineBreaks(cell.title);
      }
    });
  }, [largeCells]);

  // マンダラチャートデータをAPIから取得
  useEffect(() => {
    const fetchMandalaCharts = async () => {
      if (!selectedUser?.id) {
        return;
      }

      try {
        const response = await Service.getApiMandalaCharts(selectedUser.id);
        
        if (response.responseStatus === 1 && response.charts) {
          // アクティブなチャートを取得
          const activeChart = response.charts.find(chart => chart.is_active === true);
          
          if (activeChart) {
            // CHART_IDを保持
            if (activeChart.chart_id) {
              currentChartIdRef.current = activeChart.chart_id;
            }
            
            if (activeChart.main_goal) {
              // メイン目標のデータを画面に反映
              if (activeChart.main_goal.goal_title) {
                setCenterGoal(activeChart.main_goal.goal_title);
              }
            }
            
            if (activeChart.start_year_month) {
              setCenterStartDate(activeChart.start_year_month);
            }
            
            // 大目標のデータを画面に反映
            if (activeChart.large_goals && activeChart.large_goals.length > 0) {
              
              // goal_typeをplMetricに変換する関数
              const convertGoalTypeToPlMetric = (goalType?: number): PlMetric | undefined => {
                switch (goalType) {
                  case 2:
                    return 'revenue';
                  case 3:
                    return 'grossProfit';
                  case 4:
                    return 'operatingProfit';
                  default:
                    return undefined;
                }
              };
              
              // large_goalsをpositionでソート
              const sortedLargeGoals = [...activeChart.large_goals].sort((a, b) => {
                // positionが含まれている場合はそれを使用、ない場合はlarge_goal_idでソート
                const posA = (a as any).position || 0;
                const posB = (b as any).position || 0;
                return posA - posB;
              });
              
              // largeCellsを更新
              setLargeCells((prev) => {
                const updated = prev.map((cell, index) => {
                  // positionは1-8、indexは0-7なので、position = index + 1
                  const position = index + 1;
                  const largeGoal = sortedLargeGoals.find((lg: any) => lg.position === position);
                  
                  if (largeGoal) {
                    // ★★★ ここに追加 ★★★
                    // middle_goals_progressを8個の配列に変換
                    const middleProgressArray = new Array(8).fill(0);
                    if (largeGoal.middle_goals_progress && Array.isArray(largeGoal.middle_goals_progress)) {
                      largeGoal.middle_goals_progress.forEach((mg: any) => {
                        if (mg.position >= 1 && mg.position <= 8) {
                          middleProgressArray[mg.position - 1] = mg.progress || 0;
                        }
                      });
                    }
                    
                    return {
                      ...cell,
                      title: largeGoal.goal_title || '',
                      largeGoalId: largeGoal.large_goal_id,
                      plMetric: convertGoalTypeToPlMetric(largeGoal.goal_type),
                      middleGoalsProgress: middleProgressArray, // ★★★ この行を追加 ★★★
                    };
                  }
                  return cell;
                });
                return updated;
              });
            }
          }
        }
      } catch (error) {
        console.error('マンダラチャート取得API呼び出しエラー:', error);
      }
    };

    fetchMandalaCharts();
  }, [selectedUser?.id, location.pathname]); // location.pathnameを依存配列に追加
  
  useEffect(() => {
    if (selectedUser?.id && !userSetup) {
      loadUserSetup();
    }
  }, [selectedUser?.id, userSetup, loadUserSetup]);

  useEffect(() => {
    const charts: { [key: string]: MandalaSubChart } = {};
    let hasChanges = false;
    
    Object.values(middleCharts).forEach((middleChart) => {
      middleChart.cells.forEach((cell) => {
        if (!smallCharts[cell.id]) {
          charts[cell.id] = {
            centerId: cell.id,
            centerTitle: cell.title,
            cells: Array.from({ length: 10 }, (_, i) => ({
              id: `${cell.id}_small_${i + 1}`,
              title: "",
              achievement: 0,
              status: "not_started" as const,
              isChecked: false,
            })),
          };
          hasChanges = true;
        } else {
          charts[cell.id] = {
            ...smallCharts[cell.id],
            centerTitle: cell.title,
          };
        }
      });
    });
    
    if (hasChanges) {
      setSmallCharts(charts);
    }
  }, [middleCharts]);

  // URLのクエリパラメータからviewLevelを復元
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const level = params.get('level') as ViewLevel | null;
    const largeId = params.get('largeId');
    const middleId = params.get('middleId');

    if (level && ['large', 'middle', 'small'].includes(level)) {
      setViewLevel(level);
      if (largeId) setSelectedLargeCellId(largeId);
      if (middleId) setSelectedMiddleCellId(middleId);
    }
  }, [location.search]);

  // viewLevelが変わったときにURLを更新
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('level', viewLevel);
    
    if (selectedLargeCellId) {
      params.set('largeId', selectedLargeCellId);
    }
    if (selectedMiddleCellId) {
      params.set('middleId', selectedMiddleCellId);
    }

    const newSearch = `?${params.toString()}`;
    if (location.search !== newSearch) {
      navigate(`${location.pathname}${newSearch}`, { replace: false });
    }
  }, [viewLevel, selectedLargeCellId, selectedMiddleCellId]);

  const getCellStatus = (achievement: number): MandalaCell["status"] => {
    if (achievement >= 100) return "achieved";
    if (achievement > 0) return "in_progress";
    return "not_started";
  };

  // ★ 追加: 大目標が完全に達成されているかチェック
  const isLargeGoalFullyCompleted = (largeCellId: string): boolean => {
    const largeCell = largeCells.find(c => c.id === largeCellId);
    
    // middleGoalsProgressが存在する場合
    if (largeCell?.middleGoalsProgress && largeCell.middleGoalsProgress.length === 8) {
      return largeCell.middleGoalsProgress.every(progress => progress >= 100);
    }
    
    // フォールバック: middleChartsから判定
    const middleChart = middleCharts[largeCellId];
    if (!middleChart) {
      return false;
    }
    
    // 8個すべての中目標が100%達成されているかチェック
    return middleChart.cells.every(cell => cell.achievement >= 100);
  };

  const handleLargeCellClick = async (cellId: string) => {
    setSelectedLargeCellId(cellId);
    setViewLevel("middle");

    // 選択された大目標のlargeGoalIdを取得
    const largeCell = largeCells.find((c) => c.id === cellId);
    const largeGoalId = largeCell?.largeGoalId;

    if (!largeGoalId) {
      return;
    }

    try {
      const response = await Service.getApiMiddleGoals(largeGoalId);

      if (response.responseStatus === 1 && response.middle_goals) {

        // goal_typeをplMetricに変換する関数
        const convertGoalTypeToPlMetric = (goalType?: number): PlMetric | undefined => {
          switch (goalType) {
            case 2:
              return 'revenue';
            case 3:
              return 'grossProfit';
            case 4:
              return 'operatingProfit';
            default:
              return undefined;
          }
        };

        // progressをachievementに変換し、statusを決定する関数
        const getStatusFromProgress = (progress?: number): MandalaCell["status"] => {
          if (progress === undefined || progress === null) return "not_started";
          if (progress >= 100) return "achieved";
          if (progress > 0) return "in_progress";
          return "not_started";
        };

        // middle_goalsをpositionでソート
        const sortedMiddleGoals = [...response.middle_goals].sort((a, b) => {
          const posA = a.position || 0;
          const posB = b.position || 0;
          return posA - posB;
        });

        // middleChartsを更新
        setMiddleCharts((prev) => {
          const updated = { ...prev };
          const middleChart = updated[cellId];

          if (!middleChart) {
            return prev;
          }

          // 既存のcellsを初期化（8個の空セル）
          const newCells: MandalaCell[] = Array.from({ length: 8 }, (_, i) => ({
            id: `${cellId}_middle_${i + 1}`,
            title: "",
            achievement: 0,
            status: "not_started" as const,
          }));

          // APIから取得したデータをpositionに基づいてセット
          sortedMiddleGoals.forEach((middleGoal) => {
            const position = middleGoal.position;
            if (position && position >= 1 && position <= 8) {
              const index = position - 1; // positionは1-8、indexは0-7
              newCells[index] = {
                id: `${cellId}_middle_${position}`,
                title: middleGoal.goal_title || '',
                achievement: Math.round(middleGoal.progress || 0),
                status: getStatusFromProgress(middleGoal.progress),
                plMetric: convertGoalTypeToPlMetric(middleGoal.goal_type),
                middleGoalId: middleGoal.middle_goal_id,
              };
            }
          });

          updated[cellId] = {
            ...middleChart,
            cells: newCells,
          };

          return updated;
        });

      } else {
        console.error('中目標データの取得に失敗しました:', response);
      }
    } catch (error) {
    }
  };

  const handleMiddleCellClick = async (cellId: string) => {
    setSelectedMiddleCellId(cellId);
    setViewLevel("small");

    // 選択された中目標のmiddleGoalIdを取得
    if (!selectedLargeCellId || !middleCharts[selectedLargeCellId]) {
       return;
    }

    const middleChart = middleCharts[selectedLargeCellId];
    const middleCell = middleChart.cells.find((c) => c.id === cellId);
    const middleGoalId = middleCell?.middleGoalId;

    if (!middleGoalId) {
      return;
    }

    try {
      const response = await Service.getApiSmallGoals(middleGoalId);

      if (response.responseStatus === 1 && response.small_goals) {

        // small_goalsをpositionでソート
        const sortedSmallGoals = [...response.small_goals].sort((a, b) => {
          const posA = a.position || 0;
          const posB = b.position || 0;
          return posA - posB;
        });

        // smallChartsを更新
        setSmallCharts((prev) => {
          const updated = { ...prev };
          const smallChart = updated[cellId];

          if (!smallChart) {
            return prev;
          }

          // 既存のcellsを初期化（10個の空セル）
          const newCells: MandalaCell[] = Array.from({ length: 10 }, (_, i) => ({
            id: `${cellId}_small_${i + 1}`,
            title: "",
            achievement: 0,
            status: "not_started" as const,
            isChecked: false,
          }));

          // APIから取得したデータをpositionに基づいてセット
          sortedSmallGoals.forEach((smallGoal) => {
            const position = smallGoal.position;
            if (position && position >= 1 && position <= 10) {
              const index = position - 1; // positionは1-10、indexは0-9
              const isCompleted = smallGoal.is_completed || false;
              const achievement = isCompleted ? 100 : 0;
              const status: MandalaCell["status"] = isCompleted ? "achieved" : "not_started";

              newCells[index] = {
                id: `${cellId}_small_${position}`,
                title: smallGoal.goal_title || '',
                achievement: achievement,
                status: status,
                isChecked: isCompleted,
                smallGoalId: smallGoal.small_goal_id,
              };
            }
          });

          updated[cellId] = {
            ...smallChart,
            cells: newCells,
          };

          return updated;
        });
        // ★ここを追加：APIから取得したデータをsavedSmallChartsにも反映
        setSmallCharts((current) => {
          setSavedSmallCharts(JSON.parse(JSON.stringify(current)));
          return current;
        });

      } else {
        console.error('小目標データの取得に失敗しました:', response);
      }
    } catch (error) {
    }
  };

  const handleBackToLarge = async () => {
    setViewLevel("large");
    setSelectedLargeCellId(null);
    setSelectedMiddleCellId(null);
  
    // 大目標の最新データを再取得
    if (!selectedUser || !selectedUser.id) {
      return;
    }
  
    try {
      const response = await Service.getApiMandalaCharts(selectedUser.id);
      
      if (response.responseStatus === 1 && response.charts) {
        const activeChart = response.charts.find(chart => chart.is_active === true);
        
        if (activeChart && activeChart.large_goals) {
          
          // goal_typeをplMetricに変換する関数
          const convertGoalTypeToPlMetric = (goalType?: number): PlMetric | undefined => {
            switch (goalType) {
              case 2:
                return 'revenue';
              case 3:
                return 'grossProfit';
              case 4:
                return 'operatingProfit';
              default:
                return undefined;
            }
          };
          
          const sortedLargeGoals = [...activeChart.large_goals].sort((a, b) => {
            const posA = (a as any).position || 0;
            const posB = (b as any).position || 0;
            return posA - posB;
          });
          
          // largeCellsを更新
          setLargeCells((prev) => {
            const updated = prev.map((cell, index) => {
              const position = index + 1;
              const largeGoal = sortedLargeGoals.find((lg: any) => lg.position === position);
              
              if (largeGoal) {
                // ★ middle_goals_progressを8個の配列に変換
                const middleProgressArray = new Array(8).fill(0);
                if (largeGoal.middle_goals_progress && Array.isArray(largeGoal.middle_goals_progress)) {
                  largeGoal.middle_goals_progress.forEach((mg: any) => {
                    if (mg.position >= 1 && mg.position <= 8) {
                      middleProgressArray[mg.position - 1] = mg.progress || 0;
                    }
                  });
                }
                
                return {
                  ...cell,
                  title: largeGoal.goal_title || '',
                  largeGoalId: largeGoal.large_goal_id,
                  plMetric: convertGoalTypeToPlMetric(largeGoal.goal_type),
                  middleGoalsProgress: middleProgressArray, // ★ 追加
                };
              }
              return cell;
            });
            return updated;
          });
        }
      }
    } catch (error) {
      console.error('マンダラチャート取得API呼び出しエラー（戻る時）:', error);
    }
  };

  const handleBackToMiddle = async () => {
    setViewLevel("middle");
    setSelectedMiddleCellId(null);
  
    // 中目標の最新データを再取得
    if (!selectedLargeCellId) {
      return;
    }
  
    const largeCell = largeCells.find((c) => c.id === selectedLargeCellId);
    const largeGoalId = largeCell?.largeGoalId;
  
    if (!largeGoalId) {
      return;
    }
  
    try {
      const response = await Service.getApiMiddleGoals(largeGoalId);
  
      if (response.responseStatus === 1 && response.middle_goals) {
        
        // goal_typeをplMetricに変換する関数
        const convertGoalTypeToPlMetric = (goalType?: number): PlMetric | undefined => {
          switch (goalType) {
            case 2:
              return 'revenue';
            case 3:
              return 'grossProfit';
            case 4:
              return 'operatingProfit';
            default:
              return undefined;
          }
        };
  
        // progressをachievementに変換し、statusを決定する関数
        const getStatusFromProgress = (progress?: number): MandalaCell["status"] => {
          if (progress === undefined || progress === null) return "not_started";
          if (progress >= 100) return "achieved";
          if (progress > 0) return "in_progress";
          return "not_started";
        };
  
        // middle_goalsをpositionでソート
        const sortedMiddleGoals = [...response.middle_goals].sort((a, b) => {
          const posA = a.position || 0;
          const posB = b.position || 0;
          return posA - posB;
        });
  
        // middleChartsを更新
        setMiddleCharts((prev) => {
          const updated = { ...prev };
          const middleChart = updated[selectedLargeCellId];
  
          if (!middleChart) {
            console.error('middleChartが見つかりません:', selectedLargeCellId);
            return prev;
          }
  
          // 既存のcellsを初期化（8個の空セル）
          const newCells: MandalaCell[] = Array.from({ length: 8 }, (_, i) => ({
            id: `${selectedLargeCellId}_middle_${i + 1}`,
            title: "",
            achievement: 0,
            status: "not_started" as const,
          }));
  
          // APIから取得したデータをpositionに基づいてセット
          sortedMiddleGoals.forEach((middleGoal) => {
            const position = middleGoal.position;
            if (position && position >= 1 && position <= 8) {
              const index = position - 1; // positionは1-8、indexは0-7
              newCells[index] = {
                id: `${selectedLargeCellId}_middle_${position}`,
                title: middleGoal.goal_title || '',
                achievement: Math.round(middleGoal.progress || 0),
                status: getStatusFromProgress(middleGoal.progress),
                plMetric: convertGoalTypeToPlMetric(middleGoal.goal_type),
                middleGoalId: middleGoal.middle_goal_id,
              };
            }
          });
  
          updated[selectedLargeCellId] = {
            ...middleChart,
            cells: newCells,
          };
  
          return updated;
        });
  
      } else {
        console.error('中目標データの再取得に失敗しました:', response);
      }
    } catch (error) {
      console.error('中目標一覧取得API呼び出しエラー（戻る時）:', error);
    }
  };
  
  const convertPlMetricToGoalType = (plMetric: PlMetric): GoalType | null => {
    switch (plMetric) {
      case 'revenue':
        return 'revenue';
      case 'grossProfit':
        return 'grossProfit';
      case 'operatingProfit':
        return 'operatingProfit';
      case 'netWorth':
        // netWorthはGoalTypeには存在しないため、nullを返す
        return null;
      default:
        return null;
    }
  };


  const openGoalInputModal = (
    cellId: string, 
    cellType: 'center' | 'large' | 'middle' | 'small', 
    currentValue: string
  ) => {
    let currentGoalType: GoalType | null = null;
  
    if (cellType === 'large') {
      const cell = largeCells.find(c => c.id === cellId);
      if (cell?.plMetric) {
        currentGoalType = convertPlMetricToGoalType(cell.plMetric);
      } else if (currentValue && !cell?.plMetric) {
        // ★ 追加: plMetricがない場合は定性目標
        currentGoalType = 'qualitative';
      }
    } else if (cellType === 'middle' && selectedLargeCellId) {
      const chart = middleCharts[selectedLargeCellId];
      const cell = chart?.cells.find(c => c.id === cellId);
      if (cell?.plMetric) {
        currentGoalType = convertPlMetricToGoalType(cell.plMetric);
      } else if (currentValue && !cell?.plMetric) {
        // ★ 追加: plMetricがない場合は定性目標
        currentGoalType = 'qualitative';
      }
    }
  
    setGoalInputModal({
      isOpen: true,
      cellId,
      cellType,
      currentValue,
      currentGoalType
    });
  };

  // 大項目の位置を計算する関数
  const getLargePosition = (cellId: string): number => {
    // large_1 → position 1, large_2 → position 2, ..., large_8 → position 8
    const match = cellId.match(/large_(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
    return 1;
  };

  // 中項目の位置を計算する関数
  // gridOrder: [0, 1, 2, 3, null, 4, 5, 6, 7]
  // 上段の左から1～3、中段の左が4、中心はメイン目標なので対象外、右側が5、下段の左から6～8
  const getMiddlePosition = (cellId: string): number => {
    // cellIdの形式: ${largeCellId}_middle_${index + 1}
    // 例: large_1_middle_1 → index 0 → position 1
    const match = cellId.match(/_middle_(\d+)/);
    if (match) {
      const index = parseInt(match[1], 10) - 1; // 1-based to 0-based
      // gridOrderのインデックスからpositionへのマッピング
      // [0, 1, 2, 3, null, 4, 5, 6, 7] → [1, 2, 3, 4, 5, 6, 7, 8]
      const positionMap = [1, 2, 3, 4, 5, 6, 7, 8];
      if (index >= 0 && index < positionMap.length) {
        return positionMap[index];
      }
    }
    return 1;
  };

  // 小項目の位置を計算する関数
  // 小目標は上から1～10で登録
  const getSmallPosition = (cellId: string): number => {
    // cellIdの形式: ${middleCellId}_small_${index + 1}
    // 例: large_1_middle_1_small_1 → index 0 → position 1
    const match = cellId.match(/_small_(\d+)/);
    if (match) {
      const index = parseInt(match[1], 10); // 1-based
      if (index >= 1 && index <= 10) {
        return index;
      }
    }
    return 1;
  };

  // goal_typeを数値に変換する関数
  const convertGoalTypeToNumber = (goalType: 'qualitative' | 'revenue' | 'grossProfit' | 'operatingProfit'): number => {
    switch (goalType) {
      case 'qualitative':
        return 1;
      case 'revenue':
        return 2;
      case 'grossProfit':
        return 3;
      case 'operatingProfit':
        return 4;
      default:
        return 1;
    }
  };


  // 年次PLの金額を更新する関数
  const updateYearlyPL = async (
    goalType: 'revenue' | 'grossProfit' | 'operatingProfit',
    targetYear: number,
    targetAmount: number
  ) => {
    if (!selectedUser || !selectedUser.id) {
      console.error('ユーザーIDが取得できませんでした');
      return;
    }

    try {
      // userSetupが読み込まれていない場合は読み込む
      let currentUserSetup = userSetup;
      if (!currentUserSetup) {
        await loadUserSetup();
        // loadUserSetup後、userSetupが更新されるまで少し待つ
        await new Promise(resolve => setTimeout(resolve, 100));
        // 再度userSetupを取得
        const { Service } = await import("../api/services/Service");
        const { withErrorHandling: withErrorHandlingForSetup } = await import("../utils/apiErrorHandler");
        const setupResponse = await withErrorHandlingForSetup(() => 
          Service.getApiSettingUser(selectedUser!.id)
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
      const dataYear = targetYear;
      const dataMonth = fiscalYearStartMonth;

      // 既存の年次PLデータを取得して実績値を保持
      const yearlyResponse = await withErrorHandling(() =>
        Service.getApiYearlyBudgetActual(selectedUser.id)
      );

      let existingActual = 0;

      if (goalType === 'revenue') {
        // 売上項目を更新
        if (yearlyResponse.saleSchema) {
          const existingSale = yearlyResponse.saleSchema.find(s => s.year === targetYear);
          existingActual = existingSale?.saleResult || 0;
        }

        const saleSchema: SaleSchema = {
          userId: selectedUser.id,
          year: dataYear,
          month: dataMonth,
          saleTarget: targetAmount,
          saleResult: existingActual,
        };

        const response = await withErrorHandling(() => Service.putApiSaleUpdate(saleSchema));
        if (response.responseStatus === 1) {
        } else {
          console.error(`売上年次PLの更新に失敗しました（FY${targetYear}）`);
        }
      } else if (goalType === 'grossProfit') {
        // 粗利益項目を更新
        if (yearlyResponse.grossProfitSchema) {
          const existingGrossProfit = yearlyResponse.grossProfitSchema.find(g => g.year === targetYear);
          existingActual = existingGrossProfit?.grossProfitResult || 0;
        }

        const grossProfitSchema: GrossProfitSchema = {
          userId: selectedUser.id,
          year: dataYear,
          month: dataMonth,
          grossProfitTarget: targetAmount,
          grossProfitResult: existingActual,
        };

        const response = await withErrorHandling(() => Service.putApiGrossProfitUpdate(grossProfitSchema));
        if (response.responseStatus === 1) {
        } else {
          console.error(`粗利益年次PLの更新に失敗しました（FY${targetYear}）`);
        }
      } else if (goalType === 'operatingProfit') {
        // 営業利益項目を更新
        if (yearlyResponse.operatingProfitSchema) {
          const existingOperatingProfit = yearlyResponse.operatingProfitSchema.find(o => o.year === targetYear);
          existingActual = existingOperatingProfit?.operatingProfitResult || 0;
        }

        const operatingProfitSchema: OperatingProfitSchema = {
          userId: selectedUser.id,
          year: dataYear,
          month: dataMonth,
          operatingProfitTarget: targetAmount,
          operatingProfitResult: existingActual,
        };

        const response = await withErrorHandling(() => Service.putApiOperatingProfitUpdate(operatingProfitSchema));
        if (response.responseStatus === 1) {
        } else {
          console.error(`営業利益年次PLの更新に失敗しました（FY${targetYear}）`);
        }
      }
    } catch (error) {
      console.error('年次PL更新エラー:', error);
    }
  };


  // handleGoalSubmitの前に追加

  const saveGoalWithPlUpdate = async (
    cellId: string,
    cellType: 'center' | 'large' | 'middle' | 'small',
    goal: string,
    goalType: 'revenue' | 'grossProfit' | 'operatingProfit',
    finalTargetYear: number,
    finalTargetAmount: number,
    targetYearIndex?: number, 
    amountInManYen?: number 
  ) => {
    if (cellType === 'large') {
      await saveLargeGoal(cellId, goal, goalType, finalTargetYear, finalTargetAmount, true);
    } else if (cellType === 'middle' && selectedLargeCellId) {
      await saveMiddleGoal(cellId, selectedLargeCellId, goal, goalType, finalTargetYear, finalTargetAmount, true);
    }
  };

  const saveGoalWithoutPlUpdate = async (
    cellId: string,
    cellType: 'center' | 'large' | 'middle' | 'small',
    goal: string,
    goalType: 'revenue' | 'grossProfit' | 'operatingProfit',
    finalTargetYear: number,
    finalTargetAmount: number,
    targetYearIndex?: number,
    amountInManYen?: number
  ) => {
    if (cellType === 'large') {
      await saveLargeGoal(cellId, goal, goalType, finalTargetYear, finalTargetAmount, false);
    } else if (cellType === 'middle' && selectedLargeCellId) {
      await saveMiddleGoal(cellId, selectedLargeCellId, goal, goalType, finalTargetYear, finalTargetAmount, false);
    }
  };

  const saveLargeGoal = async (
    cellId: string,
    goal: string,
    goalType: 'revenue' | 'grossProfit' | 'operatingProfit',
    finalTargetYear: number,
    finalTargetAmount: number,
    updatePl: boolean
  ) => {
    const plMetric = goalType;
    const currentCell = largeCells.find(c => c.id === cellId);
    const largeGoalId = currentCell?.largeGoalId;
    const chartId = currentChartIdRef.current;
    const position = getLargePosition(cellId);
    const goalTypeNumber = convertGoalTypeToNumber(goalType);

    if (!chartId || !selectedUser?.id) return;

    try {
      if (largeGoalId) {
        const response = await Service.putApiLargeGoalsUpdate(
          largeGoalId,
          {
            chart_id: chartId,
            position: position,
            goal_title: goal,
            goal_type: goalTypeNumber,
            target_year: finalTargetYear,
            target_amount: finalTargetAmount,
          }
        );
        
        if (response.responseStatus === 1) {
          
          setLargeCells((prev) =>
            prev.map((c) =>
              c.id === cellId ? { ...c, title: goal, plMetric, largeGoalId: largeGoalId } : c
            )
          );
          
          // ★ updatePlがtrueの場合のみ年次PLを更新
          if (updatePl) {
            await updateYearlyPL(goalType, finalTargetYear, finalTargetAmount);
            
            const plKey = `${goalType}-${finalTargetYear}`;
            setActivePlGoals(prev => ({
              ...prev,
              [plKey]: {
                cellId: cellId,
                cellType: 'large',
                amount: finalTargetAmount
              }
            }));
          }
        } else {
          console.error('❌ 大目標の更新に失敗しました');
        }
      } else {
        const response = await Service.postApiLargeGoalsCreate(
          chartId,
          {
            chart_id: chartId,
            position: position,
            goal_title: goal,
            goal_type: goalTypeNumber,
            target_year: finalTargetYear,
            target_amount: finalTargetAmount,
          }
        );
        
        if (response.responseStatus === 1) {
          const createdLargeGoalId = response.large_goal_id;
          if (createdLargeGoalId) {
            setLargeCells((prev) =>
              prev.map((c) =>
                c.id === cellId ? { ...c, title: goal, plMetric, largeGoalId: createdLargeGoalId } : c
              )
            );
          }
          
          // ★ updatePlがtrueの場合のみ年次PLを更新
          if (updatePl) {
            await updateYearlyPL(goalType, finalTargetYear, finalTargetAmount);
            
            const plKey = `${goalType}-${finalTargetYear}`;
            setActivePlGoals(prev => ({
              ...prev,
              [plKey]: {
                cellId: cellId,
                cellType: 'large',
                amount: finalTargetAmount
              }
            }));
          }
        } else {
          console.error('❌ 大目標の作成に失敗しました');
        }
      }
    } catch (error) {
      console.error('❌ 大目標API呼び出しエラー:', error);
    }
  };

  const saveMiddleGoal = async (
    cellId: string,
    selectedLargeCellId: string,
    goal: string,
    goalType: 'revenue' | 'grossProfit' | 'operatingProfit',
    finalTargetYear: number,
    finalTargetAmount: number,
    updatePl: boolean
  ) => {
    const plMetric = goalType;
    const middleChart = middleCharts[selectedLargeCellId];
    if (!middleChart) {
      console.error('middleChartが見つかりません:', selectedLargeCellId);
      return;
    }

    const currentMiddleCell = middleChart.cells.find(c => c.id === cellId);
    const middleGoalId = currentMiddleCell?.middleGoalId;
    const largeCell = largeCells.find(c => c.id === selectedLargeCellId);
    const largeGoalId = largeCell?.largeGoalId;

    if (!largeGoalId) {
      console.error('largeGoalIdが見つかりません');
      return;
    }

    const position = getMiddlePosition(cellId);
    const goalTypeNumber = convertGoalTypeToNumber(goalType);

    try {
      if (middleGoalId) {
        const response = await Service.putApiMiddleGoalsUpdate(
          middleGoalId,
          {
            position: position,
            goal_title: goal,
            goal_type: goalTypeNumber,
            target_year: finalTargetYear,
            target_amount: finalTargetAmount,
          }
        );

        if (response.responseStatus === 1) {
          
          setMiddleCharts((prev) => ({
            ...prev,
            [selectedLargeCellId]: {
              ...prev[selectedLargeCellId],
              cells: prev[selectedLargeCellId].cells.map((c) =>
                c.id === cellId ? { ...c, title: goal, plMetric, middleGoalId: middleGoalId } : c
              ),
            },
          }));
          
          // ★ updatePlがtrueの場合のみ年次PLを更新
          if (updatePl) {
            await updateYearlyPL(goalType, finalTargetYear, finalTargetAmount);
            
            const plKey = `${goalType}-${finalTargetYear}`;
            setActivePlGoals(prev => ({
              ...prev,
              [plKey]: {
                cellId: cellId,
                cellType: 'middle',
                amount: finalTargetAmount
              }
            }));
          }
        } else {
          console.error('❌ 中目標の更新に失敗しました');
        }
      } else {
        const response = await Service.postApiMiddleGoalsCreate(
          largeGoalId,
          {
            position: position,
            goal_title: goal,
            goal_type: goalTypeNumber,
            target_year: finalTargetYear,
            target_amount: finalTargetAmount,
          }
        );

        if (response.responseStatus === 1) {
          const createdMiddleGoalId = response.middle_goal_id;
          if (createdMiddleGoalId) {
            setMiddleCharts((prev) => ({
              ...prev,
              [selectedLargeCellId]: {
                ...prev[selectedLargeCellId],
                cells: prev[selectedLargeCellId].cells.map((c) =>
                  c.id === cellId ? { ...c, title: goal, plMetric, middleGoalId: createdMiddleGoalId } : c
                ),
              },
            }));
          }
          
          // ★ updatePlがtrueの場合のみ年次PLを更新
          if (updatePl) {
            await updateYearlyPL(goalType, finalTargetYear, finalTargetAmount);
            
            const plKey = `${goalType}-${finalTargetYear}`;
            setActivePlGoals(prev => ({
              ...prev,
              [plKey]: {
                cellId: cellId,
                cellType: 'middle',
                amount: finalTargetAmount
              }
            }));
          }
        } else {
          console.error('❌ 中目標の作成に失敗しました');
        }
      }
    } catch (error) {
      console.error('❌ 中目標API呼び出しエラー:', error);
    }
  };
  
  // 万円を億円表記に変換する関数
  const formatAmountDisplay = (amountInManYen: number): string => {
    if (amountInManYen >= 10000) {
      const oku = Math.floor(amountInManYen / 10000);
      const man = amountInManYen % 10000;
      if (man === 0) {
        return `${oku}億円`;
      } else {
        return `${oku}億${man.toLocaleString()}万円`;
      }
    }
    return `${amountInManYen.toLocaleString()}万円`;
  };

  const handleGoalSubmit = async (
    goal: string, 
    goalType: 'qualitative' | 'revenue' | 'grossProfit' | 'operatingProfit',
    amountInManYen?: number,
    targetYearIndex?: number
  ) => {
  
    const { cellId, cellType } = goalInputModal;
  
    if (cellType === 'center') {
      setCenterGoal(goal);
      return;
    }
    
    if (cellType === 'small' && selectedMiddleCellId) {
      setSmallCharts({
        ...smallCharts,
        [selectedMiddleCellId]: {
          ...smallCharts[selectedMiddleCellId],
          cells: smallCharts[selectedMiddleCellId].cells.map((c) =>
            c.id === cellId ? { ...c, title: goal } : c
          ),
        },
      });
      return;
    }
    
    // 定性的目標の場合は通常の処理（年次PL連動なし）
    if (goalType === 'qualitative') {
      if (cellType === 'large') {
        const currentCell = largeCells.find(c => c.id === cellId);
        const largeGoalId = currentCell?.largeGoalId;
        const chartId = currentChartIdRef.current;
        const position = getLargePosition(cellId);
        const goalTypeNumber = convertGoalTypeToNumber(goalType);
  
        if (chartId && selectedUser?.id) {
          try {
            if (largeGoalId) {
              const response = await Service.putApiLargeGoalsUpdate(
                largeGoalId,
                {
                  chart_id: chartId,
                  position: position,
                  goal_title: goal,
                  goal_type: goalTypeNumber,
                  target_year: undefined,
                  target_amount: undefined,
                }
              );
              
              if (response.responseStatus === 1) {
                setLargeCells((prev) =>
                  prev.map((c) =>
                    c.id === cellId ? { ...c, title: goal, plMetric: undefined, largeGoalId: largeGoalId } : c
                  )
                );
              }
            } else {
              const response = await Service.postApiLargeGoalsCreate(
                chartId,
                {
                  chart_id: chartId,
                  position: position,
                  goal_title: goal,
                  goal_type: goalTypeNumber,
                  target_year: undefined,
                  target_amount: undefined,
                }
              );
              
              if (response.responseStatus === 1) {
                const createdLargeGoalId = response.large_goal_id;
                if (createdLargeGoalId) {
                  setLargeCells((prev) =>
                    prev.map((c) =>
                      c.id === cellId ? { ...c, title: goal, plMetric: undefined, largeGoalId: createdLargeGoalId } : c
                    )
                  );
                }
              }
            }
          } catch (error) {
            console.error('❌ 大目標（定性）API呼び出しエラー:', error);
          }
        }
      } else if (cellType === 'middle' && selectedLargeCellId) {
        const middleChart = middleCharts[selectedLargeCellId];
        if (!middleChart) {
          console.error('middleChartが見つかりません:', selectedLargeCellId);
          return;
        }
  
        const currentMiddleCell = middleChart.cells.find(c => c.id === cellId);
        const middleGoalId = currentMiddleCell?.middleGoalId;
        const largeCell = largeCells.find(c => c.id === selectedLargeCellId);
        const largeGoalId = largeCell?.largeGoalId;
  
        if (!largeGoalId) {
          console.error('largeGoalIdが見つかりません');
          return;
        }
  
        const position = getMiddlePosition(cellId);
        const goalTypeNumber = convertGoalTypeToNumber(goalType);
  
        try {
          if (middleGoalId) {
            const response = await Service.putApiMiddleGoalsUpdate(
              middleGoalId,
              {
                position: position,
                goal_title: goal,
                goal_type: goalTypeNumber,
                target_year: undefined,
                target_amount: undefined,
              }
            );
  
            if (response.responseStatus === 1) {
              setMiddleCharts((prev) => ({
                ...prev,
                [selectedLargeCellId]: {
                  ...prev[selectedLargeCellId],
                  cells: prev[selectedLargeCellId].cells.map((c) =>
                    c.id === cellId ? { ...c, title: goal, plMetric: undefined, middleGoalId: middleGoalId } : c
                  ),
                },
              }));
            }
          } else {
            const response = await Service.postApiMiddleGoalsCreate(
              largeGoalId,
              {
                position: position,
                goal_title: goal,
                goal_type: goalTypeNumber,
                target_year: undefined,
                target_amount: undefined,
              }
            );
  
            if (response.responseStatus === 1) {
              const createdMiddleGoalId = response.middle_goal_id;
              if (createdMiddleGoalId) {
                setMiddleCharts((prev) => ({
                  ...prev,
                  [selectedLargeCellId]: {
                    ...prev[selectedLargeCellId],
                    cells: prev[selectedLargeCellId].cells.map((c) =>
                      c.id === cellId ? { ...c, title: goal, plMetric: undefined, middleGoalId: createdMiddleGoalId } : c
                    ),
                  },
                }));
              }
            }
          }
        } catch (error) {
          console.error('❌ 中目標（定性）API呼び出しエラー:', error);
        }
      }
      return;
    }
    
    // ★ PL連動目標の場合は重複チェック
    if (targetYearIndex !== undefined && amountInManYen !== undefined) {
      let currentUserSetup = userSetup;
      
      if (!currentUserSetup || !currentUserSetup.fiscalYearStartYear) {
        try {
          await loadUserSetup();
          await new Promise(resolve => setTimeout(resolve, 100));
          
          if (!selectedUser?.id) {
            console.error('selectedUserが存在しません');
            alert('ユーザー情報の取得に失敗しました');
            return;
          }
          
          const setupResponse = await withErrorHandling(() => 
            Service.getApiSettingUser(selectedUser.id)
          );
          
          if (setupResponse.responseStatus === 1 && setupResponse.settingSchema) {
            currentUserSetup = {
              fiscalYearStartMonth: setupResponse.settingSchema.fiscalYearStartMonth || 4,
              fiscalYearStartYear: setupResponse.settingSchema.fiscalYearStartYear || new Date().getFullYear(),
            } as any;
          } else {
            console.error('userSetupの取得に失敗しました');
            alert('事業年度設定の取得に失敗しました。設定画面で事業年度を設定してください。');
            return;
          }
        } catch (error) {
          console.error('userSetupロードエラー:', error);
          alert('事業年度設定の取得に失敗しました');
          return;
        }
      }
      
      if (!currentUserSetup?.fiscalYearStartYear) {
        console.error('fiscalYearStartYearが取得できませんでした');
        alert('事業年度が設定されていません。設定画面で事業年度を設定してください。');
        return;
      }
      
      const finalTargetYear = currentUserSetup.fiscalYearStartYear + targetYearIndex - 1;
      const finalTargetAmount = amountInManYen * 10000;
      
      // ★ 修正：マンダラチャートのデータから直接重複をチェック
      let conflict = { hasConflict: false, existingCellTitle: '', existingAmount: 0 };
      
      // 大目標から重複をチェック（現在編集中のセルを除く）
      largeCells.forEach(cell => {
        if (cell.id === cellId) return; // 自分自身はスキップ
        if (cell.plMetric !== goalType) return; // メトリックが異なる場合はスキップ
        if (!cell.title) return; // タイトルがない場合はスキップ
        
        // タイトルから年度を抽出
        const yearMatch = cell.title.match(/(\d+)年目に/);
        if (yearMatch) {
          const cellYearIndex = parseInt(yearMatch[1]);
          const cellAbsoluteYear = currentUserSetup.fiscalYearStartYear + cellYearIndex - 1;
          
          if (cellAbsoluteYear === finalTargetYear) {
            // 同じ年度・同じメトリックの目標が見つかった
            // 金額を抽出
            let cellAmountInManYen = 0;
            const cleanTitle = cell.title.replace(/\n/g, '');
            const okuMatch = cleanTitle.match(/(\d+)億/);
            const manMatch = cleanTitle.match(/(\d+)万円/);
            
            if (okuMatch) {
              cellAmountInManYen += parseInt(okuMatch[1]) * 10000;
            }
            if (manMatch) {
              const manValue = parseInt(manMatch[1]);
              if (okuMatch) {
                cellAmountInManYen += manValue;
              } else {
                cellAmountInManYen = manValue;
              }
            }
            
            conflict = {
              hasConflict: true,
              existingCellTitle: cleanTitle,
              existingAmount: cellAmountInManYen * 10000
            };
          }
        }
      });
      
      // 中目標から重複をチェック（大目標で見つからなかった場合）
      if (!conflict.hasConflict) {
        Object.values(middleCharts).forEach(chart => {
          chart.cells.forEach(cell => {
            if (conflict.hasConflict) return; // 既に見つかっている場合はスキップ
            
            // 現在編集中のセルの判定
            const isCurrentCell = cellType === 'middle' && cell.id === cellId;
            if (isCurrentCell) return; // 自分自身はスキップ
            
            if (cell.plMetric !== goalType) return;
            if (!cell.title) return;
            
            const yearMatch = cell.title.match(/(\d+)年目に/);
            if (yearMatch) {
              const cellYearIndex = parseInt(yearMatch[1]);
              const cellAbsoluteYear = currentUserSetup.fiscalYearStartYear + cellYearIndex - 1;
              
              if (cellAbsoluteYear === finalTargetYear) {
                // 金額を抽出
                let cellAmountInManYen = 0;
                const cleanTitle = cell.title.replace(/\n/g, '');
                const okuMatch = cleanTitle.match(/(\d+)億/);
                const manMatch = cleanTitle.match(/(\d+)万円/);
                
                if (okuMatch) {
                  cellAmountInManYen += parseInt(okuMatch[1]) * 10000;
                }
                if (manMatch) {
                  const manValue = parseInt(manMatch[1]);
                  if (okuMatch) {
                    cellAmountInManYen += manValue;
                  } else {
                    cellAmountInManYen = manValue;
                  }
                }
                
                conflict = {
                  hasConflict: true,
                  existingCellTitle: cleanTitle,
                  existingAmount: cellAmountInManYen * 10000
                };
              }
            }
          });
        });
      }
      
      if (conflict.hasConflict) {
        // ★ 競合がある場合は確認ダイアログを表示
        const metricLabel = 
          goalType === 'revenue' ? '売上' :
          goalType === 'grossProfit' ? '粗利益' : '営業利益';
        
        const existingAmountInManYen = conflict.existingAmount ? Math.round(conflict.existingAmount / 10000) : 0;
        const existingAmountDisplay = formatAmountDisplay(existingAmountInManYen);
        const newAmountDisplay = formatAmountDisplay(amountInManYen);
        
        // ★ 追加：既存目標の階層情報を取得
        let hierarchyInfo = '';
        
        // 大目標から検索
        const existingLargeCell = largeCells.find(cell => {
          if (!cell.title || cell.plMetric !== goalType) return false;
          const cleanTitle = cell.title.replace(/\n/g, '');
          return cleanTitle === conflict.existingCellTitle;
        });
        
        if (existingLargeCell) {
          // 大目標の場合
          hierarchyInfo = `大目標：${conflict.existingCellTitle}`;
        } else {
          // 中目標から検索
          let foundMiddleCell = false;
          Object.entries(middleCharts).forEach(([largeCellId, chart]) => {
            if (foundMiddleCell) return;
            
            const middleCell = chart.cells.find(cell => {
              if (!cell.title || cell.plMetric !== goalType) return false;
              const cleanTitle = cell.title.replace(/\n/g, '');
              return cleanTitle === conflict.existingCellTitle;
            });
            
            if (middleCell) {
              foundMiddleCell = true;
              // 紐づく大目標のタイトルを取得
              const largeCell = largeCells.find(c => c.id === largeCellId);
              const largeCellTitle = largeCell?.title ? largeCell.title.replace(/\n/g, '') : '';
              
              if (largeCellTitle) {
                hierarchyInfo = `大目標：${largeCellTitle}\n∟中目標：${conflict.existingCellTitle}`;
              } else {
                hierarchyInfo = `中目標：${conflict.existingCellTitle}`;
              }
            }
          });
        }
        
        // ★ 修正：メッセージに階層情報を追加
        const message = `同じ年度に${metricLabel}目標が設定されています。\n\n${hierarchyInfo}\n\n年次PLの目標金額を${newAmountDisplay}に更新しますか？\n※ 上記のマンダラの目標は更新されません。`;
        
        setPlConflictDialog({
          isOpen: true,
          message: message,
          onConfirm: async () => {
            setPlConflictDialog(prev => ({ ...prev, isOpen: false }));
            await saveGoalWithPlUpdate(cellId, cellType, goal, goalType, finalTargetYear, finalTargetAmount, targetYearIndex, amountInManYen);
          },
          onCancel: async () => {
            setPlConflictDialog(prev => ({ ...prev, isOpen: false }));
            await saveGoalWithoutPlUpdate(cellId, cellType, goal, goalType, finalTargetYear, finalTargetAmount);
          }
        });
        
        return;
      }
      
      // ★ 競合がない場合は通常通り保存（年次PLとマンダラチャートの両方を更新）
      if (cellType === 'large') {
        await saveLargeGoal(cellId, goal, goalType, finalTargetYear, finalTargetAmount, true);
      } else if (cellType === 'middle' && selectedLargeCellId) {
        await saveMiddleGoal(cellId, selectedLargeCellId, goal, goalType, finalTargetYear, finalTargetAmount, true);
      }
          } 
};

  const saveSmallCell = async (cellId: string) => {
    const chartId = Object.keys(smallCharts).find(key =>
      smallCharts[key].cells.some(c => c.id === cellId)
    );
    if (!chartId) {
      console.error('chartIdが見つかりません');
      return;
    }

    const currentCell = smallCharts[chartId].cells.find(c => c.id === cellId);
    if (!currentCell) {
      console.error('currentCellが見つかりません');
      return;
    }

    const smallGoalId = currentCell.smallGoalId;
    const goal = currentCell.title;

    // 中目標のmiddleGoalIdを取得
    if (!selectedLargeCellId || !middleCharts[selectedLargeCellId]) {
      console.error('selectedLargeCellIdまたはmiddleChartsが見つかりません');
      return;
    }

    const middleChart = middleCharts[selectedLargeCellId];
    const middleCell = middleChart.cells.find(c => c.id === chartId);
    const middleGoalId = middleCell?.middleGoalId;

    if (!middleGoalId) {
      console.error('middleGoalIdが見つかりません');
      return;
    }

    const position = getSmallPosition(cellId);

    try {
      if (smallGoalId) {
        // smallGoalIdがある場合は更新APIを実行
        const response = await Service.putApiSmallGoalsUpdate(
          smallGoalId,
          {
            position: position,
            goal_title: goal,
          }
        );

        if (response.responseStatus === 1) {
          // 画面の状態を更新
          setSmallCharts((prev) => ({
            ...prev,
            [chartId]: {
              ...prev[chartId],
              cells: prev[chartId].cells.map((c) =>
                c.id === cellId ? { ...c, smallGoalId: smallGoalId } : c
              ),
            },
          }));
          // savedSmallChartsも更新
          setSavedSmallCharts(prev => ({
            ...prev,
            [chartId]: {
              ...prev[chartId],
              cells: prev[chartId].cells.map(c =>
                c.id === cellId ? { ...currentCell, smallGoalId: smallGoalId } : c
              )
            }
          }));
        } else {
          console.error('小目標の更新に失敗しました');
        }
      } else {
        // smallGoalIdがない場合は新規作成APIを実行
        // パスパラメータはmiddleGoalIdを使用
        const response = await Service.postApiSmallGoalsCreate(
          middleGoalId,
          {
            position: position,
            goal_title: goal,
          }
        );

        if (response.responseStatus === 1) {
          // 作成されたsmallGoalIdを保存
          const createdSmallGoalId = response.small_goal_id;
          if (createdSmallGoalId) {
            const updatedCell = { ...currentCell, smallGoalId: createdSmallGoalId };
            setSmallCharts((prev) => ({
              ...prev,
              [chartId]: {
                ...prev[chartId],
                cells: prev[chartId].cells.map((c) =>
                  c.id === cellId ? updatedCell : c
                ),
              },
            }));
            // savedSmallChartsも更新
            setSavedSmallCharts(prev => ({
              ...prev,
              [chartId]: {
                ...prev[chartId],
                cells: prev[chartId].cells.map(c =>
                  c.id === cellId ? updatedCell : c
                )
              }
            }));
          }
        } else {
          console.error('小目標の作成に失敗しました');
        }
      }
    } catch (error) {
      console.error('小目標API呼び出しエラー:', error);
    }
  };

  const handleSmallCheck = async (smallCellId: string) => {
    if (!selectedMiddleCellId || !smallCharts[selectedMiddleCellId]) return;
  
    const chart = smallCharts[selectedMiddleCellId];
    const targetCell = chart.cells.find((cell) => cell.id === smallCellId);
    if (!targetCell) return;

    const smallGoalId = targetCell.smallGoalId;

    // smallGoalIdが存在する場合はAPIを呼び出す
    if (smallGoalId) {
      try {
        const response = await Service.putApiSmallGoalsComplete(smallGoalId);

        if (response.responseStatus === 1) {
          const isCompleted = response.is_completed || false;
          const newStatus: MandalaCell["status"] = isCompleted
            ? "achieved"
            : "not_started";
          const newAchievement = isCompleted ? 100 : 0;

          if (isCompleted && targetCell.title) {
            setAchievementPopup({
              isOpen: true,
              goalTitle: targetCell.title,
              level: "small",
            });
          }

          const updatedCells = chart.cells.map((cell) => {
            if (cell.id === smallCellId) {
              return {
                ...cell,
                isChecked: isCompleted,
                status: newStatus,
                achievement: newAchievement,
              };
            }
            return cell;
          });

          const updatedChart = {
            ...chart,
            cells: updatedCells,
          };

          setSmallCharts({
            ...smallCharts,
            [selectedMiddleCellId]: updatedChart,
          });

          setSavedSmallCharts(prev => ({
            ...prev,
            [selectedMiddleCellId]: updatedChart,
          }));

          updateMiddleAchievement(selectedMiddleCellId, updatedCells);
        } else {
          console.error('小目標の完了/未完了切替に失敗しました');
        }
      } catch (error) {
        console.error('小目標完了/未完了切替API呼び出しエラー:', error);
      }
    } else {
      // smallGoalIdが存在しない場合は、既存の動作（状態の更新のみ）を維持
      const newChecked = !targetCell.isChecked;
      const newStatus: MandalaCell["status"] = newChecked
        ? "achieved"
        : "not_started";
      const newAchievement = newChecked ? 100 : 0;

      if (newChecked && targetCell.title) {
        setAchievementPopup({
          isOpen: true,
          goalTitle: targetCell.title,
          level: "small",
        });
      }

      const updatedCells = chart.cells.map((cell) => {
        if (cell.id === smallCellId) {
          return {
            ...cell,
            isChecked: newChecked,
            status: newStatus,
            achievement: newAchievement,
          };
        }
        return cell;
      });

      const updatedChart = {
        ...chart,
        cells: updatedCells,
      };

      setSmallCharts({
        ...smallCharts,
        [selectedMiddleCellId]: updatedChart,
      });

      setSavedSmallCharts(prev => ({
        ...prev,
        [selectedMiddleCellId]: updatedChart,
      }));

      updateMiddleAchievement(selectedMiddleCellId, updatedCells);
    }
  };

  const updateMiddleAchievement = (
    middleCellId: string,
    smallCells: MandalaCell[]
  ) => {
    
    const checkedCount = smallCells.filter((c) => c.isChecked).length;
    const achievement = Math.round((checkedCount / 10) * 100);

    Object.entries(middleCharts).forEach(([largeId, middleChart]) => {
      let hasUpdate = false;
      const updatedCells = middleChart.cells.map((cell) => {
        if (cell.id === middleCellId) {
          
          const prevCell = cell;

          if (prevCell.status === "achieved") {
            return cell;
          }

          const isPLMetric = !!prevCell.plMetric;
          hasUpdate = true;

          const updatedCell = {
            ...prevCell,
            achievement,
            status: isPLMetric ? prevCell.status : getCellStatus(achievement),
          };

          if (
            !isPLMetric &&
            achievement === 100 &&
            updatedCell.title &&
            prevCell.achievement !== 100
          ) {
            setAchievementPopup({
              isOpen: true,
              goalTitle: updatedCell.title,
              level: "middle",
            });
          }

          return updatedCell;
        }
        return cell;
      });

      if (hasUpdate) {
        setMiddleCharts((prev) => ({
          ...prev,
          [largeId]: {
            ...middleChart,
            cells: updatedCells,
          },
        }));

        updateLargeAchievement(largeId, updatedCells);
      }
    });
  };

  const updateLargeAchievement = (
    largeId: string,
    middleCells: MandalaCell[]
  ) => {
    const totalAchievement = middleCells.reduce(
      (sum, c) => sum + c.achievement,
      0
    );
    const achievement = Math.round(totalAchievement / middleCells.length);

    setLargeCells((prev) =>
      prev.map((cell) => {
        if (cell.id === largeId) {
          const newCell = {
            ...cell,
            achievement,
          };

          if (
            cell.status !== "achieved" &&
            newCell.achievement === 100 &&
            cell.title
          ) {
            setAchievementPopup({
              isOpen: true,
              goalTitle: cell.title,
              level: "large",
            });
          }

          return newCell;
        }
        return cell;
      })
    );
  };

  const getLargeRingRatios = (largeCellId: string): number[] => {
    const largeCell = largeCells.find(c => c.id === largeCellId);
    
    // ★ APIから取得したmiddleGoalsProgressを使用（優先）
    if (largeCell?.middleGoalsProgress && largeCell.middleGoalsProgress.length > 0) {
      return largeCell.middleGoalsProgress.map(progress => {
        const ratio = progress / 100;
        return Math.max(0, Math.min(1, ratio)); // 0-1の範囲に制限
      });
    }
    
    // フォールバック: middleChartsから計算（既存のロジック）
    const middleChart = middleCharts[largeCellId];
    if (!middleChart) {
      return [];
    }
  
    const ratios = middleChart.cells.map((middleCell) => {
      const smallChart = smallCharts[middleCell.id];
      if (!smallChart) {
        return 0;
      }
  
      const checked = smallChart.cells.filter((c) => c.isChecked).length;
      const ratio = checked / 10;
  
      return Math.max(0, Math.min(1, ratio));
    });
  
    return ratios;
  };

  const getMiddleCellProgress = (middleCellId: string) => {
    // middleChartsから該当するセルを探してprogressを取得
    let progress = 0;
    
    Object.values(middleCharts).forEach((middleChart) => {
      const cell = middleChart.cells.find((c) => c.id === middleCellId);
      if (cell) {
        progress = cell.achievement || 0; // achievementにはprogressが格納されている
      }
    });
  
    // progressを0-1の範囲に変換（progressは0-100の値）
    const ratio = progress / 100;
    const totalRings = 10;
    const filledRings = Math.round(totalRings * ratio);
  
    return {
      filledRings: filledRings,
      totalRings: totalRings,
      isCompleted: progress >= 100,
    };
  };

  const isSmallCellChanged = (cellId: string) => {
    const chartId = Object.keys(smallCharts).find(key =>
      smallCharts[key].cells.some(c => c.id === cellId)
    );
    if (!chartId) return false;

    const currentCell = smallCharts[chartId]?.cells.find(c => c.id === cellId);
    const savedCell = savedSmallCharts[chartId]?.cells.find(c => c.id === cellId);
    return JSON.stringify(currentCell) !== JSON.stringify(savedCell);
  };

  const renderLargeView = () => {
    const gridOrder = [0, 1, 2, 3, null, 4, 5, 6, 7];
    
    // 時計回りのアニメーション順序（中心が0、その周りを時計回り）
    // 上: 1, 右上: 2, 右: 4, 右下: 7, 下: 6, 左下: 5, 左: 3, 左上: 0
    const animationOrder = [null, 1, 2, 4, 7, 6, 5, 3, 0];
  
    return (
      <div className="space-y-8">
        <div className="flex flex-col lg:flex-row justify-center items-start gap-8">
        <div 
          className="grid grid-cols-3 w-full max-w-[632px]"
          style={{
            aspectRatio: '1/1',
            gap: 'clamp(4px, 2vw, 16px)',
          }}
        >
            {gridOrder.map((cellIndex) => {
              // アニメーションの遅延を計算
              const animationIndex = animationOrder.indexOf(cellIndex);
              const delay = animationIndex * 100;

              if (cellIndex === null) {
                const isCenterHovered = hoveredCellId === 'center';
                
                return (
                  <div
                    key="center"
                    onClick={() => {
                      setCenterGoalModalOpen(true);
                    }}
                    className={`aspect-square p-4 flex flex-col items-center justify-center hover:shadow-lg transition-all group duration-500 cursor-pointer ${
                      isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
                    }`}
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: 'clamp(10px, 3vw, 20px)',
                      boxShadow: '0px 4px 12px 0px rgba(72, 82, 84, 0.1)',
                      border: 'none',
                      background: '#FFFFFF',
                      position: 'relative',
                      transitionDelay: '0ms'
                    }}
                    onMouseEnter={() => setHoveredCellId('center')}
                    onMouseLeave={() => setHoveredCellId(null)}
                  >
                    {isCenterHovered && !centerGoal && (
                      <div
                        className="absolute pointer-events-none transition-opacity duration-200"
                        style={{
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          fontFamily: 'Inter',
                          fontWeight: 400,
                          fontSize: 'clamp(8px, 1.6vw, 14px)',
                          color: 'rgba(19, 174, 103, 0.5)',
                          whiteSpace: 'nowrap',
                          zIndex: 5
                        }}
                      >
                        どんな目標にする？
                      </div>
                    )}
                    
                    <div
                      className="pointer-events-none"
                      style={{
                        position: 'absolute',
                        width: 'auto',
                        height: 'auto',
                        top: window.innerWidth < 768 ? '15%' : '50%',
                        left: '50%',
                        transform: window.innerWidth < 768 
                          ? 'translate(-50%, 0%)' 
                          : 'translate(-50%, clamp(-60px, -8vw, -90px))',
                        fontFamily: 'Inter',
                        fontWeight: 400,
                        fontStyle: 'normal',
                        fontSize: window.innerWidth < 768 ? '7px' : 'clamp(8px, 1.6vw, 12px)',
                        lineHeight: '100%',
                        letterSpacing: '0%',
                        textAlign: 'center',
                        color: '#13AE67'
                      }}
                    >
                      私が叶える目標
                    </div>
                    
                    <div
                      className="pointer-events-none"
                      style={{
                        position: 'absolute',
                        width: window.innerWidth < 768 ? '70%' : 'min(160px, 85%)',
                        height: 'auto',
                        maxHeight: window.innerWidth < 768 ? '40%' : '50%',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        marginTop: window.innerWidth < 768 ? '8px' : '0px',
                        fontFamily: 'Inter',
                        fontWeight: 700,
                        fontStyle: 'normal',
                        fontSize: window.innerWidth < 768 ? '9px' : 'clamp(11px, 2.6vw, 18px)',
                        lineHeight: window.innerWidth < 768 ? '12px' : 'clamp(16px, 3.4vw, 24px)',
                        letterSpacing: '0%',
                        textAlign: 'center',
                        color: '#13AE67',
                        whiteSpace: 'pre-wrap',
                        overflow: 'hidden',
                        wordBreak: 'break-all',
                        overflowWrap: 'break-word',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 2px'
                      }}
                    >
                      {centerGoal || ''}
                    </div>
                  </div>
                );
              }
  
              const cell = largeCells[cellIndex];
              const ringRatios = getLargeRingRatios(cell.id);
              const isCellHovered = hoveredCellId === cell.id;

              // ★ 追加: メイン目標が設定されているかチェック
            const hasMainGoal = !!centerGoal;

              // ★ 修正: すべての中目標が100%達成されているかチェック
              const allMiddleGoalsCompleted = isLargeGoalFullyCompleted(cell.id);

              // ★ 修正: 大目標自体のタイトルがあり、すべての中目標が完了している場合に完全達成
              const isFullyCompleted = cell.title && allMiddleGoalsCompleted;

              const visualStatus: MandalaCell["status"] =
                cell.status === "achieved" && !allMiddleGoalsCompleted
                  ? "in_progress"
                  : cell.status;

                  return (
                    <div
                      key={cell.id}
                      className={`transition-all duration-500 ${
                        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
                      }`}
                      style={{
                        transitionDelay: `${delay}ms`
                      }}
                    >
                      <MandalaCellFrame
                        status={cell.status}
                        visualStatus={visualStatus}
                        isHoverable={hasMainGoal} // ★ 修正: メイン目標がある場合のみホバー可能
                      >
                        <div 
                          className={`flex flex-col items-center h-full group ${hasMainGoal ? 'cursor-pointer' : 'cursor-default'}`} 
                          onClick={() => {
                            if (hasMainGoal) { // ★ 追加: メイン目標がある場合のみクリック可能
                              openGoalInputModal(cell.id, 'large', cell.title);
                            }
                          }}
                          onMouseEnter={() => {
                            if (hasMainGoal || !cell.title) { // ★ 修正: メイン目標があるか、タイトルがない場合のみホバー表示
                              setHoveredCellId(cell.id);
                            }
                          }}
                          onMouseLeave={() => setHoveredCellId(null)}
                        >
                          <div className="relative w-full flex-1 min-h-0 pointer-events-none">
                            {isCellHovered && !cell.title && (
                              <div
                                className="absolute pointer-events-none transition-opacity duration-200 z-30"
                                style={{
                                  top: '50%',
                                  left: '50%',
                                  transform: 'translate(-50%, -50%)',
                                  fontFamily: 'Inter',
                                  fontWeight: 400,
                                  fontSize: 'clamp(7px, 1.4vw, 14px)',
                                  color: hasMainGoal ? 'rgba(19, 174, 103, 0.5)' : 'rgba(156, 163, 175, 0.5)', // ★ 修正
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {hasMainGoal ? 'どんな目標にする？' : '真ん中の目標を設定しよう'} {/* ★ 修正 */}
                              </div>
                            )}
                        
                        {cell.title && (
                          <>
                            {/* ★ 修正: 完全達成時はピンクのアイコン、それ以外は進捗リング */}
                            {isFullyCompleted ? (
                              <img
                                src={complate_icon}
                                alt="達成リング"
                                className="absolute pointer-events-none z-10"
                                style={{
                                  width: window.innerWidth < 768 ? '100%' : '210px',
                                  height: window.innerWidth < 768 ? '100%' : '210px',
                                  objectFit: 'contain',
                                  top: '50%',
                                  left: '50%',
                                  transform: `translate(-50%, calc(-50% + ${window.innerWidth < 768 ? '8px' : '22px'}))`
                                }}
                              />
                            ) : ringRatios.length > 0 ? (
                              <LargeRingProgress
                                ringRatios={ringRatios}
                                size={190}
                                offsetY={window.innerWidth < 768 ? 8 : 22}
                              />
                            ) : null}
                          </>
                        )}
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div
                          className="bg-transparent border-none text-center"
                          style={{
                            position: 'absolute',
                            width: window.innerWidth < 768 ? '55%' : 'min(120px, 75%)',
                            height: 'auto',
                            maxHeight: window.innerWidth < 768 ? '45%' : '60%',
                            fontFamily: 'Inter',
                            fontStyle: 'normal',
                            fontWeight: 600,
                            fontSize: window.innerWidth < 768 ? '7px' : 'clamp(9px, 1.8vw, 14px)',
                            lineHeight: window.innerWidth < 768 ? '10px' : 'clamp(13px, 2.6vw, 20px)',
                            textAlign: 'center',
                            whiteSpace: 'pre-wrap',
                            overflow: 'hidden',
                            wordBreak: 'break-all',
                            overflowWrap: 'break-word',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0',
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            marginTop: window.innerWidth < 768 ? '6px' : '0px',
                            color: isFullyCompleted ? '#F2A1A0' : '#13AE67',
                            zIndex: 15
                          }}  
                        >
                          {cell.title || ''}
                        </div>
                      </div>

                      {cell.title && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLargeCellClick(cell.id);
                          }}
                          className="md:opacity-0 md:group-hover:opacity-100 transition-opacity text-note text-primary hover:text-primary/80 font-semibold bg-white/90 rounded-full shadow-md cursor-pointer z-30 pointer-events-auto"
                          style={{ 
                            width: 'clamp(90px, 22vw, 140px)',
                            fontSize: 'clamp(8px, 1.6vw, 12px)',
                            padding: 'clamp(3px, 0.8vw, 8px) clamp(6px, 1.5vw, 16px)',
                            marginTop: 'clamp(2px, 0.5vw, 8px)'
                          }}
                        >
                          中目標を設定 →
                        </button>
                      )}
                    </div>
                  </MandalaCellFrame>
                </div>
              );
            })}
          </div>
          <div 
            className="fixed top-[70px] right-4 lg:right-8 lg:top-[100px]"
            style={{ 
              zIndex: 20
            }}
          >
            <LevelIndicator level={viewLevel} />
          </div>
        </div>
      </div>
    );
  };

  const renderMiddleView = () => {
    if (!selectedLargeCellId || !middleCharts[selectedLargeCellId]) {
      return <div className="text-body text-text">データが見つかりません</div>;
    }
  
    const largeCell = largeCells.find((c) => c.id === selectedLargeCellId)!;
    const middleChart = middleCharts[selectedLargeCellId];
  
    const gridOrder = [0, 1, 2, 3, null, 4, 5, 6, 7];
    const animationOrder = [null, 1, 2, 4, 7, 6, 5, 3, 0];
  
    return (
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row justify-center items-start gap-8 relative">
        <div 
          className="grid grid-cols-3 w-full max-w-[632px]"
          style={{
            aspectRatio: '1/1',
            gap: 'clamp(4px, 2vw, 16px)',
            position: 'relative'
          }}
        >
            {gridOrder.map((cellIndex) => {
              const animationIndex = animationOrder.indexOf(cellIndex);
              const delay = animationIndex * 100;

              if (cellIndex === null) {
                return (
                  <div
                    key="center"
                    className={`aspect-square p-4 flex flex-col items-center justify-center transition-all duration-500 ${
                      isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
                    }`}
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: 'clamp(10px, 3vw, 20px)',
                      boxShadow: '0px 4px 12px 0px rgba(72, 82, 84, 0.1)',
                      border: 'none',
                      background: '#FFFFFF',
                      position: 'relative',
                      transitionDelay: '0ms'
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        width: 'auto',
                        height: 'auto',
                        top: window.innerWidth < 768 ? '15%' : '50%',
                        left: '50%',
                        transform: window.innerWidth < 768 
                          ? 'translate(-50%, 0%)' 
                          : 'translate(-50%, clamp(-60px, -8vw, -90px))',
                        fontFamily: 'Inter',
                        fontWeight: 400,
                        fontStyle: 'normal',
                        fontSize: window.innerWidth < 768 ? '7px' : 'clamp(8px, 1.6vw, 12px)',
                        lineHeight: '100%',
                        letterSpacing: '0%',
                        textAlign: 'center',
                        color: '#13AE67',
                        pointerEvents: 'none' 
                      }}
                    >
                      私が叶える目標
                    </div>
              
                    <div
                      style={{
                        position: 'absolute',
                        width: window.innerWidth < 768 ? '70%' : 'min(160px, 85%)',
                        height: 'auto',
                        maxHeight: window.innerWidth < 768 ? '40%' : '50%',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        marginTop: window.innerWidth < 768 ? '8px' : '0px',
                        fontFamily: 'Inter',
                        fontWeight: 700,
                        fontStyle: 'normal',
                        fontSize: window.innerWidth < 768 ? '9px' : 'clamp(11px, 2.6vw, 18px)',
                        lineHeight: window.innerWidth < 768 ? '12px' : 'clamp(16px, 3.4vw, 24px)',
                        letterSpacing: '0%',
                        textAlign: 'center',
                        color: '#13AE67',
                        whiteSpace: 'pre-wrap',
                        overflow: 'hidden',
                        wordBreak: 'break-all',
                        overflowWrap: 'break-word',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 2px'
                      }}
                    >
                      {largeCell.title}
                    </div>
                  </div>
                );
              }

              const cell = middleChart.cells[cellIndex];
              const progress = getMiddleCellProgress(cell.id);
              const isCellHovered = hoveredCellId === cell.id;

              const mandalaCompleted = progress.isCompleted;

              const isFullyCompleted =
                mandalaCompleted && cell.status === "achieved";

              const visualStatus: MandalaCell["status"] =
                cell.status === "achieved" && !mandalaCompleted
                  ? "in_progress"
                  : cell.status;

              return (
                <div
                  key={cell.id}
                  className={`transition-all duration-500 ${
                    isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
                  }`}
                  style={{
                    transitionDelay: `${delay}ms`
                  }}
                >
                  <MandalaCellFrame
                    status={cell.status}
                    visualStatus={visualStatus}
                    isHoverable={true}
                  >
                    <div 
                      className="relative z-10 text-center flex flex-col items-center h-full group cursor-pointer"
                      onClick={() => openGoalInputModal(cell.id, 'middle', cell.title)}
                      onMouseEnter={() => setHoveredCellId(cell.id)}
                      onMouseLeave={() => setHoveredCellId(null)}
                    >
                      <div className="relative w-full flex-1 min-h-0 pointer-events-none">
                        {isCellHovered && !cell.title && (
                          <div
                            className="absolute pointer-events-none transition-opacity duration-200 z-30"
                            style={{
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              fontFamily: 'Inter',
                              fontWeight: 400,
                              fontSize: 'clamp(12px, 2.5vw, 14px)',
                              color: 'rgba(19, 174, 103, 0.5)',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            どんな目標にする？
                          </div>
                        )}
                        
                        {cell.title && (
                          <>
                            {isFullyCompleted ? (
                            <img
                              src={complate_icon}
                              alt="達成リング"
                              className="absolute pointer-events-none z-10"
                              style={{
                                width: window.innerWidth < 768 ? '100%' : '210px',
                                height: window.innerWidth < 768 ? '100%' : '210px',
                                objectFit: 'contain',
                                top: '50%',
                                left: '50%',
                                transform: `translate(-50%, calc(-50% + ${window.innerWidth < 768 ? '8px' : '22px'}))`
                              }}
                            />
                          ) : progress.totalRings > 0 ? (
                            <MultiRingProgress
                              totalRings={progress.totalRings}
                              filledRings={progress.filledRings}
                              isCompleted={false}
                              size={190}
                              offsetY={window.innerWidth < 768 ? 8 : 22}
                            />
                          ) : null}
                          </>
                        )}
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div
                          className="bg-transparent border-none text-center"
                          style={{
                            position: 'absolute',
                            width: window.innerWidth < 768 ? '55%' : 'min(120px, 75%)',
                            height: 'auto',
                            maxHeight: window.innerWidth < 768 ? '45%' : '60%',
                            fontFamily: 'Inter',
                            fontWeight: 600,
                            fontSize: window.innerWidth < 768 ? '7px' : 'clamp(9px, 1.8vw, 14px)',
                            lineHeight: window.innerWidth < 768 ? '10px' : 'clamp(13px, 2.6vw, 20px)',
                            textAlign: 'center',
                            whiteSpace: 'pre-wrap',
                            overflow: 'hidden',
                            wordBreak: 'break-all',
                            overflowWrap: 'break-word',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0',
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            marginTop: window.innerWidth < 768 ? '6px' : '0px',
                            color: visualStatus === "achieved" ? '#F2A1A0' : '#13AE67',
                            zIndex: 15
                          }}
                        >
                          {cell.title || ''}
                        </div>
                      </div>

                      {cell.title && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMiddleCellClick(cell.id);
                          }}
                          className="md:opacity-0 md:group-hover:opacity-100 transition-opacity text-note text-primary hover:text-primary/80 font-semibold bg-white/90 rounded-full shadow-md cursor-pointer z-30 pointer-events-auto"
                          style={{ 
                            width: 'clamp(90px, 22vw, 140px)',
                            fontSize: 'clamp(8px, 1.6vw, 12px)',
                            padding: 'clamp(3px, 0.8vw, 8px) clamp(6px, 1.5vw, 16px)',
                            marginTop: 'clamp(2px, 0.5vw, 8px)'
                          }}
                        >
                          小目標を設定 →
                        </button>
                      )}
                    </div>
                  </MandalaCellFrame>
                </div>
              );
            })}
          </div>

          <div 
            className="fixed top-[70px] right-4 lg:right-8 lg:top-[100px]"
            style={{ 
              zIndex: 20
            }}
          >
            <LevelIndicator level={viewLevel} />
          </div>

          <div 
            className="fixed top-[70px] right-[60px] lg:right-[84px] lg:top-[100px]"
            style={{ 
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <p 
              style={{
                fontFamily: 'Inter',
                fontWeight: 400,
                fontSize: 'clamp(10px, 2vw, 12px)',
                lineHeight: '100%',
                color: '#9CA3AF',
                whiteSpace: 'nowrap'
              }}
            >
              今は中目標を表示しています
            </p>
            
            <button
              onClick={handleBackToLarge}
              className="flex items-center justify-center bg-white hover:bg-gray-50 rounded-full shadow-md transition-colors cursor-pointer"
              title="大目標に戻る"
              style={{
                width: '40px',
                height: '40px'
              }}
            >
              <ArrowLeft 
                className="text-primary" 
                style={{ 
                  transform: 'rotate(90deg)', 
                  width: '20px', 
                  height: '20px' 
                }} 
              />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderSmallView = () => {
    if (
      !selectedMiddleCellId ||
      !smallCharts[selectedMiddleCellId] ||
      !selectedLargeCellId ||
      !middleCharts[selectedLargeCellId]
    ) {
      return <div className="text-body text-text">データが見つかりません</div>;
    }
  
    const smallChart = smallCharts[selectedMiddleCellId];
    const middleChartOfSelectedLarge = middleCharts[selectedLargeCellId];
  
    const middleCellIndex = middleChartOfSelectedLarge.cells.findIndex(
      (c) => c.id === selectedMiddleCellId
    );
    const middleCell =
      middleCellIndex !== -1
        ? middleChartOfSelectedLarge.cells[middleCellIndex]
        : null;
  
    return (
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col lg:flex-row justify-center items-start gap-8 relative">
          <div className="flex-1 space-y-4 md:space-y-6" style={{ maxWidth: '660px', width: '100%' }}>
            <div 
              className={`w-full transition-all duration-500 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
              }`}
              style={{
                transitionDelay: '0ms'
              }}
            >
              <div 
                style={{
                  width: '100%',
                  maxWidth: '660px',
                  height: 'auto',
                  minHeight: 'clamp(64px, 12vw, 96px)',
                  borderRadius: 'clamp(12px, 3vw, 20px)',
                  background: '#FFFFFF',
                  boxShadow: '0px 4px 12px 0px rgba(72, 82, 84, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 'clamp(12px, 2.5vw, 16px)'
                }}
              >
                <p
                  style={{
                    fontFamily: 'Inter',
                    fontWeight: 700,
                    fontSize: 'clamp(14px, 3vw, 20px)',
                    lineHeight: 'clamp(22px, 4vw, 32px)',
                    letterSpacing: '0%',
                    textAlign: 'center',
                    color: '#13AE67',
                    whiteSpace: 'pre-wrap',
                    margin: 0
                  }}
                >
                  {middleCell?.title || ""}
                </p>
              </div>
            </div>
    
            <div className="space-y-4">
              {smallChart.cells.map((cell, index) => {
                const isCellHovered = hoveredCellId === cell.id;
                const cellChanged = isSmallCellChanged(cell.id);
                const delay = (index + 1) * 80;

                return (
                  <div
                    key={cell.id}
                    className={`flex items-center transition-all duration-500 relative group ${
                      isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
                    }`}
                    style={{
                      width: '100%',
                      maxWidth: '660px',
                      height: 'clamp(40px, 8vw, 48px)',
                      borderRadius: 'clamp(12px, 3vw, 20px)',
                      background: cellChanged ? 'rgba(19, 174, 103, 0.05)' : '#FFFFFF',
                      boxShadow: '0px 4px 12px 0px rgba(72, 82, 84, 0.1)',
                      padding: 'clamp(6px, 1.5vw, 8px) clamp(8px, 2vw, 12px)',
                      gap: 'clamp(8px, 2vw, 12px)',
                      transitionDelay: `${delay}ms`
                    }}
                    onMouseEnter={() => setHoveredCellId(cell.id)}
                    onMouseLeave={() => setHoveredCellId(null)}
                  >
                    {isCellHovered && !cell.title && (
                      <div
                        className="absolute pointer-events-none transition-opacity duration-200"
                        style={{
                          left: '50%',
                          transform: 'translateX(-50%)',
                          fontFamily: 'Inter',
                          fontWeight: 400,
                          fontSize: 'clamp(10px, 2vw, 14px)',
                          color: 'rgba(19, 174, 103, 0.5)',
                          whiteSpace: 'nowrap',
                          zIndex: 20
                        }}
                      >
                        どんな目標にする？
                      </div>
                    )}
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSmallCheck(cell.id);
                      }}
                      disabled={!cell.title || cellChanged}
                      className="flex-shrink-0 flex items-center justify-center transition-all duration-300 hover:scale-110"
                      style={{
                        width: 'clamp(20px, 4vw, 24px)',
                        height: 'clamp(20px, 4vw, 24px)',
                        cursor: (cell.title && !cellChanged) ? 'pointer' : 'not-allowed',
                        opacity: (!cell.title || cellChanged) ? 0.5 : 1
                      }}
                    >
                      {cell.isChecked ? (
                        <>
                          <div 
                            className="transition-all duration-300"
                            style={{
                              position: 'absolute',
                              width: 'clamp(20px, 4vw, 24px)',
                              height: 'clamp(20px, 4vw, 24px)',
                              background: '#13AE6773',
                              borderRadius: '50%',
                              opacity: 0.45
                            }}
                          />
                          <img 
                            src={heart_icon} 
                            alt="完了"
                            className="transition-all duration-300"
                            style={{
                              width: 'clamp(12px, 2.5vw, 14px)',
                              height: 'clamp(10px, 2vw, 12px)',
                              objectFit: 'contain',
                              position: 'relative',
                              zIndex: 1
                            }}
                          />
                        </>
                      ) : (
                        <div 
                          className="transition-all duration-300 hover:border-primary"
                          style={{
                            width: 'clamp(20px, 4vw, 24px)',
                            height: 'clamp(20px, 4vw, 24px)',
                            border: '2px solid #E5E7EB',
                            borderRadius: '50%'
                          }}
                        />
                      )}
                    </button>

                    <div className="flex-1 min-w-0 flex items-center relative">
                      <input
                        type="text"
                        value={cell.title}
                        maxLength={22}
                        onChange={(e) => {
                          const newTitle = e.target.value;
                          setSmallCharts({
                            ...smallCharts,
                            [selectedMiddleCellId!]: {
                              ...smallCharts[selectedMiddleCellId!],
                              cells: smallCharts[selectedMiddleCellId!].cells.map((c) =>
                                c.id === cell.id ? { ...c, title: newTitle } : c
                              ),
                            },
                          });
                        }}
                        placeholder=""
                        className="w-full bg-transparent font-medium"
                        style={{
                          fontFamily: 'Inter',
                          fontWeight: 700,
                          fontSize: 'clamp(12px, 2.5vw, 16px)',
                          lineHeight: 'clamp(20px, 4vw, 32px)',
                          letterSpacing: '0%',
                          color: '#13AE67',
                          padding: '0',
                          textAlign: 'left',
                          border: 'none',
                          outline: 'none',
                          boxShadow: 'none'
                        }}
                        onFocus={(e) => {
                          e.target.style.outline = 'none';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          right: '0',
                          bottom: '0x',
                          fontFamily: 'Inter',
                          fontWeight: 400,
                          fontSize: 'clamp(9px, 1.8vw, 11px)',
                          color: '#9CA3AF',
                          pointerEvents: 'none'
                        }}
                      >
                        {cell.title.length}/22
                      </div>
                    </div>

                    {cellChanged && (               
                      <button
                        onClick={() => {
                          saveSmallCell(cell.id);
                        }}
                        className="flex-shrink-0 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:-translate-y-0.5"
                        style={{
                          fontFamily: 'Inter',
                          fontWeight: 600,
                          fontSize: 'clamp(10px, 2vw, 12px)',
                          color: '#FFFFFF',
                          background: '#13AE67',
                          padding: 'clamp(4px, 1vw, 6px) clamp(8px, 2vw, 12px)',
                          borderRadius: 'clamp(12px, 3vw, 20px)',
                          border: 'none',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        保存する
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
    
          <div 
            className="fixed top-[70px] right-4 lg:right-8 lg:top-[100px]"
            style={{ 
              zIndex: 20
            }}
          >
            <LevelIndicator level={viewLevel} />
          </div>

          <div 
            className="fixed top-[70px] right-[60px] lg:right-[84px] lg:top-[100px]"
            style={{ 
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <p 
              style={{
                fontFamily: 'Inter',
                fontWeight: 400,
                fontSize: 'clamp(10px, 2vw, 12px)',
                lineHeight: '100%',
                color: '#9CA3AF',
                whiteSpace: 'nowrap'
              }}
            >
              今は小目標を表示しています
            </p>
            
            <button
              onClick={handleBackToMiddle}
              className="flex items-center justify-center bg-white hover:bg-gray-50 rounded-full shadow-md transition-colors cursor-pointer"
              title="中目標に戻る"
              style={{
                width: '40px',
                height: '40px'
              }}
            >
              <ArrowLeft 
                className="text-primary" 
                style={{ 
                  transform: 'rotate(90deg)', 
                  width: '20px', 
                  height: '20px' 
                }} 
              />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen" style={{ background: '#FFFFFF' }}>
      <div 
        className="w-full max-w-6xl mx-auto"
        style={{
          paddingLeft: 'clamp(16px, 4vw, 32px)',
          paddingRight: 'clamp(16px, 4vw, 32px)',
          paddingTop: 'clamp(40px, 10vh, 60px)',
          paddingBottom: 'clamp(20px, 5vh, 40px)'
        }}
      >
        {viewLevel === "large" && renderLargeView()}
        {viewLevel === "middle" && renderMiddleView()}
        {viewLevel === "small" && renderSmallView()}
      </div>
      {plConflictDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black opacity-50"
            onClick={() => setPlConflictDialog(prev => ({ ...prev, isOpen: false }))}
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
              ⚠️ 年次PL 目標金額の上書き確認
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
              {plConflictDialog.message}
            </p>
            
            <div className="flex gap-3">
              {/* ★ 追加：キャンセルボタン */}
              <button
                onClick={() => setPlConflictDialog(prev => ({ ...prev, isOpen: false }))}
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
              
              <button
                onClick={plConflictDialog.onCancel}
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
              
              <button
                onClick={plConflictDialog.onConfirm}
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
      <AchievementPopup
        isOpen={achievementPopup.isOpen}
        onClose={() =>
          setAchievementPopup({ ...achievementPopup, isOpen: false })
        }
        goalTitle={achievementPopup.goalTitle}
        level={achievementPopup.level}
        message="素晴らしい成果です!この調子で次の目標も達成しましょう!"
      />

      <CenterGoalModal
        isOpen={centerGoalModalOpen}
        onClose={() => setCenterGoalModalOpen(false)}
        onSubmit={async (goal, startDate) => {
          setCenterGoal(goal);
          setCenterStartDate(startDate);
          
          // APIに送信
          if (selectedUser?.id) {
            try {
              // useRefで最新の値を確実に取得
              const chartId = currentChartIdRef.current;
              
              if (chartId) {
                // CHART_IDがある場合は更新APIを実行
                const response = await Service.putApiMandalaChartsMainGoalUpdate(
                  chartId,
                  {
                    goal_title: goal,
                    start_year_month: startDate,
                  }
                );
                
                if (response.responseStatus === 1) {
                } else {
                  console.error('マンダラチャートのメイン目標更新に失敗しました');
                }
              } else {
                // CHART_IDがない場合は新規作成APIを実行
                const response = await Service.postApiMandalaChartsCreate({
                  userId: selectedUser.id,
                  main_goal: {
                    goal_title: goal,
                    start_year_month: startDate,
                  },
                });
                
                if (response.responseStatus === 1) {
                  // 作成後にCHART_IDを取得するため、再度データを取得
                  const chartsResponse = await Service.getApiMandalaCharts(selectedUser.id);
                  if (chartsResponse.responseStatus === 1 && chartsResponse.charts) {
                    const activeChart = chartsResponse.charts.find(chart => chart.is_active === true);
                    if (activeChart?.chart_id) {
                      currentChartIdRef.current = activeChart.chart_id;
                    }
                  }
                } else {
                  console.error('マンダラチャートの作成に失敗しました');
                }
              }
            } catch (error) {
              console.error('マンダラチャートAPI呼び出しエラー:', error);
            }
          }
        }}
        initialGoal={centerGoal}
        initialStartDate={centerStartDate}
      />
      <GoalInputModal
        isOpen={goalInputModal.isOpen}
        onClose={() => setGoalInputModal({ ...goalInputModal, isOpen: false })}
        onSubmit={handleGoalSubmit}
        initialValue={goalInputModal.currentValue}
        initialGoalType={goalInputModal.currentGoalType}
        cellType={goalInputModal.cellType}
      />
    </div>
  );
};

export default MandalaChart;