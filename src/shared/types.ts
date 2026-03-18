// API Response Types
export interface Source {
  text: string
  source_type: string
  source_id: number
  similarity: number
}

export interface ContextResponse {
  context: string
  sources: Source[]
}

export interface LoginResponse {
  access_token?: string
  token_type?: string
  email?: string
  company_id?: string
  error?: string
}

export interface RegisterResponse {
  message?: string
  api_key?: string
  error?: string
}

// Auth State
export interface AuthState {
  authenticated: boolean
  email: string | null
  company_id: string | null
  token: string | null
}

// Message Types
export type MessageType =
  | 'SEARCH_CONTEXT'
  | 'CHECK_AUTH'
  | 'AUTH_CHANGED'

export interface SearchContextMessage {
  type: 'SEARCH_CONTEXT'
  prompt: string
}

export interface CheckAuthMessage {
  type: 'CHECK_AUTH'
}

export interface AuthChangedMessage {
  type: 'AUTH_CHANGED'
}

export type Message = SearchContextMessage | CheckAuthMessage | AuthChangedMessage

export interface SearchContextResponse {
  success: boolean
  data?: ContextResponse
  error?: string
}

export interface CheckAuthResponse {
  authenticated: boolean
  email: string | null
  company_id: string | null
}
