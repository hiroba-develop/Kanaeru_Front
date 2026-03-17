/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreateSubscriptionRequest } from '../models/CreateSubscriptionRequest';
import type { CreateSubscriptionResponse } from '../models/CreateSubscriptionResponse';
import type { SubscriptionSchema } from '../models/SubscriptionSchema';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class StripeService {
    /**
     * サブスクリプション作成
     * 有料プラン選択時、Stripe CustomerとSubscriptionを作成しClientSecretを返す
     * フロントのStep3→Step4移行時に呼ばれる
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param userId ユーザーID
     * @param requestBody
     * @returns CreateSubscriptionResponse 作成成功
     * @throws ApiError
     */
    public static postApiStripeSubscriptionCreate(
        userId: string,
        requestBody: CreateSubscriptionRequest,
    ): CancelablePromise<CreateSubscriptionResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/stripe/subscription/create',
            query: {
                'userId': userId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                409: `既にアクティブなサブスクリプションが存在`,
                500: `サーバーエラー`,
            },
        });
    }
    /**
     * 現在のサブスクリプション情報取得
     * ユーザーの現在のサブスクリプション状態を取得する
     * サブスクリプションがない場合はnullを返す
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param userId ユーザーID
     * @returns any 取得成功
     * @throws ApiError
     */
    public static getApiStripeSubscription(
        userId: string,
    ): CancelablePromise<{
        responseStatus?: number;
        subscription?: SubscriptionSchema;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/stripe/subscription/',
            query: {
                'userId': userId,
            },
            errors: {
                500: `サーバーエラー`,
            },
        });
    }
    /**
     * サブスクリプション解約
     * サブスクリプションを期間終了時に解約する
     * 即時解約ではなく、現在の請求期間終了まで利用可能
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param userId ユーザーID
     * @returns any 解約予約成功
     * @throws ApiError
     */
    public static postApiStripeSubscriptionCancel(
        userId: string,
    ): CancelablePromise<{
        responseStatus?: number;
        subscription?: SubscriptionSchema;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/stripe/subscription/cancel',
            query: {
                'userId': userId,
            },
            errors: {
                404: `アクティブなサブスクリプションが見つからない`,
                500: `サーバーエラー`,
            },
        });
    }
    /**
     * サブスクリプション解約（未完了）
     * 未完了のサブスクリプションを解約する
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param userId ユーザーID
     * @returns any 解約成功
     * @throws ApiError
     */
    public static postApiStripeSubscriptionCancelIncomplete(
        userId: string,
    ): CancelablePromise<{
        responseStatus?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/stripe/subscription/cancel/incomplete',
            query: {
                'userId': userId,
            },
            errors: {
                404: `未完了のサブスクリプションが見つからない`,
                500: `サーバーエラー`,
            },
        });
    }
    /**
     * StripeWebhook受信
     * Stripeからの非同期通知を受け取る
     * Stripeダッシュボード「開発者」→「Webhook」でこのURLを登録すること
     * 対応イベント:
     * - invoice.paid（支払い完了 → サブスク有効化/更新）
     * - invoice.payment_failed（支払い失敗）
     * - customer.subscription.deleted（サブスクリプション終了 → 無効化）
     * 【重要】リクエストボディは署名検証のためraw bodyで受け取ること
     *
     * @param stripeSignature Stripeの署名（署名検証に使用）
     * @param requestBody
     * @returns any 受信成功
     * @throws ApiError
     */
    public static postApiWebhooksStripe(
        stripeSignature: string,
        requestBody: string,
    ): CancelablePromise<{
        received?: boolean;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/webhooks/stripe',
            headers: {
                'Stripe-Signature': stripeSignature,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `署名検証失敗`,
            },
        });
    }
}
