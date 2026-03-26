export type RegisterInput = {
    fullName: string;
    email: string;
    username: string;
    password: string;
    phone: string;
};

export type LoginInput = {
    identifier: string;
    password: string;
};

export type TwoFactorInput = {
    code: string;
};

export type AuthFlowResult = {
  status: number;
  body: Record<string, unknown>;
};