/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ApiSupportUnreadStatusGet200Response = {
    responseStatus?: number;
    /**
     * 一般ユーザー用（未読あり/なし）
     */
    hasUnread?: boolean;
    /**
     * 管理者用（未読のある送信者IDリスト）
     */
    unreadUserIds?: Array<string>;
};

