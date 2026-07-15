/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type SlackOauthStatusResponse = {
    /**
     * Slackワークスペースと連携済みかどうか
     */
    connected?: boolean;
    /**
     * 連携先ワークスペース表示名
     */
    teamName?: string;
    /**
     * Slack の Member ID（例: U012AB3CD）
     */
    slackUserId?: string;
    connectedAt?: string;
};

