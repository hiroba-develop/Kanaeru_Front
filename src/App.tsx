import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import YearlyBudgetActual from "./pages/YearlyBudgetActual";
// import MonthlyBudgetActual from "./pages/MonthlyBudgetActual";
// import Support from "./pages/Support";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import PasswordResetRequest from "./pages/PasswordResetRequest";
import PasswordReset from "./pages/PasswordReset";
import Setup from "./pages/Setup";
import Contact from "./pages/Contact";
// import Ranking from "./pages/Ranking";
import ClientManagement from "./pages/ClientManagement";
import AdminUserManagement from "./pages/AdminUserManagement";
import UserManagement from "./pages/UserManagement";
import MandalaChart from "./pages/MandalaChart";
import SwipeChoiceComponent from "./pages/SwipeChoiceComponent";
import SimulationScreen from "./pages/SimulationScreen";
import { useEffect } from "react";

// 認証が必要なページをラップするコンポーネント
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, isLoading, shouldRedirectToLogin } = useAuth();

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

  // cookieに「userId」キーが無い場合は、必ずlogin画面に遷移
  if (shouldRedirectToLogin) {
    return <Navigate to="/login" replace />;
  }

  // ユーザーが存在しない場合はログイン画面に遷移
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 会員登録完了＝初期設定完了なので、セットアップチェックは不要

  return <>{children}</>;
};

// メインアプリケーションコンポーネント
const AppContent: React.FC = () => {
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
    <Routes>
      {/* ログイン画面 */}
      <Route path="/login" element={<Login />} />

      {/* パスワードリセットリクエスト画面 */}
      <Route path="/password-reset-request" element={<PasswordResetRequest />} />
      
      {/* パスワード変更画面（トークンパラメータ付き） */}
      <Route path="/password-reset/:token" element={<PasswordReset />} />

      {/* 会員登録画面 */}
      <Route path="/setup" element={<Setup />} />

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
      {/* <Route
        path="/monthlyBudgetActual"
        element={
          <ProtectedRoute>
            <Layout>
              <MonthlyBudgetActual />
            </Layout>
          </ProtectedRoute>
        }
      /> */}
      {/* <Route
        path="/support"
        element={
          <ProtectedRoute>
            <Layout>
              <Support />
            </Layout>
          </ProtectedRoute>
        }
      /> */}
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
        path="/clientManagement"
        element={
          <ProtectedRoute>
            <Layout>
              <ClientManagement />
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
