/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ApiDailyGoalsCreatePostRequest = {
    user_id?: string;
    goal_date?: string;
    title?: string;
    /**
     * 1:手動 2:Slack（省略時は1）
     */
    source?: string;
    memo?: string;
    due_date?: string;
    category_goal_id?: string;
    planned_min?: number;
    sort_order?: number;
};

