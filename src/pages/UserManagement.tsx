import React, { useState } from "react";
import { Plus, Trash2, Edit } from "lucide-react";
import type {
  CompanySize,
  Industry,
  FinancialKnowledge,
  UserPerformanceData,
  RoadmapYear,
  RoadmapQuarter,
  RoadmapAdvice,
  MonthlyPerformance,
  PerformanceMetrics,
  UserRole,
  SalesTarget,
} from "../types";

const defaultRoadmapYear1: RoadmapQuarter = {
  1: {
    title: "事業をスタートさせよう",
    advice: "個人事業主の届出や会社設立から始めよう",
    details: [
      "個人事業主の届出や会社設立の手続き",
      "「どんな商品・サービスを誰に売るか」を明確にする",
      "開業資金を準備する（自分のお金や借入）",
      "家計簿のような帳簿をつける仕組みを作る",
    ],
  },
  2: {
    title: "最初のお客様を見つけよう",
    advice: "実際に商品・サービスを売り始めよう",
    details: [
      "実際に商品・サービスを売り始める",
      "「いくら売れたか」を記録する",
      "毎月の売上と支出をチェックする習慣をつける",
      "確定申告の準備を始める",
    ],
  },
  3: {
    title: "売上を伸ばしていこう",
    advice: "お客様を増やす活動に力を入れよう",
    details: [
      "お客様を増やす活動に力を入れる",
      "「今月はいくら売りたいか」目標を決める",
      "お金の出入りを毎月チェックする",
      "税金の申告について勉強し始める",
    ],
  },
  4: {
    title: "1年目の成果を確認しよう",
    advice: "確定申告・決算を行おう",
    details: [
      "確定申告・決算を行う",
      "「1年間でいくら売れたか、いくら残ったか」を計算",
      "来年の目標を立てる",
      "貯金がどれくらい増えたかチェック",
    ],
  },
};

const defaultRoadmapYear2: RoadmapQuarter = {
  1: {
    title: "事業を安定させよう",
    advice: "既存のお客様との関係を大切にしよう",
    details: [
      "既存のお客様との関係を大切にする",
      "「来月はいくら売れそうか」予測の精度を上げる",
      "無駄な出費がないかチェックする",
      "人を雇うかどうか検討する",
    ],
  },
  2: {
    title: "事業を大きくする準備をしよう",
    advice: "スタッフを雇って教育しよう",
    details: [
      "スタッフを雇って教育する",
      "仕事の流れを整理して効率化する",
      "売上管理をもっと詳しくする",
      "3年後の目標を考える",
    ],
  },
  3: {
    title: "事業を広げよう",
    advice: "新しい商品・サービスを考えよう",
    details: [
      "新しい商品・サービスを考える",
      "営業活動を強化する",
      "「売上に対してどれくらい利益が出ているか」を改善",
      "設備投資を検討する",
    ],
  },
  4: {
    title: "経営の基盤を固めよう",
    advice: "2年目の決算・税務申告を行おう",
    details: [
      "2年目の決算・税務申告",
      "お金の流れをもっと詳しく分析",
      "来年の詳しい予算を作る",
      "個人の資産がどれくらい増えたかチェック",
    ],
  },
};

const generateDefaultRoadmap = (): RoadmapYear[] => {
  const roadmap: RoadmapYear[] = [];
  for (let i = 0; i < 11; i++) {
    const year = 2024 + i;
    if (year === 2024) {
      roadmap.push({ year, quarters: defaultRoadmapYear1 });
    } else if (year < 2034) {
      roadmap.push({ year, quarters: defaultRoadmapYear2 });
    } else {
      // 2034
      const goalAdvice: RoadmapAdvice = {
        title: "10年間のゴール",
        advice: "目標に向けて歩むあなたを、この場所で待っています。",
        details: [],
      };
      roadmap.push({
        year: 2034,
        quarters: {
          1: goalAdvice,
          2: goalAdvice,
          3: goalAdvice,
          4: goalAdvice,
        },
      });
    }
  }
  return roadmap;
};

const generateDefaultSalesTargets = (): SalesTarget[] => {
  return [
    { year: 2024, targetAmount: 8000000 },
    { year: 2025, targetAmount: 16000000 },
    { year: 2026, targetAmount: 24000000 },
    { year: 2027, targetAmount: 32000000 },
    { year: 2028, targetAmount: 40000000 },
    { year: 2029, targetAmount: 48000000 },
    { year: 2030, targetAmount: 56000000 },
    { year: 2031, targetAmount: 64000000 },
    { year: 2032, targetAmount: 72000000 },
    { year: 2033, targetAmount: 80000000 },
  ];
};

const generateDefaultPerformance = (): {
  currentMonth: MonthlyPerformance;
  lastMonth: MonthlyPerformance;
  twoMonthsAgo: MonthlyPerformance;
} => {
  const zeroMetrics: PerformanceMetrics = {
    target: 0,
    actual: 0,
    achievementRate: 0,
  };
  const zeroMonthly: MonthlyPerformance = {
    sales: zeroMetrics,
    grossProfit: zeroMetrics,
    operatingProfit: zeroMetrics,
  };
  return {
    currentMonth: zeroMonthly,
    lastMonth: zeroMonthly,
    twoMonthsAgo: zeroMonthly,
  };
};

const initialUsers: UserPerformanceData[] = [
  {
    userId: "normal-user-001",
    userName: "デモユーザー1",
    email: "normalUser1@example.com",
    role: "一般ユーザー",
    lastUpdated: "2023-01-15",
    companyName: "デモ会社A",
    fiscalYearEndMonth: 3,
    performance: generateDefaultPerformance(),
    hasComment: false,
    comment: "",
    commentDate: "",
    commentHistory: [],
    roadmap: generateDefaultRoadmap(),
    salesTargets: generateDefaultSalesTargets(),
  },
  {
    userId: "normal-user-002",
    userName: "デモユーザー2",
    email: "normalUser2@example.com",
    role: "一般ユーザー",
    lastUpdated: "2023-02-20",
    companyName: "デモ会社B",
    fiscalYearEndMonth: 3,
    performance: generateDefaultPerformance(),
    hasComment: false,
    comment: "",
    commentDate: "",
    commentHistory: [],
    roadmap: generateDefaultRoadmap(),
    salesTargets: generateDefaultSalesTargets(),
  },
  {
    userId: "tax-user-001",
    userName: "管理者ユーザー",
    email: "taxUser@example.com",
    role: "管理者ユーザー",
    lastUpdated: "2023-03-10",
    companyName: "税理士事務所",
    fiscalYearEndMonth: 12,
    performance: generateDefaultPerformance(),
    hasComment: false,
    comment: "",
    commentDate: "",
    commentHistory: [],
    roadmap: generateDefaultRoadmap(),
    salesTargets: generateDefaultSalesTargets(),
  },
  {
    userId: "admin-user-001",
    userName: "プラットフォームオーナー",
    email: "adminUser@example.com",
    role: "プラットフォームオーナー",
    lastUpdated: "2023-04-01",
    companyName: "ミエトル株式会社",
    fiscalYearEndMonth: 12,
    performance: generateDefaultPerformance(),
    hasComment: false,
    comment: "",
    commentDate: "",
    commentHistory: [],
    roadmap: generateDefaultRoadmap(),
    salesTargets: generateDefaultSalesTargets(),
  },
];

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserPerformanceData[]>(initialUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserPerformanceData | null>(
    null
  );
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const companySizeOptions: CompanySize[] = [
    "個人事業主",
    "法人（従業員1-5名）",
    "法人（従業員6-20名）",
    "法人（従業員21名以上）",
  ];

  const industryOptions: Industry[] = [
    "IT・ソフトウェア",
    "製造業",
    "小売業",
    "飲食業",
    "サービス業",
    "建設業",
    "医療・福祉",
    "教育",
    "金融・保険",
    "不動産",
    "その他",
  ];

  const financialKnowledgeOptions: FinancialKnowledge[] = [
    "初心者",
    "基本レベル",
    "中級レベル",
    "上級レベル",
  ];

  const initialNewUserState: Omit<
    UserPerformanceData,
    | "userId"
    | "lastUpdated"
    | "performance"
    | "hasComment"
    | "comment"
    | "commentDate"
    | "commentHistory"
    | "roadmap"
    | "salesTargets"
  > & { password?: string } = {
    userName: "",
    email: "",
    password: "",
    companyName: "",
    role: "管理者ユーザー",
    phoneNumber: "",
    capital: 0,
    companySize: "法人（従業員1-5名）",
    industry: "IT・ソフトウェア",
    businessStartDate: "",
    financialKnowledge: "初心者",
    fiscalYearEndMonth: 12,
  };

  const [newUser, setNewUser] = useState(initialNewUserState);

  const handleNewUserChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setNewUser((prev) => ({
      ...prev,
      [name]: name === "role" ? (value as UserRole) : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const closeModal = () => {
    setIsAddUserModalOpen(false);
    setNewUser(initialNewUserState);
    setErrors({});
  };

  const validateForm = (isEditMode = false) => {
    const newErrors: { [key: string]: string } = {};

    if (!newUser.userName) {
      newErrors.userName = "ユーザー名を入力してください。";
    }
    if (!newUser.companyName) {
      newErrors.companyName = "会社名を入力してください。";
    }

    if (!newUser.email) {
      newErrors.email = "メールアドレスを入力してください。";
    } else if (newUser.email.includes("@")) {
      newErrors.email = "メールアドレスに「@」は含めないでください。";
    }

    if (!isEditMode && !newUser.password) {
      newErrors.password = "パスワードを入力してください。";
    } else if (newUser.password && newUser.password.length <= 8) {
      newErrors.password = "パスワードは9文字以上で入力してください。";
    }

    if (newUser.phoneNumber && newUser.phoneNumber.includes("-")) {
      newErrors.phoneNumber = "電話番号にハイフン「-」は含めないでください。";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddNewUser = () => {
    if (!validateForm()) {
      return;
    }

    const newUserWithDefaults: UserPerformanceData = {
      userId: `user_${Date.now()}`,
      lastUpdated: new Date().toISOString().split("T")[0],
      performance: generateDefaultPerformance(),
      hasComment: false,
      comment: "",
      commentDate: "",
      commentHistory: [],
      roadmap: generateDefaultRoadmap(),
      salesTargets: generateDefaultSalesTargets(),
      ...newUser,
      role: newUser.role,
      capital:
        newUser.role === "一般ユーザー" ? Number(newUser.capital) : undefined,
      companySize:
        newUser.role === "一般ユーザー" ? newUser.companySize : undefined,
      industry: newUser.role === "一般ユーザー" ? newUser.industry : undefined,
      businessStartDate:
        newUser.role === "一般ユーザー" ? newUser.businessStartDate : undefined,
      financialKnowledge:
        newUser.role === "一般ユーザー"
          ? newUser.financialKnowledge
          : undefined,
    };

    setUsers((prevUsers) => [...prevUsers, newUserWithDefaults]);
    closeModal();
  };

  const handleOpenEditModal = (user: UserPerformanceData) => {
    setEditingUser(user);
    setNewUser({
      ...user,
      password: "",
    });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingUser(null);
    setNewUser(initialNewUserState);
    setErrors({});
  };

  const handleUpdateUser = () => {
    if (!editingUser) return;

    if (!validateForm(true)) {
      return;
    }

    setUsers((prevUsers) =>
      prevUsers.map((user) => {
        if (user.userId === editingUser.userId) {
          const updatedUser = {
            ...user,
            ...newUser,
            lastUpdated: new Date().toISOString().split("T")[0],
            capital:
              newUser.role === "一般ユーザー"
                ? Number(newUser.capital)
                : undefined,
            companySize:
              newUser.role === "一般ユーザー" ? newUser.companySize : undefined,
            industry:
              newUser.role === "一般ユーザー" ? newUser.industry : undefined,
            businessStartDate:
              newUser.role === "一般ユーザー"
                ? newUser.businessStartDate
                : undefined,
            financialKnowledge:
              newUser.role === "一般ユーザー"
                ? newUser.financialKnowledge
                : undefined,
          };
          if (!newUser.password) {
            delete (updatedUser as Partial<UserPerformanceData>).password;
          }
          return updatedUser;
        }
        return user;
      })
    );
    closeEditModal();
  };

  const filteredUsers = users.filter(
    (user) =>
      user.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteUser = (userId: string) => {
    if (window.confirm("本当にこのユーザーを削除しますか？")) {
      setUsers(users.filter((user) => user.userId !== userId));
    }
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
            ユーザー管理
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            ユーザーの追加、編集、削除を行います。
          </p>
        </div>
        <button
          onClick={() => setIsAddUserModalOpen(true)}
          className="mt-4 sm:mt-0 flex items-center justify-center bg-primary text-white font-medium py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          新規ユーザー追加
        </button>
      </div>

      {/* 検索 */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="ユーザー名またはメールアドレスで検索..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* ユーザーリスト */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-600">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3">
                ユーザー名
              </th>
              <th scope="col" className="px-6 py-3">
                メールアドレス
              </th>
              <th scope="col" className="px-6 py-3">
                権限
              </th>
              <th scope="col" className="px-6 py-3">
                登録日
              </th>
              <th scope="col" className="px-6 py-3 text-center">
                アクション
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr
                key={user.userId}
                className="bg-white border-b hover:bg-gray-50"
              >
                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                  {user.userName}
                </td>
                <td className="px-6 py-4">{user.email}</td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      user.role === "プラットフォームオーナー"
                        ? "bg-red-100 text-red-800"
                        : user.role === "管理者ユーザー"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4">{user.lastUpdated}</td>
                <td className="px-6 py-4 flex justify-center items-center space-x-2">
                  <button
                    onClick={() => handleOpenEditModal(user)}
                    className="p-2 text-gray-500 hover:text-primary transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user.userId)}
                    className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* 新規ユーザー追加モーダル */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 sm:p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">新規ユーザー追加</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {/* Role */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-text/70 mb-1">
                  権限 *
                </label>
                <select
                  name="role"
                  value={newUser.role}
                  onChange={handleNewUserChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option>管理者ユーザー</option>
                  <option>プラットフォームオーナー</option>
                </select>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-text/70 mb-1">
                  メールアドレス *
                </label>
                <input
                  type="text"
                  name="email"
                  value={newUser.email}
                  onChange={handleNewUserChange}
                  autoComplete="off"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-text/70 mb-1">
                  パスワード *
                </label>
                <input
                  type="text"
                  name="password"
                  value={newUser.password}
                  onChange={handleNewUserChange}
                  autoComplete="new-password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1">{errors.password}</p>
                )}
              </div>

              {/* User Name */}
              <div>
                <label className="block text-sm font-medium text-text/70 mb-1">
                  ユーザー名 *
                </label>
                <input
                  type="text"
                  name="userName"
                  value={newUser.userName}
                  onChange={handleNewUserChange}
                  autoComplete="off"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                {errors.userName && (
                  <p className="text-red-500 text-xs mt-1">{errors.userName}</p>
                )}
              </div>

              {/* Company Name */}
              <div>
                <label className="block text-sm font-medium text-text/70 mb-1">
                  会社名 *
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={newUser.companyName}
                  onChange={handleNewUserChange}
                  autoComplete="off"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                {errors.companyName && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.companyName}
                  </p>
                )}
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-text/70 mb-1">
                  電話番号(ハイフン無し)
                </label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={newUser.phoneNumber}
                  onChange={handleNewUserChange}
                  autoComplete="off"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                {errors.phoneNumber && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.phoneNumber}
                  </p>
                )}
              </div>

              {newUser.role === "一般ユーザー" && (
                <>
                  {/* Capital */}
                  <div>
                    <label className="block text-sm font-medium text-text/70 mb-1">
                      資本金 (円)
                    </label>
                    <input
                      type="number"
                      name="capital"
                      value={newUser.capital}
                      onChange={handleNewUserChange}
                      autoComplete="off"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  {/* Company Size */}
                  <div>
                    <label className="block text-sm font-medium text-text/70 mb-1">
                      会社規模
                    </label>
                    <select
                      name="companySize"
                      value={newUser.companySize}
                      onChange={handleNewUserChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      {companySizeOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Industry */}
                  <div>
                    <label className="block text-sm font-medium text-text/70 mb-1">
                      業界
                    </label>
                    <select
                      name="industry"
                      value={newUser.industry}
                      onChange={handleNewUserChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      {industryOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Business Start Date */}
                  <div>
                    <label className="block text-sm font-medium text-text/70 mb-1">
                      事業開始年月
                    </label>
                    <input
                      type="month"
                      name="businessStartDate"
                      value={newUser.businessStartDate}
                      onChange={handleNewUserChange}
                      autoComplete="off"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  {/* Knowledge Level */}
                  <div>
                    <label className="block text-sm font-medium text-text/70 mb-1">
                      財務・会計の知識レベル
                    </label>
                    <select
                      name="financialKnowledge"
                      value={newUser.financialKnowledge}
                      onChange={handleNewUserChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      {financialKnowledgeOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-4 mt-8">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleAddNewUser}
                className="px-4 py-2 text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ユーザー編集モーダル */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 sm:p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">ユーザー情報編集</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-text/70 mb-1">
                  メールアドレス *
                </label>
                <input
                  type="text"
                  name="email"
                  value={newUser.email}
                  onChange={handleNewUserChange}
                  autoComplete="off"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-text/70 mb-1">
                  パスワード (変更する場合のみ入力)
                </label>
                <input
                  type="text"
                  name="password"
                  value={newUser.password}
                  onChange={handleNewUserChange}
                  autoComplete="new-password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1">{errors.password}</p>
                )}
              </div>

              {/* User Name */}
              <div>
                <label className="block text-sm font-medium text-text/70 mb-1">
                  ユーザー名 *
                </label>
                <input
                  type="text"
                  name="userName"
                  value={newUser.userName}
                  onChange={handleNewUserChange}
                  autoComplete="off"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                {errors.userName && (
                  <p className="text-red-500 text-xs mt-1">{errors.userName}</p>
                )}
              </div>

              {/* Company Name */}
              <div>
                <label className="block text-sm font-medium text-text/70 mb-1">
                  会社名 *
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={newUser.companyName}
                  onChange={handleNewUserChange}
                  autoComplete="off"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                {errors.companyName && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.companyName}
                  </p>
                )}
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-text/70 mb-1">
                  電話番号(ハイフン無し)
                </label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={newUser.phoneNumber}
                  onChange={handleNewUserChange}
                  autoComplete="off"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                {errors.phoneNumber && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.phoneNumber}
                  </p>
                )}
              </div>

              {newUser.role === "一般ユーザー" && (
                <>
                  {/* Capital */}
                  <div>
                    <label className="block text-sm font-medium text-text/70 mb-1">
                      資本金 (円)
                    </label>
                    <input
                      type="number"
                      name="capital"
                      value={newUser.capital}
                      onChange={handleNewUserChange}
                      autoComplete="off"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  {/* Company Size */}
                  <div>
                    <label className="block text-sm font-medium text-text/70 mb-1">
                      会社規模
                    </label>
                    <select
                      name="companySize"
                      value={newUser.companySize}
                      onChange={handleNewUserChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      {companySizeOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Industry */}
                  <div>
                    <label className="block text-sm font-medium text-text/70 mb-1">
                      業界
                    </label>
                    <select
                      name="industry"
                      value={newUser.industry}
                      onChange={handleNewUserChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      {industryOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Business Start Date */}
                  <div>
                    <label className="block text-sm font-medium text-text/70 mb-1">
                      事業開始年月
                    </label>
                    <input
                      type="month"
                      name="businessStartDate"
                      value={newUser.businessStartDate}
                      onChange={handleNewUserChange}
                      autoComplete="off"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  {/* Knowledge Level */}
                  <div>
                    <label className="block text-sm font-medium text-text/70 mb-1">
                      財務・会計の知識レベル
                    </label>
                    <select
                      name="financialKnowledge"
                      value={newUser.financialKnowledge}
                      onChange={handleNewUserChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      {financialKnowledgeOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-4 mt-8">
              <button
                onClick={closeEditModal}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleUpdateUser}
                className="px-4 py-2 text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
              >
                更新
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
