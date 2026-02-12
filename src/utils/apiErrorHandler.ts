/**
 * API エラーハンドラー
 * 401エラー（認証エラー）を検知して自動ログアウトを実行
 */

import { ApiError } from '../api/core/ApiError';

// ログアウトコールバック（AuthContextから設定される）
let logoutCallback: (() => void) | null = null;

// セッション期限切れメッセージを表示するコールバック
let sessionExpiredCallback: (() => void) | null = null;

// 401エラー処理中フラグ（複数回実行を防ぐ）
let isHandling401 = false;

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
 * 401エラー処理フラグをリセット（テスト用）
 */
export const reset401HandlingFlag = () => {
  isHandling401 = false;
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
      // すでに処理中の場合は何もしない（複数のAPI呼び出しが同時に401を返す場合の対策）
      if (isHandling401) {
        return;
      }
      
      // 処理開始フラグを立てる
      isHandling401 = true;
      
      console.warn('トークンが無効または期限切れです。自動ログアウトを実行します。');
      
      // エラーメッセージを取得
      const errorBody = error.body as any;
      const message = errorBody?.message || '認証が必要です。ログインしてください。';
      
      // ポップアップを表示
      alert(message);
      
      // セッション期限切れメッセージを表示
      if (sessionExpiredCallback) {
        sessionExpiredCallback();
      }
      
      // ログアウト処理を実行
      if (logoutCallback) {
        logoutCallback();
      }
      
      // 2秒後にフラグをリセット（ログアウト処理完了を待つ）
      setTimeout(() => {
        isHandling401 = false;
      }, 2000);
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
