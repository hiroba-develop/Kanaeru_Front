import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import YearlyBudgetActual from "./pages/YearlyBudgetActual";
import MonthlyBudgetActual from "./pages/MonthlyBudgetActual";
import Support from "./pages/Support";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import PasswordResetRequest from "./pages/PasswordResetRequest";
import PasswordReset from "./pages/PasswordReset";
import Setup from "./pages/Setup";
import Contact from "./pages/Contact";
import Terms from "./pages/Terms";
import PlanselectModal, { type PlanId } from "./components/PlanselectModal";
import TutorialModal from "./components/TutorialModal";
// import Ranking from "./pages/Ranking";
//import ClientManagement from "./pages/ClientManagement";
import AdminUserManagement from "./pages/AdminUserManagement";
import UserManagement from "./pages/UserManagement";
import MandalaChart from "./pages/MandalaChart";
import SwipeChoiceComponent from "./pages/SwipeChoiceComponent";
import SimulationScreen from "./pages/SimulationScreen";
import { useEffect, useState } from "react";
import { Service } from "./api/services/Service";
import { StripeService } from "./api/services/StripeService";
import { withErrorHandling } from "./utils/apiErrorHandler";
import { getCurrentJSTISOString } from "./utils/dateUtils";

// Cookie取得ヘルパー関数
const getCookie = (name: string): string | null => {
  try {
    const localValue = localStorage.getItem(name);
    if (localValue) {
      return localValue;
    }
  } catch (e) {
    console.error("localStorage読取エラー:", e);
  }
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      const value = c.substring(nameEQ.length, c.length);
      return value;
    }
  }
  return null;
};

// 認証が必要なページをラップするコンポーネント
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, isLoading, shouldRedirectToLogin } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (shouldRedirectToLogin) {
    // ログアウト・セッション切れ起因はfromを保存しない
    return <Navigate to="/login" replace />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// サポート画面専用ルート
// - 未認証 → ログイン画面（from を保持してリダイレクト）
// - role:0/3（無料ユーザー）→ HOME
// - role:4（有料一般ユーザー）→ 自分のサポート画面のみ（userId パラメーターは無視）
// - role:1/2（管理者）→ userId パラメーター付きでそのユーザーとの画面を表示
//
// shouldRedirectToLogin は「cookie なし」「セッション切れ」どちらでも true になるが
// その際は必ず user = null になるため、!user のみで判定して常に from を保持する
const SupportRoute: React.FC = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 無料ユーザー（role:0/3）はサポート画面へのアクセス不可
  if (user.role === "0" || user.role === "3") {
    return <Navigate to="/" replace />;
  }

  return (
    <Layout>
      <Support />
    </Layout>
  );
};

// メインアプリケーションコンポーネント
const AppContent: React.FC = () => {
  const { showTermsModal, closeTermsModal, logout, user, handlePlanUpgrade } = useAuth();
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  useEffect(() => {
    if (showTermsModal) return;
    if (!user) return; // ← 追加：ユーザーがいない場合はスキップ
  
    const flag =
      localStorage.getItem("showPlanSelectModal") ||
      document.cookie
        .split(";")
        .find(c => c.trim().startsWith("showPlanSelectModal="))
        ?.split("=")[1];
  
    if (flag === "true") {
      setShowPlanModal(true);
    }
  }, [showTermsModal, user]);

  const handlePlanModalClose = async () => {
    setShowPlanModal(false);
    document.cookie = "showPlanSelectModal=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    localStorage.removeItem("showPlanSelectModal");
  
    // チュートリアルcookieが残っていれば表示
    const tutFlag = localStorage.getItem("showTutorialModal");
    if (tutFlag === "true") {
      setShowTutorialModal(true);
    }
  
    if (user) {
      try {
        await StripeService.postApiStripeSubscriptionCancelIncomplete(user.id);
      } catch (err: any) {
        if (err?.status !== 404) {
          console.error("Stripeキャンセルエラー:", err);
        }
      }
    }
  };
  
  // ↓ onCompleteに渡す関数を別で作成
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const handlePlanComplete = async (plan: PlanId) => {
    if (plan === "paid") {
      handlePlanUpgrade();
      setShowUpgradeModal(true);
      setShowPlanModal(false);
      localStorage.removeItem("showPlanSelectModal");
      document.cookie = "showPlanSelectModal=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    } else {
      await handlePlanModalClose(); // ← これで無料選択時もチュートリアルが起動する
    }
  };

  // アップグレード完了モーダルを閉じたときもチュートリアルを起動
  const handleUpgradeModalClose = () => {
    setShowUpgradeModal(false);
    const tutFlag = localStorage.getItem("showTutorialModal");
    if (tutFlag === "true") {
      // チュートリアルが残っていれば表示し、チュートリアル終了時にリロード
      setShowTutorialModal(true);
    } else {
      // チュートリアルなしの場合は即リロードしてrole:4を反映
      window.location.reload();
    }
  };

  // チュートリアル完了
  const handleTutorialClose = () => {
    setShowTutorialModal(false);
    localStorage.removeItem("showTutorialModal");
    document.cookie = "showTutorialModal=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    // チュートリアル終了後にリロードしてrole:4を反映
    window.location.reload();
  };
  const location = useLocation();

  const handleTermsAgree = async () => {
    try {
      await withErrorHandling(() =>
        Service.postApiAuthTermsAgree({
          userId: user!.id,
          termsAgreedAt: getCurrentJSTISOString(),
        })
      );
      closeTermsModal();
      // 利用規約同意後にプラン選択Cookieが残っていれば開く
      const flag =
        localStorage.getItem("showPlanSelectModal") ||
        document.cookie
          .split(";")
          .find(c => c.trim().startsWith("showPlanSelectModal="))
          ?.split("=")[1];
      if (flag === "true") {
        setShowPlanModal(true);
      }
    } catch (err) {
      console.error("利用規約同意の更新に失敗しました", err);
    }
  };

  const handleLogout = async () => {
    const token = getCookie("authToken");
    if (token) {
      try {
        await withErrorHandling(() => Service.postApiAuthLogout({ token }));
      } catch (error) {
        console.error("ログアウトAPIの直接呼び出しに失敗:", error);
      }
    }
    await logout();
    closeTermsModal();
    sessionStorage.setItem("loggedOut", "true"); // 追加
    window.location.replace("/login");
  };

  // 検索エンジンボット対策の強化
  useEffect(() => {
    // User-Agentベースでのボット検出
    const userAgent = navigator.userAgent.toLowerCase();
    const isBot = /bot|crawler|spider|crawling/i.test(userAgent);

    if (isBot) {
      // ボットの場合は空のページを表示
      document.body.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: Arial, sans-serif;">
          <div style="text-align: center;">
            <h1>会員限定サイト</h1>
            <p>このサイトは会員限定です。</p>
            <p>アクセスには認証が必要です。</p>
          </div>
        </div>
      `;
      return;
    }

    // メタタグの動的追加（念のため）
    const metaRobots = document.querySelector('meta[name="robots"]');
    if (!metaRobots) {
      const meta = document.createElement("meta");
      meta.name = "robots";
      meta.content = "noindex, nofollow, noarchive, nosnippet, noimageindex";
      document.head.appendChild(meta);
    }

    // デモモード用のページタイトル設定
    document.title = "kanaeru";
  }, []);

  return (
    <>
      <Routes>
        {/* ログイン画面 */}
        <Route path="/login" element={<Login />} />

        {/* パスワードリセットリクエスト画面 */}
        <Route path="/password-reset-request" element={<PasswordResetRequest />} />
        
        {/* パスワード変更画面（トークンパラメータ付き） */}
        <Route path="/password-reset/:token" element={<PasswordReset />} />

        {/* 会員登録画面 */}
        <Route path="/setup" element={<Setup />} />

        {/* 利用規約画面 */}
        <Route path="/terms" element={<Terms />} />

        {/* お問い合わせ画面 */}
        <Route path="/contact" element={<Contact />} />

        {/* 認証が必要なページ */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/yearlyBudgetActual"
          element={
            <ProtectedRoute>
              <Layout>
                <YearlyBudgetActual />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/monthlyBudgetActual"
          element={
            <ProtectedRoute>
              <Layout>
                <MonthlyBudgetActual />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route path="/support" element={<SupportRoute />} />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Layout>
                <Settings />
              </Layout>
            </ProtectedRoute>
          }
        />
        {/* <Route
          path="/ranking"
          element={
            <ProtectedRoute>
              <Layout>
                <Ranking />
              </Layout>
            </ProtectedRoute>
          }
        /> */}
        <Route
          path="/adminUserManagement"
          element={
            <ProtectedRoute>
              <Layout>
                <AdminUserManagement />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/userManagement"
          element={
            <ProtectedRoute>
              <Layout>
                <UserManagement />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/mandalaChart"
          element={
            <ProtectedRoute>
              <Layout>
                <MandalaChart />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/swipeChoiceComponent"
          element={
            <ProtectedRoute>
              <Layout>
                <SwipeChoiceComponent />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/simulation"
          element={
            <ProtectedRoute>
              <Layout>
                <SimulationScreen />
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>

      {/* 利用規約同意モーダル */}
      {showTermsModal && location.pathname !== "/terms" && 
        (user?.role === "0" || user?.role === "3" || user?.role === "4") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black opacity-50" />
          <div
            className="relative bg-white rounded-3xl shadow-xl mx-4 p-6"
            style={{ width: "100%", maxWidth: "480px" }}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-3">
              利用規約の同意が必要です
            </h3>
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              サービスを継続してご利用いただくには、<br />
              利用規約およびプライバシーポリシーへの同意が必要です。
            </p>

            {/* 規約リンク */}
            <div
              className="rounded-xl p-4 mb-4 text-sm space-y-2"
              style={{ background: "#F9FAFB", border: "1px solid #E5E7EB" }}
            >
              <div>
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline"
                  style={{ color: "#13AE67" }}
                >
                  利用規約を確認する
                </a>
              </div>
              <div>
                <a
                  href="https://etomoji.co.jp/privacy-policy/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline"
                  style={{ color: "#13AE67" }}
                >
                  プライバシーポリシーを確認する
                </a>
              </div>
            </div>

            {/* ボタン */}
            <div className="flex gap-3">
              <button
                onClick={handleLogout}
                className="flex-1 py-3 rounded-full font-medium text-xs sm:text-sm"
                style={{ background: "#F3F4F6", color: "#6B7280" }}
              >
                同意しない（ログアウト）
              </button>
              <button
                onClick={handleTermsAgree}
                className="flex-1 py-3 rounded-full font-medium text-xs sm:text-sm text-white"
                style={{ background: "#13AE67" }}
              >
                同意して続ける
              </button>
            </div>
          </div>
        </div>
      )}
      {/* プラン選択モーダル（初回ログイン時） */}
      {showPlanModal && !showTermsModal && user && (user.role === "0" || user.role === "3") && (
        <PlanselectModal
        isOpen={showPlanModal}
        onClose={handlePlanModalClose}
        onComplete={handlePlanComplete}
        userId={user.id}
      />
      )}
      {/* アップグレード完了モーダル */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black opacity-50" onClick={handleUpgradeModalClose} />
          <div
            className="relative bg-white rounded-3xl shadow-xl p-8 text-center"
            style={{ width: "100%", maxWidth: "400px" }}
          >
            <div
              className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-5"
              style={{ background: "rgba(240,103,166,0.1)" }}
            >
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <path d="M8 20l8 8 16-16" stroke="#F067A6" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              アップグレード完了！🎉
            </h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              有料プランへの移行が完了しました。<br />
              メンターとの相談チャットや<br />アドバイス機能がご利用いただけます。
            </p>
            <button
              onClick={handleUpgradeModalClose}
              className="w-full py-3 rounded-full font-semibold text-sm text-white"
              style={{ background: "linear-gradient(135deg, #F067A6, #d44f8e)" }}
            >
              さっそく使ってみる
            </button>
          </div>
        </div>
      )}
      {/* チュートリアルモーダル（初回ログイン時） */}
      {showTutorialModal && (
        <TutorialModal onClose={handleTutorialClose} />
      )}
    </>
  );
};

function App() {
  // Viteのベースパスを取得
  const basename = import.meta.env.BASE_URL;

  return (
    <AuthProvider>
      <Router basename={basename}>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
