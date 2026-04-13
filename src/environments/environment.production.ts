const apiBaseUrl = 'https://imcoces.sistemastarija.com/';

export const environment = {
  production: true,
  apiBaseUrl,
  apiUrl: `${apiBaseUrl}api/v1`,
} as const;
