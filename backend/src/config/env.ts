import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const config = {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development'
};

export function getRequestBinUrl(): string {
    const baseURL = process.env.REQUEST_BIN_URL;

    if (!baseURL) {
        throw new Error('REQUEST_BIN_URL is not defined.');
    };

    return baseURL;
};