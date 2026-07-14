/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ApiDailyGoalsCompleteRequest = {
    /**
     * 0:未完了 1:完了
     */
    is_completed?: string;
    /**
     * 実績時間（分）、未完了時はnull
     */
    actual_min?: number;
};

