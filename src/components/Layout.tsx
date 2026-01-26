import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  Users,
  Briefcase,
  Home,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { Service } from "../api/services/Service";
import { withErrorHandling } from "../utils/apiErrorHandler";
import headerIcon from "../assets/header_icon.png";
import mandalaIcon from "../assets/mandala_icon.png";
import plIcon from "../assets/icon_pl.png";
import settingsIcon from "../assets/settings_icon.png";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const location = useLocation();
  const { logout, user, managedUsers, selectedUser, switchUser, updateUser } = useAuth();

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

  const getCookie = (name: string): string | null => {
    const nameEQ = name + "=";
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === " ") c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  };

  useEffect(() => {
    try {
      const role = getCookie("role");
      setUserRole(role);
    } catch (err) {
      console.error("cookieの解析に失敗:", err);
    }
  }, [user]);

  useEffect(() => {
    if (user?.avatar) {
      setAvatarPreview(user.avatar);
    }
  }, [user?.avatar]);

  // デバッグ用のuseEffectを追加
  useEffect(() => {
    console.log('=== Debug Info ===');
    console.log('userRole:', userRole, 'type:', typeof userRole);
    console.log('managedUsers:', managedUsers);
    console.log('managedUsers.length:', managedUsers.length);
    console.log('selectedUser:', selectedUser);
    console.log('condition result:', userRole !== null && ["1", "2"].includes(userRole) && managedUsers.length > 0);
  }, [userRole, managedUsers, selectedUser]);

  const handleAvatarClick = () => {
    if (!isUploadingAvatar) {
      avatarInputRef.current?.click();
    }
  };

  // 画像の寸法を検証するヘルパー関数
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

    // 画像形式のバリデーション
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    const fileType = file.type.toLowerCase();
    if (!allowedTypes.includes(fileType)) {
      alert('許可されていない画像形式です。JPEG、PNG、GIFのみアップロードできます。');
      e.target.value = '';
      return;
    }

    // ファイルサイズのバリデーション（5MB = 5 * 1024 * 1024 bytes）
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('ファイルサイズが大きすぎます。5MB以下のファイルをアップロードしてください。');
      e.target.value = '';
      return;
    }

    // 画像の寸法チェック
    try {
      const dimensions = await validateImageDimensions(file);
      if (!dimensions) {
        alert('画像の読み込みに失敗しました。');
        e.target.value = '';
        return;
      }
      
      // 最小サイズチェック（プロフィール画像として100x100px以上）
      if (dimensions.width < 100 || dimensions.height < 100) {
        alert('画像サイズが小さすぎます。100x100ピクセル以上の画像をアップロードしてください。');
        e.target.value = '';
        return;
      }
      
      // 最大サイズチェック（8000x8000px以下）
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

    // プレビューを表示
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
    setIsUploadingAvatar(true);

    // APIを呼び出して画像をアップロード
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
        // 成功時にユーザー情報を更新
        updateUser({ avatar: response.imageUrl });
        setAvatarPreview(response.imageUrl);
      } else {
        alert('画像のアップロードに失敗しました。');
        // プレビューを元に戻す
        if (user?.avatar) {
          setAvatarPreview(user.avatar);
        } else {
          setAvatarPreview(null);
        }
      }
    } catch (error) {
      console.error('画像アップロードエラー:', error);
      alert('画像のアップロード中にエラーが発生しました。');
      // プレビューを元に戻す
      if (user?.avatar) {
        setAvatarPreview(user.avatar);
      } else {
        setAvatarPreview(null);
      }
    } finally {
      setIsUploadingAvatar(false);
      // ファイル入力をリセット
      e.target.value = '';
    }
  };

  const clientNavigation = [
    {
      name: "HOME",
      href: "/",
      icon: Home,
      disabled: false,
      roleRequired: ["0", "1", "2"],
    },
    {
      name: "kanaeruマンダラ",
      href: "/mandalaChart",
      icon: MandalaIcon,
      disabled: false,
      roleRequired: ["0", "1", "2"],
    },
    {
      name: "年次PL",
      href: "/yearlyBudgetActual",
      icon: PLIcon,
      disabled: false,
      roleRequired: ["0", "1", "2"],
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
      roleRequired: ["2"],  // role:2のみ
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
        {/* サイドバー（PC） - 固定配置、z-indexを高く */}
        <aside className="hidden lg:flex lg:flex-shrink-0 fixed left-0 top-0 h-screen z-30">
          <div 
            className="flex flex-col h-full w-52 xl:w-56"
            style={{
              background: '#F6FAFC',
              boxShadow: '0px 4px 12px 0px rgba(124, 124, 124, 0.25)',
              overflowX: 'hidden'
            }}
          >
            {/* ロゴエリア - 中央揃え */}
            <div 
              className="flex items-center justify-center h-16 xl:h-20"
            >
              <img
                src={headerIcon}
                alt="Kanaeru"
                className="h-7 xl:h-8 w-auto object-contain"
              />
            </div>

            {/* userInfo または userSwitcher - role:1,2の場合はプルダウンのみ */}
            {userRole !== null && ["1", "2"].includes(userRole) ? (
              // 管理者・マネージャーの場合：ユーザー選択プルダウンのみ
              <div className="p-4 xl:p-6" style={{ background: '#F6FAFC' }}>
                {managedUsers.length > 0 ? (
                  <div className="relative">
                    <select
                      value={selectedUser?.id || ""}
                      onChange={(e) => {
                        switchUser(e.target.value);
                        if (sidebarOpen) {
                          setSidebarOpen(false);
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
                      {managedUsers.map((managedUser) => (
                        <option key={managedUser.id} value={managedUser.id}>
                          {managedUser.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <p className="text-xs xl:text-sm text-gray-500 text-center">管理対象ユーザーがいません</p>
                )}
              </div>
            ) : (
              // 一般ユーザーの場合：アバター画像表示
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
                {filteredClientNavigation.map((item) => {
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
                      to={item.href}
                      className={`flex items-center py-2 xl:py-2.5 rounded-none transition-colors -ml-6 xl:-ml-9 pl-6 xl:pl-9 -mr-3 pr-3 ${
                        isActive
                          ? "bg-white text-primary"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <item.icon className="h-4 w-4 xl:h-5 xl:w-5 mr-4 flex-shrink-0" />
                      <span className="text-xs xl:text-sm">{item.name}</span>
                    </Link>
                  );
                })}

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
                    to={item.href}
                    className={`flex items-center py-2 xl:py-2.5 rounded-none transition-colors -ml-6 xl:-ml-9 pl-6 xl:pl-9 -mr-3 pr-3 ${
                      isActive
                        ? "bg-white text-primary"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <item.icon className="h-4 w-4 xl:h-5 xl:w-5 mr-4 flex-shrink-0" />
                    <span className="text-xs xl:text-sm">{item.name}</span>
                  </Link>
                  );
                })}
              </div>
            </nav>
            {/* お問い合わせボタンを追加 */}
            <div className="p-4 xl:p-6">
              <Link
                to="/contact"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-xs xl:text-sm font-medium bg-primary text-white border border-primary transition-colors hover:bg-primary/90 px-3 py-1.5 xl:px-4 xl:py-2 rounded-full block text-center"
              >
                お問い合わせ
              </Link>
            </div>
          </div>
        </aside>

        {/* メインコンテンツエリア（サイドバーの幅分左にマージン） */}
        <div className="flex-1 lg:ml-52 xl:ml-56">
          {/* ヘッダー */}
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
                  <img
                    src={headerIcon}
                    alt="Kanaeru"
                    className="h-6 sm:h-8 w-auto lg:hidden"
                  />
                </div>
              </div>

              <div className="flex items-center lg:mr-8">
                <button
                  onClick={async () => {
                    if (window.confirm("ログアウトしますか？")) {
                      await logout();
                    }
                  }}
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

          {/* メインコンテンツ */}
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
                  <img
                    src={headerIcon}
                    alt="Kanaeru"
                    className="h-6 sm:h-8 w-auto object-contain"
                  />
                </div>
                <button
                  type="button"
                  className="p-1.5 sm:p-2 rounded-md text-gray-700 hover:bg-gray-100 absolute right-3"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              </div>
              
              {/* モバイル用：role:1,2の場合はプルダウンのみ */}
              {userRole !== null && ["1", "2"].includes(userRole) ? (
                // 管理者・マネージャーの場合：ユーザー選択プルダウンのみ
                <div className="p-4 sm:p-5" style={{ background: '#F6FAFC' }}>
                  {managedUsers.length > 0 ? (
                    <div className="relative">
                      <select
                        value={selectedUser?.id || ""}
                        onChange={(e) => {
                          switchUser(e.target.value);
                          if (sidebarOpen) {
                            setSidebarOpen(false);
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
                        {managedUsers.map((managedUser) => (
                          <option key={managedUser.id} value={managedUser.id}>
                            {managedUser.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <p className="text-xs sm:text-sm text-gray-500 text-center">管理対象ユーザーがいません</p>
                  )}
                </div>
              ) : (
                // 一般ユーザーの場合：アバター画像表示
                userInfo
              )}

              <nav className="flex-1 overflow-y-auto" style={{ overflowX: 'hidden' }}>
                <div className="space-y-1 sm:space-y-2 pl-6 sm:pl-9 pr-3 pt-3">
                  {filteredClientNavigation.map((item) => {
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
              {/* お問い合わせボタンを追加（モバイル用） */}
              <div className="p-4 sm:p-6">
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Layout;