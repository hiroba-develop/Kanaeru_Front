/**
 * 日時関連のユーティリティ関数
 */

/**
 * 現在の日時をJST（日本標準時、UTC+9）のISO 8601形式で取得
 * @returns JSTタイムゾーン付きのISO 8601形式の文字列（例: "2026-03-03T18:17:33.371+09:00"）
 */
export const getCurrentJSTISOString = (): string => {
  const now = new Date();
  
  // JSTオフセット（+09:00）を適用してJST時刻を計算
  const jstOffsetMs = 9 * 60 * 60 * 1000; // 9時間をミリ秒に変換
  const jstTime = new Date(now.getTime() + jstOffsetMs);
  
  // UTCベースでJSTの日時を計算
  const year = jstTime.getUTCFullYear();
  const month = String(jstTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(jstTime.getUTCDate()).padStart(2, "0");
  const hours = String(jstTime.getUTCHours()).padStart(2, "0");
  const minutes = String(jstTime.getUTCMinutes()).padStart(2, "0");
  const seconds = String(jstTime.getUTCSeconds()).padStart(2, "0");
  const milliseconds = String(jstTime.getUTCMilliseconds()).padStart(3, "0");
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}+09:00`;
};
