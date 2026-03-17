import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  Users,
  Briefcase,
  Home,
  MessageCircle,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { Service } from "../api/services/Service";
import { StripeService } from "../api/services/StripeService";
import { withErrorHandling } from "../utils/apiErrorHandler";
import headerIcon from "../assets/header_icon.png";
import mandalaIcon from "../assets/mandala_icon.png";
import plIcon from "../assets/icon_pl.png";
import settingsIcon from "../assets/settings_icon.png";
import PlanSelectModal from "../components/PlanselectModal";
import { useUnreadStatus } from '../hooks/useUnreadStatus';
import UnreadDot from '../components/UnreadDot';

interface LayoutProps {
  children: React.ReactNode;
}

// ── Layout 外の独立コンポーネント ──────────────────────────────

// 「アドバイス・相談」非活性行（ホバーでツールチップ表示）
const UpgradeAdviceItem: React.FC<{ size?: "sm" | "xl"; isAdmin?: boolean }> = ({ size = "xl", isAdmin = false }) => {
  const iconSize = size === "xl" ? "h-5 w-5" : "h-4 w-4";
  const textSize = size === "xl" ? "text-sm" : "text-xs";
  const rowRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);

  const handleMouseEnter = () => {
    if (isAdmin) return;
    if (rowRef.current) {
      const rect = rowRef.current.getBoundingClientRect();
      setTooltipPos({ top: rect.bottom + 6, left: rect.left });
    }
  };
  const handleMouseLeave = () => setTooltipPos(null);

  return (
    <div className="flex flex-col">
      <div
        ref={rowRef}
        className="flex items-center py-2 xl:py-2.5 opacity-40 cursor-not-allowed"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <MessageCircle className={`${iconSize} mr-4 flex-shrink-0 text-gray-400`} />
        <span className={`${textSize} text-gray-400`}>アドバイス・相談</span>
      </div>
      {tooltipPos && (
        <div
          className="pointer-events-none fixed z-[9999] w-52 rounded-xl px-3 py-2.5 text-xs"
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left,
            background: "#FFF0F7",
            color: "#BE185D",
            lineHeight: 1.7,
            border: "1.5px solid #FBCFE8",
            boxShadow: "0 4px 16px rgba(240,103,166,0.15)",
          }}
        >
          <span
            className="absolute left-5 bottom-full"
            style={{
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderBottom: "5px solid #FBCFE8",
            }}
          />
          <span
            className="absolute left-[21px] bottom-full"
            style={{
              borderLeft: "4px solid transparent",
              borderRight: "4px solid transparent",
              borderBottom: "4px solid #FFF0F7",
            }}
          />
          ✨ 有料プランにアップグレードをすると「アドバイス・相談」機能が使えるようになります
        </div>
      )}
    </div>
  );
};

// アップグレードボタン（お問い合わせボタンの上に表示）
const UpgradeButton: React.FC<{ size?: "sm" | "xl"; onClick: () => void }> = ({ size = "xl", onClick }) => {
  const btnTextSize = size === "xl" ? "text-xs xl:text-sm" : "text-xs sm:text-sm";

  return (
    <button
      onClick={onClick}
      className={`w-full ${btnTextSize} font-medium rounded-full block text-center px-3 py-1.5 xl:px-4 xl:py-2 transition-colors hover:opacity-90`}
      style={{
        background: "#F067A6",
        color: "#fff",
        border: "none",
      }}
    >
      アップグレード
    </button>
  );
};

// ── メインコンポーネント ────────────────────────────────────────

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user, managedUsers, selectedUser, switchUser, updateUser, handlePlanUpgrade } = useAuth();
  const { hasUnread, refetch: refetchUnread } = useUnreadStatus(user?.id ?? null);
  const userRole = user?.role ?? null;
  

  const MandalaIcon: React.FC<{ className?: string }> = ({
    className = "",
  }) => (
    <img
      src={mandalaIcon}
      alt="Mandala"
      className={`inline-block align-middle ${className}`}
      style={{
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        objectFit: 'cover'
      }}
    />
  );
  const PLIcon: React.FC<{ className?: string }> = ({
    className = "",
  }) => (
    <img
      src={plIcon}
      alt="PL"
      className={`inline-block align-middle ${className}`}
      style={{
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        objectFit: 'cover'
      }}
    />
  );

  useEffect(() => {
    if (user?.avatar) {
      setAvatarPreview(user.avatar);
    }
  }, [user?.avatar]);

  const handleLogout = async () => {
    if (window.confirm("ログアウトしますか？")) {
      try {
        await logout();
      } catch (error) {
        console.error("ログアウトAPIエラー:", error);
      } finally {
        localStorage.clear();
        sessionStorage.clear();
        
        document.cookie.split(";").forEach((c) => {
          const name = c.split("=")[0].trim();
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=.kanaeru.etomoji.co.jp`;
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=.etomoji.co.jp`;
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=staging.kanaeru.etomoji.co.jp`;
        });
        
        window.location.href = '/login';
      }
    }
  };

  const handleAvatarClick = () => {
    if (!isUploadingAvatar) {
      avatarInputRef.current?.click();
    }
  };

  const validateImageDimensions = (file: File): Promise<{ width: number; height: number } | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve({ width: img.width, height: img.height });
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(null);
      };
      
      img.src = objectUrl;
    });
  };

  const handleAvatarChange: React.ChangeEventHandler<HTMLInputElement> = async (
    e
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    const fileType = file.type.toLowerCase();
    if (!allowedTypes.includes(fileType)) {
      alert('許可されていない画像形式です。JPEG、PNG、GIFのみアップロードできます。');
      e.target.value = '';
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('ファイルサイズが大きすぎます。5MB以下のファイルをアップロードしてください。');
      e.target.value = '';
      return;
    }

    try {
      const dimensions = await validateImageDimensions(file);
      if (!dimensions) {
        alert('画像の読み込みに失敗しました。');
        e.target.value = '';
        return;
      }
      
      if (dimensions.width < 100 || dimensions.height < 100) {
        alert('画像サイズが小さすぎます。100x100ピクセル以上の画像をアップロードしてください。');
        e.target.value = '';
        return;
      }
      
      if (dimensions.width > 8000 || dimensions.height > 8000) {
        alert('画像サイズが大きすぎます。8000x8000ピクセル以下の画像をアップロードしてください。');
        e.target.value = '';
        return;
      }
    } catch (error) {
      console.error('画像の検証エラー:', error);
      alert('画像の検証中にエラーが発生しました。');
      e.target.value = '';
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
    setIsUploadingAvatar(true);

    try {
      if (!user?.id) {
        alert('ユーザー情報が取得できませんでした。');
        return;
      }

      const response = await withErrorHandling(() =>
        Service.postApiSettingUserImage({
          userId: user.id,
          imageFile: file,
        })
      );

      if (response.responseStatus === 1 && response.imageUrl) {
        updateUser({ avatar: response.imageUrl });
        setAvatarPreview(response.imageUrl);
      } else {
        alert('画像のアップロードに失敗しました。');
        if (user?.avatar) {
          setAvatarPreview(user.avatar);
        } else {
          setAvatarPreview(null);
        }
      }
    } catch (error) {
      console.error('画像アップロードエラー:', error);
      alert('画像のアップロード中にエラーが発生しました。');
      if (user?.avatar) {
        setAvatarPreview(user.avatar);
      } else {
        setAvatarPreview(null);
      }
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = '';
    }
  };

  // 管理者（role:1,2）がユーザーを選択している場合はそのユーザーのroleで判定、それ以外は自分のrole
  const effectiveRole =
    userRole !== null && ["1", "2"].includes(userRole) && selectedUser
      ? String((selectedUser as any).role)
      : userRole;

  // role:0 または role:3 の場合、「アドバイス・相談」を非活性表示してアップグレードボタンを出す
  const isUpgradableRole = effectiveRole === "0" || effectiveRole === "3";

  const clientNavigation = [
    {
      name: "HOME",
      href: "/",
      icon: Home,
      disabled: false,
      roleRequired: ["0", "1", "2", "3", "4"],
    },
    {
      name: "kanaeruマンダラ",
      href: "/mandalaChart",
      icon: MandalaIcon,
      disabled: false,
      roleRequired: ["0", "1", "2", "3", "4"],
    },
    {
      name: "損益管理",
      href: "/yearlyBudgetActual",
      icon: PLIcon,
      disabled: false,
      roleRequired: ["0", "1", "2", "3", "4"],
    },
    {
      name: "アドバイス・相談",
      href: "/support",
      icon: MessageCircle,
      disabled: false,
      roleRequired: ["0", "1", "2", "3", "4"],
    },
  ];

  const adminNavigation = [
    {
      name: "ユーザー管理",
      href: "/userManagement",
      icon: Briefcase,
      disabled: false,
      roleRequired: ["1", "2"],
    },
    {
      name: "管理者ユーザー管理",
      href: "/adminUserManagement",
      icon: Users,
      disabled: false,
      roleRequired: ["2"],
    },
  ];

  const roleFilter = (item: { roleRequired?: string | string[] }) => {
    if (!item.roleRequired) return true;
    if (Array.isArray(item.roleRequired)) {
      return userRole !== null && item.roleRequired.includes(userRole);
    }
    return userRole === item.roleRequired;
  };

  const filteredClientNavigation = clientNavigation.filter(roleFilter);
  const filteredAdminNavigation = adminNavigation.filter(roleFilter);

  const renderClientNavItem = (item: typeof clientNavigation[0], isMobile: boolean) => {
    const isActive = location.pathname === item.href;
    
    const isDisabledByNoSelection =
      userRole !== null &&
      ["1", "2"].includes(userRole) &&
      !selectedUser;

    // アドバイス・相談かつ非活性ロールの場合
    if (item.name === "アドバイス・相談" && isUpgradableRole) {
      return (
        <div key={item.name}>
          <UpgradeAdviceItem size={isMobile ? "sm" : "xl"} isAdmin={userRole === "1" || userRole === "2"} />
        </div>
      );
    }

    if (item.disabled || isDisabledByNoSelection) {
      return (
        <div
          key={item.name}
          className={`flex items-start py-2 ${isMobile ? "sm:py-2.5" : "xl:py-2.5"} rounded-lg opacity-50`}
        >
          <item.icon className={`h-4 w-4 ${isMobile ? "sm:h-5 sm:w-5 sm:mr-3" : "xl:h-5 xl:w-5 xl:mr-3"} mr-2 text-gray-400 mt-0.5 flex-shrink-0`} />
          <div className="flex flex-col">
            <span className={`text-xs ${isMobile ? "sm:text-sm" : "xl:text-sm"} text-gray-400`}>
              {item.name}
            </span>
            {item.disabled && (
              <span className={`text-[10px] ${isMobile ? "sm:text-xs" : "xl:text-xs"} text-red-500 font-small`}>
                COMING SOON
              </span>
            )}
          </div>
        </div>
      );
    }

    return (
      <Link
        key={item.name}
        to={item.name === "kanaeruマンダラ" ? "/mandalaChart?level=large" : item.href}
        className={`flex items-center py-2 ${isMobile ? "sm:py-2.5" : "xl:py-2.5"} rounded-none transition-colors -ml-6 ${isMobile ? "sm:-ml-9" : "xl:-ml-9"} pl-6 ${isMobile ? "sm:pl-9" : "xl:pl-9"} -mr-3 pr-3 ${
          isActive
            ? "bg-white text-primary"
            : "text-gray-700 hover:bg-gray-100"
        }`}
        onClick={() => isMobile && setSidebarOpen(false)}
      >
        {item.name === "アドバイス・相談" ? (
          <div
            className={`${isMobile ? "h-5 w-5 sm:h-6 sm:w-6" : "h-5 w-5 xl:h-6 xl:w-6"} mr-4 flex-shrink-0 rounded-full flex items-center justify-center`}
            style={{ background: "#13AE67" }}
          >
            <item.icon className={`h-3 w-3 ${isMobile ? "sm:h-3.5 sm:w-3.5" : "xl:h-3.5 xl:w-3.5"} text-white`} />
          </div>
        ) : (
          <item.icon className={`h-4 w-4 ${isMobile ? "sm:h-5 sm:w-5" : "xl:h-5 xl:w-5"} mr-4 flex-shrink-0`} />
        )}
        <span className={`flex items-center text-xs ${isMobile ? "sm:text-sm" : "xl:text-sm"}`}>
          {item.name}
          {item.name === "アドバイス・相談" && <UnreadDot show={hasUnread} />}
        </span>
      </Link>
    );
  };

  const userInfo = (
    <div className="p-4 sm:p-5 lg:p-6 flex justify-center" style={{ background: '#F6FAFC' }}>
      <div className="flex flex-col items-center space-y-2 sm:space-y-3">
        <button
          type="button"
          onClick={handleAvatarClick}
          disabled={isUploadingAvatar}
          className={`relative rounded-full border-2 border-gray-200 overflow-hidden group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 w-20 h-20 sm:w-24 sm:h-24 hover:border-primary transition-colors ${
            isUploadingAvatar ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isUploadingAvatar ? (
            <div className="h-full w-full bg-gray-100 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : avatarPreview ? (
            <img
              src={avatarPreview}
              alt={user?.name || "avatar"}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gray-100 text-gray-400 flex items-center justify-center text-4xl sm:text-5xl font-light">
              +
            </div>
          )}
        </button>
  
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif"
          className="hidden"
          onChange={handleAvatarChange}
          disabled={isUploadingAvatar}
        />  
        <div className="text-center">
          <p className="text-xs sm:text-sm text-gray-800">
            {user?.name || "User Name"}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* サイドバー（PC） */}
        <aside className="hidden lg:flex lg:flex-shrink-0 fixed left-0 top-0 h-screen z-30">
          <div 
            className="flex flex-col h-full w-52 xl:w-56"
            style={{
              background: '#F6FAFC',
              boxShadow: '0px 4px 12px 0px rgba(124, 124, 124, 0.25)',
              overflowX: 'hidden'
            }}
          >
            <div 
              className="flex items-center justify-center h-16 xl:h-20"
            >
              <Link
                to="/"
                className="flex items-center justify-center h-16 xl:h-20 hover:opacity-80 transition-opacity"
              >
                <img
                  src={headerIcon}
                  alt="Kanaeru"
                  className="h-7 xl:h-8 w-auto object-contain"
                />
              </Link>
            </div>

            {userRole !== null && ["1", "2"].includes(userRole) ? (
              <div className="p-4 xl:p-6" style={{ background: '#F6FAFC' }}>
                {managedUsers.length > 0 ? (
                  <div className="relative">
                    <select
                      value={selectedUser?.id || ""}
                      onChange={(e) => {
                        if (e.target.value) {
                          switchUser(e.target.value);
                          navigate("/");
                          if (sidebarOpen) {
                            setSidebarOpen(false);
                          }
                        }
                      }}
                      className="w-full text-xs xl:text-sm border border-gray-300 rounded px-2 py-1.5 pr-8 appearance-none bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                      style={{
                        backgroundImage:
                          'url(\'data:image/svg+xml;utf8,<svg fill="black" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/><path d="M0 0h24v24H0z" fill="none"/></svg>\')',
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "calc(100% - 4px) center",
                        backgroundSize: "16px",
                      }}
                    >
                      <option value="" disabled>
                        ▼選択してください
                      </option>
                      {[...managedUsers]
                      .sort((a, b) => {
                        const aIsPremium = a.role === "4";
                        const bIsPremium = b.role === "4";
                        if (aIsPremium !== bIsPremium) return aIsPremium ? -1 : 1;
                        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                      })
                      .map((managedUser) => (
                        <option
                          key={managedUser.id}
                          value={managedUser.id}
                          // ★ /support 画面では無料ユーザーを選択不可
                          disabled={
                            location.pathname === "/support" &&
                            (managedUser.role === "3" || managedUser.role === "0")
                          }
                        >
                          {managedUser.role === "4" ? `⭐ ${managedUser.name}` : managedUser.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <p className="text-xs xl:text-sm text-gray-500 text-center">管理対象ユーザーがいません</p>
                )}
              </div>
            ) : (
              <div className="p-4 xl:p-6 flex justify-center" style={{ background: '#F6FAFC' }}>
                <div className="flex flex-col items-center space-y-2 xl:space-y-3">
                  <button
                    type="button"
                    onClick={handleAvatarClick}
                    disabled={isUploadingAvatar}
                    className={`relative rounded-full border-2 border-gray-200 overflow-hidden group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 w-20 h-20 xl:w-24 xl:h-24 hover:border-primary transition-colors ${
                      isUploadingAvatar ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isUploadingAvatar ? (
                      <div className="h-full w-full bg-gray-100 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt={user?.name || "avatar"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-gray-100 text-gray-400 flex items-center justify-center text-4xl xl:text-5xl font-light">
                        +
                      </div>
                    )}
                  </button>

                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif"
                    className="hidden"
                    onChange={handleAvatarChange}
                    disabled={isUploadingAvatar}
                  />
                  <div className="text-center">
                    <p className="text-xs xl:text-sm break-all text-gray-800 px-2">
                      {user?.name || "User Name"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <nav className="flex-1 overflow-y-auto" style={{ overflowX: 'hidden' }}>
              <div className="space-y-1 xl:space-y-2 pl-6 xl:pl-9 pr-3 pt-3">
                {filteredClientNavigation.map((item) => renderClientNavItem(item, false))}

                {filteredAdminNavigation.length > 0 && (
                  <hr className="border-gray-200 my-2" />
                )}

                {filteredAdminNavigation.map((item) => {
                  const isActive = location.pathname === item.href;

                  if (item.disabled) {
                    return (
                      <div
                        key={item.name}
                        className="flex items-start py-2 xl:py-2.5 rounded-lg cursor-not-allowed opacity-50"
                      >
                        <item.icon className="h-4 w-4 xl:h-5 xl:w-5 mr-2 xl:mr-3 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-xs xl:text-sm text-gray-400">
                            {item.name}
                          </span>
                          <span className="text-[10px] xl:text-xs text-red-500 font-small">
                            COMING SOON
                          </span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.name}
                      to={item.name === "kanaeruマンダラ" ? "/mandalaChart?level=large" : item.href}
                      className={`flex items-center py-2 sm:py-2.5 rounded-none transition-colors -ml-6 sm:-ml-9 pl-6 sm:pl-9 -mr-3 pr-3 ${
                        isActive
                          ? "bg-white text-primary"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.icon className="h-4 w-4 sm:h-5 sm:w-5 mr-4 flex-shrink-0" />
                      <span className="text-xs sm:text-sm">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </nav>
            {!(userRole === "1" || userRole === "2") && (
              <div className="p-4 xl:p-6 flex flex-col gap-2">
                {isUpgradableRole && <UpgradeButton size="xl" onClick={() => setShowPlanModal(true)} />}
                <Link
                  to="/contact"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full text-xs xl:text-sm font-medium bg-primary text-white border border-primary transition-colors hover:bg-primary/90 px-3 py-1.5 xl:px-4 xl:py-2 rounded-full block text-center"
                >
                  お問い合わせ
                </Link>
              </div>
            )}
          </div>
        </aside>

        {/* メインコンテンツエリア */}
        <div className="flex-1 lg:ml-52 xl:ml-56">
          <header 
            className="px-3 sm:px-4 lg:px-6 h-14 sm:h-16 lg:h-20 flex items-center lg:pl-6"
            style={{
              background: '#F6FAFC'
            }}
          >
            <div className="flex items-center justify-between h-full w-full">
              <div className="flex items-center">
                <button
                  type="button"
                  className="lg:hidden p-1.5 sm:p-2 rounded-md text-text hover:bg-sub2"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
                <div className="flex items-center ml-2 lg:ml-0">
                  <Link to="/" className="hover:opacity-80 transition-opacity">
                    <img
                      src={headerIcon}
                      alt="Kanaeru"
                      className="h-6 sm:h-8 w-auto lg:hidden"
                    />
                  </Link>
                </div>
              </div>

              <div className="flex items-center lg:mr-8">
                <button
                  onClick={handleLogout}
                  className="hover:opacity-80 transition-opacity text-xs sm:text-sm text-gray-800 whitespace-nowrap"
                  style={{
                    marginRight: '55px'
                  }}
                >
                  ログアウト
                </button>

                <Link
                  to="/settings"
                  className="p-1.5 sm:p-2 rounded-md hover:bg-sub2 transition-colors flex items-center justify-center"
                  title="設定"
                >
                  <img 
                    src={settingsIcon} 
                    alt="設定" 
                    className="h-5 w-5 sm:h-6 sm:w-6 object-contain"
                  />
                </Link>
              </div>
            </div>
          </header>

          <main>
            {children}
          </main>
        </div>

        {/* モバイルサイドバー */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="fixed inset-0 bg-black bg-opacity-50"
              onClick={() => setSidebarOpen(false)}
            />
            <div 
              className="fixed inset-y-0 left-0 shadow-xl flex flex-col w-4/5 max-w-xs sm:max-w-sm"
              style={{
                background: '#F6FAFC',
                boxShadow: '0px 4px 12px 0px rgba(124, 124, 124, 0.25)',
                overflowX: 'hidden'
              }}
            >
              <div className="flex items-center justify-between px-3 py-2 sm:p-4 h-14 sm:h-16">
                <div className="flex-1 flex justify-center">
                  <Link 
                    to="/" 
                    className="hover:opacity-80 transition-opacity"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <img
                      src={headerIcon}
                      alt="Kanaeru"
                      className="h-6 sm:h-8 w-auto object-contain"
                    />
                  </Link>
                </div>
                <button
                  type="button"
                  className="p-1.5 sm:p-2 rounded-md text-gray-700 hover:bg-gray-100 absolute right-3"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              </div>
              
              {userRole !== null && ["1", "2"].includes(userRole) ? (
                <div className="p-4 sm:p-5" style={{ background: '#F6FAFC' }}>
                  {managedUsers.length > 0 ? (
                    <div className="relative">
                      <select
                        value={selectedUser?.id || ""}
                        onChange={(e) => {
                          if (e.target.value) {
                            switchUser(e.target.value);
                            navigate("/");
                            if (sidebarOpen) {
                              setSidebarOpen(false);
                            }
                          }
                        }}
                        className="w-full text-xs sm:text-sm border border-gray-300 rounded px-2 py-1.5 pr-8 appearance-none bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                        style={{
                          backgroundImage:
                            'url(\'data:image/svg+xml;utf8,<svg fill="black" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/><path d="M0 0h24v24H0z" fill="none"/></svg>\')',
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "calc(100% - 4px) center",
                          backgroundSize: "16px",
                        }}
                      >
                        <option value="" disabled>
                          ▼選択してください
                        </option>
                        {[...managedUsers]
                        .sort((a, b) => {
                          const aIsPremium = a.role === "4";
                          const bIsPremium = b.role === "4";
                          if (aIsPremium !== bIsPremium) return aIsPremium ? -1 : 1;
                          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                        })
                        .map((managedUser) => (
                          <option
                            key={managedUser.id}
                            value={managedUser.id}
                            // ★ /support 画面では無料ユーザーを選択不可
                            disabled={
                              location.pathname === "/support" &&
                              (managedUser.role === "3" || managedUser.role === "0")
                            }
                          >
                            {managedUser.role === "4" ? `⭐ ${managedUser.name}` : managedUser.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <p className="text-xs sm:text-sm text-gray-500 text-center">管理対象ユーザーがいません</p>
                  )}
                </div>
              ) : (
                userInfo
              )}

              <nav className="flex-1 overflow-y-auto" style={{ overflowX: 'hidden' }}>
                <div className="space-y-1 sm:space-y-2 pl-6 sm:pl-9 pr-3 pt-3">
                  {filteredClientNavigation.map((item) => renderClientNavItem(item, true))}

                  {filteredAdminNavigation.length > 0 && (
                    <hr className="border-gray-200 my-2" />
                  )}

                  {filteredAdminNavigation.map((item) => {
                    const isActive = location.pathname === item.href;

                    if (item.disabled) {
                      return (
                        <div
                          key={item.name}
                          className="flex items-start py-2 sm:py-2.5 rounded-lg cursor-not-allowed opacity-50"
                        >
                          <item.icon className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="flex flex-col">
                            <span className="text-xs sm:text-sm text-gray-400">
                              {item.name}
                            </span>
                            <span className="text-[10px] sm:text-xs text-red-500 font-small">
                              COMING SOON
                            </span>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={`flex items-center py-2 sm:py-2.5 rounded-none transition-colors -ml-6 sm:-ml-9 pl-6 sm:pl-9 -mr-3 pr-3 ${
                          isActive
                            ? "bg-white text-primary"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <item.icon className="h-4 w-4 sm:h-5 sm:w-5 mr-4 flex-shrink-0" />
                        <span className="text-xs sm:text-sm">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </nav>
              {!(userRole === "1" || userRole === "2") && (
                <div className="p-4 sm:p-6 flex flex-col gap-2">
                  {isUpgradableRole && <UpgradeButton size="sm" onClick={() => setShowPlanModal(true)} />}
                  <Link
                    to="/contact"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full text-xs sm:text-sm font-medium bg-primary text-white border border-primary transition-colors hover:bg-primary/90 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full block text-center"
                    onClick={() => setSidebarOpen(false)}
                  >
                    お問い合わせ
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showPlanModal && (
        <PlanSelectModal
          isOpen={showPlanModal}
          onClose={async () => {
            setShowPlanModal(false);
            // incomplete状態のサブスクリプションがあればキャンセル
            if (user) {
              try {
                await StripeService.postApiStripeSubscriptionCancelIncomplete(user.id);
              }catch (err: any) {
                if (err?.status !== 404) {
                  console.error("Stripeキャンセルエラー:", err);
                }
              }
            }
          }}
          userId={user?.id ?? ""}
          currentPlan="free"
          onComplete={async (plan) => {
            if (plan === "paid") {
              handlePlanUpgrade();
              setShowUpgradeModal(true);
              setShowPlanModal(false); // キャンセルAPIは呼ばない
            } else {
              // 無料プラン選択時はキャンセルAPI実行
              setShowPlanModal(false);
              if (user) {
                try {
                  await StripeService.postApiStripeSubscriptionCancel(user.id);
                } catch (err) {
                  console.error("Stripeキャンセルエラー:", err);
                }
              }
            }
          }}
        />
      )}

      {/* アップグレード完了モーダル */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black opacity-50" onClick={() => setShowUpgradeModal(false)} />
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
              onClick={() => setShowUpgradeModal(false)}
              className="w-full py-3 rounded-full font-semibold text-sm text-white"
              style={{ background: "linear-gradient(135deg, #F067A6, #d44f8e)" }}
            >
              さっそく使ってみる
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;