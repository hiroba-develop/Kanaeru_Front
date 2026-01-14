// 財務データ関連の型定義
export interface FinancialData {
  month: string;
  year: number;
  revenue: number;
  profit: number;
  expenses: number;
  customers: number;
}

// KPI関連の型定義
export interface KPIData {
  title: string;
  value: string;
  change: string;
  trend: "up" | "down" | "neutral";
  color: string;
  status: "success" | "warning" | "error" | "info";
}

// ロードマップ関連の型定義
export interface YearlyTarget {
  year: number;
  netWorth: number; // 純資産
  revenue: number; // 売上
  profit: number; // 事業の利益
  employees: number;
  phase: BusinessPhase;
}

export type BusinessPhase = "創業期" | "成長期" | "拡大期" | "安定期";

// 通知・タスク関連の型定義
export interface Task {
  id: number;
  name: string;
  day: number;
  enabled: boolean;
  completed?: boolean; // タスクの完了状態を追加
  type: TaskType;
}

export type TaskType = "revenue" | "expense" | "analysis" | "report" | "custom";

// 相談・サポート関連の型定義
export interface Consultation {
  id: number;
  date: string;
  advisor: string;
  topic: string;
  status: ConsultationStatus;
  notes?: string;
}

export type ConsultationStatus = "予約済み" | "完了" | "キャンセル";

export interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
  helpful: number;
}

// ユーザー関連の型定義
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  company: string;
  createdAt: Date;
  lastLogin: Date;
}

// 設定関連の型定義
export interface NotificationSettings {
  email: boolean;
  browser: boolean;
  mobile: boolean;
  frequency: "immediate" | "daily" | "weekly";
}

export interface YayoiSettings {
  connected: boolean;
  apiKey: string;
  autoSync: boolean;
  syncFrequency: "hourly" | "daily" | "weekly";
  lastSync?: Date;
}

// APIレスポンス関連の型定義
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

// チャート関連の型定義
export interface ChartData {
  name: string;
  value: number;
  color?: string;
}

export interface TimeSeriesData extends ChartData {
  date: string;
  target?: number;
  actual?: number;
}

// アラート関連の型定義
export interface Alert {
  id: number;
  type: AlertType;
  title: string;
  message: string;
  severity: AlertSeverity;
  createdAt: Date;
  read: boolean;
  actionUrl?: string;
}

export type AlertType =
  | "target_miss"
  | "revenue_drop"
  | "expense_increase"
  | "system"
  | "reminder";
export type AlertSeverity = "low" | "medium" | "high" | "critical";

// 認証関連の型定義
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  isSetupComplete: boolean;
  createdAt: Date;
  lastLogin: Date;
  role?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface GoogleAuthRequest {
  idToken: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
  refreshToken: string;
}

// 初期設定関連の型定義
export interface InitialSetup {
  userName: string; // ユーザー名を追加
  email: string; // メールアドレスを追加
  companyName: string; // 会社名（必須に変更）
  phoneNumber: string; // 電話番号を追加
  password: string; // パスワードを追加
  passwordConfirm: string; // パスワード確認を追加
  currentAssets: number;
  companySize: CompanySize;
  fiscalYearStartMonth: number;
  fiscalYearStartYear: number; // 事業年度開始年を追加
  industry: Industry;
  financialKnowledge: FinancialKnowledge;
  capital?: number;
}

export type CompanySize =
  | "個人事業主"
  | "法人（従業員1-5名）"
  | "法人（従業員6-20名）"
  | "法人（従業員21名以上）";

export type Industry =
  | "IT・ソフトウェア"
  | "製造業"
  | "小売業"
  | "飲食業"
  | "サービス業"
  | "建設業"
  | "医療・福祉"
  | "教育"
  | "金融・保険"
  | "不動産"
  | "その他";

export type FinancialKnowledge =
  | "初心者"
  | "基本レベル"
  | "中級レベル"
  | "上級レベル";

export type UserRole =
  | "一般ユーザー"
  | "管理者ユーザー"
  | "プラットフォームオーナー";

export interface CommentHistory {
  id: string;
  comment: string;
  date: string;
  yearMonth: string; // YYYY-MM形式
}

export interface PerformanceMetrics {
  target: number;
  actual: number;
  achievementRate: number;
}

export interface MonthlyPerformance {
  sales: PerformanceMetrics;
  grossProfit: PerformanceMetrics;
  operatingProfit: PerformanceMetrics;
}

export interface YoYPerformance {
  sales: number;
  grossProfit: number;
  operatingProfit: number;
}

export interface RoadmapAdvice {
  title: string;
  advice: string;
  details: string[];
}

export interface RoadmapQuarter {
  [quarter: number]: RoadmapAdvice;
}

export interface RoadmapYear {
  year: number;
  quarters: RoadmapQuarter;
}

export interface SalesTarget {
  year: number;
  targetAmount: number;
}

export interface UserPerformanceData {
  userId: string;
  userName: string;
  email: string;
  password?: string;
  companyName: string; // businessName を companyName に統一
  role: UserRole;
  phoneNumber?: string;
  capital?: number;
  companySize?: CompanySize;
  industry?: Industry;
  businessStartDate?: string;
  financialKnowledge?: FinancialKnowledge; // knowledgeLevel を financialKnowledge に統一
  lastUpdated: string;
  fiscalYearEndMonth: number; // 決算月（1-12）
  performance: {
    currentMonth: MonthlyPerformance;
    lastMonth: MonthlyPerformance;
    twoMonthsAgo: MonthlyPerformance;
    yoyCurrentMonth?: YoYPerformance;
    yoyLastMonth?: YoYPerformance;
    yoyTwoMonthsAgo?: YoYPerformance;
  };
  hasComment: boolean;
  comment: string;
  commentDate: string;
  goodPoint?: string;
  cautionPoint?: string;
  badPoint?: string;
  commentHistory: CommentHistory[];
  roadmap: RoadmapYear[];
  salesTargets: SalesTarget[];
  grossProfitMarginTarget?: number;
  operatingProfitMarginTarget?: number;
}

// 設定ステップ関連
export interface SetupStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
}

// ランキング・表彰システム関連の型定義
export interface RankingSettings {
  isParticipating: boolean; // ランキング参加の可否
  isAnonymous: boolean; // 匿名表示の可否
  allowBenchmarking: boolean; // ベンチマーキング参加
  notificationEnabled: boolean; // ランキング通知の有効/無効
}

export interface CompanyRanking {
  id: string;
  rank: number;
  companyName?: string; // 匿名の場合は"A社"など
  isAnonymous: boolean;
  industry: Industry;
  companySize: CompanySize;
  foundingYear: number; // 創業年
  totalScore: number;
  netWorthFormationRate: number; // 純資産形成率
  revenueGrowthRate: number; // 売上成長率
  profitMarginImprovement: number; // 利益率改善
  targetAchievementRate: number; // 目標達成率
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  iconUrl?: string;
  unlockedAt?: Date;
}

export type BadgeCategory =
  | "performance" // パフォーマンスバッジ
  | "achievement" // 達成バッジ
  | "rare" // レアバッジ
  | "special"; // 特別賞

export type BadgeRarity = "common" | "rare" | "epic" | "legendary";

export interface Award {
  id: string;
  name: string;
  category: AwardCategory;
  period: AwardPeriod;
  year: number;
  month?: number; // 月次表彰の場合
  quarter?: number; // 四半期表彰の場合
  rank: number; // 1位、2位、3位
  companyId: string;
  companyName?: string; // 匿名の場合は表示されない
  isAnonymous: boolean;
}

export type AwardCategory =
  | "overall" // 総合
  | "industry" // 業界別
  | "size" // 規模別
  | "growth" // 成長率
  | "profit" // 利益率
  | "stability" // 安定経営
  | "special"; // 特別賞

export type AwardPeriod = "monthly" | "quarterly" | "annual";

export interface RankingCategory {
  id: string;
  name: string;
  description: string;
  type: RankingType;
}

export type RankingType =
  | "overall" // 総合ランキング
  | "industry" // 業界別
  | "size" // 規模別
  | "founding" // 創業年数別
  | "revenue" // 売上成長率
  | "profit" // 利益率改善
  | "net_worth" // 純資産形成率
  | "target"; // 目標達成率

export interface BenchmarkData {
  industry: Industry;
  companySize: CompanySize;
  averageScore: number;
  medianScore: number;
  topPercentileScore: number; // 上位10%の平均
  averageRevenueGrowth: number;
  averageProfitMargin: number;
  averageNetWorthFormation: number;
  averageTargetAchievement: number;
  participantCount: number;
}

export interface UserRankingData {
  currentRank: number;
  totalParticipants: number;
  totalScore: number;
  scoreBreakdown: {
    netWorthFormationRate: number;
    revenueGrowthRate: number;
    profitMarginImprovement: number;
    targetAchievementRate: number;
  };
  categoryRankings: {
    category: RankingType;
    rank: number;
    totalParticipants: number;
  }[];
  earnedBadges: Badge[];
  recentAwards: Award[];
  benchmarkData: BenchmarkData;
}

// マンダラチャート関連の型定義
export interface MandalaGoal {
  id: string;
  title: string;
  description?: string;
  feeling?: string; // なぜこの目標を立てたのか
  level: 'major' | 'middle' | 'minor'; // 大目標/中目標/小目標
  parentId?: string; // 親目標のID
  position: number; // 1-8の位置（中央は0）
  achievement: number; // 0-100の達成度
  status: 'not_started' | 'in_progress' | 'achieved'; // 未着手/進行中/達成
  createdAt: Date;
  updatedAt: Date;
  achievedAt?: Date; // 達成日時
}

export interface MandalaMajorGoal extends MandalaGoal {
  level: 'major';
  middleGoals: MandalaMiddleGoal[]; // 8つの中目標
}

export interface MandalaMiddleGoal extends MandalaGoal {
  level: 'middle';
  minorGoals: MandalaMinorGoal[]; // 8つの小目標
}

export interface MandalaMinorGoal extends MandalaGoal {
  level: 'minor';
  isChecked: boolean; // ToDo的なチェック状態
  linkedToYearlyTarget?: boolean; // 年次予実管理との連動フラグ
}

export interface MandalaChartData {
  centerGoal: MandalaMajorGoal; // 中央の最終目標
  createdAt: Date;
  updatedAt: Date;
}

// 予実管理との連動データ
export interface YearlyTargetLink {
  mandalaGoalId: string; // マンダラの目標ID（大目標or中目標）
  yearlyTargetId: string; // 年次予実の目標ID
  linkType: 'revenue' | 'profit' | 'custom'; // 売上/利益/カスタム
  createdAt: Date;
}