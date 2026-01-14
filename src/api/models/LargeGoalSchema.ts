/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type LargeGoalSchema = {
    large_goal_id?: string;
    /**
     * 1-8の範囲
     */
    position?: number;
    goal_title?: string;
    goal_description?: string;
    goal_type?: number;
    target_year?: number;
    target_amount?: number;
    progress?: number;
    middle_goals_progress?: Array<{
        /**
         * 中目標の進捗率をposition順番に取得
         */
        progress?: number;
    }>;
};

