import { searchContext } from '../shared/api'
import { getToken } from '../shared/storage'
import type { Message, SearchContextResponse, CheckAuthResponse } from '../shared/types'

chrome.runtime.onMessage.addListener(
  (message: Message, _sender, sendResponse: (response: unknown) => void) => {
    if (message.type === 'SEARCH_CONTEXT') {
      handleContextSearch(message.prompt, sendResponse)
      return true // Keep channel open for async response
    }

    if (message.type === 'CHECK_AUTH') {
      handleCheckAuth(sendResponse)
      return true
    }

    return false
  }
)

async function handleContextSearch(
  prompt: string,
  sendResponse: (response: SearchContextResponse) => void
) {
  try {
    const token = await getToken()

    if (!token) {
      sendResponse({
        success: false,
        error: 'Not authenticated. Please login via the extension popup.',
      })
      return
    }

    const result = await searchContext(prompt, token)
    sendResponse({ success: true, data: result })
  } catch (error) {
    console.error('Backend error:', error)
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

async function handleCheckAuth(sendResponse: (response: CheckAuthResponse) => void) {
  try {
    const data = await chrome.storage.local.get(['token', 'email', 'company_id'])
    sendResponse({
      authenticated: !!data.token,
      email: data.email || null,
      company_id: data.company_id || null,
    })
  } catch {
    sendResponse({
      authenticated: false,
      email: null,
      company_id: null,
    })
  }
}
