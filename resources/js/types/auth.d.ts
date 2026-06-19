export interface User {
    id: number;
    name?: string;
    avatar?: string;
    email: string;
    roles?: Role[];
    direct_permissions?: Permission[];
}

export interface Passkey {
    id: number;
    name: string;
    authenticator: string | null;
    created_at_diff: string;
    last_used_at_diff: string | null;
}

export interface Role {
    id: string;
    name: string;
    permissions: Permission[];
}

export interface Permission {
    id: string;
    name: string;
    resource: string;
    action: string;
}

export interface RegisterFormData {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
}

export interface RegisterResponse {
    user?: {
        id: string;
        name: string;
        email: string;
    };
    message?: string;
}

export interface LaravelValidationError {
    message: string;
    errors: {
        [field: string]: string[];
    };
}

export interface LaravelError {
    message: string;
    error?: string;
}
