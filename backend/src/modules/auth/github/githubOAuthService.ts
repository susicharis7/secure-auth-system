import { getGitHubOAuthConfig } from "../../../config/env";
import { GitHubAccessTokenResponse, GitHubIdentity, GitHubUserEmailResponse, GitHubUserResponse } from "./githubOAuthTypes";

const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";
const GITHUB_USER_EMAILS_URL = "https://api.github.com/user/emails";
const GITHUB_ACCEPT_HEADER = "application/vnd.github+json";
const GITHUB_USER_AGENT = "sssd-2026-app";

function buildGitHubApiHeaders(accessToken: string): Record<string, string> {
    return {
        Authorization: `Bearer ${accessToken}`,
        Accept: GITHUB_ACCEPT_HEADER,
        "User-Agent": GITHUB_USER_AGENT,
    }
};

function splitFullName(fullName: string): { givenName: string, familyName: string } {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
        return { givenName: "", familyName: "" };
    }

    const [first, ...rest] = parts;
    return {
        givenName: first ?? "",
        familyName: rest.join(" "),
    }
};

export function generateGitHubAuthUrl(state: string): string {
    const config = getGitHubOAuthConfig();

    const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        scope: "read:user user:email",
        state,
        allow_signup: "false",
    });

    return `${GITHUB_AUTHORIZE_URL}?${params.toString()}`;
};

async function exchangeCodeForAccessToken(code: string): Promise<string> {
    const config = getGitHubOAuthConfig();
    const normalizedCode = code.trim(); 

    if (!normalizedCode) throw new Error("GitHub Authorization code is missing.");

    const response = await fetch(GITHUB_ACCESS_TOKEN_URL, {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
        },

        body: new URLSearchParams({
            client_id: config.clientId, 
            client_secret: config.clientSecret,
            code: normalizedCode, 
            redirect_uri: config.redirectUri,
        })
    });

    const tokenData = (await response.json()) as GitHubAccessTokenResponse;

    if (!response.ok) throw new Error(`GitHub token exchange failed with status: ${response.status}`);

    if (!tokenData.access_token) {
        const details = tokenData.error_description ?? tokenData.error ?? "unknown_error";
        throw new Error(`GitHub token exchange failed: ${details}`);
    }

    return tokenData.access_token.trim();
};

async function fetchGitHubUser(accessToken: string): Promise<GitHubUserResponse> {
    const response = await fetch(GITHUB_USER_URL, {
        headers: buildGitHubApiHeaders(accessToken),
    });

    if (!response.ok) {
        throw new Error(`GitHub user fetch failed with status ${response.status}`);
    }

    return (await response.json()) as GitHubUserResponse;
};

async function fetchGitHubVerifiedEmail(accessToken: string): Promise<string> {
    const response = await fetch(GITHUB_USER_EMAILS_URL, {
        headers: buildGitHubApiHeaders(accessToken)
    });

    if (!response.ok) throw new Error(`GitHub email fetch failed with status: ${response.status}`);

    const emails = (await response.json()) as GitHubUserEmailResponse[];

    if (!Array.isArray(emails)) throw new Error("GitHub email response format is invalid.");

    const primaryVerified = emails.find(
        (item) => 
            item.verified === true &&
            item.primary === true && 
            typeof item.email === 'string' &&
            item.email.trim().length > 0
    );

    const anyVerified = emails.find(
        (item) => 
            item.verified === true &&
        typeof item.email === "string" && 
        item.email.trim().length > 0 
    );

    const selected = primaryVerified ?? anyVerified;

    if (!selected) throw new Error("GitHub Account does not have a verified email.");

    return selected.email.trim().toLowerCase();
};

export async function exchangeCodeForGitHubIdentity(code: string): Promise<GitHubIdentity> {
    const accessToken = await exchangeCodeForAccessToken(code);

    const [user, verifiedEmail] = await Promise.all([
        fetchGitHubUser(accessToken),
        fetchGitHubVerifiedEmail(accessToken),
    ]);

    const subject = String(user.id ?? "").trim();

    if (!subject) throw new Error("GitHub subject is missing.");

    const fullName = (user.name ?? "").trim();
    const { givenName, familyName } = splitFullName(fullName);

    return {
        subject,
        email: verifiedEmail,
        emailVerified: true,
        fullName,
        givenName,
        familyName,
        username: (user.login ?? "").trim()
    }
};

