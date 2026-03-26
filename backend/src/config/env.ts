import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const config = {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development'
};

export type InfobipConfig = {
    apiKey: string;
    baseUrl: string;
    smsPath: string;
    sender: string;
};

export function getInfobipConfig(): InfobipConfig {
    const apiKey = process.env.INFOBIP_API_KEY;
    const baseUrl = process.env.INFOBIP_API_BASE_URL;
    const rawPath = process.env.INFOBIP_SMS_PATH || '/sms/3/messages';
    const sender = process.env.INFOBIP_SENDER || 'ServiceSMS';

    if (!apiKey) throw new Error("INFOBIP_API_KEY is not defined.");
    if (!baseUrl) throw new Error("INFOBIP_API_BASE_URL is not defined.");

    const smsPath = rawPath;

    return {
        apiKey,
        baseUrl: baseUrl.replace(/\/+$/, ""),
        smsPath,
        sender
    };
}

export function getRequestBinUrl(): string {
    const baseURL = process.env.REQUEST_BIN_URL;

    if (!baseURL) {
        throw new Error('REQUEST_BIN_URL is not defined.');
    };

    return baseURL;
};

