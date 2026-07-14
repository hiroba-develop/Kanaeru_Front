/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SlackUserMappingRequest } from '../models/SlackUserMappingRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class SlackService {
    /**
     * Slack ユーザーID取得
     * ユーザーの Slack User ID（Member ID）を取得
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param userId
     * @returns any 取得成功
     * @throws ApiError
     */
    public static getSlackUserMapping(
        userId: string,
    ): CancelablePromise<{
        responseStatus?: number;
        /**
         * Slack の Member ID（例: U012AB3CD）
         */
        slackUserId?: string;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/slack/user-mapping',
            query: {
                'userId': userId,
            },
        });
    }
    /**
     * Slack ユーザーID登録・更新
     * ユーザーの Slack User ID を SLACK_USER_MAPPINGS テーブルに upsert
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param requestBody
     * @returns any 登録・更新成功
     * @throws ApiError
     */
    public static updateSlackUserMapping(
        requestBody: SlackUserMappingRequest,
    ): CancelablePromise<{
        responseStatus?: number;
    }> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/slack/user-mapping',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
