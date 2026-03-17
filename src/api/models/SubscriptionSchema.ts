/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type SubscriptionSchema = {
    /**
     * StripeサブスクリプションID
     */
    id?: string;
    /**
     * サブスクリプションの状態（active / past_due / canceled など）
     */
    status?: string;
    /**
     * 現在の請求期間の開始日時
     */
    currentPeriodStart?: string;
    /**
     * 現在の請求期間の終了日時
     */
    currentPeriodEnd?: string;
    /**
     * 期間終了時に解約予定かどうか
     */
    cancelAtPeriodEnd?: boolean;
    /**
     * 解約予約日時（cancelAtPeriodEndがtrueの場合に設定）
     */
    canceledAt?: string;
    /**
     * 請求金額（円）
     */
    amount?: number;
    /**
     * 請求サイクル（monthly / yearly など）
     */
    billingCycle?: string;
    /**
     * サブスクリプション作成日時
     */
    createdAt?: string;
};

