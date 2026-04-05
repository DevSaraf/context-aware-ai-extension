/**
 * KRAB Side Panel JavaScript
 * Handles search, context detection, and AI answers
 */

const API_URL = "https://krabai.tech";

// State
let currentContext = {
  app: null,
  url: null,
  title: null,
  selectedText: null
};

let isAuthenticated = false;

// DOM Elements
const mainContent = document.getElementById('mainContent');
const authRequired = document.getElementById('authRequired');
const searchInput = document.getElementById('searchInput');
const contextAppName = document.getElementById('contextAppName');
const contextPageTitle = document.getElementById('contextPageTitle');
const resultsContainer = document.getElementById('resultsContainer');
const emptyState = document.getElementById('emptyState');
const loadingState = document.getElementById('loadingState');
const aiAnswer = document.getElementById('aiAnswer');
const aiAnswerText = document.getElementById('aiAnswerText');
const resultsList = document.getElementById('resultsList');

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
  await checkAuth();
  if (isAuthenticated) {
    await detectContext();
    setupEventListeners();
  }
}

// Auth
async function checkAuth() {
  try {
    const data = await chrome.storage.local.get(['token', 'email']);
    isAuthenticated = !!data.token;
    
    if (isAuthenticated) {
      mainContent.classList.remove('hidden');
      authRequired.classList.add('hidden');
    } else {
      mainContent.classList.add('hidden');
      authRequired.classList.remove('hidden');
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    isAuthenticated = false;
  }
}

// Context Detection
async function detectContext() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    currentContext.url = tab.url;
    currentContext.title = tab.title;
    currentContext.app = detectApp(tab.url);

    contextAppName.textContent = currentContext.app || 'Unknown';
    contextPageTitle.textContent = currentContext.title || tab.url;
  } catch (error) {
    console.error('Context detection failed:', error);
  }
}

function detectApp(url) {
  const appPatterns = {
    'Gmail': /mail\.google\.com/,
    'GitHub': /github\.com/,
    'Slack': /slack\.com/,
    'Jira': /atlassian\.net.*jira|jira\.com/,
    'Confluence': /atlassian\.net.*wiki|confluence/,
    'Notion': /notion\.so/,
    'Salesforce': /salesforce\.com|lightning\.force\.com/,
    'Zendesk': /zendesk\.com/,
    'HubSpot': /hubspot\.com/,
    'Linear': /linear\.app/,
    'ChatGPT': /chat\.openai\.com|chatgpt\.com/,
    'Claude': /claude\.ai/,
    'Gemini': /gemini\.google\.com/,
    'Google Drive': /drive\.google\.com/,
    'Google Docs': /docs\.google\.com/,
    'Figma': /figma\.com/,
    'Trello': /trello\.com/,
    'Asana': /asana\.com/,
    'Monday': /monday\.com/,
    'ClickUp': /clickup\.com/,
    'Intercom': /intercom\.com/,
    'Freshdesk': /freshdesk\.com/
  };

  for (const [app, pattern] of Object.entries(appPatterns)) {
    if (pattern.test(url)) {
      return app;
    }
  }

  try {
    const hostname = new URL(url).hostname;
    return hostname.replace('www.', '').split('.')[0];
  } catch {
    return 'Web';
  }
}

// Event Listeners
function setupEventListeners() {
  // Search
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      performSearch(searchInput.value.trim());
    }
  });

  // Quick Actions
  document.querySelectorAll('.quick-action').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      handleQuickAction(action);
    });
  });

  // Sign In
  document.getElementById('signInBtn')?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage?.() || chrome.tabs.create({ url: 'popup.html' });
  });

  // Copy Answer
  document.getElementById('copyAnswerBtn')?.addEventListener('click', () => {
    navigator.clipboard.writeText(aiAnswerText.textContent);
    showToast('Copied to clipboard');
  });

  // Insert Answer
  document.getElementById('insertAnswerBtn')?.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, {
      type: 'INSERT_TEXT',
      text: aiAnswerText.textContent
    });
    showToast('Inserted into page');
  });

  // Feedback
  document.getElementById('feedbackBtn')?.addEventListener('click', () => {
    submitFeedback('helpful');
    showToast('Thanks for your feedback!');
  });

  // Refresh
  document.getElementById('refreshBtn')?.addEventListener('click', () => {
    detectContext();
  });

  // Settings
  document.getElementById('settingsBtn')?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'popup.html' });
  });

  // Listen for context from content script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'CONTEXT_UPDATE') {
      currentContext.selectedText = message.selectedText;
      if (message.selectedText) {
        searchInput.value = message.selectedText;
      }
    }
  });
}

// Search
async function performSearch(query) {
  if (!query) return;

  showLoading();

  try {
    const data = await chrome.storage.local.get(['token']);
    
    const response = await fetch(`${API_URL}/context`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${data.token}`
      },
      body: JSON.stringify({
        prompt: query,
        context: {
          app: currentContext.app,
          url: currentContext.url,
          title: currentContext.title
        }
      })
    });

    if (response.status === 401) {
      isAuthenticated = false;
      checkAuth();
      return;
    }

    const result = await response.json();
    displayResults(result, query);

  } catch (error) {
    console.error('Search failed:', error);
    showError('Search failed. Please try again.');
  }
}

function displayResults(result, query) {
  hideLoading();
  emptyState.classList.add('hidden');

  // AI Answer
  if (result.answer || result.response) {
    aiAnswer.classList.remove('hidden');
    aiAnswerText.textContent = result.answer || result.response;
  } else {
    aiAnswer.classList.add('hidden');
  }

  // Source Results
  const sources = result.sources || result.chunks || [];
  if (sources.length > 0) {
    resultsList.innerHTML = `
      <div class="results-header">
        <span class="results-title">Sources</span>
        <span class="results-count">${sources.length} results</span>
      </div>
      ${sources.map(source => createResultCard(source, query)).join('')}
    `;
  } else {
    resultsList.innerHTML = '';
  }
}

function createResultCard(source, query) {
  const title = source.title || source.source_title || 'Untitled';
  const text = source.text || source.content || '';
  const sourceApp = source.source_app || source.source_type || 'Document';
  const similarity = source.similarity ? Math.round(source.similarity * 100) : null;

  // Highlight query terms
  let snippet = text.substring(0, 200);
  if (query) {
    const terms = query.toLowerCase().split(' ');
    terms.forEach(term => {
      if (term.length > 2) {
        const regex = new RegExp(`(${term})`, 'gi');
        snippet = snippet.replace(regex, '<mark>$1</mark>');
      }
    });
  }

  return `
    <div class="result-card" data-url="${source.source_url || ''}" onclick="openSource(this)">
      <div class="result-source">
        <span>${sourceApp}</span>
        ${similarity ? `<span>• ${similarity}% match</span>` : ''}
      </div>
      <div class="result-title">${escapeHtml(title)}</div>
      <div class="result-snippet">${snippet}...</div>
    </div>
  `;
}

// Quick Actions
async function handleQuickAction(action) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  switch (action) {
    case 'summarize':
      searchInput.value = `Summarize this page: ${currentContext.title}`;
      performSearch(searchInput.value);
      break;
    case 'related':
      searchInput.value = `Find related documents to: ${currentContext.title}`;
      performSearch(searchInput.value);
      break;
    case 'ticket':
      chrome.tabs.create({ url: `${API_URL.replace('/api', '')}/dashboard.html#tickets` });
      break;
  }
}

// Feedback
async function submitFeedback(type) {
  try {
    const data = await chrome.storage.local.get(['token']);
    await fetch(`${API_URL}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${data.token}`
      },
      body: JSON.stringify({
        feedback_type: type,
        query: searchInput.value,
        context: currentContext
      })
    });
  } catch (error) {
    console.error('Feedback failed:', error);
  }
}

// UI Helpers
function showLoading() {
  emptyState.classList.add('hidden');
  loadingState.classList.remove('hidden');
  aiAnswer.classList.add('hidden');
  resultsList.innerHTML = '';
}

function hideLoading() {
  loadingState.classList.add('hidden');
}

function showError(message) {
  hideLoading();
  resultsList.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-title" style="color: var(--error)">Error</div>
      <div class="empty-state-text">${message}</div>
    </div>
  `;
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--bg-tertiary);
    color: var(--text);
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 13px;
    z-index: 1000;
    animation: fadeIn 0.2s;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Global function for result card clicks
window.openSource = function(element) {
  const url = element.dataset.url;
  if (url) {
    chrome.tabs.create({ url });
  }
};
