/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type DailyGoalSchema = {
    daily_goal_id?: string;
    user_id?: string;
    goal_date?: string;
    title?: string;
    /**
     * 0:未完了 1:完了
     */
    is_completed?: string;
    completed_at?: string;
    /**
     * 1:手動 2:Slack
     */
    source?: string;
    memo?: string;
    due_date?: string;
    /**
     * FK → LARGE_GOALS
     */
    category_goal_id?: string;
    /**
     * 予定時間（分）
     */
    planned_min?: number;
    /**
     * 実績時間（分）
     */
    actual_min?: number;
    sort_order?: number;
    /**
     * 引継ぎ元日付
     */
    carried_from?: string;
};

