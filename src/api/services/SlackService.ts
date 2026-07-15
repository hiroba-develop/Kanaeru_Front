/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SlackOauthAuthorizeResponse } from '../models/SlackOauthAuthorizeResponse';
import type { SlackOauthStatusResponse } from '../models/SlackOauthStatusResponse';
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
    /**
     * Slack OAuth 認可開始
     * Slack公式の認可URLを発行してJSONで返す（302リダイレクトはしない）。
     * ブラウザの通常ページ遷移はAuthorizationヘッダーを送信できないため、
     * フロントエンドはこのAPIをAuthorizationヘッダー付きのfetch/axiosで呼び出し、
     * レスポンスのauthorizeUrlへ window.location.href で遷移させること。
     * state に userId・returnUrl を含む署名付きトークンを発行し、コールバック時に検証する。
     * JWT認証必須。
     *
     * @param userId
     * @param returnUrl 連携完了後にリダイレクトするkanaeru側のURL（設定画面）
     * @returns SlackOauthAuthorizeResponse 認可URL発行成功
     * @throws ApiError
     */
    public static apiSlackOauthAuthorizeGet(
        userId: string,
        returnUrl: string,
    ): CancelablePromise<SlackOauthAuthorizeResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/slack/oauth/authorize',
            query: {
                'userId': userId,
                'returnUrl': returnUrl,
            },
        });
    }
    /**
     * Slack OAuth コールバック
     * Slackからのリダイレクトを受け、認可コードをBot Tokenに交換して
     * SLACK_WORKSPACES / SLACK_USER_MAPPINGS へ保存する。
     * 認証不要（SecurityConfigでpermitAll）。
     *
     * @param state
     * @param code
     * @param error
     * @returns void
     * @throws ApiError
     */
    public static apiSlackOauthCallbackGet(
        state: string,
        code?: string,
        error?: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/slack/oauth/callback',
            query: {
                'code': code,
                'state': state,
                'error': error,
            },
            errors: {
                302: `returnUrl へリダイレクト（成否をクエリパラメータで通知）`,
            },
        });
    }
    /**
     * Slack連携状態取得
     * ログインユーザーが所属するSlackワークスペースの連携状況を取得（設定画面表示用）
     *
     * @param userId
     * @returns SlackOauthStatusResponse 取得成功
     * @throws ApiError
     */
    public static getSlackOauthStatus(
        userId: string,
    ): CancelablePromise<SlackOauthStatusResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/slack/oauth/status',
            query: {
                'userId': userId,
            },
        });
    }
}
