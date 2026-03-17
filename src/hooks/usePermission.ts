import { useAuth } from "../contexts/AuthContext";

export const ROLES = {
  LEGACY_FREE: "0",   // 旧無料ユーザー（互換性のため残す）
  FREE: "3",          // 無料ユーザー（自分のデータ編集可能）
  PAID: "4",          // 有料ユーザー（自分のデータ編集可能）
  ADMIN: "1",         // 管理者（他ユーザー閲覧可能）
  MANAGER: "2",       // 管理者（他ユーザー閲覧可能）
} as const;

export const usePermission = () => {
  const { selectedUser, user } = useAuth();
  const role = selectedUser?.role;

  const isSelf = user?.id === selectedUser?.id;
  
  const canEdit = (role === ROLES.LEGACY_FREE || role === ROLES.FREE || role === ROLES.PAID) && isSelf;
  
  const isAdmin = role === ROLES.ADMIN || role === ROLES.MANAGER;
  const isViewOnly = !canEdit;

  return {
    canEdit,
    isAdmin,
    isViewOnly,
    isSelf,
    role,
  };
};