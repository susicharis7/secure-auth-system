import { google } from "googleapis";
import { getGoogleOAuthConfig } from "../../../config/env";

export type GoogleIdentity = {
    subject: string;
    email: string; 
    emailVerified: boolean;
    fullName: string;
    givenName: string; 
    familyName: string;
};

function createGoogleClient() {
    const config = getGoogleOAuthConfig();

    return new google.auth.OAuth2(
        config.clientId,
        config.clientSecret,
        config.redirectUri
    );
}

export function generateGoogleAuthUrl(state: string): string {
    const client = createGoogleClient();

    return client.generateAuthUrl({
        state,
        access_type: "offline",
        prompt: "consent",
        scope: ["openid", "email", "profile"],
    });
}

export async function exchangeCodeForGoogleIdentity(code: string): Promise<GoogleIdentity> {
    const client = createGoogleClient();

    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const { data } = await oauth2.userinfo.get();

    const email = (data.email ?? "").trim().toLowerCase();
    const emailVerified = data.verified_email === true; 
    const subject = (data.id ?? "").trim();

    if (!email) {
        throw new Error("Google account email is missing.");
    }

    if (!emailVerified) {
        throw new Error("Google account email is not verified.");
    }

    if (!subject) {
        throw new Error("Google subject is missing.");
    }

    const givenName = (data.given_name ?? "").trim();
    const familyName = (data.family_name ?? "").trim();
    const fullName = (data.name ?? `${givenName} ${familyName}`.trim());

    return {
        subject,
        email,
        emailVerified,
        fullName,
        givenName,
        familyName,
    }


}