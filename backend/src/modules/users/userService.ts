import { LoginInput, RegisterInput } from "./userTypes";

export function registerUser(_input: RegisterInput) {
    return { message: 'Hello from register.' };
};

export function loginUser(_input: LoginInput) {
    return { message: 'Hello from login. '};
};

