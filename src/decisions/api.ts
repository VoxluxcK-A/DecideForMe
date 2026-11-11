import type { DecisionData, DecisionHistory, DecisionOption, DecisionStatus } from './model';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin';
  isAdmin: boolean;
  isActive: boolean;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin';
  isActive: boolean;
  createdAt: string;
}

export interface ApiPage<T> {
  data: T[];
  meta: {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
  };
}

export interface ApiDashboard extends DecisionData {
  stats: {
    categories: number;
    options: number;
    decisions: number;
    favorites: number;
  };
}

export interface RandomDecision {
  option: DecisionOption;
  history: DecisionHistory;
}

export class ApiError extends Error {
  readonly status: number;
  readonly fields: Record<string, string[]>;

  constructor(message: string, status: number, fields: Record<string, string[]> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
  }
}

let csrfCookieRequest: Promise<void> | null = null;

function csrfToken(): string {
  const value = document.cookie.split('; ').find((cookie) => cookie.startsWith('XSRF-TOKEN='));
  if (!value) return '';
  return decodeURIComponent(value.slice('XSRF-TOKEN='.length));
}

async function ensureCsrfCookie(): Promise<void> {
  if (!csrfCookieRequest) {
    csrfCookieRequest = fetch('/sanctum/csrf-cookie', {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    })
      .then((response) => {
        if (!response.ok) throw new ApiError('Could not start a secure session. Please try again.', response.status);
      })
      .finally(() => {
        csrfCookieRequest = null;
      });
  }
  await csrfCookieRequest;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  headers.set('X-Requested-With', 'XMLHttpRequest');
  if (init.body) headers.set('Content-Type', 'application/json');

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    await ensureCsrfCookie();
    const token = csrfToken();
    if (token) headers.set('X-XSRF-TOKEN', token);
  }

  const response = await fetch(path, {
    ...init,
    method,
    headers,
    credentials: 'same-origin',
  });

  if (response.status === 204) return undefined as T;

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    if (response.ok) {
      throw new ApiError('The server returned an unexpected response. Please refresh and try again.', response.status);
    }
    payload = null;
  }
  if (!response.ok) {
    if (response.status === 401 && !['/login', '/register'].includes(window.location.pathname)) {
      window.location.assign('/login');
    }

    const result = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
    const errors = result.errors && typeof result.errors === 'object'
      ? result.errors as Record<string, string[]>
      : {};
    const message = typeof result.message === 'string'
      ? result.message
      : response.status === 401
        ? 'Please sign in to continue.'
        : 'The request could not be completed.';
    throw new ApiError(message, response.status, errors);
  }

  if (!payload || typeof payload !== 'object') {
    throw new ApiError('The server returned an unexpected response. Please refresh and try again.', response.status);
  }

  return payload as T;
}

function jsonBody(value: unknown): string {
  return JSON.stringify(value);
}

export const decisionApi = {
  async currentUser(): Promise<AuthUser> {
    const response = await request<{ data: AuthUser }>('/api/user');
    return response.data;
  },

  async dashboard(): Promise<ApiDashboard> {
    const response = await request<{ data: DecisionData; stats: ApiDashboard['stats'] }>('/api/dashboard');
    return { ...response.data, stats: response.stats };
  },

  async login(email: string, password: string): Promise<AuthUser> {
    const response = await request<{ data: AuthUser }>('/api/login', {
      method: 'POST',
      body: jsonBody({ email, password }),
    });
    return response.data;
  },

  async register(name: string, email: string, password: string, passwordConfirmation: string): Promise<AuthUser> {
    const response = await request<{ data: AuthUser }>('/api/register', {
      method: 'POST',
      body: jsonBody({ name, email, password, password_confirmation: passwordConfirmation }),
    });
    return response.data;
  },

  async logout(): Promise<void> {
    await request('/api/logout', { method: 'POST' });
  },

  async requestPasswordReset(email: string): Promise<string> {
    const response = await request<{ message: string }>('/api/password/forgot', {
      method: 'POST',
      body: jsonBody({ email }),
    });
    return response.message;
  },

  async resetPassword(email: string, token: string, password: string, passwordConfirmation: string): Promise<string> {
    const response = await request<{ message: string }>('/api/password/reset', {
      method: 'POST',
      body: jsonBody({
        email,
        token,
        password,
        password_confirmation: passwordConfirmation,
      }),
    });
    return response.message;
  },

  async adminUsers(search: string, page = 1): Promise<ApiPage<AdminUser>> {
    const params = new URLSearchParams({ page: String(page), per_page: '50' });
    if (search.trim()) params.set('search', search.trim());
    return request<ApiPage<AdminUser>>(`/api/admin/users?${params.toString()}`);
  },

  async setAdminUserActive(id: number, isActive: boolean): Promise<AdminUser> {
    const response = await request<{ data: AdminUser }>(`/api/admin/users/${id}/status`, {
      method: 'PATCH',
      body: jsonBody({ is_active: isActive }),
    });
    return response.data;
  },

  async createCategory(name: string, description: string) {
    const response = await request<{ data: DecisionData['categories'][number] }>('/api/categories', {
      method: 'POST',
      body: jsonBody({ name, description }),
    });
    return response.data;
  },

  async updateCategory(id: string, name: string, description: string) {
    const response = await request<{ data: DecisionData['categories'][number] }>(`/api/categories/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: jsonBody({ name, description }),
    });
    return response.data;
  },

  async deleteCategory(id: string): Promise<void> {
    await request(`/api/categories/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  async createOption(categoryId: string, name: string, description: string) {
    const response = await request<{ data: DecisionOption }>(`/api/categories/${encodeURIComponent(categoryId)}/options`, {
      method: 'POST',
      body: jsonBody({ name, description }),
    });
    return response.data;
  },

  async updateOption(id: string, categoryId: string, name: string, description: string) {
    const response = await request<{ data: DecisionOption }>(`/api/options/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: jsonBody({ category_id: categoryId, name, description }),
    });
    return response.data;
  },

  async deleteOption(id: string): Promise<void> {
    await request(`/api/options/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  async setOptionFlag(id: string, flag: 'isFavorite' | 'isExcluded', value: boolean): Promise<DecisionOption> {
    const field = flag === 'isFavorite' ? 'is_favorite' : 'is_excluded';
    if (flag === 'isFavorite') {
      const response = await request<{ data: DecisionOption }>(
        `/api/favorites/${encodeURIComponent(id)}`,
        { method: value ? 'POST' : 'DELETE' },
      );
      return response.data;
    }

    const response = await request<{ data: DecisionOption }>(`/api/options/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: jsonBody({ [field]: value }),
    });
    return response.data;
  },

  async randomDecision(categoryId: string | null, favoritesOnly = false): Promise<RandomDecision> {
    const response = await request<{ data: RandomDecision }>('/api/decisions/random', {
      method: 'POST',
      body: jsonBody({ category_id: categoryId, favorites_only: favoritesOnly }),
    });
    return response.data;
  },

  async replaceDecision(id: string, optionId: string, favoritesOnly: boolean): Promise<RandomDecision & { replacedHistory: DecisionHistory }> {
    const response = await request<{ data: RandomDecision & { replacedHistory: DecisionHistory } }>(
      `/api/decisions/history/${encodeURIComponent(id)}/replace`,
      {
        method: 'POST',
        body: jsonBody({ option_id: optionId, favorites_only: favoritesOnly }),
      },
    );
    return response.data;
  },

  async updateHistoryStatus(id: string, status: DecisionStatus): Promise<DecisionHistory> {
    const response = await request<{ data: DecisionHistory }>(`/api/decisions/history/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: jsonBody({ status }),
    });
    return response.data;
  },

  async explainDecision(id: string, situation: string): Promise<DecisionHistory> {
    const response = await request<{ data: DecisionHistory }>(`/api/decisions/history/${encodeURIComponent(id)}/reason`, {
      method: 'POST',
      body: jsonBody({ situation }),
    });
    return response.data;
  },

  async historyPage(page: number): Promise<ApiPage<DecisionHistory>> {
    return request<ApiPage<DecisionHistory>>(`/api/decisions/history?per_page=100&page=${page}`);
  },

  async deleteHistory(id: string): Promise<void> {
    await request(`/api/decisions/history/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  async clearHistory(): Promise<void> {
    await request('/api/decisions/history', { method: 'DELETE' });
  },
};

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 419) return 'Your session expired. Refresh the page and sign in again.';
    if (error.status === 429) return 'Too many requests. Please wait a moment and try again.';
    if (error.status >= 500) return 'We’re having trouble reaching your decision space. Please try again.';
    const firstFieldError = Object.values(error.fields).flat()[0];
    return firstFieldError ?? error.message;
  }
  if (error instanceof TypeError) return 'Could not reach the server. Check your connection and try again.';
  return error instanceof Error ? error.message : 'Something unexpected happened.';
}
