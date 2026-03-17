/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CreateSubscriptionResponse = {
    /**
     * 成功時は1、失敗時は0
     */
    responseStatus?: number;
    /**
     * フロントのStripe Elements confirmPaymentに使用するClientSecret
     */
    clientSecret?: string;
    /**
     * 作成されたStripe SubscriptionのID
     */
    subscriptionId?: string;
    /**
     * 作成または取得されたStripe CustomerのID
     */
    customerId?: string;
    /**
     * 請求金額（円）
     */
    amount?: number;
};

