import { useState, useEffect, useRef } from 'react'
import Sidebar from './components/Sidebar'
import type { Source, CheckAuthResponse, SearchContextResponse } from '../shared/types'

export default function App() {
  const [authenticated, setAuthenticated] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)

  const debounceTimer = useRef<number | null>(null)
  const listenerAttached = useRef(false)

  useEffect(() => {
    checkAuth()
    setupMessageListener()

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [])

  useEffect(() => {
    if (authenticated && !listenerAttached.current) {
      attachPromptListener()
    }
  }, [authenticated])

  function setupMessageListener() {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'AUTH_CHANGED') {
        checkAuth()
        setSources([])
      }
    })
  }

  function checkAuth() {
    chrome.runtime.sendMessage({ type: 'CHECK_AUTH' }, (response: CheckAuthResponse) => {
      setAuthenticated(response?.authenticated || false)
      setEmail(response?.email || null)
      setChecking(false)
    })
  }

  function attachPromptListener() {
    const textarea = document.querySelector('#prompt-textarea')
    if (!textarea) {
      // Retry if not found yet
      setTimeout(attachPromptListener, 500)
      return
    }

    console.log('Prompt box detected')
    listenerAttached.current = true

    textarea.addEventListener('input', () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }

      debounceTimer.current = window.setTimeout(() => {
        const prompt = (textarea as HTMLElement).innerText ||
                       (textarea as HTMLTextAreaElement).value || ''

        if (prompt.length >= 3) {
          searchContext(prompt)
        }
      }, 800)
    })
  }

  function searchContext(prompt: string) {
    setLoading(true)
    setError(null)

    chrome.runtime.sendMessage(
      { type: 'SEARCH_CONTEXT', prompt },
      (response: SearchContextResponse) => {
        setLoading(false)

        if (!response?.success) {
          setError(response?.error || 'Search failed')
          setSources([])
          return
        }

        setSources(response.data?.sources || [])
      }
    )
  }

  function injectContext() {
    if (sources.length === 0) return

    const textarea = document.querySelector('#prompt-textarea')
    if (!textarea) return

    const currentText = (textarea as HTMLElement).innerText ||
                        (textarea as HTMLTextAreaElement).value || ''

    let contextText = '[Company Context]\n'
    sources.forEach((source, index) => {
      contextText += `- ${source.source_type} #${source.source_id || index + 1}: ${source.text}\n`
    })
    contextText += '\n[Your Question]\n'

    const newText = contextText + currentText

    if ((textarea as HTMLTextAreaElement).value !== undefined) {
      ;(textarea as HTMLTextAreaElement).value = newText
    } else {
      ;(textarea as HTMLElement).innerText = newText
    }

    textarea.dispatchEvent(new Event('input', { bubbles: true }))
  }

  return (
    <Sidebar
      authenticated={authenticated}
      email={email}
      sources={sources}
      loading={loading}
      error={error}
      checking={checking}
      onInjectContext={injectContext}
    />
  )
}
