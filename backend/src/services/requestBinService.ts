import { httpClient } from "./httpClient";

export async function getRequestWithCustomHeaders(baseUrl: string) {
    return httpClient(`${baseUrl}/data`, {
        method: 'GET',
        headers: {
            'X-Custom-Header' : 'Value1',
            Authorization: 'Bearer YourToken'
        }
    });
};

export async function postRequestWithJSONData(baseUrl: string) {
    return httpClient(`${baseUrl}/users`, {
        method: 'POST',
        headers: {
            'Content-Type' : 'application/json'
        },
        body: JSON.stringify({
            name: 'Haris',
            email: 'haris@example.com'
        })
    });
};

export async function deleteRequest(baseUrl: string) { 
    return httpClient(`${baseUrl}/users/123`, {
        method: 'DELETE'
    })
};

export async function putRequestWithFormData(baseUrl: string) {
    return httpClient(`${baseUrl}/users/123`, {
        method: 'PUT',
        headers: {
            'Content-Type' : 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            name: 'Jane',
            email: 'jane@example.com'
        }).toString()
        
    });
};

export async function patchRequestWithCustomUserAgent(baseUrl: string) {
    return httpClient(`${baseUrl}/users/123`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'MyCustomUserAgent/1.0'
        }, 
        body: JSON.stringify({
            status: 'active'
        })
    });
};

export async function putRequestWithJSONDataAndCustomHeaders(baseUrl: string) {
    return httpClient(`${baseUrl}/settings/456`, {
        method: 'PUT',
        headers: {
            'Content-Type' : 'application/json',
            'X-Request-ID' : '789'
        },
        body: JSON.stringify({
            theme : 'dark',
            notifications: 'enabled'
        })
    });
};


