import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { usePermission } from "../hooks/usePermission";
import { Service } from "../api/services/Service";
import { DailyGoalService } from "../api/services/DailyGoalService";
import { SlackService } from "../api/services/SlackService";
import type { LargeGoalSchema } from "../api/models/LargeGoalSchema";
import type { DailyGoalSchema } from "../api/models/DailyGoalSchema";
import type { SlackOauthStatusResponse } from "../api/models/SlackOauthStatusResponse";

// ── 型定義 ──────────────────────────────────────────────
type Source = "manual" | "slack";

interface Category {
  id: string;
  label: string;
  color: string;   // テキスト色
  bg: string;      // 背景色
}

// マンダラ大目標をカテゴリとして使う。
// 色はインデックス順に自動割り当て。
const CATEGORY_PALETTE: Array<{ color: string; bg: string }> = [
  { color: "#8A77B5", bg: "#EFECF5" }, // 1番目
  { color: "#2A927C", bg: "#E1F0ED" }, // 2番目
  { color: "#568FC0", bg: "#E7EFF6" }, // 3番目
  { color: "#687E91", bg: "#EAEDF0" }, // 4番目
  { color: "#B8872B", bg: "#F5EEE1" }, // 5番目
  { color: "#CA718B", bg: "#F8EBEF" }, // 6番目
  { color: "#839255", bg: "#EEF0E7" }, // 7番目
  { color: "#D17E3D", bg: "#F9EDE4" }, // 8番目
];

// 大目標未設定タスク用の擬似カテゴリID（タグ別一覧モーダルで使用）
const UNCATEGORIZED = "__uncategorized__";

interface Goal {
  id: string;
  title: string;
  isCompleted: boolean;
  source: Source;
  memo: string;
  dueDate: string;      // "YYYY-MM-DD" or ""
  category: string;     // Category.id or ""
  plannedMin: number;   // 予定時間（分）0=未設定
  actualMin: number;    // 実績時間（分）0=未設定
  carriedFrom?: string; // 引き継ぎ元の日付 "YYYY-MM-DD"
  sortOrder?: number;   // 表示順序
}

interface DayData {
  date: Date;
  goals: Goal[];
}

// ── 日付ユーティリティ ───────────────────────────────────
const today = new Date();
const toDs = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
// 指定月（monthBaseと同じ年月）の実日付配列（1日〜末日）
const daysInMonthArray = (base: Date): Date[] => {
  const year = base.getFullYear();
  const month = base.getMonth();
  const count = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: count }, (_, i) => new Date(year, month, i + 1));
};

// タイトルの最大文字数（マンダラ小目標と統一）
const TITLE_MAX = 30;
const MEMO_MAX  = 500;

// API オプショナルフィールド用（null ではなく undefined を渡す）
const optionalStr = (v: string): string | undefined => v || undefined;
const optionalMin = (v: number): number | undefined => (v > 0 ? v : undefined);

// API レスポンス → Goal 型への変換（月フェッチ・ポーリング共通）
const mapApiGoal = (g: DailyGoalSchema, idx: number): Goal => ({
  id:          g.daily_goal_id ?? "",
  title:       g.title ?? "",
  isCompleted: g.is_completed === "1",
  source:      g.source === "2" ? "slack" : "manual",
  memo:        g.memo ?? "",
  dueDate:     g.due_date ?? "",
  category:    g.category_goal_id ?? "",
  plannedMin:  g.planned_min ?? 0,
  actualMin:   g.actual_min ?? 0,
  carriedFrom: g.carried_from ?? undefined,
  sortOrder:   g.sort_order ?? idx + 1,
});

// Slack 連携ヘルプ用データ
const SLACK_BULLET_ROWS: { fmt: string; example: string; note: string; ok: boolean }[] = [
  { fmt: "・　日本語中点",     example: "・朝のMTG準備",   note: "スペース不要",         ok: true  },
  { fmt: "•　英語ビュレット",  example: "• 朝のMTG準備",   note: "スペース不要",         ok: true  },
  { fmt: "-　ハイフン",        example: "- 朝のMTG準備",   note: "後ろに半角スペース必要", ok: true  },
  { fmt: "*　アスタリスク",    example: "* 朝のMTG準備",   note: "後ろに半角スペース必要", ok: true  },
  { fmt: "1. / 2.　数字＋ピリオド",  example: "1. 朝のMTG準備", note: "",               ok: true  },
  { fmt: "1) / 2)　数字＋括弧",      example: "1) 朝のMTG準備", note: "",               ok: true  },
  { fmt: "1。　数字＋和文ピリオド",   example: "1。朝のMTG準備", note: "",               ok: true  },
  { fmt: "①②…⑳　丸数字",   example: "① 朝のMTG準備",  note: "①〜⑳まで",          ok: true  },
  { fmt: "❶❷　黒丸数字",      example: "❶ 朝のMTG準備",  note: "",                   ok: false },
  { fmt: "→ ▶ ►　矢印系",    example: "→ 朝のMTG準備",  note: "",                   ok: false },
  { fmt: "◆ ■ □ ◇　図形系",  example: "◆ 朝のMTG準備",  note: "",                   ok: false },
  { fmt: "記号なしテキスト",   example: "今日のToDoです",   note: "導入文として自動スキップ", ok: false },
];

const SLACK_EMOJI_CATS: { name: string; icon: string; entries: { c: string; e: string }[] }[] = [
  { name: "よく使う記号", icon: "✨", entries: [
    {c:"sparkles",e:"✨"},{c:"star",e:"⭐"},{c:"star2",e:"🌟"},
    {c:"white_check_mark",e:"✅"},{c:"heavy_check_mark",e:"✔️"},{c:"check",e:"✔️"},
    {c:"x",e:"❌"},{c:"warning",e:"⚠️"},{c:"fire",e:"🔥"},{c:"rocket",e:"🚀"},
    {c:"bulb",e:"💡"},{c:"tada",e:"🎉"},{c:"confetti_ball",e:"🎊"},{c:"trophy",e:"🏆"},
    {c:"dart",e:"🎯"},{c:"100",e:"💯"},{c:"muscle",e:"💪"},{c:"crown",e:"👑"},
    {c:"gem",e:"💎"},{c:"rainbow",e:"🌈"},{c:"sunny",e:"☀️"},{c:"sun_with_face",e:"🌞"},
  ]},
  { name: "メモ・仕事", icon: "📝", entries: [
    {c:"memo",e:"📝"},{c:"pencil",e:"✏️"},{c:"pencil2",e:"✏️"},
    {c:"calendar",e:"📅"},{c:"date",e:"📅"},
    {c:"clock1",e:"🕐"},{c:"clock2",e:"🕑"},{c:"clock3",e:"🕒"},{c:"clock4",e:"🕓"},
    {c:"clock5",e:"🕔"},{c:"clock6",e:"🕕"},{c:"clock7",e:"🕖"},{c:"clock8",e:"🕗"},
    {c:"clock9",e:"🕘"},{c:"clock10",e:"🕙"},{c:"clock11",e:"🕚"},{c:"clock12",e:"🕛"},
    {c:"chart_with_upwards_trend",e:"📈"},{c:"chart_with_downwards_trend",e:"📉"},{c:"bar_chart",e:"📊"},
    {c:"computer",e:"💻"},{c:"iphone",e:"📱"},{c:"telephone_receiver",e:"📞"},
    {c:"email",e:"📧"},{c:"envelope",e:"✉️"},{c:"mailbox",e:"📫"},
    {c:"bookmark",e:"🔖"},{c:"books",e:"📚"},{c:"book",e:"📖"},
    {c:"page_facing_up",e:"📄"},{c:"clipboard",e:"📋"},{c:"pushpin",e:"📌"},
    {c:"paperclip",e:"📎"},{c:"link",e:"🔗"},
    {c:"hammer",e:"🔨"},{c:"wrench",e:"🔧"},{c:"gear",e:"⚙️"},
    {c:"key",e:"🔑"},{c:"lock",e:"🔒"},{c:"unlock",e:"🔓"},
    {c:"mag",e:"🔍"},{c:"mag_right",e:"🔎"},
  ]},
  { name: "音声・メディア", icon: "🎤", entries: [
    {c:"microphone",e:"🎤"},{c:"headphones",e:"🎧"},{c:"speaker",e:"🔈"},
    {c:"loud_sound",e:"🔊"},{c:"loudspeaker",e:"📢"},{c:"mega",e:"📣"},
    {c:"bell",e:"🔔"},{c:"no_bell",e:"🔕"},{c:"mute",e:"🔇"},
    {c:"musical_note",e:"🎵"},{c:"notes",e:"🎶"},{c:"studio_microphone",e:"🎙️"},
  ]},
  { name: "テック・デバイス", icon: "🖥️", entries: [
    {c:"desktop_computer",e:"🖥️"},{c:"keyboard",e:"⌨️"},{c:"printer",e:"🖨️"},
    {c:"floppy_disk",e:"💾"},{c:"cd",e:"💿"},{c:"dvd",e:"📀"},
    {c:"tv",e:"📺"},{c:"radio",e:"📻"},
    {c:"camera",e:"📷"},{c:"camera_flash",e:"📸"},{c:"video_camera",e:"📹"},
    {c:"movie_camera",e:"🎥"},{c:"clapper",e:"🎬"},
    {c:"satellite",e:"📡"},{c:"battery",e:"🔋"},{c:"electric_plug",e:"🔌"},
  ]},
  { name: "ファイル・ビジネス", icon: "📁", entries: [
    {c:"file_folder",e:"📁"},{c:"open_file_folder",e:"📂"},{c:"card_index",e:"📇"},
    {c:"spiral_notepad",e:"🗒️"},{c:"package",e:"📦"},
    {c:"inbox_tray",e:"📥"},{c:"outbox_tray",e:"📤"},{c:"wastebasket",e:"🗑️"},
    {c:"label",e:"🏷️"},{c:"money_with_wings",e:"💸"},{c:"dollar",e:"💵"},
    {c:"yen",e:"💴"},{c:"moneybag",e:"💰"},{c:"credit_card",e:"💳"},
  ]},
  { name: "時計・時間", icon: "⏰", entries: [
    {c:"alarm_clock",e:"⏰"},{c:"stopwatch",e:"⏱️"},{c:"timer_clock",e:"⏲️"},
    {c:"hourglass",e:"⌛"},{c:"hourglass_flowing_sand",e:"⏳"},
  ]},
  { name: "ハンドジェスチャー", icon: "👍", entries: [
    {c:"+1",e:"👍"},{c:"thumbsup",e:"👍"},{c:"-1",e:"👎"},{c:"thumbsdown",e:"👎"},
    {c:"clap",e:"👏"},{c:"raised_hands",e:"🙌"},{c:"pray",e:"🙏"},{c:"wave",e:"👋"},
    {c:"ok_hand",e:"👌"},{c:"point_up",e:"☝️"},{c:"point_up_2",e:"👆"},
    {c:"point_down",e:"👇"},{c:"point_left",e:"👈"},{c:"point_right",e:"👉"},
    {c:"v",e:"✌️"},{c:"hand",e:"✋"},{c:"raised_hand",e:"✋"},
    {c:"fist",e:"✊"},{c:"punch",e:"👊"},{c:"open_hands",e:"👐"},{c:"crossed_fingers",e:"🤞"},
  ]},
  { name: "人物・ジェスチャー", icon: "🙇", entries: [
    {c:"bow",e:"🙇"},{c:"woman-bowing",e:"🙇‍♀️"},{c:"man-bowing",e:"🙇‍♂️"},
    {c:"woman-raising-hand",e:"🙋‍♀️"},{c:"man-raising-hand",e:"🙋‍♂️"},{c:"raising_hand",e:"🙋"},
    {c:"person_frowning",e:"🙍"},{c:"woman-frowning",e:"🙍‍♀️"},{c:"man-frowning",e:"🙍‍♂️"},
    {c:"woman-gesturing-ok",e:"🙆‍♀️"},{c:"man-gesturing-ok",e:"🙆‍♂️"},{c:"ok_woman",e:"🙆"},
    {c:"woman-gesturing-no",e:"🙅‍♀️"},{c:"man-gesturing-no",e:"🙅‍♂️"},{c:"no_good",e:"🙅"},
    {c:"woman-running",e:"🏃‍♀️"},{c:"man-running",e:"🏃‍♂️"},{c:"runner",e:"🏃"},
    {c:"woman-walking",e:"🚶‍♀️"},{c:"man-walking",e:"🚶‍♂️"},{c:"walking",e:"🚶"},
  ]},
  { name: "スポーツ・ゲーム", icon: "🏆", entries: [
    {c:"soccer",e:"⚽"},{c:"baseball",e:"⚾"},{c:"basketball",e:"🏀"},
    {c:"tennis",e:"🎾"},{c:"golf",e:"⛳"},{c:"game_die",e:"🎲"},{c:"art",e:"🎨"},
  ]},
  { name: "顔文字", icon: "😊", entries: [
    {c:"grinning",e:"😀"},{c:"smile",e:"😄"},{c:"laughing",e:"😆"},{c:"satisfied",e:"😆"},
    {c:"joy",e:"😂"},{c:"rofl",e:"🤣"},{c:"slightly_smiling_face",e:"🙂"},
    {c:"wink",e:"😉"},{c:"blush",e:"😊"},{c:"innocent",e:"😇"},
    {c:"heart_eyes",e:"😍"},{c:"kissing_heart",e:"😘"},{c:"yum",e:"😋"},{c:"sunglasses",e:"😎"},
    {c:"thinking_face",e:"🤔"},{c:"hushed",e:"😯"},{c:"open_mouth",e:"😮"},
    {c:"astonished",e:"😲"},{c:"flushed",e:"😳"},{c:"sweat_smile",e:"😅"},{c:"sweat",e:"😓"},
    {c:"disappointed",e:"😞"},{c:"worried",e:"😟"},{c:"cry",e:"😢"},{c:"sob",e:"😭"},
    {c:"confounded",e:"😖"},{c:"persevere",e:"😣"},{c:"tired_face",e:"😫"},{c:"weary",e:"😩"},
    {c:"grimacing",e:"😬"},{c:"fearful",e:"😨"},{c:"cold_sweat",e:"😰"},
    {c:"pensive",e:"😔"},{c:"sleepy",e:"😪"},{c:"relieved",e:"😌"},
    {c:"expressionless",e:"😑"},{c:"no_mouth",e:"😶"},{c:"zipper_mouth_face",e:"🤐"},
    {c:"rage",e:"😡"},{c:"angry",e:"😠"},{c:"skull",e:"💀"},
  ]},
  { name: "ハート", icon: "❤️", entries: [
    {c:"heart",e:"❤️"},{c:"orange_heart",e:"🧡"},{c:"yellow_heart",e:"💛"},
    {c:"green_heart",e:"💚"},{c:"blue_heart",e:"💙"},{c:"purple_heart",e:"💜"},
    {c:"black_heart",e:"🖤"},{c:"broken_heart",e:"💔"},{c:"two_hearts",e:"💕"},
    {c:"sparkling_heart",e:"💖"},{c:"heartpulse",e:"💗"},{c:"heartbeat",e:"💓"},
    {c:"revolving_hearts",e:"💞"},{c:"heart_decoration",e:"💟"},{c:"heavy_heart_exclamation",e:"❣️"},
  ]},
  { name: "自然・食べ物", icon: "🌸", entries: [
    {c:"cherry_blossom",e:"🌸"},{c:"rose",e:"🌹"},{c:"sunflower",e:"🌻"},
    {c:"four_leaf_clover",e:"🍀"},{c:"coffee",e:"☕"},{c:"tea",e:"🍵"},
    {c:"beer",e:"🍺"},{c:"pizza",e:"🍕"},{c:"rice_ball",e:"🍙"},{c:"sushi",e:"🍣"},
  ]},
  { name: "乗り物・場所", icon: "🚗", entries: [
    {c:"house",e:"🏠"},{c:"office",e:"🏢"},{c:"school",e:"🏫"},{c:"hospital",e:"🏥"},
    {c:"car",e:"🚗"},{c:"train",e:"🚂"},{c:"airplane",e:"✈️"},
    {c:"earth_asia",e:"🌏"},{c:"earth_americas",e:"🌎"},{c:"earth_africa",e:"🌍"},
  ]},
  { name: "記号・矢印", icon: "➡️", entries: [
    {c:"exclamation",e:"❗"},{c:"question",e:"❓"},{c:"grey_exclamation",e:"❕"},{c:"grey_question",e:"❔"},
    {c:"heavy_plus_sign",e:"➕"},{c:"heavy_minus_sign",e:"➖"},{c:"heavy_multiplication_x",e:"✖️"},
    {c:"arrow_right",e:"➡️"},{c:"arrow_left",e:"⬅️"},{c:"arrow_up",e:"⬆️"},{c:"arrow_down",e:"⬇️"},
    {c:"arrow_forward",e:"▶️"},{c:"small_red_triangle",e:"🔺"},{c:"small_red_triangle_down",e:"🔻"},
    {c:"red_circle",e:"🔴"},{c:"orange_circle",e:"🟠"},{c:"yellow_circle",e:"🟡"},
    {c:"green_circle",e:"🟢"},{c:"blue_circle",e:"🔵"},{c:"purple_circle",e:"🟣"},
    {c:"white_circle",e:"⚪"},{c:"black_circle",e:"⚫"},{c:"large_blue_circle",e:"🔵"},
    {c:"radio_button",e:"🔘"},{c:"ballot_box_with_check",e:"☑️"},
    {c:"new",e:"🆕"},{c:"ok",e:"🆗"},{c:"up",e:"🆙"},{c:"cool",e:"🆒"},{c:"free",e:"🆓"},
    {c:"sos",e:"🆘"},{c:"no_entry",e:"⛔"},{c:"no_entry_sign",e:"🚫"},
  ]},
];

// ────────────────────────────────────────────────────────
const DailyGoalPage: React.FC = () => {
  const { user, selectedUser } = useAuth();
  const { canEdit }            = usePermission();

  const displayUser = selectedUser ?? user;

  // マンダラ大目標から生成したカテゴリリスト（API から取得）
  const [mandalaCategories, setMandalaCategories] = useState<Category[]>([]);
  const [isLoadingMandalaCategories, setIsLoadingMandalaCategories] = useState(false);

  // 表示中の月の基準日（1日固定で保持）
  const [monthBase,  setMonthBase]  = useState<Date>(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [monthData,  setMonthData]  = useState<DayData[]>(() => daysInMonthArray(today).map(date => ({ date, goals: [] })));
  const [isLoading,  setIsLoading]  = useState(false);
  const [selectedDs, setSelectedDs] = useState<string>(toDs(today));
  const [newTitle,      setNewTitle]      = useState("");
  const [newFormOpen,   setNewFormOpen]   = useState(false);
  // 選択中・編集中の目標ID
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  // ドラッグ&ドロップ（選択日のタスク一覧の並べ替え）
  const [dragOverId,  setDragOverId]  = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null); // タッチD&D視覚フィードバック用
  const [closedCats,  setClosedCats]  = useState<Set<string>>(new Set());
  const dragGoalId        = React.useRef<string | null>(null);
  // タッチD&D用
  const touchDragGoalId  = React.useRef<string | null>(null);
  const touchDragActive  = React.useRef(false);
  const touchStartY      = React.useRef(0);
  const touchStartX      = React.useRef(0);
  const wasTouchDrag     = React.useRef(false);
  const longPressTimer   = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleTextareaRef  = React.useRef<HTMLTextAreaElement>(null);
  const detailPanelRef    = React.useRef<HTMLDivElement>(null);
  const scrollAreaRef     = React.useRef<HTMLDivElement>(null);
  // モバイル判定（サイドバーが表示される 1024px を境界に）
  const [isMobile, setIsMobile] = useState(false);
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  const [categoryBreakdownOpen, setCategoryBreakdownOpen] = useState(true);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  // カレンダーピッカーで閲覧中の月（日付を確定するまでは monthBase/monthData に影響させない）
  const [pickerMonth, setPickerMonth] = useState<Date>(monthBase);
  const [pickerMonthData, setPickerMonthData] = useState<DayData[] | null>(null);
  const [pickerAnchor, setPickerAnchor] = useState<{ top: number; left: number; openUp: boolean } | null>(null);
  const dayNavRef = React.useRef<HTMLDivElement>(null);
  const [hoveredCat, setHoveredCat] = useState<string | null>(null);

  // カレンダーピッカー表示中はスクロール/リサイズで閉じる（固定位置がズレるのを防ぐ）
  React.useEffect(() => {
    if (!datePickerOpen) return;
    const close = () => setDatePickerOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [datePickerOpen]);

  // ── 月データ API ロード（月移動・初回表示時） ──────────────
  useEffect(() => {
    const uid = displayUser?.id;
    if (!uid) return;
    const days = daysInMonthArray(monthBase);
    const startDate = toDs(days[0]);
    const endDate   = toDs(days[days.length - 1]);
    setMonthData(days.map(date => ({ date, goals: [] })));
    setIsLoading(true);
    setSelectedGoalId(null);
    DailyGoalService.apiDailyGoalsGet(uid, startDate, endDate)
      .then(res => {
        if (res.responseStatus !== 1) return;
        const dayMap = new Map((res.days ?? []).map(d => [d.date, d.goals]));
        const newMonthData = days.map(date => {
          const ds = toDs(date);
          const apiGoals = dayMap.get(ds) ?? [];
          return { date, goals: (apiGoals as DailyGoalSchema[]).map(mapApiGoal) };
        });
        setMonthData(newMonthData);
      })
      .catch(err => console.error("DailyGoal fetch error:", err))
      .finally(() => setIsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthBase, displayUser?.id]);

  // ── カレンダーピッカー用データロード（閲覧中の月が monthBase と異なる場合のみ取得） ──
  useEffect(() => {
    if (!datePickerOpen) return;
    if (pickerMonth.getFullYear() === monthBase.getFullYear() && pickerMonth.getMonth() === monthBase.getMonth()) {
      setPickerMonthData(monthData);
      return;
    }
    const uid = displayUser?.id;
    if (!uid) return;
    const days = daysInMonthArray(pickerMonth);
    const startDate = toDs(days[0]);
    const endDate   = toDs(days[days.length - 1]);
    setPickerMonthData(null);
    DailyGoalService.apiDailyGoalsGet(uid, startDate, endDate)
      .then(res => {
        if (res.responseStatus !== 1) return;
        const dayMap = new Map((res.days ?? []).map(d => [d.date, d.goals]));
        setPickerMonthData(days.map(date => {
          const ds = toDs(date);
          const apiGoals = dayMap.get(ds) ?? [];
          return { date, goals: (apiGoals as DailyGoalSchema[]).map(mapApiGoal) };
        }));
      })
      .catch(err => console.error("DailyGoal (picker) fetch error:", err));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datePickerOpen, pickerMonth, monthBase, displayUser?.id]);

  // ── 30秒ポーリング：Slack 投稿後の自動反映 ─────────────────
  useEffect(() => {
    const uid = displayUser?.id;
    if (!uid) return;
    const timer = setInterval(() => {
      const days = daysInMonthArray(monthBase);
      DailyGoalService.apiDailyGoalsGet(uid, toDs(days[0]), toDs(days[days.length - 1]))
        .then(res => {
          if (res.responseStatus !== 1) return;
          const dayMap = new Map((res.days ?? []).map(d => [d.date, d.goals]));
          const newMonthData = days.map(date => {
            const ds = toDs(date);
            const apiGoals = dayMap.get(ds) ?? [];
            return { date, goals: (apiGoals as DailyGoalSchema[]).map(mapApiGoal) };
          });
          setMonthData(newMonthData);
        })
        .catch(() => {}); // ポーリング失敗は無視
    }, 30_000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthBase, displayUser?.id]);

  // ── マンダラ大目標をカテゴリとして読み込み ──────────────
  useEffect(() => {
    const uid = displayUser?.id;
    if (!uid) {
      setMandalaCategories([]);
      return;
    }

    setIsLoadingMandalaCategories(true);
    Service.getApiMandalaCharts(uid)
      .then((res) => {
        if (res.responseStatus !== 1 || !res.charts?.length) {
          setMandalaCategories([]);
          return;
        }

        const activeChart = res.charts.find((chart) => chart.is_active === true) ?? res.charts[0];
        const largeGoals = activeChart?.large_goals ?? [];
        const sorted = [...largeGoals].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

        setMandalaCategories(
          sorted
            .filter((lg): lg is LargeGoalSchema & { large_goal_id: string; goal_title: string } =>
              Boolean(lg.large_goal_id && lg.goal_title?.trim())
            )
            .map((lg, i) => ({
              id:    lg.large_goal_id,
              label: lg.goal_title.trim(),
              ...CATEGORY_PALETTE[i % CATEGORY_PALETTE.length],
            }))
        );
      })
      .catch((err) => {
        console.error("Mandala categories fetch error:", err);
        setMandalaCategories([]);
      })
      .finally(() => setIsLoadingMandalaCategories(false));
  }, [displayUser?.id]);

  // ── Slack連携状態の取得 ──────────────────────────────
  useEffect(() => {
    const uid = displayUser?.id;
    if (!uid) {
      setSlackOauthStatus(null);
      return;
    }

    SlackService.getSlackOauthStatus(uid)
      .then(setSlackOauthStatus)
      .catch((err) => {
        console.error("Slack連携状態取得エラー:", err);
        setSlackOauthStatus(null);
      });
  }, [displayUser?.id]);
  // 削除確認ダイアログ
  const [deleteConfirm, setDeleteConfirm] = useState<{ goalId: string; title: string } | null>(null);
  const [copyModal,     setCopyModal]     = useState<{ goalId: string; targetDate: string } | null>(null);
  // 編集中の一時的な値（保存ボタンで確定）
  const [editDraft, setEditDraft] = useState<{ title: string; goalDate: string; dueDate: string; memo: string; category: string; plannedMin: number; actualMin: number }>({ title: "", goalDate: "", dueDate: "", memo: "", category: "", plannedMin: 0, actualMin: 0 });
  // 未保存の変更があるか
  const [isDirty, setIsDirty] = useState(false);
  // 保存エラーメッセージ
  const [saveError, setSaveError] = useState<string | null>(null);
  // タイトル編集モード（クリックで開く）
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  // タグ別一覧モーダル（UNCATEGORIZED は大目標未設定タスクを表す特別値）
  const [tagViewCat, setTagViewCat] = useState<string | null>(null);
  // Slack 連携ヘルプモーダル
  const [slackHelpOpen, setSlackHelpOpen] = useState(false);
  const [slackHelpTab,  setSlackHelpTab]  = useState<"bullet" | "emoji">("bullet");
  const [emojiSearch,   setEmojiSearch]   = useState("");
  const [slackOauthStatus, setSlackOauthStatus] = useState<SlackOauthStatusResponse | null>(null);

  // タイトルテキストエリアの高さを内容に合わせて自動調整
  React.useEffect(() => {
    const el = titleTextareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [selectedGoalId, editDraft.title]);

  // 目標選択時に詳細パネルへ自動スクロール
  React.useEffect(() => {
    if (!selectedGoalId) return;
    const timer = setTimeout(() => {
      const anchor  = detailPanelRef.current;
      const container = scrollAreaRef.current;
      if (!anchor) return;
      if (container && container.scrollHeight > container.clientHeight) {
        // 内側スクロールコンテナをスクロール
        const containerTop = container.getBoundingClientRect().top;
        const anchorTop    = anchor.getBoundingClientRect().top;
        container.scrollTo({ top: container.scrollTop + (anchorTop - containerTop) - 8, behavior: "smooth" });
      } else {
        // window をスクロール
        const rect = anchor.getBoundingClientRect();
        window.scrollTo({ top: window.scrollY + rect.top - 16, behavior: "smooth" });
      }
    }, 80);
    return () => clearTimeout(timer);
  }, [selectedGoalId]);

  // 日付変更でアコーディオンを全開にリセット
  React.useEffect(() => { setClosedCats(new Set()); }, [selectedDs]);

  // タッチD&D中のスクロール抑制関数（ドラッグ開始時のみ登録・終了時に解除）
  const preventScrollRef = React.useRef<((e: TouchEvent) => void) | null>(null);

  const todayDs         = toDs(today);
  const isCurrentMonth  = monthBase.getFullYear() === today.getFullYear() && monthBase.getMonth() === today.getMonth();
  const selectedDayData = monthData.find((d) => toDs(d.date) === selectedDs);
  const goals           = selectedDayData?.goals ?? [];
  const completed       = goals.filter((g) => g.isCompleted).length;
  const achievePct      = goals.length > 0 ? Math.round((completed / goals.length) * 100) : 0;
  const isSelectedToday = selectedDs === todayDs;
  const selectedGoal = selectedGoalId ? monthData.flatMap((d) => d.goals).find((g) => g.id === selectedGoalId) ?? null : null;

  // ── 月次サマリー（振り返り用の集計） ─────────────────────
  const monthCompleted  = monthData.reduce((s, d) => s + d.goals.filter((g) => g.isCompleted).length, 0);
  const monthTotal      = monthData.reduce((s, d) => s + d.goals.length, 0);
  const monthAchievePct = monthTotal > 0 ? Math.round((monthCompleted / monthTotal) * 100) : 0;
  const daysWithGoals   = monthData.filter((d) => d.goals.length > 0).length;
  const elapsedDaysInMonth = isCurrentMonth ? today.getDate() : monthData.length;

  // ── アクション ───────────────────────────────────────────
  // 選択日を1日単位で前後させる。月をまたぐ場合は monthBase も追従させる
  const moveDay = (diff: number) => {
    const [y, m, d] = selectedDs.split("-").map(Number);
    const newDate = new Date(y, m - 1, d + diff);
    const newDs = toDs(newDate);
    const crossesMonth = newDate.getFullYear() !== monthBase.getFullYear() || newDate.getMonth() !== monthBase.getMonth();
    if (crossesMonth) {
      setMonthBase(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
    }
    setSelectedDs(newDs);
    setSelectedGoalId(null);
  };

  const goToToday = () => {
    if (!isCurrentMonth) setMonthBase(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDs(todayDs);
    setSelectedGoalId(null);
    setNewFormOpen(false);
  };

  const updateGoal = (goalId: string, patch: Partial<Goal>) => {
    setMonthData((prev) =>
      prev.map((d) => ({
        ...d,
        goals: d.goals.map((g) => g.id === goalId ? { ...g, ...patch } : g),
      }))
    );
  };

  const reorderGoals = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    let newSortOrder = 1;
    setMonthData(prev =>
      prev.map(d => {
        const list = [...d.goals];
        const fromIdx = list.findIndex(g => g.id === fromId);
        const toIdx   = list.findIndex(g => g.id === toId);
        if (fromIdx < 0 || toIdx < 0) return d;
        const [moved] = list.splice(fromIdx, 1);
        list.splice(toIdx, 0, moved);
        newSortOrder = toIdx + 1;
        return { ...d, goals: list.map((g, i) => ({ ...g, sortOrder: i + 1 })) };
      })
    );
    // API 同期（移動したゴールの新しい sort_order を送信）
    DailyGoalService.apiDailyGoalsDailyGoalIdReorderPost(fromId, { sort_order: newSortOrder })
      .catch(err => console.error("reorderGoals error:", err));
  };

  const startEdit = (goal: Goal) => {
    const dayData = monthData.find((d) => d.goals.some((g) => g.id === goal.id));
    const goalDate = dayData ? toDs(dayData.date) : selectedDs;
    setSelectedGoalId(goal.id);
    setNewFormOpen(false);
    setEditDraft({ title: goal.title, goalDate, dueDate: goal.dueDate, memo: goal.memo, category: goal.category, plannedMin: goal.plannedMin, actualMin: goal.actualMin });
    setIsDirty(false);
    setSaveError(null);
    setIsTitleEditing(false);
    if (dayData) setSelectedDs(toDs(dayData.date));
  };
  const saveEdit = async (goalId: string) => {
    if (!canEdit) return;
    const title = editDraft.title.trim() || editDraft.title;

    const byteLen = new TextEncoder().encode(title).length;
    if (byteLen > 500) {
      setSaveError(`タイトルが長すぎます（${byteLen}バイト）。500バイト以内にしてください。`);
      return;
    }
    setSaveError(null);

    const original       = monthData.flatMap(d => d.goals).find(g => g.id === goalId);
    const originalDayData = monthData.find(d => d.goals.some(g => g.id === goalId));
    const originalDs     = originalDayData ? toDs(originalDayData.date) : "";
    const newDs          = editDraft.goalDate || originalDs;
    const isDateChanged  = !!(newDs && newDs !== originalDs);

    // 楽観的更新
    if (isDateChanged) {
      // 日付変更：フィールド更新 + 移動を1回の setMonthData にまとめる
      setMonthData(prev => {
        let moved: Goal | null = null;
        const without = prev.map(d => {
          const idx = d.goals.findIndex(g => g.id === goalId);
          if (idx < 0) return d;
          moved = { ...d.goals[idx], title, dueDate: editDraft.dueDate, memo: editDraft.memo, category: editDraft.category, plannedMin: editDraft.plannedMin, actualMin: editDraft.actualMin };
          return { ...d, goals: d.goals.filter(g => g.id !== goalId) };
        });
        if (!moved) return prev;
        return without.map(d => toDs(d.date) === newDs ? { ...d, goals: [...d.goals, moved!] } : d);
      });
      setSelectedDs(newDs);
    } else {
      updateGoal(goalId, { title, dueDate: editDraft.dueDate, memo: editDraft.memo, category: editDraft.category, plannedMin: editDraft.plannedMin, actualMin: editDraft.actualMin });
    }
    setIsDirty(false);

    try {
      await DailyGoalService.apiDailyGoalsDailyGoalIdUpdatePut(goalId, {
        title,
        memo:             optionalStr(editDraft.memo),
        due_date:         optionalStr(editDraft.dueDate),
        category_goal_id: optionalStr(editDraft.category),
        planned_min:      optionalMin(editDraft.plannedMin),
        ...(isDateChanged ? { goal_date: newDs } : {}),
      });
      await DailyGoalService.apiDailyGoalsDailyGoalIdCompletePut(goalId, {
        is_completed: original?.isCompleted ? "1" : "0",
        actual_min:   optionalMin(editDraft.actualMin),
      });
    } catch (err) {
      console.error("saveEdit error:", err);
      if (original) {
        if (isDateChanged) {
          // ロールバック：元の日付に戻す
          setMonthData(prev => {
            const restored = { ...original };
            const without  = prev.map(d => ({ ...d, goals: d.goals.filter(g => g.id !== goalId) }));
            return without.map(d => toDs(d.date) === originalDs ? { ...d, goals: [...d.goals, restored] } : d);
          });
          setSelectedDs(originalDs);
          setEditDraft(prev => ({ ...prev, goalDate: originalDs }));
        } else {
          updateGoal(goalId, { title: original.title, dueDate: original.dueDate, memo: original.memo, category: original.category, plannedMin: original.plannedMin, actualMin: original.actualMin });
        }
      }
      setIsDirty(true);
      setSaveError("保存に失敗しました。タイトルが長すぎる可能性があります。短くしてから再度保存してください。");
    }
  };
  const cancelEdit = () => {
    setSelectedGoalId(null);
    setIsDirty(false);
    setSaveError(null);
    setIsTitleEditing(false);
  };

  // タスク行の直下にアコーディオン展開する詳細編集パネル
  const renderGoalDetail = (selectedGoal: Goal) => (
    <>
      {/* 閉じるボタンのみ（完了チェック・タイトルはタスク行と共通のため重複表示しない） */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
        <button
          onClick={() => cancelEdit()}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: "2px", display: "flex", alignItems: "center", flexShrink: 0 }}
          title="閉じる"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* マンダラ大目標 */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>マンダラ大目標</label>
          <div style={{ position: "relative", display: "flex", alignItems: "center", flex: 1 }}>
            <select
              value={editDraft.category}
              onChange={(e) => updateEditDraft((d) => ({ ...d, category: e.target.value }))}
              disabled={isLoadingMandalaCategories || !canEdit}
              style={{ width: "100%", fontSize: 12, fontWeight: 600, fontFamily: "inherit", border: "1px solid #e5e7eb", borderRadius: 8, padding: "5px 28px 5px 10px", appearance: "none" as const, outline: "none", cursor: isLoadingMandalaCategories || !canEdit ? "default" : "pointer", background: isLoadingMandalaCategories ? "#f9fafb" : "#fff", color: editDraft.category ? "#374151" : "#9ca3af" }}
            >
              <option value="">
                {isLoadingMandalaCategories ? "読み込み中..." : "大目標を選択（任意）"}
              </option>
              {editDraft.category && !mandalaCategories.some((c) => c.id === editDraft.category) && (
                <option value={editDraft.category}>（登録済みの大目標）</option>
              )}
              {mandalaCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", right: 8, pointerEvents: "none" }}><polyline points="6 9 12 15 18 9"/></svg>
          </div>
        </div>
        {!isLoadingMandalaCategories && mandalaCategories.length === 0 && (
          <p style={{ fontSize: 10, color: "#9ca3af", margin: "4px 0 0 82px" }}>
            マンダラチャートに大目標が登録されていません
          </p>
        )}
      </div>

      {/* 日付（別日への移動） */}
      <div style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 10 }}>
        <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, width: 36 }}>日付</label>
        <input
          type="date"
          value={editDraft.goalDate}
          disabled={!canEdit}
          onChange={(e) => updateEditDraft((d) => ({ ...d, goalDate: e.target.value }))}
          style={{ fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 8, padding: "4px 8px", outline: "none", fontFamily: "inherit", color: "#374151", background: "#fff" }}
        />
      </div>

      {/* メモ */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
          <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>メモ</label>
          <span style={{
            fontSize: 10, fontWeight: 600,
            color: editDraft.memo.length >= MEMO_MAX ? "#ef4444" : editDraft.memo.length >= MEMO_MAX - 50 ? "#f59e0b" : "#9ca3af",
          }}>{editDraft.memo.length}/{MEMO_MAX}</span>
        </div>
        <textarea
          value={editDraft.memo}
          disabled={!canEdit}
          maxLength={MEMO_MAX}
          onChange={(e) => updateEditDraft((d) => ({ ...d, memo: e.target.value }))}
          placeholder="メモを入力..."
          rows={3}
          style={{ width: "100%", fontSize: 12, color: "#374151", border: "1px solid #e5e7eb", borderRadius: 8, padding: "6px 10px", outline: "none", fontFamily: "inherit", resize: "vertical", lineHeight: 1.6, background: canEdit ? "#fff" : "#f9fafb", boxSizing: "border-box" as const }}
          onFocus={(e) => { e.target.style.borderColor = "#13AE67"; }}
          onBlur={(e) => { e.target.style.borderColor = "#e5e7eb"; }}
        />
      </div>

      {/* 保存エラー */}
      {saveError && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 6, background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "8px 10px", marginBottom: 10 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span style={{ fontSize: 12, color: "#ef4444", lineHeight: 1.5 }}>{saveError}</span>
        </div>
      )}

      {/* 削除 / コピー ｜ キャンセル / 保存 */}
      {isMobile ? (
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 6 }}>
          {canEdit && (
            <button
              onClick={() => setDeleteConfirm({ goalId: selectedGoal.id, title: selectedGoal.title })}
              style={{ padding: "5px 8px", borderRadius: 20, border: "1px solid #fca5a5", background: "#fff", fontSize: 11, fontWeight: 600, color: "#ef4444", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 2, whiteSpace: "nowrap" as const }}
              title="削除"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
              </svg>
              削除
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => setCopyModal({ goalId: selectedGoal.id, targetDate: selectedDs })}
              style={{ padding: "5px 8px", borderRadius: 20, border: "1px solid #d1d5db", background: "#fff", fontSize: 11, fontWeight: 600, color: "#6b7280", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 2, whiteSpace: "nowrap" as const }}
              title="別日にコピー"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
              </svg>
              コピー
            </button>
          )}
          <button onClick={cancelEdit} style={{ padding: "5px 10px", borderRadius: 20, border: "1px solid #e5e7eb", background: "#fff", fontSize: 11, fontWeight: 600, color: "#6b7280", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const }}>キャンセル</button>
          <button onClick={() => saveEdit(selectedGoal.id)} disabled={!isDirty || !canEdit} style={{ padding: "5px 10px", borderRadius: 20, border: "none", background: isDirty && canEdit ? "#13AE67" : "#e5e7eb", fontSize: 11, fontWeight: 700, color: isDirty && canEdit ? "#fff" : "#9ca3af", cursor: isDirty && canEdit ? "pointer" : "default", fontFamily: "inherit", whiteSpace: "nowrap" as const, transition: "background 0.2s, color 0.2s" }}>保存する</button>
        </div>
      ) : (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {canEdit && (
              <button
                onClick={() => setDeleteConfirm({ goalId: selectedGoal.id, title: selectedGoal.title })}
                style={{ padding: "6px 10px", borderRadius: 20, border: "1px solid #fca5a5", background: "#fff", fontSize: 12, fontWeight: 600, color: "#ef4444", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 3, whiteSpace: "nowrap" as const }}
                title="削除"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                </svg>
                削除
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => setCopyModal({ goalId: selectedGoal.id, targetDate: selectedDs })}
                style={{ padding: "6px 10px", borderRadius: 20, border: "1px solid #d1d5db", background: "#fff", fontSize: 12, fontWeight: 600, color: "#6b7280", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 3, whiteSpace: "nowrap" as const }}
                title="別日にコピー"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                </svg>
                コピー
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={cancelEdit} style={{ padding: "6px 12px", borderRadius: 20, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12, fontWeight: 600, color: "#6b7280", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const }}>キャンセル</button>
            <button onClick={() => saveEdit(selectedGoal.id)} disabled={!isDirty || !canEdit} style={{ padding: "6px 12px", borderRadius: 20, border: "none", background: isDirty && canEdit ? "#13AE67" : "#e5e7eb", fontSize: 12, fontWeight: 700, color: isDirty && canEdit ? "#fff" : "#9ca3af", cursor: isDirty && canEdit ? "pointer" : "default", fontFamily: "inherit", whiteSpace: "nowrap" as const, transition: "background 0.2s, color 0.2s" }}>保存する</button>
          </div>
        </div>
      )}
    </>
  );

  const copyGoalToDate = async (goalId: string, targetDate: string) => {
    const uid = displayUser?.id;
    if (!uid || !canEdit || !targetDate) return;
    const original = monthData.flatMap(d => d.goals).find(g => g.id === goalId);
    if (!original) return;

    const tempId  = `temp_copy_${Date.now()}`;
    const newGoal: Goal = { ...original, id: tempId, isCompleted: false, actualMin: 0 };

    // 楽観的更新（対象日が当月ビュー内の場合のみ反映）
    setMonthData(prev => prev.map(d =>
      toDs(d.date) === targetDate ? { ...d, goals: [...d.goals, newGoal] } : d
    ));
    setCopyModal(null);
    setSelectedDs(targetDate);
    // コピー元の詳細パネルを開いたままにすると、別日に移動したのに古い完了状態・日付が
    // 表示され続けて紛らわしいため、パネルは閉じてコピー先の一覧を素の状態で見せる
    setSelectedGoalId(null);

    try {
      const res = await DailyGoalService.apiDailyGoalsCreatePost({
        user_id:          uid,
        goal_date:        targetDate,
        title:            original.title,
        source:           "1",
        memo:             optionalStr(original.memo),
        due_date:         optionalStr(original.dueDate),
        category_goal_id: optionalStr(original.category),
        planned_min:      optionalMin(original.plannedMin),
      });
      if (res.responseStatus === 1 && res.daily_goal_id) {
        const realId = res.daily_goal_id;
        setMonthData(prev => prev.map(d => ({
          ...d,
          goals: d.goals.map(g => g.id === tempId ? { ...g, id: realId } : g),
        })));
      }
    } catch (err) {
      console.error("copyGoal error:", err);
      setMonthData(prev => prev.map(d => ({ ...d, goals: d.goals.filter(g => g.id !== tempId) })));
    }
  };

  const toggleGoal = (goalId: string) => {
    if (!canEdit) return;
    const g = monthData.flatMap((d) => d.goals).find((g) => g.id === goalId);
    if (!g) return;
    const nowCompleted = !g.isCompleted;
    // 楽観的更新
    updateGoal(goalId, { isCompleted: nowCompleted });
    // API 同期（fire-and-forget）
    DailyGoalService.apiDailyGoalsDailyGoalIdCompletePut(goalId, {
      is_completed: nowCompleted ? "1" : "0",
      actual_min:   optionalMin(g.actualMin),
    }).catch(err => console.error("toggleGoal error:", err));
  };

  const deleteGoal = (goalId: string) => {
    if (!canEdit) return;
    // 楽観的削除
    setMonthData(prev => prev.map(d => ({ ...d, goals: d.goals.filter(g => g.id !== goalId) })));
    if (selectedGoalId === goalId) {
      setSelectedGoalId(null);
    }
    // API 同期（fire-and-forget）
    DailyGoalService.apiDailyGoalsDailyGoalIdDeleteDelete(goalId)
      .catch(err => console.error("deleteGoal error:", err));
  };

  const addGoal = async () => {
    if (!canEdit || !newTitle.trim()) return;
    const uid = displayUser?.id;
    if (!uid) return;

    const title     = newTitle.trim();
    const tempId    = `temp_${Date.now()}`;
    const sortOrder = (monthData.find(d => toDs(d.date) === selectedDs)?.goals.length ?? 0) + 1;
    const tempGoal: Goal = { id: tempId, title, isCompleted: false, source: "manual", memo: "", dueDate: selectedDs, category: "", plannedMin: 0, actualMin: 0, sortOrder };

    // 楽観的更新
    setMonthData(prev => prev.map(d => toDs(d.date) === selectedDs ? { ...d, goals: [...d.goals, tempGoal] } : d));
    setNewTitle("");
    setNewFormOpen(false);
    setSelectedGoalId(tempId);
    setEditDraft({ title: tempGoal.title, goalDate: selectedDs, dueDate: tempGoal.dueDate, memo: tempGoal.memo, category: tempGoal.category, plannedMin: tempGoal.plannedMin, actualMin: 0 });
    setIsDirty(false);

    try {
      const res = await DailyGoalService.apiDailyGoalsCreatePost({
        user_id:          uid,
        goal_date:        selectedDs,
        title,
        source:           "1",
        planned_min:      optionalMin(tempGoal.plannedMin),
        sort_order:       sortOrder,
      });
      if (res.responseStatus === 1 && res.daily_goal_id) {
        const realId = res.daily_goal_id;
        setMonthData(prev => prev.map(d => ({ ...d, goals: d.goals.map(g => g.id === tempId ? { ...g, id: realId } : g) })));
        setSelectedGoalId(prev => (prev === tempId ? realId : prev));
      }
    } catch (err) {
      console.error("addGoal error:", err);
      // ロールバック
      setMonthData(prev => prev.map(d => ({ ...d, goals: d.goals.filter(g => g.id !== tempId) })));
      setSelectedGoalId(null);
    }
  };

  const updateEditDraft = (updater: (d: typeof editDraft) => typeof editDraft) => {
    setEditDraft(updater);
    setIsDirty(true);
  };

  // ── スタイルヘルパー ─────────────────────────────────────
  const card = (extra?: React.CSSProperties): React.CSSProperties => ({
    background: "#fff", borderRadius: 14, boxShadow: "0 2px 12px rgba(0,0,0,.08)", ...extra,
  });
  const tag = (bg: string, color: string): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", background: bg, color,
    borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700,
    whiteSpace: "nowrap" as const, flexShrink: 0,
  });
  const summaryChip = (label: string, value: string, flexGrow = 1) => (
    <div style={{ background: "#f9fafb", borderRadius: 10, padding: "6px 10px", flex: `${flexGrow} 1 0`, minWidth: 76 }}>
      <p style={{ fontSize: 9, color: "#9ca3af", fontWeight: 600, margin: "0 0 2px", letterSpacing: "0.03em", whiteSpace: "nowrap" as const }}>{label}</p>
      <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", margin: 0, whiteSpace: "nowrap" as const }}>{value}</p>
    </div>
  );

  return (
    <>
    <style>{`
      @keyframes spin { to { transform: rotate(360deg); } }
      .dgp-cal-cell { min-height: 30px; }
      @media (min-width: 640px) { .dgp-cal-cell { min-height: 36px; } }
      .dgp-slack-modal {
        max-height: min(80vh, calc(100dvh - env(safe-area-inset-top, 44px) - 12px));
        padding-bottom: env(safe-area-inset-bottom, 0px);
      }
      .dgp-tip { position: relative; }
      .dgp-tip::after {
        content: attr(data-tip);
        position: absolute; top: calc(100% + 6px); right: 0;
        background: #1f2937; color: #fff; font-size: 11px; font-weight: 600; white-space: nowrap;
        padding: 5px 9px; border-radius: 6px; pointer-events: none;
        opacity: 0; visibility: hidden; transition: opacity 0.15s ease 0.1s;
        z-index: 50;
      }
      .dgp-tip:hover::after, .dgp-tip:focus-visible::after { opacity: 1; visibility: visible; }
    `}</style>
    <div
      className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6"
      style={{ display: "flex", flexDirection: "column", gap: isMobile ? 8 : 14, paddingBottom: isMobile ? 12 : 32, overflowX: "hidden" }}
    >
      {/* ── ページタイトル ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0, flexWrap: "wrap" }}>
        <h1 className="text-xl sm:text-2xl font-bold text-text" style={{ whiteSpace: "nowrap" }}>日々の目標</h1>
        <span style={{ fontSize: 13, color: "#9ca3af", whiteSpace: "nowrap" }}>
          {today.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}
        </span>
        <div style={{ flex: 1 }} />
        {slackOauthStatus?.connected ? (
          <span
            className={isMobile ? "dgp-tip" : undefined}
            data-tip={isMobile ? `Slack連携済み（${slackOauthStatus.teamName}）` : undefined}
            aria-label={`Slack連携済み（${slackOauthStatus.teamName}）`}
            tabIndex={isMobile ? 0 : undefined}
            style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "#166534", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 16, padding: isMobile ? "4px 7px" : "4px 12px", whiteSpace: "nowrap" }}
          >
            <svg width="13" height="13" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="#166534" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {!isMobile && <>Slack連携済み（{slackOauthStatus.teamName}）</>}
          </span>
        ) : (
          <Link
            to="/settings"
            className={isMobile ? "dgp-tip" : undefined}
            data-tip={isMobile ? "Slack未連携（設定画面へ）" : undefined}
            aria-label="Slack未連携（設定画面へ）"
            style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "#9ca3af", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 16, padding: isMobile ? "4px 7px" : "4px 12px", whiteSpace: "nowrap", textDecoration: "none" }}
          >
            {isMobile ? "!" : "Slack未連携（設定画面へ）"}
          </Link>
        )}
        <button
          onClick={() => { setSlackHelpOpen(true); setSlackHelpTab("bullet"); setEmojiSearch(""); }}
          className={isMobile ? "dgp-tip" : undefined}
          data-tip={isMobile ? "Slack連携ヘルプ" : undefined}
          aria-label="Slack連携ヘルプ"
          style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "#4b9e8e", background: "#f0faf6", border: "1px solid #bbf7d0", borderRadius: 16, padding: isMobile ? "4px 7px" : "4px 12px", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          {!isMobile && "Slack 連携ヘルプ"}
        </button>
      </div>

      {/* ── タグ別タスク一覧モーダル ── */}
      {tagViewCat && (() => {
        const cat = tagViewCat === UNCATEGORIZED
          ? { id: UNCATEGORIZED, label: "大目標未設定", color: "#6b7280", bg: "#f3f4f6" }
          : mandalaCategories.find((c) => c.id === tagViewCat);
        if (!cat) return null;
        const daysWithTasks = monthData
          .map((d) => ({
            date: d.date,
            tasks: d.goals.filter((g) => tagViewCat === UNCATEGORIZED ? !g.category : g.category === tagViewCat),
          }))
          .filter((d) => d.tasks.length > 0);
        const totalCount  = daysWithTasks.reduce((s, d) => s + d.tasks.length, 0);
        const doneCount   = daysWithTasks.reduce((s, d) => s + d.tasks.filter((g) => g.isCompleted).length, 0);
        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div onClick={() => setTagViewCat(null)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} />
            <div style={{ position: "relative", background: "#fff", borderRadius: 20, width: 540, maxWidth: "calc(100vw - 24px)", maxHeight: "82vh", display: "flex", flexDirection: "column", boxShadow: "0 12px 40px rgba(0,0,0,.18)", overflow: "hidden" }}>
              {/* ヘッダー */}
              <div style={{ padding: "16px 20px 14px", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: cat.bg, borderRadius: 10, padding: "5px 12px" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: cat.color }}>{cat.label}</span>
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#1e1f1f" }}>のタスク一覧</span>
                  <div style={{ flex: 1 }} />
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>{doneCount}/{totalCount} 完了</span>
                  <button onClick={() => setTagViewCat(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", display: "flex", alignItems: "center", padding: 4 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
                {/* 進捗バー */}
                {totalCount > 0 && (
                  <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, height: 5, background: "#f3f4f6", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.round(doneCount / totalCount * 100)}%`, background: doneCount === totalCount ? "#F472B6" : cat.color, borderRadius: 4, transition: "width 0.4s" }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: doneCount === totalCount ? "#F472B6" : cat.color, flexShrink: 0 }}>{Math.round(doneCount / totalCount * 100)}%</span>
                  </div>
                )}
              </div>
              {/* タスク一覧（スクロール） */}
              <div style={{ flex: 1, overflowY: "auto", padding: "8px 0 12px" }}>
                {daysWithTasks.length === 0 ? (
                  <p style={{ textAlign: "center", fontSize: 13, color: "#9ca3af", padding: "32px 0" }}>タスクはありません</p>
                ) : (
                  daysWithTasks.map(({ date, tasks }) => {
                    const ds = toDs(date);
                    const isToday = ds === todayDs;
                    const dayLabel = date.toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" });
                    const dayDone = tasks.filter((g) => g.isCompleted).length;
                    return (
                      <div key={ds}>
                        {/* 日付ヘッダー */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px 6px", background: "#fafafa", borderTop: "1px solid #f3f4f6" }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>{dayLabel}</span>
                          {isToday && <span style={{ fontSize: 10, color: "#13AE67", fontWeight: 700, background: "#f0faf6", borderRadius: 6, padding: "1px 6px" }}>今日</span>}
                          <div style={{ flex: 1 }} />
                          <span style={{ fontSize: 11, color: "#9ca3af" }}>{dayDone}/{tasks.length}</span>
                        </div>
                        {/* タスク行 */}
                        {tasks.map((goal) => (
                          <div key={goal.id}
                            onClick={() => { startEdit(goal); setTagViewCat(null); }}
                            style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 20px", borderBottom: "1px solid #f9fafb", cursor: "pointer", transition: "background 0.12s" }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#f9fafb"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = ""; }}
                          >
                            {/* 完了チェック */}
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleGoal(goal.id); }}
                              disabled={!canEdit}
                              style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, cursor: canEdit ? "pointer" : "default", border: "none", background: goal.isCompleted ? "#13AE67" : "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center" }}
                            >
                              {goal.isCompleted && (
                                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                                  <path d="M2 6L5 9L10 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </button>
                            {/* タイトル + 時間 */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p
                                title={goal.source === "slack" && goal.title.length > TITLE_MAX ? goal.title : undefined}
                                style={{ fontSize: 13, fontWeight: 500, color: goal.isCompleted ? "#9ca3af" : "#374151", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: goal.isCompleted ? "line-through" : "none" }}
                              >
                                {goal.title}
                              </p>
                            </div>
                            {/* 矢印 */}
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="9 18 15 12 9 6"/></svg>
                          </div>
                        ))}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Slack 連携ヘルプモーダル ── */}
      {slackHelpOpen && (() => {
        const totalEmoji = SLACK_EMOJI_CATS.reduce((s, c) => s + c.entries.length, 0);
        const mp = isMobile ? "12px 14px" : "14px 20px";
        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center" }}>
            <div onClick={() => setSlackHelpOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} />
            <div
              className={isMobile ? "dgp-slack-modal" : ""}
              style={{
                position: "relative", background: "#fff",
                borderRadius: isMobile ? "20px 20px 0 0" : 20,
                width: 580, maxWidth: "100vw",
                maxHeight: isMobile ? undefined : "86vh",
                display: "flex", flexDirection: "column",
                boxShadow: "0 12px 40px rgba(0,0,0,.18)", overflow: "hidden",
              }}
            >
              {/* ヘッダー */}
              <div style={{ padding: isMobile ? "14px 14px 0" : "16px 20px 0", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4b9e8e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#1e1f1f" }}>Slack 連携ヘルプ</span>
                  <div style={{ flex: 1 }} />
                  <button onClick={() => setSlackHelpOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", display: "flex", alignItems: "center", padding: 4 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
                {/* 使い方 */}
                <div style={{ padding: "10px 12px", background: "#f0fdf9", border: "1px solid #bbf7d0", borderRadius: 10, marginBottom: 8, fontSize: 12, color: "#374151", lineHeight: 1.7 }}>
                  <strong>①設定画面</strong>でSlackワークスペースと連携し、<strong>②Slack上で「@kanaeru」にメンションして箇条書きで投稿</strong>すると、各行が<strong>日々の目標として自動登録</strong>されます。<br />
                  Slackで使った絵文字（✨🎉💪 など）はそのままタイトルに表示されます。<br />
                  このヘルプでは、対応している箇条書き形式と表示可能な絵文字の一覧を確認できます。
                </div>
                {!slackOauthStatus?.connected && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 12px", background: "#fefce8", border: "1px solid #fde68a", borderRadius: 10, marginBottom: 12, fontSize: 12, color: "#78620a" }}>
                    <span>まだSlackと連携していません</span>
                    <Link
                      to="/settings"
                      onClick={() => setSlackHelpOpen(false)}
                      style={{ color: "#78620a", fontWeight: 700, textDecoration: "underline", whiteSpace: "nowrap" }}
                    >
                      設定画面で連携する
                    </Link>
                  </div>
                )}
                {/* タブ */}
                <div style={{ display: "flex", gap: 2, background: "#f3f4f6", borderRadius: 10, padding: 3 }}>
                  {(["bullet", "emoji"] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setSlackHelpTab(tab)}
                      style={{ flex: 1, fontSize: isMobile ? 11 : 12, fontWeight: 700, padding: "6px 4px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "inherit", transition: "all .15s", whiteSpace: "nowrap",
                        background: slackHelpTab === tab ? "#fff" : "transparent",
                        color: slackHelpTab === tab ? "#374151" : "#9ca3af",
                        boxShadow: slackHelpTab === tab ? "0 1px 4px rgba(0,0,0,.10)" : "none" }}
                    >
                      {tab === "bullet"
                        ? (isMobile ? "📋 箇条書き" : "📋  箇条書き形式")
                        : (isMobile ? `😊 絵文字一覧（${totalEmoji}件）` : `😊  表示可能な絵文字（${totalEmoji}件）`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* コンテンツ */}
              <div style={{ flex: 1, overflowY: "auto", padding: mp }}>

                {/* ── 箇条書きタブ ── */}
                {slackHelpTab === "bullet" && (() => {
                  const okRows  = SLACK_BULLET_ROWS.filter(r => r.ok);
                  const ngRows  = SLACK_BULLET_ROWS.filter(r => !r.ok);
                  const BulletRow = ({ row }: { row: typeof SLACK_BULLET_ROWS[0] }) => (
                    <div style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "8px 12px", borderBottom: "1px solid #f3f4f6" }}>
                      <code style={{ fontSize: 12, fontFamily: "ui-monospace,monospace", color: "#374151", flexShrink: 0, minWidth: 90 }}>{row.fmt.split("　")[0]}</code>
                      <span style={{ fontSize: 11, color: "#6b7280", fontFamily: "ui-monospace,monospace", flexShrink: 0 }}>{row.example}</span>
                      {row.note && <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: "auto", flexShrink: 0 }}>{row.note}</span>}
                    </div>
                  );
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {/* 対応済みセクション */}
                      <div style={{ border: "1px solid #bbf7d0", borderRadius: 12, overflow: "hidden" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: "#f0fdf4" }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#166534" }}>✓</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#166534" }}>対応済み</span>
                          <span style={{ marginLeft: "auto", fontSize: 11, color: "#166534", opacity: 0.7 }}>{okRows.length}種類</span>
                        </div>
                        {okRows.map((row, i) => (
                          <div key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                            <BulletRow row={row} />
                          </div>
                        ))}
                      </div>
                      {/* 未対応セクション */}
                      <div style={{ border: "1px solid #fecaca", borderRadius: 12, overflow: "hidden" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: "#fef2f2" }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#991b1b" }}>✗</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#991b1b" }}>未対応</span>
                          <span style={{ marginLeft: "auto", fontSize: 11, color: "#991b1b", opacity: 0.7 }}>{ngRows.length}種類</span>
                        </div>
                        {ngRows.map((row, i) => (
                          <div key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fef9f9" }}>
                            <BulletRow row={row} />
                          </div>
                        ))}
                      </div>
                      {/* 注意書き */}
                      <div style={{ padding: "10px 14px", background: "#fefce8", border: "1px solid #fde68a", borderRadius: 8, fontSize: 12, color: "#6b7280", lineHeight: 1.7 }}>
                        <strong style={{ color: "#374151" }}>注意：</strong>
                        <code style={{ background: "#fef9c3", padding: "1px 4px", borderRadius: 3, fontSize: 11 }}>-</code> と <code style={{ background: "#fef9c3", padding: "1px 4px", borderRadius: 3, fontSize: 11 }}>*</code> は後ろに<strong style={{ color: "#374151" }}>半角スペースが必要</strong>です。<br />
                        箇条書きマーカーのない行は導入文として自動スキップされます。<br />
                        複数の目標を登録する場合は<strong style={{ color: "#374151" }}>改行して1行に1つずつ</strong>書いてください。箇条書きかどうかは各行の<strong style={{ color: "#374151" }}>先頭の文字</strong>だけで判定するため、文中に <code style={{ background: "#fef9c3", padding: "1px 4px", borderRadius: 3, fontSize: 11 }}>・</code> が含まれていても（例：「・画像・写真を整理する」）分割されません。
                      </div>
                    </div>
                  );
                })()}

                {/* ── 絵文字タブ ── */}
                {slackHelpTab === "emoji" && (() => {
                  const catTerm = emojiSearch.trim().toLowerCase();
                  const visibleCats = catTerm
                    ? SLACK_EMOJI_CATS.filter(cat => cat.name.includes(catTerm))
                    : SLACK_EMOJI_CATS;
                  return (
                    <div>
                      {/* カテゴリ絞り込み */}
                      <input
                        type="text"
                        value={emojiSearch}
                        onChange={e => setEmojiSearch(e.target.value)}
                        placeholder="カテゴリで絞り込み（例: 仕事、顔文字）"
                        style={{ width: "100%", padding: "8px 12px", fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 8, outline: "none", marginBottom: 12, color: "#374151", background: "#fff", boxSizing: "border-box" as const }}
                      />
                      {visibleCats.length === 0 ? (
                        <p style={{ textAlign: "center", fontSize: 13, color: "#9ca3af", padding: "24px 0" }}>該当するカテゴリが見つかりませんでした</p>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {visibleCats.map(cat => (
                            <div key={cat.name} style={{ border: "1px solid #f3f4f6", borderRadius: 12, overflow: "hidden" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", background: "#f9fafb", borderBottom: "1px solid #f3f4f6" }}>
                                <span style={{ fontSize: 15 }}>{cat.icon}</span>
                                <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{cat.name}</span>
                                <span style={{ marginLeft: "auto", fontSize: 11, color: "#9ca3af" }}>{cat.entries.length}種類</span>
                              </div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 2, padding: 8, background: "#fff" }}>
                                {cat.entries.map((e, idx) => (
                                  <span
                                    key={idx}
                                    title={`:${e.c}:`}
                                    style={{ fontSize: 22, lineHeight: 1, padding: "5px 6px", borderRadius: 8, cursor: "default", display: "inline-block" }}
                                    onMouseEnter={ev => { (ev.currentTarget as HTMLSpanElement).style.background = "#f3f4f6"; }}
                                    onMouseLeave={ev => { (ev.currentTarget as HTMLSpanElement).style.background = ""; }}
                                  >{e.e}</span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ marginTop: 12, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 12, color: "#6b7280", lineHeight: 1.7 }}>
                        <strong style={{ color: "#374151" }}>一覧にない絵文字について：</strong>
                        Slackで使った絵文字が上の一覧にない場合（ワークスペース固有のカスタム絵文字・国旗・肌色バリアントなど）は、コードのまま目標タイトルに表示されます。
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── 削除確認ダイアログ ── */}
      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={() => setDeleteConfirm(null)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)" }} />
          <div style={{ position: "relative", background: "#fff", borderRadius: 18, width: 360, maxWidth: "calc(100vw - 32px)", boxShadow: "0 8px 32px rgba(0,0,0,.14)", padding: "24px 24px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: "50%", background: "#fef2f2", margin: "0 auto 14px" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
              </svg>
            </div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#1e1f1f", textAlign: "center", margin: "0 0 6px" }}>タスクを削除しますか？</p>
            <p style={{ fontSize: 13, color: "#6b7280", textAlign: "center", margin: "0 0 20px", lineHeight: 1.6 }}>
              「<span style={{ fontWeight: 600, color: "#374151" }}>{deleteConfirm.title}</span>」を削除します。<br />この操作は取り消せません。
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#6b7280", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 20, padding: "9px 0", cursor: "pointer", fontFamily: "inherit" }}
              >キャンセル</button>
              <button
                onClick={() => { deleteGoal(deleteConfirm.goalId); setDeleteConfirm(null); }}
                style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "#fff", background: "#ef4444", border: "none", borderRadius: 20, padding: "9px 0", cursor: "pointer", fontFamily: "inherit" }}
              >削除する</button>
            </div>
          </div>
        </div>
      )}

      {/* ── コピーモーダル ── */}
      {copyModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={() => setCopyModal(null)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)" }} />
          <div style={{ position: "relative", background: "#fff", borderRadius: 18, width: 320, maxWidth: "calc(100vw - 32px)", boxShadow: "0 8px 32px rgba(0,0,0,.14)", padding: "24px 24px 20px" }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#1e1f1f", textAlign: "center", margin: "0 0 16px" }}>別日にコピー</p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, display: "block", marginBottom: 6 }}>コピー先の日付</label>
              <input
                type="date"
                value={copyModal.targetDate}
                onChange={(e) => setCopyModal(prev => prev ? { ...prev, targetDate: e.target.value } : null)}
                style={{ width: "100%", fontSize: 13, border: "1px solid #e5e7eb", borderRadius: 8, padding: "6px 10px", outline: "none", fontFamily: "inherit", boxSizing: "border-box" as const }}
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setCopyModal(null)}
                style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#6b7280", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 20, padding: "9px 0", cursor: "pointer", fontFamily: "inherit" }}
              >キャンセル</button>
              <button
                onClick={() => copyGoalToDate(copyModal.goalId, copyModal.targetDate)}
                disabled={!copyModal.targetDate}
                style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "#fff", background: copyModal.targetDate ? "#13AE67" : "#e5e7eb", border: "none", borderRadius: 20, padding: "9px 0", cursor: copyModal.targetDate ? "pointer" : "default", fontFamily: "inherit" }}
              >コピーする</button>
            </div>
          </div>
        </div>
      )}

      {/* ── メインエリア: 1カラム ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 8 : 14 }}>

        {/* ── サマリー・カテゴリ割合 ── */}
        <div style={card()}>
          {/* 日送りナビゲーション */}
          <div ref={dayNavRef} style={{ padding: isMobile ? "8px 12px 8px" : "10px 14px 10px", borderBottom: "1px solid #f3f4f6", position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={() => moveDay(-1)}
                style={{ width: 26, height: 26, borderRadius: "50%", border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280", flexShrink: 0 }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <button
                onClick={() => {
                  if (datePickerOpen) { setDatePickerOpen(false); return; }
                  setPickerMonth(monthBase);
                  const rect = dayNavRef.current?.getBoundingClientRect();
                  if (rect) {
                    const estHeight = 340;
                    const spaceBelow = window.innerHeight - rect.bottom;
                    const openUp = spaceBelow < estHeight && rect.top > spaceBelow;
                    setPickerAnchor({
                      top: openUp ? rect.top - 6 : rect.bottom + 6,
                      left: rect.left + rect.width / 2,
                      openUp,
                    });
                  }
                  setDatePickerOpen(true);
                }}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: "4px 0", borderRadius: 8 }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#1e1f1f" }}>
                  {selectedDayData?.date.toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" }) ?? selectedDs}
                </span>
                {isSelectedToday && (
                  <span style={{ fontSize: 10, color: "#13AE67", fontWeight: 700, background: "#f0faf6", borderRadius: 6, padding: "1px 6px" }}>今日</span>
                )}
              </button>
              {!isSelectedToday && (
                <button
                  onClick={goToToday}
                  style={{ fontSize: 11, fontWeight: 700, color: "#13AE67", background: "#f0faf6", border: "1px solid #bbf7d0", borderRadius: 8, padding: "2px 8px", cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}
                >今日</button>
              )}
              <button
                onClick={() => moveDay(1)}
                style={{ width: 26, height: 26, borderRadius: "50%", border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280", flexShrink: 0 }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>

            {datePickerOpen && pickerAnchor && (() => {
              const days = daysInMonthArray(pickerMonth);
              const leadingBlanks = days[0].getDay(); // 0=日曜
              const cells: Array<Date | null> = [...Array(leadingBlanks).fill(null), ...days];
              return (
                <>
                  <div style={{ position: "fixed", inset: 0, zIndex: 90 }} onClick={() => setDatePickerOpen(false)} />
                  <div style={{
                    position: "fixed", top: pickerAnchor.top, left: pickerAnchor.left,
                    transform: `translate(-50%, ${pickerAnchor.openUp ? "-100%" : "0%"})`,
                    background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, boxShadow: "0 12px 32px rgba(0,0,0,.14)",
                    padding: 12, width: 268, maxHeight: "calc(100vh - 16px)", overflowY: "auto", zIndex: 100,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <button
                        onClick={() => setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() - 1, 1))}
                        style={{ width: 24, height: 24, borderRadius: "50%", border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280" }}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                      </button>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#1e1f1f" }}>{pickerMonth.getFullYear()}年{pickerMonth.getMonth() + 1}月</span>
                      <button
                        onClick={() => setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + 1, 1))}
                        style={{ width: 24, height: 24, borderRadius: "50%", border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280" }}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                      </button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 2 }}>
                      {["日", "月", "火", "水", "木", "金", "土"].map((w, i) => (
                        <div key={w} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: i === 0 ? "#ef4444" : i === 6 ? "#3b82f6" : "#9ca3af", padding: "2px 0" }}>{w}</div>
                      ))}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
                      {cells.map((date, i) => {
                        if (!date) return <div key={`b${i}`} />;
                        const ds = toDs(date);
                        const dayData = pickerMonthData?.find((d) => toDs(d.date) === ds);
                        const hasGoals = (dayData?.goals.length ?? 0) > 0;
                        const allDone = hasGoals && dayData!.goals.every((g) => g.isCompleted);
                        const isSel = ds === selectedDs;
                        const isToday = ds === todayDs;
                        return (
                          <button
                            key={ds}
                            onClick={() => {
                              setSelectedDs(ds);
                              if (pickerMonth.getFullYear() !== monthBase.getFullYear() || pickerMonth.getMonth() !== monthBase.getMonth()) {
                                setMonthBase(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth(), 1));
                              }
                              setDatePickerOpen(false);
                            }}
                            style={{
                              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1,
                              height: 32, borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                              border: isToday && !isSel ? "1px solid #bbf7d0" : "1px solid transparent",
                              background: isSel ? "#13AE67" : "transparent",
                              color: isSel ? "#fff" : "#374151",
                              fontSize: 12, fontWeight: isSel || isToday ? 700 : 500,
                            }}
                          >
                            <span>{date.getDate()}</span>
                            <span style={{
                              width: 4, height: 4, borderRadius: "50%",
                              background: !hasGoals ? "transparent" : isSel ? "#fff" : allDone ? "#F472B6" : "#13AE67",
                            }} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              );
            })()}

            {/* 月次サマリー */}
            <div style={{ marginTop: isMobile ? 7 : 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {summaryChip("達成率", `${monthAchievePct}%`)}
              {summaryChip("タスク", `${monthCompleted}/${monthTotal}`)}
              {summaryChip("記録日数", `${daysWithGoals}/${elapsedDaysInMonth}日`)}
            </div>
          </div>

          {/* 大目標ごとの積み上げ（今月）── カレンダーより上に固定表示 */}
          <div style={{ padding: isMobile ? "8px 12px" : "10px 14px", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
            {mandalaCategories.length > 0 ? (() => {
              const allMonthGoals = monthData.flatMap((d) => d.goals);
              const stats = mandalaCategories
                .map((cat) => {
                  const cg = allMonthGoals.filter((g) => g.category === cat.id);
                  const count = cg.length;
                  const done  = cg.filter((g) => g.isCompleted).length;
                  return { cat, count, done };
                })
                .filter((s) => s.count > 0)
                .sort((a, b) => b.count - a.count);
              const uncategorizedCount = allMonthGoals.filter((g) => !g.category).length;
              if (stats.length === 0) return (
                <p style={{ fontSize: 11, color: "#d1d5db", margin: 0, textAlign: "center" as const }}>今月はまだ大目標に紐づくタスクがありません</p>
              );

              // ドーナツ用の弧の計算（12時位置から時計回り、count の多い順）
              const totalCategorized = stats.reduce((s, x) => s + x.count, 0);
              const totalDone        = stats.reduce((s, x) => s + x.done,  0);
              const r = 38, cx = 50, cy = 50;
              const donutSize = isMobile ? 92 : 150;
              const circumference = 2 * Math.PI * r;
              let cumulative = 0;
              const arcs = stats.map((s) => {
                const totalDash = (s.count / totalCategorized) * circumference;
                const doneDash  = (s.done  / totalCategorized) * circumference;
                const offset = cumulative;
                cumulative += totalDash;
                // 弧の中央角度（12時位置起点・時計回り）からツールチップの表示座標を算出
                const midAngleRad = ((offset + totalDash / 2) / circumference) * 2 * Math.PI;
                const anchorX = cx + r * Math.sin(midAngleRad);
                const anchorY = cy - r * Math.cos(midAngleRad);
                return { ...s, totalDash, doneDash, offset, anchorX, anchorY };
              });
              const hoveredArc = arcs.find((a) => a.cat.id === hoveredCat) ?? null;

              return (
                <>
                  <button
                    onClick={() => setCategoryBreakdownOpen((o) => !o)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
                      background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit",
                      margin: categoryBreakdownOpen ? (isMobile ? "0 0 6px" : "0 0 10px") : 0,
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: "0.02em" }}>大目標ごとの割合（今月）</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      style={{ transform: categoryBreakdownOpen ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.15s", flexShrink: 0 }}
                    >
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>
                  {categoryBreakdownOpen && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: isMobile ? 10 : 16, alignItems: "center" }}>
                    {/* ドーナツ円グラフ：薄色=全体・濃色=達成済み */}
                    <div style={{ position: "relative", width: donutSize, height: donutSize, flexShrink: 0, margin: "0 auto" }}>
                      <svg width={donutSize} height={donutSize} viewBox="0 0 100 100">
                        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth={16} />
                        {arcs.map(({ cat, totalDash, doneDash, offset }) => (
                          <g
                            key={cat.id}
                            onMouseEnter={() => setHoveredCat(cat.id)}
                            onMouseLeave={() => setHoveredCat((c) => (c === cat.id ? null : c))}
                            onClick={() => setTagViewCat(cat.id)}
                            style={{ cursor: "pointer" }}
                          >
                            {/* 当たり判定を広げるための透明な太いストローク */}
                            <circle
                              cx={cx} cy={cy} r={r} fill="none"
                              stroke="transparent" strokeWidth={24}
                              strokeDasharray={`${totalDash.toFixed(2)} ${(circumference - totalDash).toFixed(2)}`}
                              strokeDashoffset={(-offset).toFixed(2)}
                              transform={`rotate(-90 ${cx} ${cy})`}
                            />
                            {/* 全体（薄色） */}
                            <circle
                              cx={cx} cy={cy} r={r} fill="none"
                              stroke={cat.color} strokeOpacity={hoveredCat === cat.id ? 0.35 : 0.2} strokeWidth={16}
                              strokeDasharray={`${totalDash.toFixed(2)} ${(circumference - totalDash).toFixed(2)}`}
                              strokeDashoffset={(-offset).toFixed(2)}
                              transform={`rotate(-90 ${cx} ${cy})`}
                              style={{ transition: "stroke-opacity 0.1s" }}
                            />
                            {/* 達成分（濃色） */}
                            {doneDash > 0 && (
                              <circle
                                cx={cx} cy={cy} r={r} fill="none"
                                stroke={cat.color} strokeOpacity={0.9} strokeWidth={16}
                                strokeDasharray={`${doneDash.toFixed(2)} ${(circumference - doneDash).toFixed(2)}`}
                                strokeDashoffset={(-offset).toFixed(2)}
                                transform={`rotate(-90 ${cx} ${cy})`}
                              />
                            )}
                          </g>
                        ))}
                      </svg>
                      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                        <span style={{ fontSize: isMobile ? 14 : 22, fontWeight: 700, color: "#374151", lineHeight: 1 }}>{totalDone}/{totalCategorized}</span>
                        <span style={{ fontSize: isMobile ? 8 : 13, color: "#9ca3af" }}>達成</span>
                      </div>
                      {hoveredArc && (() => {
                        const pxScale = donutSize / 100;
                        const px = hoveredArc.anchorX * pxScale;
                        const py = hoveredArc.anchorY * pxScale;
                        const isTopHalf = hoveredArc.anchorY < cy;
                        const pct = Math.round((hoveredArc.count / totalCategorized) * 100);
                        return (
                          <div style={{
                            position: "absolute", left: px, top: py, pointerEvents: "none", zIndex: 20,
                            transform: `translate(-50%, ${isTopHalf ? "-116%" : "16%"})`,
                          }}>
                            <div style={{
                              background: "#1f2937", color: "#fff", borderRadius: 8, padding: "6px 10px",
                              whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,.18)",
                            }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700 }}>
                                <span style={{ width: 7, height: 7, borderRadius: "50%", background: hoveredArc.cat.color, flexShrink: 0 }} />
                                {hoveredArc.cat.label}
                              </div>
                              <div style={{ fontSize: 11, color: "#d1d5db", marginTop: 2 }}>
                                {pct}%（{hoveredArc.done}/{hoveredArc.count}件達成）
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    {/* 凡例（割合順） */}
                    <div style={{ flex: "1 1 170px", maxWidth: 460, display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                      {stats.map(({ cat, count, done }) => {
                        const pct = Math.round((count / totalCategorized) * 100);
                        return (
                          <button
                            key={cat.id}
                            onClick={() => setTagViewCat(cat.id)}
                            style={{ display: "flex", alignItems: "center", gap: 7, background: "none", border: "none", cursor: "pointer", padding: "4px 2px", fontFamily: "inherit", textAlign: "left" as const, width: "100%", borderRadius: 6 }}
                          >
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: cat.color, opacity: 0.9, flexShrink: 0 }} />
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#374151", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{cat.label}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#0f6e56", flexShrink: 0 }}>{pct}%</span>
                            <span style={{ fontSize: 10, color: "#9ca3af", flexShrink: 0, whiteSpace: "nowrap" as const }}>{done}/{count}件達成</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  )}
                  {categoryBreakdownOpen && uncategorizedCount > 0 && (
                    <button
                      onClick={() => setTagViewCat(UNCATEGORIZED)}
                      style={{ display: "block", fontSize: 10, color: "#9ca3af", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: "4px 2px 0", margin: 0, textDecoration: "underline", textUnderlineOffset: 2 }}
                    >大目標未設定のタスク: {uncategorizedCount}件</button>
                  )}
                </>
              );
            })() : !isLoadingMandalaCategories && (
              <p style={{ fontSize: 11, color: "#d1d5db", margin: 0, textAlign: "center" as const }}>
                マンダラチャートに大目標を登録すると、ここに割合が表示されます
              </p>
            )}
          </div>

        </div>

        {/* ── 選択日のタスク一覧・詳細 ── */}
        <div style={card()}>

            {/* ── 常時表示: 選択日のサマリー ── */}
            <div style={{ padding: isMobile ? "8px 14px 8px" : "12px 20px 12px", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
              {isLoading ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2.5px solid #e5e7eb", borderTopColor: "#13AE67", animation: "spin 0.8s linear infinite" }} />
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>読み込み中...</span>
                </div>
              ) : (() => {
                const r = 24; const circ = 2 * Math.PI * r; const dash = circ * achievePct / 100;
                const ringSize = isMobile ? 44 : 58;
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 12 }}>
                    <div style={{ position: "relative", width: ringSize, height: ringSize, flexShrink: 0 }}>
                      <svg width={ringSize} height={ringSize} viewBox="0 0 58 58">
                        <circle cx="29" cy="29" r={r} fill="none" stroke="#f3f4f6" strokeWidth="6"/>
                        <circle cx="29" cy="29" r={r} fill="none"
                          stroke={achievePct === 100 ? "#F472B6" : "#13AE67"} strokeWidth="6"
                          strokeDasharray={`${dash} ${circ - dash}`}
                          strokeLinecap="round"
                          transform="rotate(-90 29 29)"
                          style={{ transition: "stroke-dasharray 0.4s" }}
                        />
                      </svg>
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: isMobile ? 9 : 11, fontWeight: 700, color: achievePct === 100 ? "#F472B6" : "#13AE67" }}>{achievePct}%</span>
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: isMobile ? 16 : 20, fontWeight: 700, color: "#1e1f1f", margin: 0, lineHeight: 1 }}>
                        {completed}<span style={{ fontSize: isMobile ? 11 : 13, color: "#9ca3af", fontWeight: 400 }}>/{goals.length}</span>
                      </p>
                      <p style={{ fontSize: isMobile ? 11 : 12, color: "#9ca3af", margin: "4px 0 0" }}>タスク完了</p>
                      {achievePct === 100 && goals.length > 0 && (
                        <p style={{ fontSize: isMobile ? 11 : 12, color: "#F472B6", fontWeight: 700, margin: "2px 0 0" }}>🎉 全タスク達成！</p>
                      )}
                      {goals.length === 0 && (
                        <p style={{ fontSize: isMobile ? 11 : 12, color: "#9ca3af", margin: "4px 0 0" }}>{isSelectedToday ? "今日の目標を追加しましょう" : "この日の目標はありません"}</p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* ── この日のタスク一覧 + 詳細/追加フォーム（スクロール可） ── */}
            <div ref={scrollAreaRef} style={{ padding: isMobile ? "8px 14px 12px" : "12px 20px 16px", overflowX: "hidden" }}>

              {/* タスク一覧（カテゴリ別アコーディオン） */}
              {goals.length > 0 && (() => {
                const renderGoalRow = (goal: Goal) => {
                  const isSelected = selectedGoalId === goal.id;
                  const cat = goal.category ? mandalaCategories.find((c) => c.id === goal.category) : null;
                  return (
                    <React.Fragment key={goal.id}>
                    <div
                      data-goal-id={goal.id}
                      draggable={canEdit}
                      onDragStart={() => { dragGoalId.current = goal.id; setActiveDragId(goal.id); }}
                      onDragEnd={() => { dragGoalId.current = null; setActiveDragId(null); setDragOverId(null); }}
                      onDragOver={(e) => { e.preventDefault(); setDragOverId(goal.id); }}
                      onDrop={(e) => { e.preventDefault(); if (dragGoalId.current) reorderGoals(dragGoalId.current, goal.id); setDragOverId(null); }}
                      onTouchStart={(e) => {
                        if (!canEdit) return;
                        touchDragGoalId.current = goal.id;
                        touchDragActive.current = false;
                        touchStartY.current = e.touches[0].clientY;
                        touchStartX.current = e.touches[0].clientX;
                        // 長押し500msでドラッグ開始
                        longPressTimer.current = setTimeout(() => {
                          longPressTimer.current = null;
                          if (!touchDragGoalId.current) return;
                          touchDragActive.current = true;
                          dragGoalId.current = touchDragGoalId.current;
                          setActiveDragId(touchDragGoalId.current);
                          if (navigator.vibrate) navigator.vibrate(40);
                          // ドラッグ中のみスクロール抑制リスナーを登録
                          const fn = (e: TouchEvent) => e.preventDefault();
                          preventScrollRef.current = fn;
                          document.addEventListener("touchmove", fn, { passive: false });
                        }, 500);
                      }}
                      onTouchMove={(e) => {
                        const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
                        const dx = Math.abs(e.touches[0].clientX - touchStartX.current);
                        // 長押し確定前に指が動いたらキャンセル（スクロール優先）
                        if (longPressTimer.current && (dy > 6 || dx > 6)) {
                          clearTimeout(longPressTimer.current);
                          longPressTimer.current = null;
                          touchDragGoalId.current = null;
                          return;
                        }
                        if (!touchDragActive.current || !touchDragGoalId.current) return;
                        const touch = e.touches[0];
                        const el = document.elementFromPoint(touch.clientX, touch.clientY);
                        const row = el?.closest("[data-goal-id]") as HTMLElement | null;
                        const hoverId = row?.getAttribute("data-goal-id");
                        if (hoverId && hoverId !== touchDragGoalId.current) setDragOverId(hoverId);
                      }}
                      onTouchEnd={() => {
                        if (longPressTimer.current) {
                          clearTimeout(longPressTimer.current);
                          longPressTimer.current = null;
                        }
                        // スクロール抑制リスナーを即時解除
                        if (preventScrollRef.current) {
                          document.removeEventListener("touchmove", preventScrollRef.current);
                          preventScrollRef.current = null;
                        }
                        if (touchDragActive.current && touchDragGoalId.current && dragOverId) {
                          wasTouchDrag.current = true;
                          reorderGoals(touchDragGoalId.current, dragOverId);
                        }
                        touchDragGoalId.current = null;
                        touchDragActive.current = false;
                        dragGoalId.current = null;
                        setActiveDragId(null);
                        setDragOverId(null);
                      }}
                      onClick={() => { if (wasTouchDrag.current) { wasTouchDrag.current = false; return; } if (isSelected) { cancelEdit(); } else { startEdit(goal); } }}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "8px 12px",
                        background: isSelected ? "#f0faf6" : "transparent",
                        cursor: "pointer",
                        borderTop: dragOverId === goal.id && activeDragId !== goal.id ? "2px solid #13AE67" : "1px solid #f9fafb",
                        opacity: activeDragId === goal.id ? 0.4 : 1,
                        transition: "background 0.15s",
                        minWidth: 0, maxWidth: "100%",
                      }}
                    >
                      {canEdit && (
                        <div style={{ cursor: "grab", color: "#d1d5db", flexShrink: 0, display: "flex", alignItems: "center" }}>
                          <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
                            <circle cx="3" cy="2.5" r="1.3"/><circle cx="7" cy="2.5" r="1.3"/>
                            <circle cx="3" cy="7"   r="1.3"/><circle cx="7" cy="7"   r="1.3"/>
                            <circle cx="3" cy="11.5" r="1.3"/><circle cx="7" cy="11.5" r="1.3"/>
                          </svg>
                        </div>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); if (!canEdit) return; toggleGoal(goal.id); }}
                        title={cat ? cat.label : undefined}
                        style={{
                          width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                          cursor: canEdit ? "pointer" : "default",
                          border: goal.isCompleted ? "none" : cat ? `2px solid ${cat.color}` : "none",
                          background: goal.isCompleted ? "#13AE67" : cat ? "#fff" : "#f3f4f6",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all .2s",
                        }}
                      >
                        {goal.isCompleted && (
                          <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6L5 9L10 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }} onClick={(e) => { if (isSelected) e.stopPropagation(); }}>
                        {isSelected && isTitleEditing ? (
                          <textarea
                            ref={titleTextareaRef}
                            autoFocus
                            className="focus:outline-none focus:ring-0 focus:shadow-none"
                            disabled={!canEdit}
                            maxLength={goal.source === "slack" ? undefined : TITLE_MAX}
                            value={editDraft.title}
                            onChange={(e) => {
                              updateEditDraft((d) => ({ ...d, title: e.target.value }));
                              e.target.style.height = "auto";
                              e.target.style.height = e.target.scrollHeight + "px";
                            }}
                            onBlur={() => setIsTitleEditing(false)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setIsTitleEditing(false); } if (e.key === "Escape") setIsTitleEditing(false); }}
                            rows={1}
                            style={{ width: "100%", fontSize: 13, fontWeight: 500, color: "#374151", border: "none", borderBottom: "2px solid #13AE67", outline: "none", background: "transparent", fontFamily: "inherit", resize: "none", padding: 0, boxSizing: "border-box" as const, lineHeight: 1.4, overflow: "hidden", display: "block" }}
                          />
                        ) : (
                          <div
                            onClick={() => isSelected && canEdit && setIsTitleEditing(true)}
                            title={goal.source === "slack" && goal.title.length > TITLE_MAX ? goal.title : undefined}
                            style={{
                              fontSize: 13, fontWeight: 500, color: goal.isCompleted ? "#9ca3af" : "#374151",
                              textDecoration: goal.isCompleted ? "line-through" : "none",
                              overflow: isSelected ? "visible" : "hidden", textOverflow: isSelected ? "clip" : "ellipsis",
                              whiteSpace: isSelected ? "normal" : "nowrap", wordBreak: "break-word", overflowWrap: "anywhere",
                              cursor: isSelected && canEdit ? "text" : "default",
                            }}
                          >
                            {isSelected ? (editDraft.title || goal.title) : goal.title}
                          </div>
                        )}
                      </div>
                      {goal.source === "slack" && <span style={tag("#f0faf6", "#13AE67")}>Slack</span>}
                      {goal.carriedFrom && <span style={{ fontSize: 9, color: "#92400e", background: "#fef3c7", borderRadius: 4, padding: "1px 4px", flexShrink: 0 }}>引継ぎ</span>}
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isSelected ? "#13AE67" : "#d1d5db"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        style={{ flexShrink: 0, transition: "transform 0.2s", transform: isSelected ? "rotate(180deg)" : "rotate(0deg)" }}>
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </div>
                    {isSelected && selectedGoal && (
                      <div style={{ background: "#fafffd", borderTop: "1px solid #e5f3ec", padding: "14px 16px 16px" }}>
                        <div ref={detailPanelRef} />
                        {renderGoalDetail(selectedGoal)}
                      </div>
                    )}
                  </React.Fragment>
                  );
                };

                const catGroups = mandalaCategories
                  .filter((cat) => goals.some((g) => g.category === cat.id))
                  .map((cat) => ({ key: cat.id, cat, groupGoals: goals.filter((g) => g.category === cat.id) }));
                const uncatGoals = goals.filter((g) => !g.category);
                const groups = [
                  ...catGroups,
                  ...(uncatGoals.length > 0 ? [{ key: "__none__", cat: null as typeof mandalaCategories[0] | null, groupGoals: uncatGoals }] : []),
                ];

                return (
                  <div style={{ marginBottom: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                    {groups.map(({ key, cat, groupGoals }) => {
                      const isOpen = !closedCats.has(key);
                      const done  = groupGoals.filter((g) => g.isCompleted).length;
                      return (
                        <div key={key} style={{ border: "1px solid #f3f4f6", borderRadius: 12, overflow: "hidden" }}>
                          {/* アコーディオンヘッダー */}
                          <button
                            onClick={() => setClosedCats((prev) => {
                              const next = new Set(prev);
                              if (next.has(key)) next.delete(key); else next.add(key);
                              return next;
                            })}
                            style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: cat ? cat.bg : "#f9fafb", border: "none", cursor: "pointer", fontFamily: "inherit" }}
                          >
                            {cat && <span style={{ width: 8, height: 8, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />}
                            <span style={{ fontSize: 12, fontWeight: 700, color: cat ? cat.color : "#6b7280", flex: 1, textAlign: "left" as const }}>
                              {cat ? cat.label : "未分類"}
                            </span>
                            <span style={{ fontSize: 11, color: cat ? cat.color : "#9ca3af", opacity: 0.8, marginRight: 4 }}>
                              {done}/{groupGoals.length}
                            </span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={cat ? cat.color : "#9ca3af"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                              style={{ flexShrink: 0, transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                              <polyline points="6 9 12 15 18 9"/>
                            </svg>
                          </button>
                          {/* ゴール行 */}
                          {isOpen && groupGoals.map((goal) => renderGoalRow(goal))}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {!selectedGoal && (
                <>
                  {canEdit && (
                    <div style={{ paddingTop: 4 }}>
                      {!newFormOpen ? (
                        <button
                          onClick={() => setNewFormOpen(true)}
                          style={{ display: "flex", alignItems: "center", gap: 7, background: "none", border: "1px dashed #d1d5db", borderRadius: 10, padding: "7px 14px", cursor: "pointer", fontFamily: "inherit", color: "#9ca3af", fontSize: 13, fontWeight: 600, width: "100%" }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                          目標を追加する
                        </button>
                      ) : (
                        <div style={{ background: "#f9fafb", borderRadius: 12, padding: "12px 14px", border: "1px solid #e5e7eb" }}>
                          <div style={{ marginBottom: 10 }}>
                            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                              <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>タイトル</span>
                              <span style={{
                                fontSize: 10, fontWeight: 600,
                                color: newTitle.length >= TITLE_MAX ? "#ef4444" : newTitle.length >= TITLE_MAX - 5 ? "#f59e0b" : "#9ca3af",
                              }}>{newTitle.length}/{TITLE_MAX}</span>
                            </div>
                            <input
                              autoFocus
                              className="focus:outline-none focus:ring-0 focus:shadow-none"
                              type="text"
                              maxLength={TITLE_MAX}
                              value={newTitle}
                              onChange={(e) => setNewTitle(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter" && newTitle.trim()) addGoal(); if (e.key === "Escape") { setNewTitle(""); setNewFormOpen(false); } }}
                              placeholder="目標のタイトルを入力..."
                              style={{ width: "100%", fontSize: 14, fontWeight: 600, border: "none", borderBottom: "2px solid #13AE67", outline: "none", background: "transparent", fontFamily: "inherit", padding: "4px 0", boxSizing: "border-box" as const, color: "#13AE67" }}
                            />
                          </div>
                          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                            <button onClick={() => { setNewTitle(""); setNewFormOpen(false); }} style={{ padding: "6px 16px", borderRadius: 20, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12, fontWeight: 600, color: "#6b7280", cursor: "pointer", fontFamily: "inherit" }}>キャンセル</button>
                            <button onClick={addGoal} disabled={!newTitle.trim()} style={{ padding: "6px 16px", borderRadius: 20, border: "none", background: newTitle.trim() ? "#13AE67" : "#e5e7eb", fontSize: 12, fontWeight: 700, color: newTitle.trim() ? "#fff" : "#9ca3af", cursor: newTitle.trim() ? "pointer" : "default", fontFamily: "inherit" }}>追加する</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

            </div>

          </div>

      </div>
    </div>
    </>
  );
};

export default DailyGoalPage;