import type { AuthState } from './types'

export async function getAuthState(): Promise<AuthState> {
  const data = await chrome.storage.local.get(['token', 'email', 'company_id'])
  return {
    authenticated: !!data.token,
    token: data.token || null,
    email: data.email || null,
    company_id: data.company_id || null,
  }
}

export async function setAuthState(
  token: string,
  email: string,
  company_id: string
): Promise<void> {
  await chrome.storage.local.set({ token, email, company_id })
}

export async function clearAuthState(): Promise<void> {
  await chrome.storage.local.remove(['token', 'email', 'company_id'])
}

export async function getToken(): Promise<string | null> {
  const data = await chrome.storage.local.get(['token'])
  return data.token || null
}
