import React, { useState, useEffect } from "react";
import { Service } from "../api/services/Service";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  Users,
  Mail,
  Building2,
  Banknote,
  Briefcase,
  BookOpen,
  Calendar,
  ChevronRight,
  ArrowLeft,
  User,
  BarChart3,
} from "lucide-react";
import mandalaIcon from "../assets/mandala_icon.png";
import plIcon from "../assets/icon_pl.png"; 
import type {
  UserPerformanceData,
  RoadmapYear,
  SalesTarget,
} from "../types";
import type { UserListSchema } from "../api/models/UserListSchema";
import type { SettingSchema } from "../api/models/SettingSchema";

// UserListSchemaとSettingSchemaからUserPerformanceDataへのマッピング関数
const mapUserSchemaToUserPerformanceData = (
  userListSchema: UserListSchema,
  settingSchema?: SettingSchema
): UserPerformanceData => {
  // デフォルトのパフォーマンスデータ
  const defaultPerformance = {
    currentMonth: {
      sales: { target: 0, actual: 0, achievementRate: 0 },
      grossProfit: { target: 0, actual: 0, achievementRate: 0 },
      operatingProfit: { target: 0, actual: 0, achievementRate: 0 },
    },
    lastMonth: {
      sales: { target: 0, actual: 0, achievementRate: 0 },
      grossProfit: { target: 0, actual: 0, achievementRate: 0 },
      operatingProfit: { target: 0, actual: 0, achievementRate: 0 },
    },
    twoMonthsAgo: {
      sales: { target: 0, actual: 0, achievementRate: 0 },
      grossProfit: { target: 0, actual: 0, achievementRate: 0 },
      operatingProfit: { target: 0, actual: 0, achievementRate: 0 },
    },
  };

  // roleのマッピング
  const roleMap: Record<string, "一般ユーザー" | "管理者ユーザー" | "プラットフォームオーナー"> = {
    "0": "一般ユーザー",
    "1": "管理者ユーザー",
    "2": "プラットフォームオーナー",
  };

  // 会社規模のマッピング（数値から文字列へ）
  const companySizeMap: Record<string, "個人事業主" | "法人（従業員1-5名）" | "法人（従業員6-20名）" | "法人（従業員21名以上）"> = {
    "1": "個人事業主",
    "2": "法人（従業員1-5名）",
    "3": "法人（従業員6-20名）",
    "4": "法人（従業員21名以上）",
  };

  // 業界のマッピング（数値から文字列へ）
  const industryMap: Record<string, "IT・ソフトウェア" | "製造業" | "小売業" | "飲食業" | "サービス業" | "建設業" | "医療・福祉" | "教育" | "金融・保険" | "不動産" | "その他"> = {
    "1": "IT・ソフトウェア",
    "2": "製造業",
    "3": "小売業",
    "4": "飲食業",
    "5": "サービス業",
    "6": "建設業",
    "7": "医療・福祉",
    "8": "教育",
    "9": "金融・保険",
    "10": "不動産",
    "11": "その他",
  };

  // 財務知識レベルのマッピング（数値から文字列へ）
  const financialKnowledgeMap: Record<string, "初心者" | "基本レベル" | "中級レベル" | "上級レベル"> = {
    "1": "初心者",
    "2": "基本レベル",
    "3": "中級レベル",
    "4": "上級レベル",
  };

  // 決算月の計算（fiscalYearStartMonthから12ヶ月後）
  const fiscalYearEndMonth = settingSchema?.fiscalYearStartMonth 
    ? (settingSchema.fiscalYearStartMonth === 1 ? 12 : settingSchema.fiscalYearStartMonth - 1)
    : 3;

  // 事業開始年月の計算
  const businessStartDate = settingSchema?.fiscalYearStartYear && settingSchema?.fiscalYearStartMonth
    ? `${settingSchema.fiscalYearStartYear}-${String(settingSchema.fiscalYearStartMonth).padStart(2, "0")}`
    : undefined;

  return {
    userId: userListSchema.userId || "",
    userName: userListSchema.name || "",
    email: userListSchema.email || "",
    companyName: userListSchema.company || "",
    role: roleMap[userListSchema.role || "0"] || "一般ユーザー",
    avatar: userListSchema.userImageUrl || undefined,
    capital: settingSchema?.capital,
    companySize: settingSchema?.companySize ? companySizeMap[settingSchema.companySize] : undefined,
    industry: settingSchema?.industry ? industryMap[settingSchema.industry] : undefined,
    businessStartDate: businessStartDate,
    financialKnowledge: settingSchema?.financialKnowledge ? financialKnowledgeMap[settingSchema.financialKnowledge] : undefined,
    lastUpdated: userListSchema.updatedAt || userListSchema.createdAt || new Date().toISOString(),
    fiscalYearEndMonth: fiscalYearEndMonth,
    performance: defaultPerformance,
    hasComment: !!settingSchema?.lastAdminCommentDate,
    comment: "",
    commentDate: settingSchema?.lastAdminCommentDate || "",
    commentHistory: [],
    roadmap: generateDefaultRoadmap(),
    salesTargets: generateDefaultSalesTargets(),
    grossProfitMarginTarget: 40,
    operatingProfitMarginTarget: 20,
  };
};

const generateDefaultRoadmap = (): RoadmapYear[] => {
  const roadmap: RoadmapYear[] = [];
  for (let i = 0; i < 11; i++) {
    const year = 2024 + i;
    roadmap.push({ 
      year, 
      quarters: {
        1: { title: "", advice: "", details: [] },
        2: { title: "", advice: "", details: [] },
        3: { title: "", advice: "", details: [] },
        4: { title: "", advice: "", details: [] },
      }
    });
  }
  return roadmap;
};

const generateDefaultSalesTargets = (): SalesTarget[] => {
  return [
    { year: 2024, targetAmount: 0 },
    { year: 2025, targetAmount: 0 },
    { year: 2026, targetAmount: 0 },
    { year: 2027, targetAmount: 0 },
    { year: 2028, targetAmount: 0 },
    { year: 2029, targetAmount: 0 },
    { year: 2030, targetAmount: 0 },
    { year: 2031, targetAmount: 0 },
    { year: 2032, targetAmount: 0 },
    { year: 2033, targetAmount: 0 },
  ];
};

const UserManagement: React.FC = () => {
  const navigate = useNavigate();
  const { switchUser } = useAuth();
  const [selectedUser, setSelectedUser] = useState<UserPerformanceData | null>(null);
  const [users, setUsers] = useState<UserPerformanceData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const response = await Service.getApiGetUsers();
        
        if (response.responseStatus === 1 && response.userListSchema) {
          // userListSchemaとsettingListSchemaをuserIdでマッチング
          const mappedUsers = response.userListSchema.map((user) => {
            const setting = response.settingListSchema?.find(
              (s) => s.userId === user.userId
            );
            return mapUserSchemaToUserPerformanceData(user, setting);
          });
          setUsers(mappedUsers);
        } else {
          console.warn("ユーザー取得に失敗しました。");
          setUsers([]);
        }
      } catch (error) {
        console.error("ユーザー取得エラー:", error);
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const filteredAndSortedUsers = users.filter(
    (user) =>
      user.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.companyName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUserSelect = (user: UserPerformanceData) => {
    setSelectedUser(user);
  };

  // ユーザー詳細画面
  if (selectedUser) {
    const formatBusinessStartDate = (dateStr?: string) => {
      if (!dateStr) return "未設定";
      const [year, month] = dateStr.split("-");
      return `${year}年${month}月`;
    };

    const formatCapital = (capital?: number) => {
      if (!capital || capital <= 0) return "未設定";
      return capital.toLocaleString("ja-JP") + "円";
    };

    return (
      <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedUser(null)}
            className="flex items-center space-x-2 text-[#13AE67] hover:text-[#13AE67]/80 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>ユーザー一覧に戻る</span>
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-[#13AE67]/10 flex items-center justify-center overflow-hidden" style={{ width: '64px', height: '64px', minWidth: '64px', minHeight: '64px' }}>
                {selectedUser.avatar ? (
                  <img
                    src={selectedUser.avatar}
                    alt={selectedUser.userName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="h-8 w-8 text-[#13AE67]" />
                )}
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                  {selectedUser.userName || "未設定"}
                </h2>
                <p className="text-sm text-gray-500">
                  {selectedUser.companyName || "会社名 未設定"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* マンダラチャートへのリンク */}
              <button
                onClick={() => {
                  switchUser(selectedUser.userId);
                  navigate("/mandalaChart");
                }}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="kanaeruマンダラ"
              >
                <img
                  src={mandalaIcon}
                  alt="マンダラ"
                  className="w-10 h-10"
                  style={{
                    borderRadius: '50%',
                    objectFit: 'cover'
                  }}
                />
              </button>
              {/* 年次PLへのリンク */}
              <button
                onClick={() => {
                  switchUser(selectedUser.userId);
                  navigate("/yearlyBudgetActual");
                }}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="年次PL"
              >
                <img
                  src={plIcon}
                  alt="PL"
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    objectFit: 'cover'
                  }}
                />
              </button>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6 mt-2" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-gray-500 tracking-wide uppercase">
                  メールアドレス
                </div>
                <div className="mt-1 text-sm font-medium text-gray-900 break-all">
                  {selectedUser.email || "未設定"}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-gray-500 tracking-wide uppercase">
                  ユーザー名
                </div>
                <div className="mt-1 text-sm font-medium text-gray-900">
                  {selectedUser.userName || "未設定"}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-gray-500 tracking-wide uppercase">
                  会社名
                </div>
                <div className="mt-1 text-sm font-medium text-gray-900">
                  {selectedUser.companyName || "未設定"}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Banknote className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-gray-500 tracking-wide uppercase">
                  資本金
                </div>
                <div className="mt-1 text-sm font-medium text-gray-900">
                  {formatCapital(selectedUser.capital)}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-gray-500 tracking-wide uppercase">
                  会社規模
                </div>
                <div className="mt-1">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {selectedUser.companySize || "未設定"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Briefcase className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-gray-500 tracking-wide uppercase">
                  業界
                </div>
                <div className="mt-1">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {selectedUser.industry || "未設定"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-gray-500 tracking-wide uppercase">
                  事業開始年月
                </div>
                <div className="mt-1 text-sm font-medium text-gray-900">
                  {formatBusinessStartDate(selectedUser.businessStartDate)}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <BookOpen className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-gray-500 tracking-wide uppercase">
                  財務・会計の知識レベル
                </div>
                <div className="mt-1">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#13AE67]/10 text-[#13AE67]">
                    {selectedUser.financialKnowledge || "未設定"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ユーザー一覧画面
  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8 py-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-text">
          ユーザー管理
        </h1>
        <div className="text-sm text-text/70">
          登録ユーザー数: {users.length}名
        </div>
      </div>

      {/* ローディング表示 */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text/70">データを読み込んでいます...</p>
        </div>
      ) : (
        <>
          {/* 検索 */}
          <div className="card">
            <input
              type="text"
              placeholder="ユーザー名または事業名で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* ユーザー一覧 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedUsers.map((user) => (
              <div
              key={user.userId}
              className="card hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-[#13AE67]"
              onClick={() => handleUserSelect(user)}
            >
              <div className="flex items-start justify-between mb-4 gap-2">
                <div className="flex items-start space-x-3 min-w-0 flex-1">
                  <div className="bg-primary/10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0" style={{ width: '56px', height: '56px', minWidth: '56px', minHeight: '56px' }}>
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.userName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-text truncate">
                      {user.userName}
                    </h3>
                    <p className="text-sm text-text/70 truncate">{user.email}</p>
                    <p className="text-sm text-text/70 truncate">{user.companyName}</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-text/40 flex-shrink-0 mt-1" />
              </div>
            
              <div className="flex justify-between items-center gap-2">
                <span className="text-sm text-text/70 flex-shrink-0">事業開始年月</span>
                <span className="text-sm font-medium text-primary text-right">
                  {user.businessStartDate
                    ? `${user.businessStartDate.split("-")[0]}年${
                        user.businessStartDate.split("-")[1]
                      }月`
                    : "未設定"}
                </span>
              </div>
            </div>
            ))}
          </div>

          {filteredAndSortedUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-text/30 mx-auto mb-4" />
              <p className="text-text/70">
                該当するユーザーが見つかりませんでした
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UserManagement;
