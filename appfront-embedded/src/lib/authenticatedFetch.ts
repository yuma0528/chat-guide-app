// App Bridge経由でsession tokenを取得してfetchに付与するユーティリティ
export function authenticatedFetch(app: any) {
  return async (uri: RequestInfo | URL, options?: RequestInit) => {
    const token = await app.idToken();
    const fetchOptions = {
      ...options,
      headers: {
        ...options?.headers,
        Authorization: `Bearer ${token}`,
      },
    };
    return fetch(uri, fetchOptions);
  };
}
