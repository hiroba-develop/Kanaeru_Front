import React, { useState, useEffect } from "react";
import { Users, Plus, Edit2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { Service } from "../api/services/Service";
import { withErrorHandling } from "../utils/apiErrorHandler";
import type { UserSchema } from "../api/models/UserSchema";
import type { UserListSchema } from "../api/models/UserListSchema";
import { validatePassword } from "../utils/passwordUtils";
import CryptoJS from "crypto-js";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt?: string;
}

const AdminUserManagement: React.FC = () => {
  const { user } = useAuth();
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "1",
  });

  const [showPassword, setShowPassword] = useState(true);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  const sha256 = (text: string): string => {
    return CryptoJS.SHA256(text).toString(CryptoJS.enc.Hex);
  };

  useEffect(() => {
    const fetchAdminUsers = async () => {
      try {
        setIsLoading(true);
        const response = await withErrorHandling(() =>
          Service.getApiGetAdminUsers()
        );
        
        if (response.responseStatus === 1 && response.adminUserListSchema) {
          const mappedUsers: AdminUser[] = response.adminUserListSchema.map((userData: UserListSchema) => ({
            id: userData.userId || '',
            name: userData.name || '',
            email: userData.email || '',
            role: userData.role || '1',
            createdAt: userData.createdAt,
          }));
          setAdminUsers(mappedUsers);
        } else {
          console.warn('管理者ユーザーの取得に失敗しました');
          setAdminUsers([]);
        }
      } catch (error) {
        console.error("管理者ユーザー取得エラー:", error);
        setAdminUsers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdminUsers();
  }, []);

  const handleOpenModal = (adminUser?: AdminUser) => {
    setIsModalOpen(false);
    
    setEditingUser(null);
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "1",
    });
    setPasswordErrors([]);
    setShowPassword(true);
    
    setTimeout(() => {
      if (adminUser) {
        setEditingUser(adminUser);
        setFormData({
          name: adminUser.name,
          email: adminUser.email,
          password: "",
          role: adminUser.role,
        });
      }
      
      setIsModalOpen(true);
    }, 10);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "1",
    });
    setPasswordErrors([]);
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    if (!editingUser) {
      const errors = validatePassword(formData.password);
      if (errors.length > 0) {
        setPasswordErrors(errors);
        return;
      }
    }
  
    setPasswordErrors([]);
  
    try {
      if (editingUser) {
        const userSchema: UserSchema = {
          userId: editingUser.id,
          name: formData.name,
          email: formData.email,
          role: formData.role,
        };
  
        const response = await withErrorHandling(() =>
          Service.putApiUpdateAdminUsers({ userSchema })
        );
  
        if (response.responseStatus === 1) {
          setAdminUsers(prev =>
            prev.map(u =>
              u.id === editingUser.id
                ? { ...u, name: formData.name, email: formData.email, role: formData.role }
                : u
            )
          );
          alert("管理者ユーザーを更新しました");
          handleCloseModal();
        } else {
          console.error('管理者ユーザー更新失敗: responseStatus =', response.responseStatus);
          alert("管理者ユーザーの更新に失敗しました");
        }
      } else {
        const passwordHash = sha256(formData.password);
  
        const userSchema: UserSchema = {
          name: formData.name,
          email: formData.email,
          passwordHash: passwordHash,
          role: formData.role,
        };
  
        const response = await withErrorHandling(() =>
          Service.postApiAuthRegistrationAdmin({ userSchema })
        );
  
        if (response.responseStatus === 1) {
          
          const listResponse = await withErrorHandling(() =>
            Service.getApiGetAdminUsers()
          );
          
          if (listResponse.responseStatus === 1 && listResponse.adminUserListSchema) {
            const mappedUsers: AdminUser[] = listResponse.adminUserListSchema.map((u: UserListSchema) => ({
              id: u.userId || '',
              name: u.name || '',
              email: u.email || '',
              role: u.role || '1',
              createdAt: u.createdAt,
            }));
            setAdminUsers(mappedUsers);
          }
          
          alert("管理者ユーザーを作成しました");
          handleCloseModal();
        } else {
          console.error('管理者ユーザー作成失敗: responseStatus =' + response.responseStatus);
          alert("管理者ユーザーの作成に失敗しました\n登録済みのメールアドレスではないかご確認ください");
        }
      }
    } catch (error) {
      console.error("管理者ユーザー登録/更新エラー:", error);
      alert("エラーが発生しました");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8 py-6">
      {/* タイトル */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="bg-primary text-white p-2 rounded-full">
            <Users className="w-5 h-5" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-text">
            管理者ユーザー管理
          </h1>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="btn-primary flex items-center justify-center space-x-2 rounded-full w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          <span>新規作成</span>
        </button>
      </div>

      {/* ユーザー一覧 - デスクトップ：テーブル */}
      <div className="hidden md:block card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  名前
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  メールアドレス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  権限
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {adminUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                    管理者ユーザーが登録されていません
                  </td>
                </tr>
              ) : (
                adminUsers.map((adminUser) => {
                  const isCurrentUser = user?.id === adminUser.id;
                  const roleLabel = adminUser.role === "2" ? "プラットフォームオーナー" : "管理者";
                  
                  return (
                    <tr key={adminUser.id} className={isCurrentUser ? 'bg-blue-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          {adminUser.name}
                          {isCurrentUser && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary text-white">
                              あなた
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {adminUser.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          adminUser.role === "2" 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {roleLabel}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {/* ★★★ 編集ボタンのみ残す ★★★ */}
                        <button
                          onClick={() => handleOpenModal(adminUser)}
                          className="text-primary hover:text-primary/80"
                          title="編集"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ユーザー一覧 - モバイル：カード */}
      <div className="md:hidden space-y-4">
        {adminUsers.length === 0 ? (
          <div className="card text-center py-8">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">管理者ユーザーが登録されていません</p>
          </div>
        ) : (
          adminUsers.map((adminUser) => {
            const isCurrentUser = user?.id === adminUser.id;
            const roleLabel = adminUser.role === "2" ? "プラットフォームオーナー" : "管理者";
            
            return (
              <div
                key={adminUser.id}
                className={`card ${isCurrentUser ? 'bg-blue-50 border-2 border-blue-200' : ''}`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{adminUser.name}</h3>
                        {isCurrentUser && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary text-white">
                            あなた
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 break-all">{adminUser.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      adminUser.role === "2" 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {roleLabel}
                    </span>
                    
                    {/* ★★★ 編集ボタンのみ残す ★★★ */}
                    <button
                      onClick={() => handleOpenModal(adminUser)}
                      className="text-primary hover:text-primary/80 p-2"
                      title="編集"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* モーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-bold mb-4">
              {editingUser ? "管理者ユーザー編集" : "管理者ユーザー新規作成"}
            </h2>
            <form 
              key={editingUser?.id || 'new'}
              onSubmit={handleSubmit} 
              className="space-y-4"
              autoComplete="off" 
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  名前 <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  name="admin-name" 
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
                  required
                  autoComplete="off"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メールアドレス <span className="text-error">*</span>
                </label>
                <input
                  type="email"
                  name="admin-email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
                  required
                  autoComplete="off"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  権限 <span className="text-error">*</span>
                </label>
                <select
                  name="admin-role"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
                  required
                  autoComplete="off"
                >
                  <option value="1">管理者</option>
                  <option value="2">プラットフォームオーナー</option>
                </select>
              </div>

              {!editingUser && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      パスワード <span className="text-error">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="admin-password"
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        className="w-full border border-gray-300 rounded px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
                        required
                        autoComplete="off"
                        data-form-type="other"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      8文字以上、半角英数字を含めてください
                    </p>
                  </div>
                </>
              )}

              {passwordErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-sm font-medium text-red-800 mb-1">パスワードエラー：</p>
                  <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                    {passwordErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="w-full sm:flex-1 px-4 py-2 border border-gray-300 rounded-full hover:bg-gray-50 text-sm sm:text-base"
                >
                  キャンセル
                </button>
                <button 
                  type="submit" 
                  className="w-full sm:flex-1 btn-primary rounded-full text-sm sm:text-base"
                >
                  {editingUser ? "更新" : "作成"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserManagement;