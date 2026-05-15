type Params = Record<string, string | number | boolean | null | undefined>;

interface RequestConfig {
    params?: Params;
    headers?: Record<string, string>;
}

export interface HttpResponse<T = unknown> {
    data: T;
    status: number;
    headers: Record<string, string>;
}

export class HttpError<T = unknown> extends Error {
    status: number;
    response: { data: T; status: number };

    constructor(status: number, data: T) {
        super(`HTTP Error ${status}`);
        this.name = 'HttpError';
        this.status = status;
        this.response = { data, status };
    }
}

export type AxiosError<T = unknown> = HttpError<T>;
export type AxiosResponse<T = unknown> = HttpResponse<T>;

export function isAxiosError(error: unknown): error is HttpError {
    return error instanceof HttpError;
}

function getCsrfToken(): string {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

function buildUrl(url: string, params?: Params): string {
    if (!params) {
        return url;
    }
    const filtered = Object.entries(params).filter(([, v]) => v != null) as [string, string][];
    if (filtered.length === 0) {
        return url;
    }
    return `${url}?${new URLSearchParams(filtered.map(([k, v]) => [k, String(v)]))}`;
}

async function request<T = unknown>(
    method: string,
    url: string,
    data?: unknown,
    config: RequestConfig = {},
): Promise<HttpResponse<T>> {
    const isFormData = data instanceof FormData;

    const headers: Record<string, string> = {
        'X-Requested-With': 'XMLHttpRequest',
        Accept: 'application/json',
        'X-XSRF-TOKEN': getCsrfToken(),
        ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
        ...config.headers,
    };

    const response = await fetch(buildUrl(url, config.params), {
        method,
        credentials: 'include',
        headers,
        body: data !== undefined ? (isFormData ? (data as FormData) : JSON.stringify(data)) : undefined,
    });

    let responseData: T;
    try {
        responseData = response.status === 204 ? (null as T) : await response.json();
    } catch {
        responseData = null as T;
    }

    if (!response.ok) {
        throw new HttpError<T>(response.status, responseData);
    }

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
    });

    return { data: responseData, status: response.status, headers: responseHeaders };
}

const http = {
    get: <T = unknown>(url: string, config?: RequestConfig) => request<T>('GET', url, undefined, config),
    post: <T = unknown>(url: string, data?: unknown, config?: RequestConfig) => request<T>('POST', url, data, config),
    put: <T = unknown>(url: string, data?: unknown, config?: RequestConfig) => request<T>('PUT', url, data, config),
    patch: <T = unknown>(url: string, data?: unknown, config?: RequestConfig) => request<T>('PATCH', url, data, config),
    delete: <T = unknown>(url: string, config?: RequestConfig) => request<T>('DELETE', url, undefined, config),
    isAxiosError,
};

export default http;
