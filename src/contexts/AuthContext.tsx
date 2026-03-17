import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import type { AuthUser, InitialSetup } from "../types";
import { setLogoutCallback, setSessionExpiredCallback } from "../utils/apiErrorHandler";

interface AuthContextType {
  user: AuthUser | null;
  userSetup: InitialSetup | null;
  isLoading: boolean;
  shouldRedirectToLogin: boolean;
  sessionExpired: boolean; // セッション期限切れフラグを追加
  clearSessionExpired: () => void; // フラグをクリアする関数
  login: (
    email: string,
    password: string,
    userId?: string,
    role?: string,
    token?: string,
    name?: string,
    userImageUrl?: string,
    termsAgreedAt?: string,
    lastLoginAt?: string | null
  ) => Promise<void>;
  completeSetup: (setupData: InitialSetup) => void;
  updateUserSetup: (setupData: Partial<InitialSetup>) => void;
  updateUser: (userData: Partial<AuthUser>) => void; // ユーザー情報を更新
  loadUserSetup: () => Promise<void>;
  logout: () => Promise<void>;
  // ユーザー切り替え機能
  managedUsers: AuthUser[];
  selectedUser: AuthUser | null;
  switchUser: (userId: string) => void;
  showTermsModal: boolean;
  setShowTermsModal: (v: boolean) => void;
  closeTermsModal: () => void;
  refreshUser: () => Promise<void>;
  handlePlanUpgrade: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// cookieを操作するためのユーティリティ関数
const setCookie = (name: string, value: string, hours: number = 24) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + hours * 60 * 60 * 1000);
  
  // HTTPSかどうかを判定
  const isSecure = window.location.protocol === 'https:';
  
  // SameSite=Laxに変更（StrictだとiOSで問題が発生する可能性がある）
  // HTTPS環境ではSecure属性を追加
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax${isSecure ? ';Secure' : ''}`;
  
  // localStorageにもバックアップ（Cookieが使えない場合の保険）
  try {
    localStorage.setItem(name, value);
  } catch (e) {
    console.error('localStorage保存エラー:', e);
  }
};

const getCookie = (name: string): string | null => {
  // iPhone/iOSではlocalStorageを優先（Cookieに問題がある場合が多いため）
  try {
    const localValue = localStorage.getItem(name);
    if (localValue) {
      return localValue;
    }
  } catch (e) {
    console.error('localStorage読取エラー:', e);
  }
  
  // localStorageに無い場合、Cookieから取得を試みる
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

const deleteCookie = (name: string) => {
  // HTTPSかどうかを判定
  const isSecure = window.location.protocol === 'https:';
  
  // Cookieを削除
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax${isSecure ? ';Secure' : ''}`;
  
  // localStorageからも削除
  try {
    localStorage.removeItem(name);
  } catch (e) {
    console.error('localStorage削除エラー:', e);
  }
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userSetup, setUserSetup] = useState<InitialSetup | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [shouldRedirectToLogin, setShouldRedirectToLogin] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [managedUsers, setManagedUsers] = useState<AuthUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AuthUser | null>(null);
  
  // ログアウト処理中フラグ（複数回実行を防ぐ）
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const closeTermsModal = () => {
    setShowTermsModal(false);
    deleteCookie("showTermsModal");
    setCookie("termsAgreedAt", new Date().toISOString(), 24 * 365);
  };

  // セッション期限切れフラグをクリアする関数
  const clearSessionExpired = () => {
    setSessionExpired(false);
  };

  // 401エラー時に呼ばれるログアウト処理
  const handleSessionExpired = async () => {
    // すでにログアウト処理中の場合は何もしない
    if (isLoggingOut) {
      return;
    }
    
    setIsLoggingOut(true);
    
    console.warn('セッションが期限切れになりました。');
    setSessionExpired(true);
    
    setUser(null);
    setUserSetup(null);
    setManagedUsers([]);
    setSelectedUser(null);
    
    // Cookieをクリア
    deleteCookie("userId");
    deleteCookie("userEmail");
    deleteCookie("role");
    deleteCookie("selectedUserId");
    deleteCookie("authToken");
    deleteCookie("userName");
    deleteCookie("userImageUrl");
    
    setShouldRedirectToLogin(true);
    
    // 処理完了後、フラグをリセット（次回のログアウトのため）
    setTimeout(() => {
      setIsLoggingOut(false);
    }, 1000);
  };

  // エラーハンドラーのコールバックを設定
  useEffect(() => {
    setLogoutCallback(handleSessionExpired);
    setSessionExpiredCallback(() => {
      setSessionExpired(true);
    });
  }, []);

  // restoreAuthState部分を修正
  useEffect(() => {
    const restoreAuthState = async () => {
      const userId = getCookie("userId");
      const token = getCookie("authToken");
      // ★ 追加
      if (token) {
              const { OpenAPI } = await import("../api/core/OpenAPI");
              OpenAPI.TOKEN = token;
      }
      const role = getCookie("role");
      const selectedUserId = getCookie("selectedUserId");
      const userName = getCookie("userName");
      const userImageUrl = getCookie("userImageUrl");
      const userEmail = getCookie("userEmail"); // ← 追加
      
      if (!userId) {
        setShouldRedirectToLogin(true);
        setIsLoading(false);
        return;
      }

      // Cookieから復元するだけ（APIは呼ばない）
      const userToSet: AuthUser = {
        id: userId,
        email: userEmail || "", // ← 修正
        name: userName || "",
        avatar: userImageUrl || undefined,
        isSetupComplete: true,
        createdAt: new Date(),
        lastLogin: new Date(),
        role: role || undefined,
      };

      setUser(userToSet);
      
      // 管理者の場合の処理
      if (role === "1" || role === "2") {
        // ユーザー一覧を取得
        const fetchManagedUsers = async () => {
          try {
            const { Service } = await import("../api/services/Service");
            const { withErrorHandling } = await import("../utils/apiErrorHandler");
            const response = await withErrorHandling(() => Service.getApiGetUsers());
            
            if (response.responseStatus === 1 && response.userListSchema) {
              // UserListSchemaをAuthUserに変換
              const managedUsersList: AuthUser[] = response.userListSchema
                .filter((u) => u.delFlg !== 1)
                .map((u) => ({
                  id: u.userId || "",
                  email: u.email || "",
                  name: u.name || "",
                  avatar: u.userImageUrl || undefined,
                  isSetupComplete: true,
                  createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
                  lastLogin: new Date(),
                  role: u.role || undefined,
                }));
              
              setManagedUsers(managedUsersList);
              
              // URL に Cookie と異なる userId が指定されている場合（別タブで別ユーザーを
              // 開いている状態で直リンクを開いた場合など）は Cookie を使わず null にする。
              // Support ページの useEffect が URL の userId で正しいユーザーに切り替える。
              const urlParams = new URLSearchParams(window.location.search);
              const urlUserId = urlParams.get("userId");
              const isSupportPath = window.location.pathname.includes("/support");
              const shouldIgnoreCookie =
                isSupportPath && !!urlUserId && urlUserId !== selectedUserId;

              if (selectedUserId && !shouldIgnoreCookie) {
                const userToSelect = managedUsersList.find((u) => u.id === selectedUserId);
                if (userToSelect) {
                  setSelectedUser(userToSelect);
                } else {
                  setSelectedUser(null);
                }
              } else {
                setSelectedUser(null);
              }
            } else {
              setManagedUsers([]);
              setSelectedUser(null);  // ★ 修正：nullに設定
            }
          } catch (error) {
            console.error("ユーザー一覧取得エラー:", error);
            setManagedUsers([]);
            setSelectedUser(null);  // ★ 修正：nullに設定
          } finally {
            setIsLoading(false);
          }
        };
        
        fetchManagedUsers();
      } else {
        setSelectedUser(userToSet);
      
        // termsAgreedAtをCookieから確認
        const termsModalFlag = getCookie("showTermsModal");
        const termsAgreedAtCookie = getCookie("termsAgreedAt");
      
        if (termsModalFlag === "true" && !termsAgreedAtCookie) {
          setShowTermsModal(true);
        } else {
          // 同意済みまたはフラグなしの場合はCookieをクリア
          deleteCookie("showTermsModal");
          setShowTermsModal(false);
        }
      
        setIsLoading(false);
      }
    };

    restoreAuthState();
  }, []);

  const login = async (  
    email: string,
    _password: string,
    userId?: string,
    role?: string,
    token?: string,
    name?: string,
    userImageUrl?: string,
    termsAgreedAt?: string,
    lastLoginAt?: string | null
  ): Promise<void> => {
    setIsLoading(true);
    try {
      if (!userId) {
        throw new Error("ユーザーIDが提供されていません");
      }

      const user: AuthUser = {
        id: userId,
        email: email,
        name: name || "",
        avatar: userImageUrl || undefined,
        isSetupComplete: true,
        createdAt: new Date(),
        lastLogin: new Date(),
        role: role || undefined,
      };

      setUser(user);
      setShouldRedirectToLogin(false);

      // Cookieに保存
      setCookie("userId", userId);
      setCookie("userEmail", email);
      if (role) setCookie("role", role);
      if (token) {
        setCookie("authToken", token);
        // APIリクエストに使用するトークンを設定
        const { OpenAPI } = await import("../api/core/OpenAPI");
        OpenAPI.TOKEN = token;
      }
      // nameが空文字列でもCookieに保存（空文字列チェックを追加）
      if (name !== undefined && name !== null) {
        setCookie("userName", name);
      }
      if (userImageUrl) setCookie("userImageUrl", userImageUrl);

      // 管理者ユーザー（role:1または2）の場合、ユーザー一覧を取得
      if (role === "1" || role === "2") {
        try {
          const { Service } = await import("../api/services/Service");
          const { withErrorHandling } = await import("../utils/apiErrorHandler");
          const response = await withErrorHandling(() => Service.getApiGetUsers());
          
          if (response.responseStatus === 1 && response.userListSchema) {
            // UserListSchemaをAuthUserに変換
            const managedUsersList: AuthUser[] = response.userListSchema
              .filter((u) => u.delFlg !== 1)
              .map((u) => ({
                id: u.userId || "",
                email: u.email || "",
                name: u.name || "",
                avatar: u.userImageUrl || undefined,
                isSetupComplete: true,
                createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
                lastLogin: new Date(),
                role: u.role || undefined,
              }));
            
            setManagedUsers(managedUsersList);
            
            // ★ 修正：CookieにselectedUserIdがある場合のみ復元、ない場合はnull
            const selectedUserId = getCookie("selectedUserId");
            if (selectedUserId) {
              const userToSelect = managedUsersList.find((u) => u.id === selectedUserId);
              if (userToSelect) {
                setSelectedUser(userToSelect);
              } else {
                setSelectedUser(null);  // ★ 修正：nullに設定
              }
            } else {
              setSelectedUser(null);  // ★ 修正：nullに設定
            }
          } else {
            setManagedUsers([]);
            setSelectedUser(null);  // ★ 修正：nullに設定
          }
        } catch (error) {
          console.error("ユーザー一覧取得エラー:", error);
          setManagedUsers([]);
          setSelectedUser(null);  // ★ 修正：nullに設定
        }
      } else {
        // 一般ユーザーの場合
        setSelectedUser(user);

        if (!termsAgreedAt) {
          setShowTermsModal(true);
          setCookie("showTermsModal", "true", 1);
          deleteCookie("termsAgreedAt");
        } else {
          deleteCookie("showTermsModal");
          setShowTermsModal(false);
          setCookie("termsAgreedAt", termsAgreedAt, 24 * 365); // 1年間保持
        }
        if (lastLoginAt === null || lastLoginAt === undefined) {
          setCookie("showPlanSelectModal", "true", 1);
        } else {
          deleteCookie("showPlanSelectModal");
        }
      }
      
    } catch (error) {
      throw new Error("ログインに失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const completeSetup = (setupData: InitialSetup) => {
    // ログイン中のユーザー(user)と表示対象のユーザー(selectedUser)の両方を更新
    if (user && selectedUser) {
      const updatedUser = { ...user, isSetupComplete: true };
      const updatedSelectedUser = { ...selectedUser, isSetupComplete: true };

      setUser(updatedUser);
      setSelectedUser(updatedSelectedUser);
      setUserSetup(setupData);
    }
  };

  const updateUserSetup = (setupData: Partial<InitialSetup>) => {
    if (userSetup) {
      const updatedSetup = { ...userSetup, ...setupData };
      setUserSetup(updatedSetup);
    }
  };

  const updateUser = (userData: Partial<AuthUser>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
  
      if (userData.avatar) {
        setCookie("userImageUrl", userData.avatar);
      }
      // ↓ 追加
      if (userData.role) {
        setCookie("role", userData.role);
      }
  
      if (selectedUser && selectedUser.id === user.id) {
        setSelectedUser({ ...selectedUser, ...userData });
      }
    }
  };
  const refreshUser = async () => {
    if (!user) return;
    try {
      const { Service } = await import("../api/services/Service");
      const { withErrorHandling } = await import("../utils/apiErrorHandler");
      const response = await withErrorHandling(() =>
        Service.getApiSettingUser(user.id)
      );
      if (response.responseStatus === 1 && response.userSchema) {
        const newRole = response.userSchema.role;
        console.log("refreshUser newRole:", newRole); // デバッグ用
        if (newRole) {
          updateUser({ role: newRole });
        }
      }
    } catch (error) {
      console.error("ユーザー情報の再取得に失敗:", error);
    }
  };

  const handlePlanUpgrade = () => {
    updateUser({ role: "4" });
    setTimeout(async () => {
      await refreshUser();
    }, 5000);
  };

  const loadUserSetup = async () => {
    if (!user) return;
  
    try {
      const { Service } = await import("../api/services/Service");
      const { withErrorHandling } = await import("../utils/apiErrorHandler");
      const response = await withErrorHandling(() => 
        Service.getApiSettingUser(selectedUser?.id || user.id)
      );
      
      if (response.responseStatus === 1 && response.userSchema && response.settingSchema) {
        const setupData: InitialSetup = {
          userName: response.userSchema.name || "",
          email: response.userSchema.email || "",
          companyName: response.userSchema.company || "",
          phoneNumber: "", // UserSchemaには電話番号フィールドがないため空文字
          password: "", // パスワードは取得しない
          passwordConfirm: "", // パスワード確認も取得しない
          currentAssets: response.settingSchema.capital || 0,
          companySize: getCompanySizeString(Number(response.settingSchema.companySize)),
          fiscalYearStartMonth: response.settingSchema.fiscalYearStartMonth || 1,
          fiscalYearStartYear: response.settingSchema.fiscalYearStartYear || new Date().getFullYear(),
          industry: getIndustryString(Number(response.settingSchema.industry)),
          financialKnowledge: getFinancialKnowledgeString(Number(response.settingSchema.financialKnowledge)),
          capital: response.settingSchema.capital,
        };
        setUserSetup(setupData);
      } else {
        setUserSetup(null);
      }
    } catch (error) {
      console.error("ユーザー設定の読み込みに失敗:", error);
      setUserSetup(null);
    }
  };
  
  // APIの数値を文字列に変換するヘルパー関数
  const getCompanySizeString = (
    size?: number
  ):
    | "個人事業主"
    | "法人（従業員1-5名）"
    | "法人（従業員6-20名）"
    | "法人（従業員21名以上）" => {
    switch (size) {
      case 1:
        return "個人事業主";
      case 2:
        return "法人（従業員1-5名）";
      case 3:
        return "法人（従業員6-20名）";
      case 4:
        return "法人（従業員21名以上）";
      default:
        return "個人事業主";
    }
  };

  const getIndustryString = (
    industry?: number
  ):
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
    | "その他" => {
    switch (industry) {
      case 1:
        return "IT・ソフトウェア";
      case 2:
        return "製造業";
      case 3:
        return "小売業";
      case 4:
        return "飲食業";
      case 5:
        return "サービス業";
      case 6:
        return "建設業";
      case 7:
        return "医療・福祉";
      case 8:
        return "教育";
      case 9:
        return "金融・保険";
      case 10:
        return "不動産";
      case 11:
        return "その他";
      default:
        return "IT・ソフトウェア";
    }
  };

  const getFinancialKnowledgeString = (
    knowledge?: number
  ): "初心者" | "基本レベル" | "中級レベル" | "上級レベル" => {
    switch (knowledge) {
      case 1:
        return "初心者";
      case 2:
        return "基本レベル";
      case 3:
        return "中級レベル";
      case 4:
        return "上級レベル";
      default:
        return "初心者";
    }
  };

  const logout = async () => {
    try {
      const token = getCookie("authToken");
      
      if (token) {
        const { Service } = await import("../api/services/Service");
        await Service.postApiAuthLogout({ token });
      }
    } catch (error) {
      console.error("ログアウトAPIの呼び出しに失敗:", error);
    } finally {
      setUser(null);
      setUserSetup(null);
      setManagedUsers([]);
      setSelectedUser(null);
      setShouldRedirectToLogin(false);
      
      // 認証関連データを削除
      deleteCookie("userId");
      deleteCookie("userEmail"); // ← 追加
      deleteCookie("role");
      deleteCookie("selectedUserId");
      deleteCookie("authToken");
      deleteCookie("userName");
      deleteCookie("userImageUrl");
    }
  };

  const switchUser = (userId: string) => {
    const userToSwitch = managedUsers.find((u) => u.id === userId);
    if (userToSwitch) {
      // まずローディング状態にする
      setIsLoading(true);
      
      // 選択ユーザーとセットアップ情報をクリア
      setSelectedUser(null);
      setUserSetup(null);
      
      // 次のティックで新しいユーザーを設定
      setTimeout(() => {
        setSelectedUser(userToSwitch);
        setCookie("selectedUserId", userId);
        setIsLoading(false);
      }, 0);
    }
  };

  const value: AuthContextType = {
    user,
    userSetup,
    isLoading,
    shouldRedirectToLogin,
    sessionExpired,
    clearSessionExpired,
    login,
    completeSetup,
    updateUserSetup,
    updateUser,
    loadUserSetup,
    logout,
    managedUsers,
    selectedUser,
    switchUser,
    showTermsModal,
    setShowTermsModal,
    closeTermsModal,
    refreshUser,
    handlePlanUpgrade,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
