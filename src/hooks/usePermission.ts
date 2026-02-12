import { useAuth } from "../contexts/AuthContext";

export const ROLES = {
  USER: "0",          // 一般ユーザー（自分のデータ編集可能）
  ADMIN: "1",         // 管理者（他ユーザー閲覧可能）
  MANAGER: "2",       // 管理者（他ユーザー閲覧可能）
} as const;

export const usePermission = () => {
  const { selectedUser, user } = useAuth();
  const role = selectedUser?.role;

  // 自分自身のデータを見ているか
  const isSelf = user?.id === selectedUser?.id;
  
  // ★ role が "0" かつ自分自身のデータの場合のみ編集可能
  const canEdit = role === ROLES.USER && isSelf;
  
  // 管理者かどうか（role が "1" または "2"）
  const isAdmin = role === ROLES.ADMIN || role === ROLES.MANAGER;
  
  // 閲覧のみ（編集不可）
  const isViewOnly = !canEdit;

  return {
    canEdit,        // role "0" かつ自分自身の場合のみtrue
    isAdmin,        // role "1" または "2" の場合true
    isViewOnly,     // 編集不可の場合true
    isSelf,         // 自分自身を選択している場合true
    role,           // 権限レベルそのもの（文字列）
  };
};