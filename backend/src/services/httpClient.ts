type HTTPMethod = 'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH';

type HTTPOptions = {
    method?: HTTPMethod;
    headers?: Record<string, string>;
    body?: string;
};

export async function httpClient(
    url: string,
    options: HTTPOptions = {}
) {

    const response = await fetch(url, {
        method: options.method ?? 'GET',
        headers: options.headers,
        body: options.body
    });

    const contentType = response.headers.get('content-type') ?? '';
    const data = contentType.includes('application/json') 
        ? await response.json()
        : await response.text();

    return {
        status: response.status,
        data,
        headers: response.headers
    };
};










