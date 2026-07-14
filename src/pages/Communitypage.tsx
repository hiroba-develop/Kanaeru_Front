import React, { useState } from "react";

// ── 型定義 ──────────────────────────────────────────────
type ActivityType = "goal_set" | "task_done" | "all_done";

interface Activity {
  id: string;
  userId: string;
  type: ActivityType;
  text: string;
  mandalaTitle?: string;
  time: string;
  liked: boolean;
  likeCount: number;
  source?: "slack" | "manual";
}

interface Member {
  id: string;
  name: string;
  avatar: string;
  role: string;
  todayGoals: number;
  todayDone: number;
  streak: number;
  activities: Activity[];
}

// ── 静的データ ───────────────────────────────────────────
const MEMBERS: Member[] = [
  {
    id: "u1", name: "桑原 翔太", avatar: "KS", role: "営業",
    todayGoals: 5, todayDone: 3, streak: 12,
    activities: [
      { id: "a1", userId: "u1", type: "goal_set",  text: "今日のToDoを登録しました", time: "09:02", liked: false, likeCount: 2, source: "slack" },
      { id: "a2", userId: "u1", type: "task_done", text: "朝のチームMTG準備", time: "09:45", liked: false, likeCount: 0, mandalaTitle: undefined },
      { id: "a3", userId: "u1", type: "task_done", text: "営業資料を仕上げる", time: "11:30", liked: false, likeCount: 5, mandalaTitle: "営業提案スキルを高める" },
      { id: "a4", userId: "u1", type: "task_done", text: "議事録の作成", time: "13:15", liked: false, likeCount: 1 },
    ],
  },
  {
    id: "u2", name: "田中 美咲", avatar: "TM", role: "マーケ",
    todayGoals: 4, todayDone: 4, streak: 7,
    activities: [
      { id: "a5", userId: "u2", type: "goal_set",  text: "今日のToDoを登録しました", time: "08:55", liked: false, likeCount: 0, source: "slack" },
      { id: "a6", userId: "u2", type: "task_done", text: "SNS投稿スケジュール作成", time: "10:10", liked: false, likeCount: 3, mandalaTitle: "ブランド認知を高める" },
      { id: "a7", userId: "u2", type: "task_done", text: "LP改善案まとめ", time: "12:00", liked: false, likeCount: 2 },
      { id: "a8", userId: "u2", type: "task_done", text: "競合調査レポート", time: "14:30", liked: false, likeCount: 4 },
      { id: "a9", userId: "u2", type: "all_done",  text: "今日の目標をすべて達成！", time: "16:00", liked: false, likeCount: 8 },
    ],
  },
  {
    id: "u3", name: "鈴木 健一", avatar: "SK", role: "エンジニア",
    todayGoals: 6, todayDone: 2, streak: 3,
    activities: [
      { id: "a10", userId: "u3", type: "goal_set",  text: "今日のToDoを登録しました", time: "09:30", liked: false, likeCount: 1, source: "manual" },
      { id: "a11", userId: "u3", type: "task_done", text: "PR#142 レビュー対応", time: "11:00", liked: false, likeCount: 2 },
      { id: "a12", userId: "u3", type: "task_done", text: "Slack Botのテスト実施", time: "13:45", liked: false, likeCount: 3, mandalaTitle: "開発生産性を上げる" },
    ],
  },
  {
    id: "u4", name: "佐藤 里奈", avatar: "SR", role: "CS",
    todayGoals: 3, todayDone: 3, streak: 21,
    activities: [
      { id: "a13", userId: "u4", type: "goal_set",  text: "今日のToDoを登録しました", time: "08:45", liked: false, likeCount: 0, source: "slack" },
      { id: "a14", userId: "u4", type: "task_done", text: "問い合わせ対応10件", time: "10:30", liked: false, likeCount: 1 },
      { id: "a15", userId: "u4", type: "task_done", text: "FAQドキュメント更新", time: "12:20", liked: false, likeCount: 2 },
      { id: "a16", userId: "u4", type: "task_done", text: "顧客満足度アンケート集計", time: "15:10", liked: false, likeCount: 0, mandalaTitle: "顧客満足度90%達成" },
      { id: "a17", userId: "u4", type: "all_done",  text: "今日の目標をすべて達成！", time: "15:30", liked: false, likeCount: 11 },
    ],
  },
  {
    id: "u5", name: "山本 大輝", avatar: "YD", role: "人事",
    todayGoals: 4, todayDone: 1, streak: 5,
    activities: [
      { id: "a18", userId: "u5", type: "goal_set",  text: "今日のToDoを登録しました", time: "09:15", liked: false, likeCount: 0, source: "manual" },
      { id: "a19", userId: "u5", type: "task_done", text: "採用面談 3件", time: "14:00", liked: false, likeCount: 2, mandalaTitle: "採用活動を進める" },
    ],
  },
];

// タイムライン用に全アクティビティを時系列でフラット化
type FlatActivity = Activity & { member: Member };
const buildTimeline = (members: Member[]): FlatActivity[] => {
  const flat: FlatActivity[] = [];
  members.forEach((m) => m.activities.forEach((a) => flat.push({ ...a, member: m })));
  flat.sort((a, b) => b.time.localeCompare(a.time));
  return flat;
};

const today = new Date();
const todayLabel = today.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" });

// ── メインコンポーネント ──────────────────────────────────
const CommunityPage: React.FC = () => {
  const [members, setMembers] = useState<Member[]>(MEMBERS);
  const [activeNav, setActiveNav] = useState("community");
  const [filter, setFilter] = useState<"all" | "goal_set" | "task_done" | "all_done">("all");
  const [focusMember, setFocusMember] = useState<string | null>(null);

  const timeline = buildTimeline(members);
  const filtered = timeline.filter((a) => {
    if (focusMember && a.userId !== focusMember) return false;
    if (filter !== "all" && a.type !== filter) return false;
    return true;
  });

  const totalActive = members.filter((m) => m.activities.length > 0).length;
  const totalDone = members.reduce((s, m) => s + m.todayDone, 0);
  const allDoneCount = members.filter((m) => m.todayDone === m.todayGoals && m.todayGoals > 0).length;

  const handleLike = (activityId: string) => {
    setMembers((prev) =>
      prev.map((m) => ({
        ...m,
        activities: m.activities.map((a) =>
          a.id === activityId
            ? { ...a, liked: !a.liked, likeCount: a.liked ? a.likeCount - 1 : a.likeCount + 1 }
            : a
        ),
      }))
    );
  };

  const card = (extra?: React.CSSProperties): React.CSSProperties => ({
    background: "#fff", borderRadius: 14, boxShadow: "0 1px 4px rgba(0,0,0,.06)", ...extra,
  });

  const navItems = [
    { key: "home",      label: "HOME",           Icon: HomeIcon },
    { key: "mandala",   label: "kanaeruマンダラ", Icon: GridIcon },
    { key: "pl",        label: "損益管理",        Icon: ChartIcon },
    { key: "daily",     label: "日々の目標",       Icon: CheckIcon },
    { key: "community", label: "コミュニティ",     Icon: CommunityIcon },
    { key: "advice",    label: "アドバイス・相談", Icon: BubbleIcon },
  ];

  const FILTER_TABS: { key: typeof filter; label: string }[] = [
    { key: "all",       label: "すべて" },
    { key: "goal_set",  label: "目標登録" },
    { key: "task_done", label: "タスク完了" },
    { key: "all_done",  label: "全達成" },
  ];

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#f5f5f5", fontFamily: "'Hiragino Sans','Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif" }}>

      {/* ══ サイドバー ══ */}
      <aside style={{ width: 200, background: "#fff", display: "flex", flexDirection: "column", borderRight: "1px solid #f0f0f0", flexShrink: 0, padding: "20px 0 16px" }}>
        <div style={{ padding: "0 20px 20px" }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: "#13AE67" }}>kanaeru</span>
        </div>
        <div style={{ padding: "0 10px", flex: 1 }}>
          {navItems.map(({ key, label, Icon }) => {
            const active = activeNav === key;
            return (
              <button key={key} onClick={() => setActiveNav(key)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "9px 10px", borderRadius: 10, marginBottom: 2, border: "none", cursor: "pointer", textAlign: "left", background: active ? "#f0faf6" : "transparent", color: active ? "#13AE67" : "#6b7280", fontWeight: active ? 700 : 500, fontSize: 13, fontFamily: "inherit" }}>
                <Icon active={active} />
                {label}
              </button>
            );
          })}
        </div>
        <div style={{ padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 7 }}>
          <button style={{ background: "#F472B6", color: "#fff", border: "none", borderRadius: 24, padding: "9px 0", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>アップグレード</button>
          <button style={{ background: "#13AE67", color: "#fff", border: "none", borderRadius: 24, padding: "9px 0", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>お問い合わせ</button>
        </div>
        <div style={{ padding: "0 16px", display: "flex", gap: 8 }}>
          <span style={{ fontSize: 10, color: "#9ca3af", cursor: "pointer" }}>利用規約</span>
          <span style={{ fontSize: 10, color: "#9ca3af", cursor: "pointer" }}>プライバシーポリシー</span>
        </div>
      </aside>

      {/* ══ メイン ══ */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* トップバー */}
        <div style={{ padding: "12px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", borderBottom: "1px solid #f0f0f0", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#1e1f1f" }}>コミュニティ</span>
            <span style={{ fontSize: 13, color: "#9ca3af" }}>{todayLabel}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 13, color: "#6b7280", cursor: "pointer" }}>ログアウト</span>
            <SettingsIcon />
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "16px 24px", gap: 12, overflow: "hidden" }}>

          {/* ─ サマリー行 ─ */}
          <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
            {[
              { val: `${totalActive}人`, label: "今日活動中", color: "#13AE67" },
              { val: `${totalDone}件`, label: "完了タスク計", color: "#378ADD" },
              { val: `${allDoneCount}人`, label: "全達成メンバー", color: "#F472B6" },
              { val: `${members.length}人`, label: "総メンバー数", color: "#6b7280" },
            ].map(({ val, label, color }) => (
              <div key={label} style={{ ...card(), flex: 1, padding: "10px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color, lineHeight: 1.2 }}>{val}</div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* ─ 2カラム: メンバー一覧 ＋ タイムライン ─ */}
          <div style={{ flex: 1, display: "flex", gap: 16, overflow: "hidden", minHeight: 0 }}>

            {/* 左: メンバーカード一覧 */}
            <div style={{ ...card(), width: 220, flexShrink: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ padding: "12px 14px 8px", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#1e1f1f" }}>メンバー</span>
                <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 6 }}>{members.length}人</span>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px" }}>
                {/* 全員ボタン */}
                <button
                  onClick={() => setFocusMember(null)}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 10, border: "none", cursor: "pointer", marginBottom: 4, background: focusMember === null ? "#f0faf6" : "transparent", fontFamily: "inherit" }}
                >
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: focusMember === null ? "#13AE67" : "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={focusMember === null ? "#fff" : "#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                    </svg>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: focusMember === null ? 700 : 500, color: focusMember === null ? "#13AE67" : "#374151" }}>全員</span>
                </button>

                {members.map((m) => {
                  const pct = m.todayGoals > 0 ? Math.round((m.todayDone / m.todayGoals) * 100) : 0;
                  const isFocus = focusMember === m.id;
                  const allDone = m.todayDone === m.todayGoals && m.todayGoals > 0;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setFocusMember(isFocus ? null : m.id)}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 10, border: "none", cursor: "pointer", marginBottom: 4, background: isFocus ? "#f0faf6" : "transparent", textAlign: "left", fontFamily: "inherit" }}
                    >
                      {/* アバター */}
                      <div style={{ width: 30, height: 30, borderRadius: "50%", background: allDone ? "#13AE67" : "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: allDone ? "#fff" : "#6b7280", flexShrink: 0, position: "relative" }}>
                        {m.avatar}
                        {allDone && (
                          <div style={{ position: "absolute", bottom: -3, right: -3, fontSize: 12, lineHeight: 1 }}>🏆</div>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: isFocus ? 700 : 500, color: isFocus ? "#13AE67" : "#374151", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                          {/* プログレスバー */}
                          <div style={{ flex: 1, height: 3, background: "#e5e7eb", borderRadius: 3 }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: allDone ? "#F472B6" : "#13AE67", borderRadius: 3, transition: "width 0.3s" }} />
                          </div>
                          <span style={{ fontSize: 9, color: "#9ca3af", flexShrink: 0 }}>{m.todayDone}/{m.todayGoals}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 右: タイムライン */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

              {/* フィルタータブ */}
              <div style={{ display: "flex", gap: 6, marginBottom: 10, flexShrink: 0 }}>
                {FILTER_TABS.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    style={{ padding: "5px 14px", borderRadius: 20, border: filter === key ? "none" : "1px solid #e5e7eb", background: filter === key ? "#13AE67" : "#fff", color: filter === key ? "#fff" : "#6b7280", fontSize: 12, fontWeight: filter === key ? 700 : 500, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
                  >
                    {label}
                  </button>
                ))}
                {focusMember && (
                  <button
                    onClick={() => setFocusMember(null)}
                    style={{ padding: "5px 12px", borderRadius: 20, border: "1px solid #13AE67", background: "#f0faf6", color: "#13AE67", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}
                  >
                    {members.find((m) => m.id === focusMember)?.name} ×
                  </button>
                )}
              </div>

              {/* タイムラインフィード */}
              <div style={{ flex: 1, overflowY: "auto" }}>
                {filtered.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af", fontSize: 13 }}>アクティビティはありません</div>
                ) : (
                  filtered.map((a, idx) => {
                    const isAllDone = a.type === "all_done";
                    const isGoalSet = a.type === "goal_set";
                    return (
                      <div key={a.id} style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                        {/* タイムライン縦線 + アバター */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                          <div style={{ width: 36, height: 36, borderRadius: "50%", background: isAllDone ? "#FCE7F3" : isGoalSet ? "#E1F5EE" : "#f0faf6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, border: isAllDone ? "2px solid #F472B6" : isGoalSet ? "2px solid #13AE67" : "2px solid #13AE67" }}>
                            {isAllDone ? "🎉" : isGoalSet ? "📝" : "✅"}
                          </div>
                          {idx < filtered.length - 1 && (
                            <div style={{ width: 1, flex: 1, minHeight: 8, background: "#e5e7eb", marginTop: 4 }} />
                          )}
                        </div>

                        {/* カード本体 */}
                        <div style={{ flex: 1, background: isAllDone ? "#fff9fb" : isGoalSet ? "#fff" : "#f8fffe", borderRadius: 12, padding: "10px 14px", boxShadow: "0 1px 4px rgba(0,0,0,.05)", border: isAllDone ? "1px solid #FCE7F3" : isGoalSet ? "1px solid #bbf7d0" : "1px solid #d1fae5", marginBottom: 2 }}>
                          {/* ヘッダー */}
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: "#1e1f1f" }}>{a.member.name}</span>
                              <span style={{ fontSize: 11, color: "#9ca3af", background: "#f3f4f6", borderRadius: 6, padding: "1px 6px" }}>{a.member.role}</span>
                              {a.source === "slack" && (
                                <span style={{ fontSize: 10, color: "#13AE67", background: "#f0faf6", borderRadius: 6, padding: "1px 6px", fontWeight: 700 }}>Slack</span>
                              )}
                            </div>
                            <span style={{ fontSize: 11, color: "#9ca3af" }}>{a.time}</span>
                          </div>

                          {/* 本文 */}
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                            {/* アイコン */}
                            <div style={{ flexShrink: 0, marginTop: 1 }}>
                              {isAllDone
                                ? <StarBadge />
                                : isGoalSet
                                ? <GoalSetIcon />
                                : <DoneCheckIcon />}
                            </div>
                            <div style={{ flex: 1 }}>
                              <p style={{ fontSize: 13, color: isAllDone ? "#831843" : isGoalSet ? "#065f46" : "#065f46", fontWeight: isAllDone ? 700 : 500, margin: 0, lineHeight: 1.5 }}>
                                {a.text}
                              </p>
                              {a.mandalaTitle && (
                                <p style={{ fontSize: 11, color: "#6b7280", margin: "3px 0 0", display: "flex", alignItems: "center", gap: 4 }}>
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                                    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                                  </svg>
                                  {a.mandalaTitle}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* いいねボタン */}
                          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                            <button
                              onClick={() => handleLike(a.id)}
                              style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 20, border: a.liked ? "none" : "1px solid #e5e7eb", background: a.liked ? "#fce7f3" : "#fff", cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit" }}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill={a.liked ? "#ec4899" : "none"} stroke={a.liked ? "#ec4899" : "#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                              </svg>
                              <span style={{ fontSize: 12, fontWeight: 600, color: a.liked ? "#ec4899" : "#9ca3af" }}>
                                {a.likeCount > 0 ? a.likeCount : "応援する"}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// ── 小コンポーネント ──────────────────────────────────────
const DoneCheckIcon: React.FC = () => (
  <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#13AE67", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
    <svg width="10" height="10" viewBox="0 0 11 11" fill="none">
      <path d="M2 5.5L4.5 8L9 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>
);

const GoalSetIcon: React.FC = () => (
  <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#E1F5EE", border: "1.5px solid #13AE67", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#13AE67" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  </div>
);

const StarBadge: React.FC = () => (
  <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#FCE7F3", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
    <svg width="10" height="10" viewBox="0 0 24 24" fill="#F472B6" stroke="none">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  </div>
);

// ── Icons ────────────────────────────────────────────────
const HomeIcon: React.FC<{active: boolean}> = ({ active }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? "#13AE67" : "#9ca3af"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/>
  </svg>
);
const GridIcon: React.FC<{active: boolean}> = ({ active }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? "#13AE67" : "#9ca3af"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
);
const ChartIcon: React.FC<{active: boolean}> = ({ active }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? "#13AE67" : "#9ca3af"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/><path d="M12 12L8 8m4 4l4-4m-4 4v5"/>
  </svg>
);
const CheckIcon: React.FC<{active: boolean}> = ({ active }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? "#13AE67" : "#9ca3af"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
  </svg>
);
const CommunityIcon: React.FC<{active: boolean}> = ({ active }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? "#13AE67" : "#9ca3af"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
  </svg>
);
const BubbleIcon: React.FC<{active: boolean}> = ({ active }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? "#13AE67" : "#9ca3af"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
  </svg>
);
const SettingsIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ cursor: "pointer" }}>
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
);

export default CommunityPage;