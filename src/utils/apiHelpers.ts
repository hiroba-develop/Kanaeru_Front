/**
 * API 呼び出しサンプル
 * エラーハンドリング付きでAPIを呼び出す例
 */

import { Service } from '../api/services/Service';
import { withErrorHandling } from '../utils/apiErrorHandler';

/**
 * ユーザー情報を取得（エラーハンドリング付き）
 */
export const fetchUserWithErrorHandling = async (userId: string) => {
  return withErrorHandling(() => Service.getApiSettingUser(userId));
};

/**
 * マンダラチャート一覧を取得（エラーハンドリング付き）
 */
export const fetchMandalaChartsWithErrorHandling = async (userId: string) => {
  return withErrorHandling(() => Service.getApiMandalaCharts(userId));
};

/**
 * 汎用的なAPI呼び出しラッパー
 * 使用例：
 * const result = await callApiWithErrorHandling(() => Service.anyApiMethod(...args));
 */
export const callApiWithErrorHandling = withErrorHandling;
