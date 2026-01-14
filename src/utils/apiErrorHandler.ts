/**
 * API エラーハンドラー
 * 401エラー（認証エラー）を検知して自動ログアウトを実行
 */

import { ApiError } from '../api/core/ApiError';

// ログアウトコールバック（AuthContextから設定される）
let logoutCallback: (() => void) | null = null;

// セッション期限切れメッセージを表示するコールバック
let sessionExpiredCallback: (() => void) | null = null;

/**
 * ログアウトコールバックを設定
 */
export const setLogoutCallback = (callback: () => void) => {
  logoutCallback = callback;
};

/**
 * セッション期限切れメッセージコールバックを設定
 */
export const setSessionExpiredCallback = (callback: () => void) => {
  sessionExpiredCallback = callback;
};

/**
 * API エラーをハンドリング
 * 401エラーの場合は自動ログアウトを実行
 */
export const handleApiError = (error: unknown): void => {
  // ApiErrorかどうかをチェック
  if (error instanceof ApiError) {
    const status = error.status;
    
    // 401エラー（Unauthorized）の場合
    if (status === 401) {
      console.warn('トークンが無効または期限切れです。自動ログアウトを実行します。');
      
      // セッション期限切れメッセージを表示
      if (sessionExpiredCallback) {
        sessionExpiredCallback();
      }
      
      // ログアウト処理を実行
      if (logoutCallback) {
        logoutCallback();
      }
    }
  }
};

/**
 * API呼び出しをラップしてエラーハンドリングを追加
 */
export const withErrorHandling = async <T>(
  apiCall: () => Promise<T>
): Promise<T> => {
  try {
    return await apiCall();
  } catch (error) {
    handleApiError(error);
    throw error; // エラーを再スローして、呼び出し元でも処理できるようにする
  }
};
