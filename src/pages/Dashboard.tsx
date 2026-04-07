import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Service } from "../api/services/Service";
import { withErrorHandling } from "../utils/apiErrorHandler";
import plIcon from "../assets/icon_pl.png";
import banner_1 from "../assets/banner/banner_1.png";
import banner_2 from "../assets/banner/banner_2.png";
import banner_3 from "../assets/banner/banner_3.png";

type MandalaMajorCell = {
  id: string;
  title: string;
  achievement: number;
  status: "not_started" | "in_progress" | "achieved";
};

const formatTitleBy8Chars = (text: string): string => {
  if (!text) return "";
  
  if (text.includes('\n')) {
    return text;
  }
  
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += 8) {
    chunks.push(text.slice(i, i + 8));
  }
  return chunks.join("\n");
};

// FY（会計年度）を計算する関数
const calculateFiscalYear = (
  currentYear: number,
  currentMonth: number,
  fiscalYearStartMonth: number
): number => {
  // 現在の月が会計年度開始月以上の場合、現在の年がFY年
  // 現在の月が会計年度開始月未満の場合、前年がFY年
  if (currentMonth >= fiscalYearStartMonth) {
    return currentYear;
  } else {
    return currentYear - 1;
  }
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { selectedUser, userSetup, loadUserSetup } = useAuth();
  const [currentDate] = useState(new Date());
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mandalaGrid, setMandalaGrid] = useState<{
    centerGoal: string;
    majorCells: MandalaMajorCell[];
  }>({
    centerGoal: "",
    majorCells: Array.from({ length: 8 }, (_, i) => ({
      id: `large_${i + 1}`,
      title: "",
      achievement: 0,
      status: "not_started" as const,
    })),
  });
  const [currentYearData, setCurrentYearData] = useState({
    fiscalYear: 0,
    revenueTarget: 0,
    revenueActual: 0,
    grossProfitTarget: 0,
    grossProfitActual: 0,
    operatingProfitTarget: 0,
    operatingProfitActual: 0,
  });

  const formatCurrency = (amount: number): string => {
    const manyen = Math.round(amount / 10000);
    
    // 1億円（10,000万円）以上の場合
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
  };

  const [animationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 100);
      
      const completeTimer = setTimeout(() => {
        setAnimationComplete(true);
      }, 100 + 1500 + 700); // 100ms(初期) + 1500ms(最大delay) + 700ms(duration)
      
      return () => {
        clearTimeout(timer);
        clearTimeout(completeTimer);
      };
    }
  }, [isLoading]);

  useEffect(() => {
    const fetchHomeData = async () => {
      if (!selectedUser?.id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setIsVisible(false); // データ取得開始時にリセット
        setAnimationComplete(false);

        // userSetupが読み込まれていない場合は読み込む
        let currentUserSetup = userSetup;
        if (!currentUserSetup) {
          await loadUserSetup();
          // loadUserSetup後、userSetupが更新されるまで少し待つ
          await new Promise(resolve => setTimeout(resolve, 100));
          // 再度userSetupを取得
          const { Service } = await import("../api/services/Service");
          const { withErrorHandling } = await import("../utils/apiErrorHandler");
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

        const response = await withErrorHandling(() => Service.getApiHome(selectedUser.id));

        if (response.responseStatus === 1) {
          // マンダラグリッドのデータを更新
          // mainGoalSchemaから中心目標を取得
          const centerGoal = response.mainGoalSchema?.goal_title || "";
          
          const majorCells: MandalaMajorCell[] = Array.from({ length: 8 }, (_, i) => ({
            id: `large_${i + 1}`,
            title: "",
            achievement: 0,
            status: "not_started" as const,
          }));

          // largeGoalSchemaは配列として扱う
          if (response.largeGoalSchema && Array.isArray(response.largeGoalSchema)) {
            response.largeGoalSchema.forEach((largeGoal) => {
              // positionは1-8の範囲
              if (largeGoal.position && largeGoal.position >= 1 && largeGoal.position <= 8) {
                const index = largeGoal.position - 1;
                majorCells[index] = {
                  id: `large_${largeGoal.position}`,
                  title: largeGoal.goal_title || "",
                  achievement: Math.round((largeGoal.progress || 0) * 100),
                  status:
                    (largeGoal.progress || 0) >= 1
                      ? "achieved"
                      : (largeGoal.progress || 0) > 0
                      ? "in_progress"
                      : "not_started",
                };
              }
            });
          }

          setMandalaGrid({
            centerGoal,
            majorCells,
          });

          // FY（会計年度）を計算
          const fiscalYearStartMonth = currentUserSetup?.fiscalYearStartMonth || 4;
          const currentYear = currentDate.getFullYear();
          const currentMonth = currentDate.getMonth() + 1; // getMonth()は0-11を返すため+1
          const fiscalYear = calculateFiscalYear(currentYear, currentMonth, fiscalYearStartMonth);

          // 年次PLデータを更新
          setCurrentYearData({
            fiscalYear,
            revenueTarget: response.saleSchema?.saleTarget || 0,
            revenueActual: response.saleSchema?.saleResult || 0,
            grossProfitTarget: response.grossProfitSchema?.grossProfitTarget || 0,
            grossProfitActual: response.grossProfitSchema?.grossProfitResult || 0,
            operatingProfitTarget: response.operatingProfitSchema?.operatingProfitTarget || 0,
            operatingProfitActual: response.operatingProfitSchema?.operatingProfitResult || 0,
          });
        } else {
          console.warn("ホーム画面データ取得に失敗しました。");
        }
      } catch (error) {
        console.error("ホーム画面データ取得エラー:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHomeData();
  }, [selectedUser?.id, currentDate, userSetup, loadUserSetup]);

  const revenueRate =
    currentYearData.revenueTarget > 0
      ? Math.round(
          (currentYearData.revenueActual / currentYearData.revenueTarget) * 100
        )
      : 0;

  const grossProfitRate =
    currentYearData.grossProfitTarget > 0
      ? Math.round(
          (currentYearData.grossProfitActual /
            currentYearData.grossProfitTarget) *
            100
        )
      : 0;

  const operatingProfitRate =
    currentYearData.operatingProfitTarget > 0
      ? Math.round(
          (currentYearData.operatingProfitActual /
            currentYearData.operatingProfitTarget) *
            100
        )
      : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text/70">データを読み込んでいます...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div 
        className="max-w-7xl mx-auto space-y-4 sm:space-y-6"
        style={{
          padding: 'clamp(12px, 3vw, 24px)'
        }}
      >
        {/* タイトル部分 */}
        <div 
          className={`bg-background rounded-card-lg ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
          }`}
          style={{ 
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
            padding: 'clamp(16px, 4vw, 24px)',
            transition: 'opacity 0.7s ease, transform 0.7s ease'
          }}
        >
          <h2 
            className="font-bold text-text text-center"
            style={{
              fontSize: 'clamp(18px, 4vw, 24px)',
              marginBottom: 'clamp(16px, 3vw, 24px)'
            }}
          >
            今日、どっちチェックする?
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {/* マンダラチャート セクション */}
            <div
              className={`bg-background cursor-pointer group rounded-card-lg transition-all ${
                isVisible ? 'opacity-100 translate-x-0 duration-700' : 'opacity-0 -translate-x-8 duration-700'
              } hover:shadow-card-hover hover:-translate-y-2 hover:scale-[1.02] hover:duration-150 hover:ease-out`}
              style={{ 
                boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
                transitionDelay: animationComplete ? '0ms' : '500ms',
                padding: 'clamp(16px, 4vw, 24px)'
              }}
              onClick={() => navigate("/mandalaChart")}
            >
              <h2 
                className="font-bold text-text"
                style={{
                  fontSize: 'clamp(16px, 3.5vw, 20px)',
                  marginBottom: 'clamp(12px, 3vw, 24px)'
                }}
              >
                Check it !
              </h2>

              {/* 3x3 マンダラグリッド */}
              <div 
                className="grid grid-cols-3 mx-auto"
                style={{
                  gap: 'clamp(4px, 1vw, 8px)',
                  maxWidth: 'min(400px, 100%)',
                  marginBottom: 'clamp(12px, 3vw, 24px)'
                }}
              >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => {
                  if (index === 4) {
                    return (
                      <div
                        key="center"
                        className={`aspect-square flex items-center justify-center transition-all duration-500 ${
                          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
                        }`}
                        style={{
                          borderRadius: 'clamp(12px, 3vw, 20px)',
                          boxShadow: '0px 4px 12px 0px rgba(72, 82, 84, 0.1)',
                          border: 'none',
                          background: '#F067A6',
                          transitionDelay: `${300 + index * 50}ms`,
                          padding: 'clamp(4px, 1vw, 8px)'
                        }}
                      >
                        <p 
                          className="text-white text-center font-semibold line-clamp-3 whitespace-pre-line"
                          style={{
                            fontSize: 'clamp(8px, 1.8vw, 12px)',
                            lineHeight: 'clamp(12px, 2.5vw, 16px)'
                          }}
                        >
                          {formatTitleBy8Chars(
                            mandalaGrid.centerGoal || "目標"
                          )}
                        </p>
                      </div>
                    );
                  }

                  const cellIndex = index > 4 ? index - 1 : index;
                  const cell = mandalaGrid.majorCells[cellIndex];
                  const hasContent = !!cell?.title;
                  
                  return (
                    <div
                      key={index}
                      className={`relative aspect-square overflow-hidden flex items-center justify-center transition-all duration-500 ${
                        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
                      }`}
                      style={{
                        borderRadius: 'clamp(12px, 3vw, 20px)',
                        boxShadow: '0px 4px 12px 0px rgba(72, 82, 84, 0.1)',
                        border: 'none',
                        background: '#FFFFFF',
                        transitionDelay: `${300 + index * 50}ms`,
                        padding: 'clamp(4px, 1vw, 8px)'
                      }}
                    >
                      <p
                        className={`relative z-10 text-center font-medium line-clamp-3 whitespace-pre-line ${
                          hasContent  // ★ isCompletedの条件を削除
                            ? "text-primary"
                            : "text-text/50"
                        }`}
                        style={{
                          fontSize: 'clamp(8px, 1.8vw, 12px)',
                          lineHeight: 'clamp(12px, 2.5vw, 16px)'
                        }}
                      >
                        {hasContent ? formatTitleBy8Chars(cell!.title) : ""}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 予実管理（年次PL） セクション */}
            <div
              className={`bg-gradient-to-br bg-background to-primary/5 cursor-pointer group rounded-card-lg transition-all ${
                isVisible ? 'opacity-100 translate-x-0 duration-700' : 'opacity-0 translate-x-8 duration-700'
              } hover:shadow-card-hover hover:-translate-y-2 hover:scale-[1.02] hover:duration-150 hover:ease-out`}
              style={{ 
                boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
                transitionDelay: animationComplete ? '0ms' : '1000ms',
                padding: 'clamp(16px, 4vw, 24px)'
              }}
              onClick={() => navigate("/yearlyBudgetActual")}
            >
              <div 
                className="flex items-start justify-between"
                style={{
                  marginBottom: 'clamp(12px, 3vw, 16px)'
                }}
              >
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <img
                    src={plIcon}
                    alt="PL"
                    style={{
                      width: 'clamp(32px, 6vw, 40px)',
                      height: 'clamp(32px, 6vw, 40px)',
                      borderRadius: '50%',
                      objectFit: 'cover'
                    }}
                  />
                  <div>
                    <h2 
                      className="font-bold text-text"
                      style={{
                        fontSize: 'clamp(16px, 3.5vw, 20px)'
                      }}
                    >
                      年次PL
                    </h2>
                  </div>
                </div>
              </div>

              {/* 年間の予実 */}
              <div 
                className="bg-background rounded-card-lg"
                style={{ 
                  boxShadow: '0 1px 6px rgba(0, 0, 0, 0.06)',
                  padding: 'clamp(12px, 3vw, 16px)',
                  marginBottom: 'clamp(12px, 3vw, 16px)'
                }}
              >
                <div 
                  className="text-text/70"
                  style={{
                    fontSize: 'clamp(10px, 2.5vw, 12px)',
                    marginBottom: 'clamp(8px, 2vw, 12px)'
                  }}
                >
                  FY{currentYearData.fiscalYear}の実績
                </div>

                {/* 売上 */}
                <div style={{ marginBottom: 'clamp(12px, 3vw, 16px)' }}>
                  <div 
                    className="flex items-center justify-between"
                    style={{
                      marginBottom: 'clamp(6px, 1.5vw, 8px)'
                    }}
                  >
                    <span 
                      className="font-semibold text-text"
                      style={{
                        fontSize: 'clamp(12px, 2.8vw, 14px)'
                      }}
                    >
                      売上(年間)
                    </span>
                    <span 
                      className="font-bold text-primary"
                      style={{
                        fontSize: 'clamp(12px, 2.8vw, 14px)'
                      }}
                    >
                      {revenueRate}%
                    </span>
                  </div>
                  <div 
                    className="w-full bg-gray-200 rounded-full overflow-hidden"
                    style={{
                      height: 'clamp(6px, 1.5vw, 8px)'
                    }}
                  >
                    <div
                      className={`bg-gradient-to-r from-primary to-primary/80 h-full rounded-full transition-all duration-1000 ${
                        isVisible ? 'w-full' : 'w-0'
                      }`}
                      style={{ 
                        width: isVisible ? `${Math.min(revenueRate, 100)}%` : '0%',
                        transitionDelay: '500ms'
                      }}
                    />
                  </div>
                  <div 
                    className="flex justify-between text-text/70"
                    style={{
                      marginTop: 'clamp(4px, 1vw, 4px)',
                      fontSize: 'clamp(9px, 2vw, 10px)'
                    }}
                  >
                    <span>
                      実績: {formatCurrency(currentYearData.revenueActual)}円
                    </span>
                    <span>
                      目標: {formatCurrency(currentYearData.revenueTarget)}円
                    </span>
                  </div>
                </div>

                {/* 粗利益 */}
                <div style={{ marginBottom: 'clamp(12px, 3vw, 16px)' }}>
                  <div 
                    className="flex items-center justify-between"
                    style={{
                      marginBottom: 'clamp(6px, 1.5vw, 8px)'
                    }}
                  >
                    <span 
                      className="font-semibold text-text"
                      style={{
                        fontSize: 'clamp(12px, 2.8vw, 14px)'
                      }}
                    >
                      粗利益(年間)
                    </span>
                    <span 
                      className="font-bold text-primary"
                      style={{
                        fontSize: 'clamp(12px, 2.8vw, 14px)'
                      }}
                    >
                      {grossProfitRate}%
                    </span>
                  </div>
                  <div 
                    className="w-full bg-gray-200 rounded-full overflow-hidden"
                    style={{
                      height: 'clamp(6px, 1.5vw, 8px)'
                    }}
                  >
                    <div
                      className={`bg-gradient-to-r from-primary to-primary/80 h-full rounded-full transition-all duration-1000 ${
                        isVisible ? 'w-full' : 'w-0'
                      }`}
                      style={{ 
                        width: isVisible ? `${Math.min(grossProfitRate, 100)}%` : '0%',
                        transitionDelay: '700ms'
                      }}
                    />
                  </div>
                  <div 
                    className="flex justify-between text-text/70"
                    style={{
                      marginTop: 'clamp(4px, 1vw, 4px)',
                      fontSize: 'clamp(9px, 2vw, 10px)'
                    }}
                  >
                    <span>
                      実績: {formatCurrency(currentYearData.grossProfitActual)}円
                    </span>
                    <span>
                      目標: {formatCurrency(currentYearData.grossProfitTarget)}円
                    </span>
                  </div>
                </div>

                {/* 営業利益 */}
                <div>
                  <div 
                    className="flex items-center justify-between"
                    style={{
                      marginBottom: 'clamp(6px, 1.5vw, 8px)'
                    }}
                  >
                    <span 
                      className="font-semibold text-text"
                      style={{
                        fontSize: 'clamp(12px, 2.8vw, 14px)'
                      }}
                    >
                      営業利益(年間)
                    </span>
                    <span 
                      className="font-bold text-primary"
                      style={{
                        fontSize: 'clamp(12px, 2.8vw, 14px)'
                      }}
                    >
                      {operatingProfitRate}%
                    </span>
                  </div>
                  <div 
                    className="w-full bg-gray-200 rounded-full overflow-hidden"
                    style={{
                      height: 'clamp(6px, 1.5vw, 8px)'
                    }}
                  >
                    <div
                      className={`bg-gradient-to-r from-primary to-primary/80 h-full rounded-full transition-all duration-1000 ${
                        isVisible ? 'w-full' : 'w-0'
                      }`}
                      style={{
                        width: isVisible ? `${Math.min(operatingProfitRate, 100)}%` : '0%',
                        transitionDelay: '900ms'
                      }}
                    />
                  </div>
                  <div 
                    className="flex justify-between text-text/70"
                    style={{
                      marginTop: 'clamp(4px, 1vw, 4px)',
                      fontSize: 'clamp(9px, 2vw, 10px)'
                    }}
                  >
                    <span>
                      実績: {formatCurrency(currentYearData.operatingProfitActual)}円
                    </span>
                    <span>
                      目標: {formatCurrency(currentYearData.operatingProfitTarget)}円
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Information セクション */}        
        <div 
          className={`rounded-card-lg transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ 
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
            transitionDelay: '1500ms',
            padding: 'clamp(16px, 4vw, 24px)'
          }}
        >
          <h2 
            className="font-bold text-text"
            style={{
              fontSize: 'clamp(16px, 3.5vw, 20px)',
              marginBottom: 'clamp(12px, 3vw, 16px)'
            }}
          >
            Information
          </h2>
          <div 
            className="grid grid-cols-1 md:grid-cols-3"
            style={{
              gap: 'clamp(12px, 3vw, 16px)'
            }}
          >
            {[
              { img: banner_1, link: 'https://etomoji.co.jp/kanaeru/' },
              { img: banner_2, link: 'https://etomoji.co.jp/hataraku-guild/' },
              { img: banner_3, link: 'https://etomoji.co.jp/' }
            ].map((banner, index) => (
              <a      
                key={index}
                href={banner.link}
                target="_blank"
                rel="noopener noreferrer"
                className={`block bg-background rounded-card-lg overflow-hidden transition-all ${
                  isVisible ? 'opacity-100 scale-100 duration-300' : 'opacity-0 scale-95 duration-300'
                } hover:shadow-card-hover hover:-translate-y-2 hover:scale-[1.03] hover:duration-150 hover:ease-out`}
                style={{ 
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                  transitionDelay: animationComplete ? '0ms' : `${400 + index * 100}ms`,
                  aspectRatio: '16 / 9',
                  width: '100%',
                }}
              >
                <img
                  src={banner.img}
                  alt={`Banner ${index + 1}`}
                  className="w-full h-full"
                  style={{
                    objectFit: 'contain',  // cover → contain に変更
                    //backgroundColor: '#13AE67',  // 背景色を追加（余白部分）
                    imageRendering: '-webkit-optimize-contrast'
                  }}
                />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;