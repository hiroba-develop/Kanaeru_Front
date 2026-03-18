import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  MessageCircle,
  User,
  Send,
  CheckCircle,
  Check,
  Plus,
  X,
  BookOpen,
  Calendar,
  Pencil,
  Trash2,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Service } from "../api/services/Service";
import { withErrorHandling } from "../utils/apiErrorHandler";
import { useUnreadStatus } from '../hooks/useUnreadStatus';

// ── 型定義 ──────────────────────────────────────────────────────
type Message = {
  messageSeq: number;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  content: string;
  createdAt: string;
  readAt: string | null;
};

type Advice = {
  adviceId: string | null;
  adminName: string;
  adviceContent: string;
  createdAt: string;
  updatedAt: string | null;
};

// ── ユーティリティ ────────────────────────────────────────────
const toMonthKey = (isoStr: string) => isoStr.slice(0, 7);

const formatMonthLabel = (key: string) => {
  const [y, m] = key.split("-");
  return `${y}年${parseInt(m, 10)}月`;
};

const sortDesc = (list: Advice[]) =>
  [...list].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

const formatDateTime = (isoStr: string) => {
  const d = new Date(isoStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
};

const isSameDateTime = (a: string, b: string) =>
  Math.abs(new Date(a).getTime() - new Date(b).getTime()) < 1000; // 1秒以内は同じとみなす
// ── モバイル用タブ型 ──────────────────────────────────────────
type Tab = "advice" | "chat";

// ── メインコンポーネント ────────────────────────────────────────
const Support: React.FC = () => {
  const { user, selectedUser, managedUsers, switchUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { refetch: refetchUnread } = useUnreadStatus(user?.id ?? null);

  // ── ロール判定 ────────────────────────────────────────────────
  const isAdmin = user?.role === "1" || user?.role === "2";
  const isFreeUser = user?.role === "3" || user?.role === "0";

  // ────────────────────────────────────────────────────────────
  // State定義
  // ────────────────────────────────────────────────────────────

  // モバイルタブ
  const [activeTab, setActiveTab] = useState<Tab>("advice");

  // アドバイス
  const [advices, setAdvices] = useState<Advice[]>([]);
  const [isAdviceLoading, setIsAdviceLoading] = useState(false);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>("");
  const [showAdviceForm, setShowAdviceForm] = useState(false);
  const [newAdviceContent, setNewAdviceContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingAdviceId, setEditingAdviceId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const adviceFormRef = useRef<HTMLTextAreaElement>(null);

  // チャット
  const [chatMessage, setChatMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [lastMessageSeq, setLastMessageSeq] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatPartnerIdRef = useRef<string>("");

  // ────────────────────────────────────────────────────────────
  // 派生値
  // ────────────────────────────────────────────────────────────

  const adminTargetId =
    selectedUser && selectedUser.id !== user?.id ? selectedUser.id : "";
  const chatPartnerId = isAdmin ? adminTargetId : (user?.id ?? "");
  const adviceUserId = isAdmin ? adminTargetId : (user?.id ?? "");

  // 全アドバイスを月ごとにグルーピング
  const advicesByMonth = useMemo(() => {
    return advices.reduce((acc, advice) => {
      const key = toMonthKey(advice.createdAt);
      if (!acc[key]) acc[key] = [];
      acc[key].push(advice);
      return acc;
    }, {} as Record<string, Advice[]>);
  }, [advices]);

  // 登録済み月一覧（新しい順）
  const availableMonths = useMemo(
    () => Object.keys(advicesByMonth).sort().reverse(),
    [advicesByMonth]
  );

  // 選択中の月のアドバイス
  const currentMonthAdvices = useMemo(
    () => advicesByMonth[selectedMonthKey] ?? [],
    [advicesByMonth, selectedMonthKey]
  );

  // 登録済みアドバイスの最新（常時表示バッジ用）
  const latestAdvice = useMemo(() => sortDesc(advices)[0] ?? null, [advices]);

  const groupMessagesByDate = useMemo(() => {
    const groups: { [key: string]: Message[] } = {};
    const sorted = [...messages].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    sorted.forEach((msg) => {
      const date = new Date(msg.createdAt).toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(msg);
    });
    return groups;
  }, [messages]);

  // ────────────────────────────────────────────────────────────
  // ハンドラー・非同期関数
  // ────────────────────────────────────────────────────────────

  const resetAdviceFormState = () => {
    setShowAdviceForm(false);
    setNewAdviceContent("");
    setEditingAdviceId(null);
    setEditingContent("");
  };

  const handleCancelAdviceForm = () => {
    setShowAdviceForm(false);
    setNewAdviceContent("");
  };

  const handleEditAdvice = (advice: Advice) => {
    setEditingAdviceId(advice.adviceId);
    setEditingContent(advice.adviceContent);
  };

  const resolveAvatar = (senderId: string): string | undefined => {
    if (senderId === user?.id) return user?.avatar;
    return managedUsers.find((u) => u.id === senderId)?.avatar;
  };

  const handleRegisterAdvice = async () => {
    if (!newAdviceContent.trim() || isSubmitting || !adviceUserId) return;
    setIsSubmitting(true);
    try {
      const response = await withErrorHandling(() =>
        Service.postApiSupportAdviceCreate({
          userId: adviceUserId,
          adviceContent: newAdviceContent.trim(),
        })
      );
      if (response.responseStatus === 1) {
        const newMonthKey = toMonthKey(new Date().toISOString());
        resetAdviceFormState();
        // 全件再取得
        const allResponse = await withErrorHandling(() =>
          Service.getApiSupportAdvice(adviceUserId)
        );
        if (allResponse.responseStatus === 1) {
          const mappedAdvices: Advice[] = (allResponse.adviceSchema ?? []).map((a) => ({
            adviceId: a.adviceId ?? null,
            adminName: a.adminName ?? "",
            adviceContent: a.adviceContent ?? "",
            createdAt: a.createdAt ?? new Date().toISOString(),
            updatedAt: a.updatedAt ?? null,
          }));
          setAdvices(mappedAdvices);
        }
        setSelectedMonthKey(newMonthKey);
      }
    } catch (error) {
      console.error("アドバイス登録エラー:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEditAdvice = async (id: string | null) => {
    if (!editingContent.trim() || id === null) return;
    try {
      const response = await withErrorHandling(() =>
        Service.putApiSupportAdviceUpdate({
          adviceId: id,
          adviceContent: editingContent.trim(),
        })
      );
      if (response.responseStatus === 1) {
        setAdvices((prev) =>
          prev.map((a) =>
            a.adviceId === id ? { ...a, adviceContent: editingContent.trim() } : a
          )
        );
        setEditingAdviceId(null);
        setEditingContent("");
        window.location.reload();
      }
    } catch (error) {
      console.error("アドバイス更新エラー:", error);
    }
  };

  const handleDeleteAdvice = async (id: string | null) => {
    if (id === null) return;
    if (!window.confirm("このアドバイスを削除してもよろしいですか？")) return;
    try {
      const response = await withErrorHandling(() =>
        Service.deleteApiSupportAdviceDelete(id)
      );
      if (response.responseStatus === 1) {
        setAdvices((prev) => prev.filter((a) => a.adviceId !== id));
      }
    } catch (error) {
      console.error("アドバイス削除エラー:", error);
    }
  };

  const markMessagesAsRead = async (unreadMessages: Message[]) => {
    if (!user?.id || unreadMessages.length === 0) return;
    try {
      await Promise.all(
        unreadMessages.map((m) =>
          withErrorHandling(() =>
            Service.getApiSupportRead(
              m.senderId,
              m.recipientId || m.senderId,
              "",
              m.messageSeq
            )
          )
        )
      );
      const readAt = new Date().toISOString();
      setMessages((prev) =>
        prev.map((m) =>
          unreadMessages.some((u) => u.messageSeq === m.messageSeq)
            ? { ...m, readAt }
            : m
        )
      );
      
      // 既読処理後にバッジを更新
      await refetchUnread();
    } catch (error) {
      console.error("既読処理エラー:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !user?.id || isSending) return;
    if (isAdmin && !adminTargetId) return;

    const content = chatMessage.trim();
    setChatMessage("");
    setIsSending(true);

    try {
      const recipientId = isAdmin ? adminTargetId : "0";
      const recipientName = isAdmin ? (selectedUser?.name ?? "") : "管理者";

      const response = await withErrorHandling(() =>
        Service.postApiSupportSend({
          senderId: user.id,
          recipientId,
          content,
          messageSeq: lastMessageSeq,
        })
      );

      if (response.responseStatus === 1) {
        setLastMessageSeq(response.lastMessageSeq ?? lastMessageSeq);
        const m = response.dmMessageSchema;
        if (m?.messageSeq !== undefined) {
          setMessages((prev) => [
            ...prev,
            {
              messageSeq: m.messageSeq as number,
              senderId: m.senderId ?? user.id,
              senderName: m.senderName ?? user.name ?? "",
              recipientId: m.recipientId ?? recipientId,
              recipientName: m.recipientName ?? recipientName,
              content: m.content ?? content,
              createdAt: m.createdAt ?? new Date().toISOString(),
              readAt: m.readAt ?? null,
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              messageSeq: Date.now(),
              senderId: user.id,
              senderName: user.name ?? "",
              recipientId,
              recipientName,
              content,
              createdAt: new Date().toISOString(),
              readAt: null,
            },
          ]);
        }
      }
    } catch (error) {
      console.error("メッセージ送信エラー:", error);
    } finally {
      setIsSending(false);
    }
  };

  // ────────────────────────────────────────────────────────────
  // useEffect
  // ────────────────────────────────────────────────────────────

  // URL の userId → selectedUser に反映
  useEffect(() => {
    if (!isAdmin) return;
    const urlUserId = searchParams.get("userId");
    if (!urlUserId) return;
    if (selectedUser?.id === urlUserId) return;
    if (managedUsers.length === 0) return;
    switchUser(urlUserId);
  }, [isAdmin, managedUsers, searchParams]);

  // adminTargetId が変わったら URL を更新
  useEffect(() => {
    if (!isAdmin) return;
    const urlUserId = searchParams.get("userId");
    if (adminTargetId && adminTargetId !== urlUserId) {
      setSearchParams({ userId: adminTargetId }, { replace: true });
    } 
  }, [adminTargetId]);

  useEffect(() => {
    if (selectedMonthKey) {
      resetAdviceFormState();
    }
  }, [selectedMonthKey]);

  // フォーム表示時に textarea へフォーカス
  useEffect(() => {
    if (showAdviceForm) {
      setTimeout(() => adviceFormRef.current?.focus(), 50);
    }
  }, [showAdviceForm]);

  // メッセージ・アドバイス初期取得
  useEffect(() => {
    if (!user?.id) return;
    if (isAdmin && !adminTargetId) return;

    const fetchInitialData = async () => {
      // ★ 追加：取得開始時点のターゲットIDを記録
      const targetId = chatPartnerId;
    
      setIsChatLoading(true);
      setIsAdviceLoading(true);
      setMessages([]);
      setAdvices([]);
      setSelectedMonthKey("");
      setLastMessageSeq(0);
    
      try {
        const response = await withErrorHandling(() =>
          Service.getApiSupport(targetId)  // ★ chatPartnerId → targetId に変更
        );
    
        // ★ 追加：取得完了時にターゲットが変わっていたら反映しない
        if (targetId !== chatPartnerIdRef.current) return;
    
        if (response.responseStatus === 1) {
          // ── メッセージ処理 ──────────────────────────
          setLastMessageSeq(response.lastMessageSeq ?? 0);
          const rawList =
            response.dmMessagesSchemaList ??
            (response.dmMessageSchema ? [response.dmMessageSchema] : []);
          if (rawList.length > 0) {
            const mapped: Message[] = rawList
              .filter((m) => m.messageSeq !== undefined)
              .map((m) => ({
                messageSeq: m.messageSeq!,
                senderId: m.senderId ?? "",
                senderName: m.senderName ?? "",
                recipientId: m.recipientId ?? "",
                recipientName: m.recipientName ?? "",
                content: m.content ?? "",
                createdAt: m.createdAt ?? new Date().toISOString(),
                readAt: m.readAt ?? null,
              }));
            setMessages(mapped);
            const unread = mapped.filter((m) => m.senderId !== user.id && !m.readAt);
            await markMessagesAsRead(unread);
          } else {
            setMessages([]); // ★ 空でも明示的にクリア（既存）
          }

          // ── アドバイス処理（全件取得） ──────────────
          const rawAdviceList = response.adviceSchema ?? [];
          const mappedAdvices: Advice[] = rawAdviceList.map((a) => ({
            adviceId: a.adviceId ?? null,
            adminName: a.adminName ?? "",
            adviceContent: a.adviceContent ?? "",
            createdAt: a.createdAt ?? new Date().toISOString(),
            updatedAt: a.updatedAt ?? null,
          }));
          setAdvices(mappedAdvices);
          if (mappedAdvices.length > 0) {
            const latestMonth = toMonthKey(sortDesc(mappedAdvices)[0].createdAt);
            setSelectedMonthKey(latestMonth);
          }
          // ★ 空の場合は selectedMonthKey は上でクリア済みなので不要
        }
      } catch (error) {
        console.error("初期データ取得エラー:", error);
      } finally {
        setIsChatLoading(false);
        setIsAdviceLoading(false);
        await refetchUnread();
      }
    };

    fetchInitialData();
  }, [user?.id, chatPartnerId,selectedUser?.id]);

  // メッセージ末尾へスクロール
  useEffect(() => {
    const t = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
    return () => clearTimeout(t);
  }, [messages]);

  useEffect(() => {
    chatPartnerIdRef.current = chatPartnerId;
  }, [chatPartnerId]);

  // ────────────────────────────────────────────────────────────
  // レンダリング
  // ────────────────────────────────────────────────────────────

  const renderAdvicePanel = () => (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-text">
            メンターからのアドバイス
          </h3>
        </div>
        {isAdmin && !showAdviceForm && (
          <button
            onClick={() => setShowAdviceForm(true)}
            className="flex items-center space-x-1 px-2 sm:px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span className="hidden sm:inline">アドバイスを登録</span>
            <span className="sm:hidden">登録</span>
          </button>
        )}
      </div>

      {/* インライン登録フォーム */}
      {isAdmin && showAdviceForm && (
        <div className="mb-4 flex-shrink-0 rounded-xl border border-primary/30 bg-green-50 p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-primary">アドバイスを登録</span>
            <button
              onClick={handleCancelAdviceForm}
              className="p-1 rounded-md hover:bg-green-100 transition-colors"
              title="キャンセル"
            >
              <X className="h-3.5 w-3.5 text-text/50" />
            </button>
          </div>
          <textarea
            ref={adviceFormRef}
            value={newAdviceContent}
            onChange={(e) => setNewAdviceContent(e.target.value)}
            placeholder="メンバーへのアドバイスを入力してください..."
            rows={4}
            maxLength={1000}
            className="w-full rounded-lg border border-primary/20 bg-white px-3 py-2 text-xs sm:text-sm text-text placeholder-text/30 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-text/40">{newAdviceContent.length}/1000文字</span>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCancelAdviceForm}
                className="px-3 py-1.5 text-xs text-text/60 hover:text-text transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleRegisterAdvice}
                disabled={!newAdviceContent.trim() || isSubmitting}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                ) : (
                  <Plus className="h-3 w-3" />
                )}
                <span>登録する</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 最新アドバイス強調表示 */}
      {latestAdvice && (
        <div className={`mb-4 flex-shrink-0 rounded-xl p-3 sm:p-4 border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 overflow-y-auto ${
          editingAdviceId === latestAdvice.adviceId ? "" : "max-h-48"
        }`}>
          <div className="mb-2">
            {/* 1行目：アイコン + 名前 + Newバッジ + 編集・削除ボタン */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2 min-w-0">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <User className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-text">
                  {latestAdvice.adminName}
                </span>
                <span className="text-xs bg-green-500 text-white px-1.5 py-0.5 rounded-full flex-shrink-0">
                  New
                </span>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => handleEditAdvice(latestAdvice)} className="p-1 rounded-md hover:bg-green-100 transition-colors" title="編集">
                    <Pencil className="h-3 w-3 text-text/40 hover:text-text/70" />
                  </button>
                  <button onClick={() => handleDeleteAdvice(latestAdvice.adviceId)} className="p-1 rounded-md hover:bg-red-100 transition-colors" title="削除">
                    <Trash2 className="h-3 w-3 text-text/40 hover:text-red-500" />
                  </button>
                </div>
              )}
            </div>
            {/* 2行目：登録・更新日時 */}
            <div className="flex flex-col gap-0.5 mt-1 items-end">
              <span className="text-xs text-text/50">登録: {formatDateTime(latestAdvice.createdAt)}</span>
              {latestAdvice.updatedAt && !isSameDateTime(latestAdvice.createdAt, latestAdvice.updatedAt) && (
                <span className="text-xs text-text/40">更新: {formatDateTime(latestAdvice.updatedAt)}</span>
              )}
            </div>
          </div>
          {isAdmin && editingAdviceId !== null && editingAdviceId === latestAdvice.adviceId ? (
          <div>
            <textarea
              value={editingContent}
              onChange={(e) => setEditingContent(e.target.value)}
              rows={4}
              maxLength={1000}
              autoFocus
              className="w-full rounded-lg border border-primary/20 bg-white px-3 py-2 text-xs sm:text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-text/40">{editingContent.length}/1000文字</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => { setEditingAdviceId(null); setEditingContent(""); }}
                  className="px-3 py-1.5 text-xs text-text/60 hover:text-text transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={() => handleSaveEditAdvice(latestAdvice.adviceId)}
                  disabled={!editingContent.trim()}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Check className="h-3 w-3" />
                  <span>保存</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs sm:text-sm text-text leading-relaxed whitespace-pre-wrap">{latestAdvice.adviceContent}</p>
        )}
        </div>
      )}

      {/* 月別プルダウン */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0 pr-2">
        <div className="flex items-center space-x-1">
          <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-text/40" />
          <span className="text-xs text-text/50 font-medium">月別履歴</span>
        </div>
        {availableMonths.length > 0 ? (
          <select
          value={selectedMonthKey}
          onChange={(e) => {
            resetAdviceFormState();
            setSelectedMonthKey(e.target.value);
          }}
          className="text-xs font-semibold text-text pl-2 pr-8 py-1 bg-gray-100 rounded-lg border-none focus:outline-none focus:ring-1 focus:ring-primary max-w-[180px]"
        >
            {availableMonths.map((key) => (
              <option key={key} value={key}>
                {formatMonthLabel(key)}（{advicesByMonth[key].length}件）
              </option>
            ))}
          </select>
        ) : (
          <span className="text-xs text-text/40">履歴なし</span>
        )}
      </div>

      {/* アドバイス一覧 */}
      <div className="flex-1 overflow-y-auto space-y-3 min-h-0 pr-1">
        {isAdviceLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
          </div>
        ) : currentMonthAdvices.filter((_, index) => {
            const isLatestMonth = availableMonths[0] === selectedMonthKey;
            return !(isLatestMonth && index === 0);
          }).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text/40 space-y-2">
            <BookOpen className="h-7 w-7 sm:h-8 sm:w-8" />
            <p className="text-xs sm:text-sm">他のアドバイスはありません</p>
          </div>
        ) : (
          sortDesc(currentMonthAdvices)
            .filter((_, index) => {
              const isLatestMonth = availableMonths[0] === selectedMonthKey;
              return !(isLatestMonth && index === 0);
            })
            .map((advice) => (
            <div
              key={advice.adviceId ?? advice.createdAt}
              className="rounded-xl p-3 sm:p-4 border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="mb-2">
                {/* 1行目：アイコン + 名前 + 編集・削除ボタン */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 min-w-0">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-primary/80 flex items-center justify-center flex-shrink-0">
                      <User className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-text">
                      {advice.adminName}
                    </span>
                  </div>
                  {isAdmin && editingAdviceId !== advice.adviceId && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => handleEditAdvice(advice)} className="p-1 rounded-md hover:bg-gray-200 transition-colors" title="編集">
                        <Pencil className="h-3 w-3 text-text/40 hover:text-text/70" />
                      </button>
                      <button onClick={() => handleDeleteAdvice(advice.adviceId)} className="p-1 rounded-md hover:bg-red-100 transition-colors" title="削除">
                        <Trash2 className="h-3 w-3 text-text/40 hover:text-red-500" />
                      </button>
                    </div>
                  )}
                </div>
                {/* 2行目：登録・更新日時 */}
                <div className="flex flex-col gap-0.5 mt-1 items-end">
                  <span className="text-xs text-text/50">登録: {formatDateTime(advice.createdAt)}</span>
                  {advice.updatedAt && !isSameDateTime(advice.createdAt, advice.updatedAt) && (
                    <span className="text-xs text-text/40">更新: {formatDateTime(advice.updatedAt)}</span>
                  )}
                </div>
              </div>

              {isAdmin && editingAdviceId !== null && editingAdviceId === advice.adviceId ? (
                <div>
                  <textarea
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    rows={4}
                    maxLength={1000}
                    autoFocus
                    className="w-full rounded-lg border border-primary/20 bg-white px-3 py-2 text-xs sm:text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-text/40">{editingContent.length}/1000文字</span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => { setEditingAdviceId(null); setEditingContent(""); }}
                        className="px-3 py-1.5 text-xs text-text/60 hover:text-text transition-colors"
                      >
                        キャンセル
                      </button>
                      <button
                        onClick={() => handleSaveEditAdvice(advice.adviceId)}
                        disabled={!editingContent.trim()}
                        className="flex items-center space-x-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Check className="h-3 w-3" />
                        <span>保存</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-text leading-relaxed whitespace-pre-wrap">{advice.adviceContent}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderChatPanel = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 sm:mb-4 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-text">チャット相談</h3>
        </div>
        {isAdmin && selectedUser && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 border border-green-200 rounded-lg">
            <User className="h-3.5 w-3.5 text-primary flex-shrink-0" />
            <span className="text-xs font-medium text-primary">{selectedUser.name}</span>
          </div>
        )}
      </div>

      {isAdmin && !adminTargetId ? (
        <div className="flex-1 flex flex-col items-center justify-center text-text/40 space-y-2">
          <MessageCircle className="h-8 w-8 sm:h-10 sm:w-10" />
          <p className="text-xs sm:text-sm">サイドメニューでユーザーを選択してください</p>
        </div>
      ) : (
        <>
          <div className="border border-border rounded-2xl flex-1 p-2 sm:p-3 mb-3 sm:mb-4 overflow-y-auto bg-sub2/30 min-h-0">
            {isChatLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
              </div>
            ) : Object.keys(groupMessagesByDate).length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-text/50 text-xs sm:text-sm">メッセージがありません</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(groupMessagesByDate).map(([date, dayMessages]) => (
                  <div key={date} className="space-y-3">
                    <div className="sticky top-0 z-10 flex items-center justify-center py-2">
                      <div className="bg-white shadow-sm text-gray-700 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs font-medium border border-gray-200">
                        {date}
                      </div>
                    </div>
                    <div className="pt-1">
                      {dayMessages.map((message) => {
                        const isOwn = message.senderId === user?.id;
                        const isRead = !!(message.readAt?.trim());
                        return (
                          <div key={message.messageSeq} className="mb-4">
                            <div className={`flex items-end gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden flex-shrink-0">
                                {resolveAvatar(message.senderId) ? (
                                  <img
                                    src={resolveAvatar(message.senderId)}
                                    alt={message.senderName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className={`w-full h-full flex items-center justify-center ${isOwn ? "bg-primary" : "bg-green-300"}`}>
                                    <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                                  </div>
                                )}
                              </div>
                              <div className={`rounded-3xl px-3 sm:px-4 py-2 sm:py-2.5 shadow-sm max-w-[72%] sm:max-w-[60%] ${isOwn ? "bg-primary text-white" : "bg-green-100 text-text"}`}>
                                <p className="text-xs sm:text-sm break-words [overflow-wrap:anywhere] leading-relaxed whitespace-pre-wrap">
                                  {message.content}
                                </p>
                              </div>
                            </div>
                            <div className={`flex items-center mt-1 text-xs text-gray-500 gap-1 ${isOwn ? "justify-end pr-9 sm:pr-10" : "justify-start pl-9 sm:pl-10"}`}>
                              <span>{message.senderName}</span>
                              <span>
                                {new Date(message.createdAt).toLocaleTimeString("ja-JP", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              {isOwn && (
                                isRead ? (
                                  <div className="flex items-center gap-0.5">
                                    <CheckCircle className="h-3 w-3 text-primary" />
                                    <span className="text-primary">既読</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-0.5">
                                    <Check className="h-3 w-3 text-gray-400" />
                                    <span>送信済み</span>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="flex-shrink-0">
            {isFreeUser ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-3 sm:p-4">
                <p className="text-xs sm:text-sm font-medium text-green-900">
                  チャット機能をご利用いただくには、有料プランへのアップグレードが必要です
                </p>
                <p className="text-xs text-green-700 mt-1">
                  有料プランにアップグレードすると、メンターとのチャット相談機能をご利用いただけます。
                </p>
                <button
                  className="mt-3 px-3 sm:px-4 py-1.5 sm:py-2 text-white text-xs sm:text-sm font-medium hover:opacity-90 transition-opacity rounded-full"
                  style={{ background: "#13AE67" }}
                  onClick={() => {/* TODO: 課金管理ページへ遷移 */}}
                >
                  有料プランにアップグレード
                </button>
              </div>
            ) : (
              <div className="space-y-1 sm:space-y-2">
                <div className="flex space-x-2 items-end">
                  <textarea
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    className="input-field flex-1 text-sm rounded-2xl resize-none"
                    placeholder="メッセージを入力..."
                    disabled={isSending}
                    maxLength={1000}
                    rows={1}
                    style={{
                      minHeight: "40px",
                      maxHeight: "120px",
                      overflowY: "auto",
                      lineHeight: "1.5",
                      paddingTop: "8px",
                      paddingBottom: "8px",
                    }}
                    onInput={(e) => {
                      // ★ 内容に応じて高さを自動調整
                      const el = e.currentTarget;
                      el.style.height = "auto";
                      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
                    }}
                    onKeyDown={(e) => {
                      // ★ Shift+Enter で改行、Enter のみで送信
                      if (e.key === "Enter" && !e.shiftKey && !isSending) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <button
                    onClick={handleSendMessage}
                    className="btn-primary px-3 rounded-full aspect-square flex-shrink-0"
                    disabled={isSending || !chatMessage.trim()}
                    style={{ height: "40px", width: "40px" }}
                  >
                    {isSending ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {chatMessage.trim() && (
                  <div className="text-xs text-text/70 px-1">{chatMessage.length}/1000文字</div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-text">
          アドバイス・チャット相談
        </h1>
      </div>

      {/* モバイル：タブUI */}
      <div className="flex flex-col md:hidden" style={{ height: "calc(100dvh - 140px)" }}>
        <div className="flex bg-gray-100 rounded-xl p-1 mb-4 flex-shrink-0">
          <button
            onClick={() => setActiveTab("advice")}
            className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "advice" ? "bg-white text-text shadow-sm" : "text-text/50 hover:text-text/70"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>アドバイス</span>
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "chat" ? "bg-white text-text shadow-sm" : "text-text/50 hover:text-text/70"
            }`}
          >
            <MessageCircle className="h-4 w-4" />
            <span>チャット</span>
          </button>
        </div>
        <div className="card flex-1 overflow-hidden">
          {activeTab === "advice" ? renderAdvicePanel() : renderChatPanel()}
        </div>
      </div>

      {/* タブレット以上：2カラム */}
      <div className="hidden md:flex gap-4 lg:gap-6" style={{ height: "80vh" }}>
        <div className="flex-1 card overflow-hidden">
          {renderAdvicePanel()}
        </div>
        <div className="flex-1 card overflow-hidden">
          {renderChatPanel()}
        </div>
      </div>
    </div>
  );
};

export default Support;