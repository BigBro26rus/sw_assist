class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(data.error || 'Ошибка запроса', res.status);
  }

  return data as T;
}

export const api = {
  health: () => request<{ ok: boolean }>('/health'),
  flaws: () => request<unknown[]>('/flaws'),
  skills: () => request<unknown[]>('/skills'),
  traits: () => request<unknown[]>('/traits'),
  races: () => request<unknown[]>('/races'),
  characters: {
    list: () => request<import('@/types').CharacterSummary[]>('/characters'),
    get: (uuid: string) => request<import('@/types').CharacterData>(`/character/${uuid}`),
    create: (data: import('@/types').CharacterData) =>
      request<{ success: boolean; uuid: string }>('/character', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (uuid: string, data: import('@/types').CharacterData) =>
      request<{ success: boolean }>(`/character/${uuid}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },
};

export { ApiError };
