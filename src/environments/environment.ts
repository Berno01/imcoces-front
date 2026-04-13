const apiBaseUrl = 'http://127.0.0.1:8000/';

export const environment = {
  production: false,
  apiBaseUrl,
  apiUrl: `${apiBaseUrl}api/v1`,
} as const;
