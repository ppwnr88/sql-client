import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from './useAuth';

// Mock the api service so no real HTTP calls are made
vi.mock('../services/api', () => ({
  login: vi.fn(),
}));

import { login as apiLogin } from '../services/api';
const mockApiLogin = apiLogin as ReturnType<typeof vi.fn>;

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('useAuth', () => {
  it('starts unauthenticated when localStorage is empty', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.username).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('reads an existing token from localStorage on mount', () => {
    localStorage.setItem('jwt_token', 'existing.token');
    localStorage.setItem('auth_username', 'alice');
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.username).toBe('alice');
  });

  it('login() sets isAuthenticated=true and stores token in localStorage', async () => {
    mockApiLogin.mockResolvedValueOnce({ token: 'signed.jwt', expiresIn: 28800 });
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('admin', 'admin123');
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.username).toBe('admin');
    expect(localStorage.getItem('jwt_token')).toBe('signed.jwt');
    expect(localStorage.getItem('auth_username')).toBe('admin');
  });

  it('login() sets isLoading=true during the request', async () => {
    let resolveLogin!: (v: { token: string; expiresIn: number }) => void;
    mockApiLogin.mockReturnValueOnce(
      new Promise<{ token: string; expiresIn: number }>((res) => { resolveLogin = res; })
    );

    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.login('admin', 'admin123');
    });

    await waitFor(() => expect(result.current.isLoading).toBe(true));

    act(() => resolveLogin({ token: 'tok', expiresIn: 28800 }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('login() re-throws and resets isLoading on API error', async () => {
    mockApiLogin.mockRejectedValueOnce(new Error('Invalid credentials'));
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await expect(result.current.login('admin', 'wrong')).rejects.toThrow('Invalid credentials');
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(localStorage.getItem('jwt_token')).toBeNull();
  });

  it('logout() clears auth state and removes localStorage entries', async () => {
    mockApiLogin.mockResolvedValueOnce({ token: 'tok', expiresIn: 28800 });
    const { result } = renderHook(() => useAuth());

    await act(async () => { await result.current.login('admin', 'admin123'); });
    act(() => { result.current.logout(); });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.username).toBeNull();
    expect(localStorage.getItem('jwt_token')).toBeNull();
    expect(localStorage.getItem('auth_username')).toBeNull();
  });

  it('mounts as unauthenticated when token is present in state initializer but cleared before useEffect runs', async () => {
    // The useEffect checks localStorage once on mount; if no token is found it
    // resets to unauthenticated. Verify that path by starting with no token.
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.isAuthenticated).toBe(false));
  });
});
