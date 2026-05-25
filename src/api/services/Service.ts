/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AdviceSchema } from '../models/AdviceSchema';
import type { ApiSmallGoalsSmallGoalIdReorderPostRequest } from '../models/ApiSmallGoalsSmallGoalIdReorderPostRequest';
import type { ApiSupportSendPost200Response } from '../models/ApiSupportSendPost200Response';
import type { ApiSupportUnreadStatusGet200Response } from '../models/ApiSupportUnreadStatusGet200Response';
import type { AvailabilitySchema } from '../models/AvailabilitySchema';
import type { DmMessagesSchema } from '../models/DmMessagesSchema';
import type { GrossProfitSchema } from '../models/GrossProfitSchema';
import type { LargeGoalSchema } from '../models/LargeGoalSchema';
import type { LargePLLinkedItemSchema } from '../models/LargePLLinkedItemSchema';
import type { MainGoalSchema } from '../models/MainGoalSchema';
import type { MiddlePLLinkedItemSchema } from '../models/MiddlePLLinkedItemSchema';
import type { NetAssetsSchema } from '../models/NetAssetsSchema';
import type { OperatingProfitSchema } from '../models/OperatingProfitSchema';
import type { ReservationSchema } from '../models/ReservationSchema';
import type { SaleSchema } from '../models/SaleSchema';
import type { SettingSchema } from '../models/SettingSchema';
import type { SubscriptionSchema } from '../models/SubscriptionSchema';
import type { UserListSchema } from '../models/UserListSchema';
import type { UserSchema } from '../models/UserSchema';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class Service {
    /**
     * ログイン
     * ユーザーログイン時使用
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param email
     * @param passwordHash
     * @returns any ログイン成功
     * @throws ApiError
     */
    public static postApiAuthLogin(
        email: string,
        passwordHash: string,
    ): CancelablePromise<{
        /**
         * 成功時は1、失敗時は0
         */
        responseStatus?: number;
        userId?: string;
        name?: string;
        email?: string;
        userImageUrl?: string;
        termsAgreedAt?: string;
        role?: string;
        /**
         * JWT認証トークン
         */
        token?: string;
        lastLoginAt?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth/login',
            query: {
                'email': email,
                'passwordHash': passwordHash,
            },
        });
    }
    /**
     * ログアウト
     * ログアウト時使用、トークン無効化
     * @param requestBody
     * @returns any ログアウト成功
     * @throws ApiError
     */
    public static postApiAuthLogout(
        requestBody: {
            /**
             * 認証トークン（JWT）
             */
            token: string;
        },
    ): CancelablePromise<{
        responseStatus?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth/logout',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 利用規約同意
     * ログイン直後の利用規約同意時使用、利用規約同意日時を更新
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param requestBody
     * @returns any 同意成功
     * @throws ApiError
     */
    public static postApiAuthTermsAgree(
        requestBody: {
            userId?: string;
            termsAgreedAt?: string;
        },
    ): CancelablePromise<{
        responseStatus?: number;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth/termsAgree',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * ユーザー登録(一般ユーザー)
     * ユーザー登録時使用(一般ユーザー)
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param requestBody
     * @returns any 登録成功
     * @throws ApiError
     */
    public static postApiAuthRegistrationUser(
        requestBody: {
            userSchema?: UserSchema;
            settingSchema?: SettingSchema;
        },
    ): CancelablePromise<{
        responseStatus?: number;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth/registration/user',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * ユーザー削除
     * ユーザー削除時使用
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param userId
     * @returns any 削除成功
     * @throws ApiError
     */
    public static deleteApiAuthDelete(
        userId: string,
    ): CancelablePromise<{
        responseStatus?: number;
    }> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/auth/delete',
            query: {
                'userId': userId,
            },
        });
    }
    /**
     * パスワード更新
     * パスワード更新時使用
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param requestBody
     * @returns any 更新成功
     * @throws ApiError
     */
    public static putApiAuthUpdatePassword(
        requestBody: {
            currentPasswordHash?: string;
            newPasswordHash?: string;
        },
    ): CancelablePromise<{
        responseStatus?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/auth/updatePassword',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * パスワード再発行
     * パスワード再発行時使用
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param requestBody
     * @returns any 再発行成功
     * @throws ApiError
     */
    public static postApiAuthForgotPassword(
        requestBody: {
            email?: string;
        },
    ): CancelablePromise<{
        responseStatus?: number;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth/forgotPassword',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * パスワード再設定
     * パスワード再設定時使用
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param requestBody
     * @returns any 再設定成功
     * @throws ApiError
     */
    public static postApiAuthResetPassword(
        requestBody: {
            token?: string;
            newPasswordHash?: string;
        },
    ): CancelablePromise<{
        responseStatus?: number;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth/resetPassword',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * ユーザー登録(管理者・プラットフォームオーナー)
     * ユーザー登録時使用(管理者・プラットフォームオーナー)
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param requestBody
     * @returns any 登録成功
     * @throws ApiError
     */
    public static postApiAuthRegistrationAdmin(
        requestBody: {
            userSchema?: UserSchema;
        },
    ): CancelablePromise<{
        responseStatus?: number;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth/registration/admin',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * ユーザー取得
     * ユーザー取得時使用
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @returns any 取得成功
     * @throws ApiError
     */
    public static getApiGetUsers(): CancelablePromise<{
        responseStatus?: number;
        userListSchema?: Array<UserListSchema>;
        settingListSchema?: Array<SettingSchema>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/get/users',
        });
    }
    /**
     * 管理者ユーザーまたはプラットフォームユーザー取得
     * 管理者ユーザーまたはプラットフォームユーザー取得時使用
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @returns any 取得成功
     * @throws ApiError
     */
    public static getApiGetAdminUsers(): CancelablePromise<{
        responseStatus?: number;
        adminUserListSchema?: Array<UserListSchema>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/get/adminUsers',
        });
    }
    /**
     * 管理者ユーザーまたはプラットフォームユーザー更新
     * ユーザー登録時使用(管理者・プラットフォームオーナー)
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param requestBody
     * @returns any 更新成功
     * @throws ApiError
     */
    public static putApiUpdateAdminUsers(
        requestBody: {
            userSchema?: UserSchema;
        },
    ): CancelablePromise<{
        responseStatus?: number;
        userSchema?: UserSchema;
    }> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/update/adminUsers',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * アカウント削除
     * アカウント削除時使用
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param userId
     * @returns any 削除成功
     * @throws ApiError
     */
    public static deleteApiDeleteAccount(
        userId: string,
    ): CancelablePromise<{
        responseStatus?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/delete/account',
            query: {
                'userId': userId,
            },
        });
    }
    /**
     * 設定内容変更(一般ユーザー)
     * 設定内容更新時使用(一般ユーザー)
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param requestBody
     * @returns any 更新成功
     * @throws ApiError
     */
    public static putApiSettingUpdateUser(
        requestBody: {
            userSchema?: UserSchema;
            settingSchema?: SettingSchema;
        },
    ): CancelablePromise<{
        responseStatus?: number;
        userSchema?: UserSchema;
        settingSchema?: SettingSchema;
    }> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/setting/update/user',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 設定内容取得(一般ユーザー)
     * 設定内容更新時使用(一般ユーザー)
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param userId
     * @returns any 取得成功
     * @throws ApiError
     */
    public static getApiSettingUser(
        userId: string,
    ): CancelablePromise<{
        responseStatus?: number;
        userSchema?: UserSchema;
        settingSchema?: SettingSchema;
        subscriptionSchema?: SubscriptionSchema;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/setting/user',
            query: {
                'userId': userId,
            },
        });
    }
    /**
     * 設定内容変更(管理者・プラットフォームオーナー)
     * 設定内容更新時使用(管理者・プラットフォームオーナー)
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param requestBody
     * @returns any 更新成功
     * @throws ApiError
     */
    public static putApiSettingUpdateAdmin(
        requestBody: {
            userSchema?: UserSchema;
        },
    ): CancelablePromise<{
        responseStatus?: number;
        userSchema?: UserSchema;
    }> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/setting/update/admin',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 設定内容取得(管理者・プラットフォームオーナー)
     * 設定内容更新時使用(管理者・プラットフォームオーナー)
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param userId
     * @returns any 取得成功
     * @throws ApiError
     */
    public static getApiSettingAdmin(
        userId: string,
    ): CancelablePromise<{
        responseStatus?: number;
        userSchema?: UserSchema;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/setting/admin',
            query: {
                'userId': userId,
            },
        });
    }
    /**
     * ユーザー画像登録
     * ユーザー画像登録時使用
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param formData
     * @returns any 登録成功
     * @throws ApiError
     */
    public static postApiSettingUserImage(
        formData: {
            /**
             * ユーザーID（必須）
             */
            userId: string;
            /**
             * 書影画像ファイル（jpg, png, gif, 最大5MB）
             */
            imageFile: Blob;
        },
    ): CancelablePromise<{
        responseStatus?: number;
        imageUrl?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/setting/user/image',
            formData: formData,
            mediaType: 'multipart/form-data',
        });
    }
    /**
     * 売上更新
     * 売上更新時使用
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param requestBody
     * @returns any 更新成功
     * @throws ApiError
     */
    public static putApiSaleUpdate(
        requestBody: SaleSchema,
    ): CancelablePromise<{
        responseStatus?: number;
        saleSchema?: SaleSchema;
    }> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/sale/update',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 粗利益更新
     * 粗利益更新時使用
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param requestBody
     * @returns any 更新成功
     * @throws ApiError
     */
    public static putApiGrossProfitUpdate(
        requestBody: GrossProfitSchema,
    ): CancelablePromise<{
        responseStatus?: number;
        grossProfitSchema?: GrossProfitSchema;
    }> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/grossProfit/update',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 営業利益更新
     * 営業利益更新時使用
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param requestBody
     * @returns any 更新成功
     * @throws ApiError
     */
    public static putApiOperatingProfitUpdate(
        requestBody: OperatingProfitSchema,
    ): CancelablePromise<{
        responseStatus?: number;
        operatingProfitSchema?: OperatingProfitSchema;
    }> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/operatingProfit/update',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 純資産更新
     * 純資産更新時使用
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param requestBody
     * @returns any 更新成功
     * @throws ApiError
     */
    public static putApiNetAssetUpdate(
        requestBody: NetAssetsSchema,
    ): CancelablePromise<{
        responseStatus?: number;
        netAssetsSchema?: NetAssetsSchema;
    }> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/netAsset/update',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * ホーム画面 初期表示
     * ホーム画面初期表示時使用
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param userId
     * @returns any 取得成功
     * @throws ApiError
     */
    public static getApiHome(
        userId: string,
    ): CancelablePromise<{
        responseStatus?: number;
        mainGoalSchema?: MainGoalSchema;
        largeGoalSchema?: Array<LargeGoalSchema>;
        saleSchema?: SaleSchema;
        grossProfitSchema?: GrossProfitSchema;
        operatingProfitSchema?: OperatingProfitSchema;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/home',
            query: {
                'userId': userId,
            },
        });
    }
    /**
     * 予実管理(年次)画面 初期表示
     * 予実管理(年次)画面初期表示時使用
     * saleSchema, grossProfitSchema, operatingProfitSchemaは12ヶ月分のデータをセットする
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param userId
     * @returns any 取得成功
     * @throws ApiError
     */
    public static getApiYearlyBudgetActual(
        userId: string,
    ): CancelablePromise<{
        responseStatus?: number;
        saleSchema?: Array<SaleSchema>;
        grossProfitSchema?: Array<GrossProfitSchema>;
        operatingProfitSchema?: Array<OperatingProfitSchema>;
        largePLLinkedItemSchema?: Array<LargePLLinkedItemSchema>;
        middlePLLinkedItemSchema?: Array<MiddlePLLinkedItemSchema>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/yearlyBudgetActual',
            query: {
                'userId': userId,
            },
        });
    }
    /**
     * 予実管理(月次)画面 初期表示
     * 予実管理(月次)画面初期表示時使用
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param userId
     * @param year
     * @param startMonth
     * @returns any 取得成功
     * @throws ApiError
     */
    public static getApiMonthlyBudgetActual(
        userId: string,
        year: number,
        startMonth: string,
    ): CancelablePromise<{
        responseStatus?: number;
        saleSchema?: Array<SaleSchema>;
        grossProfitSchema?: Array<GrossProfitSchema>;
        operatingProfitSchema?: Array<OperatingProfitSchema>;
        largePLLinkedItemSchema?: Array<LargePLLinkedItemSchema>;
        middlePLLinkedItemSchema?: Array<MiddlePLLinkedItemSchema>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/monthlyBudgetActual',
            query: {
                'userId': userId,
                'year': year,
                'startMonth': startMonth,
            },
        });
    }
    /**
     * サポート画面 初期表示
     * @param selecteId
     * @returns any 取得成功
     * @throws ApiError
     */
    public static getApiSupport(
        selecteId: string,
    ): CancelablePromise<{
        responseStatus?: number;
        lastMessageSeq?: number;
        dmMessageSchema?: DmMessagesSchema;
        dmMessagesSchemaList?: Array<DmMessagesSchema>;
        adviceSchema?: Array<AdviceSchema>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/support',
            query: {
                'selecteId': selecteId,
            },
        });
    }
    /**
     * サポート画面 メッセージ送信
     * @param requestBody
     * @returns ApiSupportSendPost200Response 送信成功
     * @throws ApiError
     */
    public static postApiSupportSend(
        requestBody: {
            senderId?: string;
            recipientId?: string;
            content?: string;
            messageSeq?: number;
        },
    ): CancelablePromise<ApiSupportSendPost200Response> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/support/send',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * サポート画面 メッセージ既読
     * @param senderId
     * @param recipientId
     * @param content
     * @param messageSeq
     * @returns any 既読成功
     * @throws ApiError
     */
    public static getApiSupportRead(
        senderId: string,
        recipientId: string,
        content: string,
        messageSeq: number,
    ): CancelablePromise<{
        responseStatus?: number;
        lastMessageSeq?: number;
        dmMessageSchema?: DmMessagesSchema;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/support/read',
            query: {
                'senderId': senderId,
                'recipientId': recipientId,
                'content': content,
                'messageSeq': messageSeq,
            },
        });
    }
    /**
     * サポート画面 メッセージ受信
     * @param userId
     * @returns any 受信成功
     * @throws ApiError
     */
    public static getApiSupportStream(
        userId: string,
    ): CancelablePromise<{
        value?: {
            messageSeq?: number;
            senderId?: string;
            senderName?: string;
            recipientId?: string;
            recipientName?: string;
            content?: string;
            readAt?: string;
            createdAt?: string;
            updatedAt?: string;
        };
        read?: {
            messageSeq?: number;
            readAt?: string;
        };
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/support/stream',
            query: {
                'userId': userId,
            },
        });
    }
    /**
     * 未読状態取得
     * @param userId
     * @returns ApiSupportUnreadStatusGet200Response 成功
     * @throws ApiError
     */
    public static apiSupportUnreadStatusGet(
        userId: string,
    ): CancelablePromise<ApiSupportUnreadStatusGet200Response> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/support/unread-status',
            query: {
                'userId': userId,
            },
        });
    }
    /**
     * サポート画面 アドバイス取得
     * @param userId
     * @param year
     * @param month
     * @returns any 取得成功
     * @throws ApiError
     */
    public static getApiSupportAdvice(
        userId: string,
        year?: number,
        month?: number,
    ): CancelablePromise<{
        responseStatus?: number;
        adviceSchema?: Array<AdviceSchema>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/support/advice',
            query: {
                'userId': userId,
                'year': year,
                'month': month,
            },
        });
    }
    /**
     * サポート画面 アドバイス作成
     * @param requestBody
     * @returns any 作成成功
     * @throws ApiError
     */
    public static postApiSupportAdviceCreate(
        requestBody: {
            userId?: string;
            adviceContent?: string;
        },
    ): CancelablePromise<{
        adviceId?: string;
        responseStatus?: number;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/support/advice/create',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * サポート画面 アドバイス更新
     * @param requestBody
     * @returns any 更新成功
     * @throws ApiError
     */
    public static putApiSupportAdviceUpdate(
        requestBody: {
            adviceId?: string;
            adviceContent?: string;
        },
    ): CancelablePromise<{
        responseStatus?: number;
    }> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/support/advice/update',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * サポート画面 アドバイス削除
     * @param adviceId
     * @returns any 削除成功
     * @throws ApiError
     */
    public static deleteApiSupportAdviceDelete(
        adviceId: string,
    ): CancelablePromise<{
        responseStatus?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/support/advice/delete',
            query: {
                'adviceId': adviceId,
            },
        });
    }
    /**
     * サポート画面 リアクション登録
     * @param requestBody
     * @returns any 登録成功
     * @throws ApiError
     */
    public static putApiSupportReactionCreate(
        requestBody: {
            messageSeq?: number;
            reactionFlag?: number;
        },
    ): CancelablePromise<{
        responseStatus?: number;
    }> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/support/reaction/create',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * サポート画面 リアクション削除
     * @param messageSeq
     * @returns any 更新成功
     * @throws ApiError
     */
    public static putApiSupportReactionDelete(
        messageSeq: number,
    ): CancelablePromise<{
        responseStatus?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/support/reaction/delete',
            query: {
                'messageSeq': messageSeq,
            },
        });
    }
    /**
     * サポート画面　予約可能日時取得
     * @param userId
     * @param date
     * @returns any 取得成功
     * @throws ApiError
     */
    public static getApiAvailability(
        userId: string,
        date: string,
    ): CancelablePromise<{
        responseStatus?: number;
        userId?: string;
        availabilitySchema?: AvailabilitySchema;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/availability',
            query: {
                'userId': userId,
                'date': date,
            },
        });
    }
    /**
     * サポート画面 予約作成
     * @param requestBody
     * @returns any 作成成功
     * @throws ApiError
     */
    public static postApiSupportReservation(
        requestBody: {
            userId?: string;
            startAt?: string;
            endAt?: string;
            content?: string;
        },
    ): CancelablePromise<{
        responseStatus?: number;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/support/reservation',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * サポート画面 予約履歴
     * @param userId
     * @param selecteId
     * @returns any 取得成功
     * @throws ApiError
     */
    public static getApiSupportReservation(
        userId: string,
        selecteId: string,
    ): CancelablePromise<{
        responseStatus?: number;
        googleStatus?: string;
        reservationSchema?: ReservationSchema;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/support/reservation',
            query: {
                'userId': userId,
                'selecteId': selecteId,
            },
        });
    }
    /**
     * サポート画面 予約承諾
     * @param requestBody
     * @returns any 承諾成功
     * @throws ApiError
     */
    public static postApiSupportReservationApproval(
        requestBody: {
            reservationId?: string;
            userId?: string;
        },
    ): CancelablePromise<{
        responseStatus?: number;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/support/reservation/approval',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * サポート画面 予約拒否
     * @param requestBody
     * @returns any 拒否成功
     * @throws ApiError
     */
    public static postApiSupportReservationReject(
        requestBody: {
            reservationId?: string;
            userId?: string;
        },
    ): CancelablePromise<{
        responseStatus?: number;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/support/reservation/reject',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * サポート画面 予約履歴(全件)
     * @param userId
     * @param selecteId
     * @returns any 取得成功
     * @throws ApiError
     */
    public static getApiSupportReservationAll(
        userId: string,
        selecteId: string,
    ): CancelablePromise<{
        responseStatus?: number;
        reservationSchema?: ReservationSchema;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/support/reservation/all',
            query: {
                'userId': userId,
                'selecteId': selecteId,
            },
        });
    }
    /**
     * Google認証
     * @param userId
     * @param returnUrl
     * @returns void
     * @throws ApiError
     */
    public static getApiGoogleAuthorize(
        userId: string,
        returnUrl: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/google/authorize',
            query: {
                'userId': userId,
                'returnUrl': returnUrl,
            },
            errors: {
                302: `Google認証ページへリダイレクト`,
            },
        });
    }
    /**
     * Google認証コールバック
     * @param state
     * @param code
     * @param error
     * @param errorDescription
     * @returns any コールバック処理完了
     * @throws ApiError
     */
    public static getApiGoogleCallback(
        state: string,
        code?: string,
        error?: string,
        errorDescription?: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/google/callback',
            query: {
                'state': state,
                'code': code,
                'error': error,
                'errorDescription': errorDescription,
            },
        });
    }
    /**
     * マンダラチャート一覧取得
     * ログインユーザーのマンダラチャート一覧を取得
     * responseStatusは成功時に1を返却、失敗時は0を返却
     * アクティブなマンダラチャートを取得
     *
     * @param userId
     * @returns any 取得成功
     * @throws ApiError
     */
    public static getApiMandalaCharts(
        userId: string,
    ): CancelablePromise<{
        responseStatus?: number;
        charts?: Array<{
            chart_id?: string;
            start_year_month?: string;
            end_year_month?: string;
            is_active?: boolean;
            created_at?: string;
            main_goal?: {
                main_goal_id?: string;
                goal_title?: string;
            };
            large_goals?: Array<LargeGoalSchema>;
        }>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/mandala-charts',
            query: {
                'userId': userId,
            },
        });
    }
    /**
     * マンダラチャート新規作成
     * メイン目標を入力されたときにマンダラチャートIDを採番
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param requestBody
     * @returns any 作成成功
     * @throws ApiError
     */
    public static postApiMandalaChartsCreate(
        requestBody: {
            userId?: string;
            chart_id?: string;
            main_goal?: {
                goal_title?: string;
                start_year_month?: string;
            };
        },
    ): CancelablePromise<{
        responseStatus?: number;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/mandala-charts/create',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * マンダラチャート更新
     * マンダラチャートを切り替えたりするときに使用
     * 期間を設定してアーカイブができる
     * マンダラチャート情報を更新
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param chartId
     * @param requestBody
     * @returns any 更新成功
     * @throws ApiError
     */
    public static putApiMandalaChartsUpdate(
        chartId: string,
        requestBody: {
            start_year_month?: string;
            end_year_month?: string;
            is_active?: boolean;
        },
    ): CancelablePromise<{
        responseStatus?: number;
    }> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/mandala-charts/{chart_id}/update',
            path: {
                'chart_id': chartId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * マンダラチャート削除
     * マンダラチャートを論理削除(DEL_FLG=1)
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param chartId
     * @param userId
     * @returns any 削除成功
     * @throws ApiError
     */
    public static deleteApiMandalaChartsDelete(
        chartId: string,
        userId: string,
    ): CancelablePromise<{
        responseStatus?: number;
    }> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/mandala-charts/{chart_id}/delete',
            path: {
                'chart_id': chartId,
            },
            query: {
                'userId': userId,
            },
        });
    }
    /**
     * メイン目標取得
     * メイン目標の詳細情報を取得
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param chartId
     * @returns any 取得成功
     * @throws ApiError
     */
    public static getApiMandalaChartsMainGoal(
        chartId: string,
    ): CancelablePromise<{
        responseStatus?: number;
        main_goal_id?: string;
        chart_id?: string;
        goal_title?: string;
        start_year_month?: string;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/mandala-charts/{chart_id}/main-goal',
            path: {
                'chart_id': chartId,
            },
        });
    }
    /**
     * メイン目標更新
     * メイン目標を更新
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param chartId
     * @param requestBody
     * @returns any 更新成功
     * @throws ApiError
     */
    public static putApiMandalaChartsMainGoalUpdate(
        chartId: string,
        requestBody: {
            goal_title?: string;
            start_year_month?: string;
        },
    ): CancelablePromise<{
        responseStatus?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/mandala-charts/{chart_id}/main-goal/update',
            path: {
                'chart_id': chartId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 大目標一覧取得
     * 指定したマンダラチャートの大目標一覧を取得
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param chartId
     * @returns any 取得成功
     * @throws ApiError
     */
    public static getApiMandalaChartsLargeGoals(
        chartId: string,
    ): CancelablePromise<{
        responseStatus?: number;
        large_goals?: Array<LargeGoalSchema>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/mandala-charts/{chart_id}/large-goals',
            path: {
                'chart_id': chartId,
            },
        });
    }
    /**
     * 大目標詳細取得
     * 大目標の詳細情報と紐づく中目標数を取得
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param largeGoalId
     * @returns any 取得成功
     * @throws ApiError
     */
    public static getApiLargeGoalsDetail(
        largeGoalId: string,
    ): CancelablePromise<{
        responseStatus?: number;
        large_goal_id?: string;
        main_goal_id?: string;
        position?: number;
        goal_title?: string;
        goal_description?: string;
        /**
         * 1=定性, 2=売上, 3=粗利益, 4=営業利益
         */
        goal_type?: number;
        target_year?: number;
        target_amount?: number;
        progress?: number;
        middle_goals_count?: number;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/large-goals/{large_goal_id}/detail',
            path: {
                'large_goal_id': largeGoalId,
            },
        });
    }
    /**
     * 大目標新規作成
     * 新しい大目標を作成
     * positionは1-8の範囲
     * goal_type: 1=定性/2=売上/3=粗利益/4=営業利益
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param chartId
     * @param requestBody
     * @returns any 作成成功
     * @throws ApiError
     */
    public static postApiLargeGoalsCreate(
        chartId: string,
        requestBody: {
            chart_id?: string;
            /**
             * 1-8の範囲
             */
            position?: number;
            goal_title?: string;
            goal_description?: string;
            /**
             * 1=定性, 2=売上, 3=粗利益, 4=営業利益
             */
            goal_type?: number;
            target_year?: number;
            target_amount?: number;
        },
    ): CancelablePromise<{
        responseStatus?: number;
        large_goal_id?: string;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/large-goals/{chart_id}/create',
            path: {
                'chart_id': chartId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 大目標更新
     * 大目標を更新
     * positionは1-8の範囲
     * goal_type: 1=定性/2=売上/3=粗利益/4=営業利益
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param largeGoalId
     * @param requestBody
     * @returns any 更新成功
     * @throws ApiError
     */
    public static putApiLargeGoalsUpdate(
        largeGoalId: string,
        requestBody: {
            chart_id?: string;
            /**
             * 1-8の範囲
             */
            position?: number;
            goal_title?: string;
            goal_description?: string;
            /**
             * 1=定性, 2=売上, 3=粗利益, 4=営業利益
             */
            goal_type?: number;
            target_year?: number;
            target_amount?: number;
        },
    ): CancelablePromise<{
        responseStatus?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/large-goals/{large_goal_id}/update',
            path: {
                'large_goal_id': largeGoalId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 大目標削除
     * 大目標を論理削除(DEL_FLG=1)
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param largeGoalId
     * @param chartId
     * @returns any 削除成功
     * @throws ApiError
     */
    public static deleteApiLargeGoalsDelete(
        largeGoalId: string,
        chartId: string,
    ): CancelablePromise<{
        responseStatus?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/large-goals/{large_goal_id}/delete',
            path: {
                'large_goal_id': largeGoalId,
            },
            query: {
                'chart_id': chartId,
            },
        });
    }
    /**
     * 中目標一覧取得
     * 指定した大目標の中目標一覧を取得
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param largeGoalId
     * @returns any 取得成功
     * @throws ApiError
     */
    public static getApiMiddleGoals(
        largeGoalId: string,
    ): CancelablePromise<{
        responseStatus?: number;
        middle_goals?: Array<{
            middle_goal_id?: string;
            /**
             * 1-8の範囲
             */
            position?: number;
            goal_title?: string;
            goal_description?: string;
            /**
             * 1=定性, 2=売上, 3=粗利益, 4=営業利益
             */
            goal_type?: number;
            target_year?: number;
            target_amount?: number;
            progress?: number;
        }>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/middle-goals/{large_goal_id}',
            path: {
                'large_goal_id': largeGoalId,
            },
        });
    }
    /**
     * 中目標詳細取得
     * 中目標の詳細情報と紐づく小目標数を取得
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param middleGoalId
     * @returns any 取得成功
     * @throws ApiError
     */
    public static getApiMiddleGoalsDetail(
        middleGoalId: string,
    ): CancelablePromise<{
        responseStatus?: number;
        middle_goal_id?: string;
        large_goal_id?: string;
        position?: number;
        goal_title?: string;
        goal_description?: string;
        /**
         * 1=定性, 2=売上, 3=粗利益, 4=営業利益
         */
        goal_type?: number;
        target_year?: number;
        target_amount?: number;
        progress?: number;
        small_goals_count?: number;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/middle-goals/{middle_goal_id}/detail',
            path: {
                'middle_goal_id': middleGoalId,
            },
        });
    }
    /**
     * 中目標新規作成
     * 新しい中目標を作成
     * positionは1-8の範囲
     * goal_type: 1=定性/2=売上/3=粗利益/4=営業利益
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param largeGoalId
     * @param requestBody
     * @returns any 作成成功
     * @throws ApiError
     */
    public static postApiMiddleGoalsCreate(
        largeGoalId: string,
        requestBody: {
            /**
             * 1-8の範囲
             */
            position?: number;
            goal_title?: string;
            goal_description?: string;
            /**
             * 1=定性, 2=売上, 3=粗利益, 4=営業利益
             */
            goal_type?: number;
            target_year?: number;
            target_amount?: number;
        },
    ): CancelablePromise<{
        responseStatus?: number;
        middle_goal_id?: string;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/middle-goals/{large_goal_id}/create',
            path: {
                'large_goal_id': largeGoalId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 中目標更新
     * 中目標を更新
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param middleGoalId
     * @param requestBody
     * @returns any 更新成功
     * @throws ApiError
     */
    public static putApiMiddleGoalsUpdate(
        middleGoalId: string,
        requestBody: {
            position?: number;
            goal_title?: string;
            goal_description?: string;
            goal_type?: number;
            target_year?: number;
            target_amount?: number;
        },
    ): CancelablePromise<{
        responseStatus?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/middle-goals/{middle_goal_id}/update',
            path: {
                'middle_goal_id': middleGoalId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 中目標削除
     * 中目標を削除
     * responseStatusは成功時に1を返却、失敗時は0を返却
     *
     * @param middleGoalId
     * @returns any 削除成功
     * @throws ApiError
     */
    public static deleteApiMiddleGoalsDelete(
        middleGoalId: string,
    ): CancelablePromise<{
        responseStatus?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/middle-goals/{middle_goal_id}/delete',
            path: {
                'middle_goal_id': middleGoalId,
            },
        });
    }
    /**
     * 小目標一覧取得
     * @param middleGoalId
     * @returns any 取得成功
     * @throws ApiError
     */
    public static getApiSmallGoals(
        middleGoalId: string,
    ): CancelablePromise<{
        responseStatus?: number;
        small_goals?: Array<{
            small_goal_id?: string;
            position?: number;
            goal_title?: string;
            goal_description?: string;
            is_completed?: boolean;
            completed_at?: string;
        }>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/small-goals/{middle_goal_id}',
            path: {
                'middle_goal_id': middleGoalId,
            },
        });
    }
    /**
     * 小目標詳細取得
     * @param smallGoalId
     * @returns any 取得成功
     * @throws ApiError
     */
    public static getApiSmallGoalsDetail(
        smallGoalId: string,
    ): CancelablePromise<{
        responseStatus?: number;
        small_goal_id?: string;
        middle_goal_id?: string;
        position?: number;
        goal_title?: string;
        goal_description?: string;
        is_completed?: boolean;
        completed_at?: string;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/small-goals/{small_goal_id}/detail',
            path: {
                'small_goal_id': smallGoalId,
            },
        });
    }
    /**
     * 小目標新規作成
     * @param middleGoalId
     * @param requestBody
     * @returns any 作成成功
     * @throws ApiError
     */
    public static postApiSmallGoalsCreate(
        middleGoalId: string,
        requestBody: {
            position?: number;
            goal_title?: string;
            goal_description?: string;
        },
    ): CancelablePromise<{
        responseStatus?: number;
        small_goal_id?: string;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/small-goals/{middle_goal_id}/create',
            path: {
                'middle_goal_id': middleGoalId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 小目標更新
     * @param smallGoalId
     * @param requestBody
     * @returns any 更新成功
     * @throws ApiError
     */
    public static putApiSmallGoalsUpdate(
        smallGoalId: string,
        requestBody: {
            position?: number;
            goal_title?: string;
            goal_description?: string;
        },
    ): CancelablePromise<{
        responseStatus?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/small-goals/{small_goal_id}/update',
            path: {
                'small_goal_id': smallGoalId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 小目標完了/未完了切替
     * @param smallGoalId
     * @returns any 切替成功
     * @throws ApiError
     */
    public static putApiSmallGoalsComplete(
        smallGoalId: string,
    ): CancelablePromise<{
        responseStatus?: number;
        is_completed?: boolean;
        completed_at?: string;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/small-goals/{small_goal_id}/complete',
            path: {
                'small_goal_id': smallGoalId,
            },
        });
    }
    /**
     * 小目標順番変更
     * @param smallGoalId
     * @param requestBody
     * @returns any 変更成功
     * @throws ApiError
     */
    public static postApiSmallGoalsReorder(
        smallGoalId: string,
        requestBody: ApiSmallGoalsSmallGoalIdReorderPostRequest,
    ): CancelablePromise<{
        responseStatus?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/small-goals/{small_goal_id}/reorder',
            path: {
                'small_goal_id': smallGoalId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 小目標削除
     * @param smallGoalId
     * @returns any 削除成功
     * @throws ApiError
     */
    public static deleteApiSmallGoalsDelete(
        smallGoalId: string,
    ): CancelablePromise<{
        responseStatus?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/small-goals/{small_goal_id}/delete',
            path: {
                'small_goal_id': smallGoalId,
            },
        });
    }
    /**
     * お問い合わせ送信
     * @param requestBody
     * @returns any 送信成功
     * @throws ApiError
     */
    public static postApiContactsSend(
        requestBody: {
            title?: string;
            userName?: string;
            email?: string;
            content?: string;
        },
    ): CancelablePromise<{
        responseStatus?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/contacts/send',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
