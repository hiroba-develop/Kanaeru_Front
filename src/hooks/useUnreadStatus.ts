import { useState, useEffect, useCallback } from 'react';
import { Service } from '../api/services/Service';

export const useUnreadStatus = (userId: string | null) => {
  const [hasUnread, setHasUnread] = useState(false);
  const [unreadUserIds, setUnreadUserIds] = useState<string[]>([]);

  const fetchUnreadStatus = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await Service.apiSupportUnreadStatusGet(userId);
      if (data.responseStatus === 1) {
        setHasUnread(data.hasUnread ?? false);
        setUnreadUserIds(data.unreadUserIds ?? []);
      }
    } catch (e) {
      console.error('未読状態取得エラー:', e);
    }
  }, [userId]);

  // 初回取得
  useEffect(() => { fetchUnreadStatus(); }, [fetchUnreadStatus]);

  // 30秒ごとにポーリング
  useEffect(() => {
    if (!userId) return;
    const timer = setInterval(fetchUnreadStatus, 30000);
    return () => clearInterval(timer);
  }, [userId, fetchUnreadStatus]);

  return { hasUnread, unreadUserIds, refetch: fetchUnreadStatus };
};