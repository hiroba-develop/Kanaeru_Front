/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiDailyGoalsCompleteRequest } from '../models/ApiDailyGoalsCompleteRequest';
import type { ApiDailyGoalsCreatePost200Response } from '../models/ApiDailyGoalsCreatePost200Response';
import type { ApiDailyGoalsCreatePostRequest } from '../models/ApiDailyGoalsCreatePostRequest';
import type { ApiDailyGoalsGet200Response } from '../models/ApiDailyGoalsGet200Response';
import type { ApiDailyGoalsReorderRequest } from '../models/ApiDailyGoalsReorderRequest';
import type { ApiDailyGoalsUpdatePutRequest } from '../models/ApiDailyGoalsUpdatePutRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DailyGoalService {
    /**
     * 週データ取得
     * 指定期間のユーザーの日々の目標一覧を日付ごとに取得
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param userId
     * @param startDate
     * @param endDate
     * @returns ApiDailyGoalsGet200Response 取得成功
     * @throws ApiError
     */
    public static apiDailyGoalsGet(
        userId: string,
        startDate: string,
        endDate: string,
    ): CancelablePromise<ApiDailyGoalsGet200Response> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/daily-goals',
            query: {
                'userId': userId,
                'startDate': startDate,
                'endDate': endDate,
            },
        });
    }
    /**
     * 目標新規作成
     * 日々の目標を新規作成
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param requestBody
     * @returns ApiDailyGoalsCreatePost200Response 作成成功
     * @throws ApiError
     */
    public static apiDailyGoalsCreatePost(
        requestBody: ApiDailyGoalsCreatePostRequest,
    ): CancelablePromise<ApiDailyGoalsCreatePost200Response> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/daily-goals/create',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 目標更新
     * 日々の目標を更新
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param dailyGoalId
     * @param requestBody
     * @returns any 更新成功
     * @throws ApiError
     */
    public static apiDailyGoalsDailyGoalIdUpdatePut(
        dailyGoalId: string,
        requestBody: ApiDailyGoalsUpdatePutRequest,
    ): CancelablePromise<{
        responseStatus?: number;
    }> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/daily-goals/{daily_goal_id}/update',
            path: {
                'daily_goal_id': dailyGoalId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 目標削除（論理削除）
     * 日々の目標を論理削除（DEL_FLG=1）
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param dailyGoalId
     * @returns any 削除成功
     * @throws ApiError
     */
    public static apiDailyGoalsDailyGoalIdDeleteDelete(
        dailyGoalId: string,
    ): CancelablePromise<{
        responseStatus?: number;
    }> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/daily-goals/{daily_goal_id}/delete',
            path: {
                'daily_goal_id': dailyGoalId,
            },
        });
    }
    /**
     * 完了/未完了切替
     * 日々の目標の完了状態を切り替え、実績時間も更新
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param dailyGoalId
     * @param requestBody
     * @returns any 切替成功
     * @throws ApiError
     */
    public static apiDailyGoalsDailyGoalIdCompletePut(
        dailyGoalId: string,
        requestBody: ApiDailyGoalsCompleteRequest,
    ): CancelablePromise<{
        responseStatus?: number;
    }> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/daily-goals/{daily_goal_id}/complete',
            path: {
                'daily_goal_id': dailyGoalId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 並び替え
     * 日々の目標の表示順を変更
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param dailyGoalId
     * @param requestBody
     * @returns any 変更成功
     * @throws ApiError
     */
    public static apiDailyGoalsDailyGoalIdReorderPost(
        dailyGoalId: string,
        requestBody: ApiDailyGoalsReorderRequest,
    ): CancelablePromise<{
        responseStatus?: number;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/daily-goals/{daily_goal_id}/reorder',
            path: {
                'daily_goal_id': dailyGoalId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
