import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import cssText from './styles.css?inline'

console.log('Context AI Extension Loaded')

function injectSidebar() {
  // Don't inject twice
  if (document.getElementById('context-ai-root')) return

  // Create container
  const container = document.createElement('div')
  container.id = 'context-ai-root'

  // Create shadow DOM for style isolation
  const shadowRoot = container.attachShadow({ mode: 'open' })

  // Inject Tailwind CSS into shadow DOM
  const style = document.createElement('style')
  style.textContent = cssText
  shadowRoot.appendChild(style)

  // Create React mount point
  const reactRoot = document.createElement('div')
  reactRoot.id = 'react-root'
  shadowRoot.appendChild(reactRoot)

  // Mount to page
  document.body.appendChild(container)

  // Shift ChatGPT main content
  const main = document.querySelector('main')
  if (main) {
    ;(main as HTMLElement).style.marginRight = '320px'
  }

  // Render React
  ReactDOM.createRoot(reactRoot).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

// Run on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectSidebar)
} else {
  injectSidebar()
}
