export type GitHubAccessTokenResponse = {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

export type GitHubUserResponse = {
  id: number;
  login: string;
  name: string | null;
};

export type GitHubUserEmailResponse = {
  email: string;
  primary: boolean;
  verified: boolean;
  visibility: string | null;
};

export type GitHubIdentity = {
  subject: string;
  email: string;
  emailVerified: boolean;
  fullName: string;
  givenName: string;
  familyName: string;
  username: string;
};

// githubOAuthCookieService
export type GitHubSsoLoginContext = {
  mode: "login";
  userId: number;
  email: string;
};

export type GitHubSsoCompleteRegistrationContext = {
  mode: "complete-registration";
  email: string;
  subject: string;
  fullName: string;
  givenName: string;
  familyName: string;
  needsFullName: boolean;
};

export type GitHubSsoContext =
  | GitHubSsoLoginContext
  | GitHubSsoCompleteRegistrationContext;