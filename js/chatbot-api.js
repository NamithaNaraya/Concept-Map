// js/chatbot-api.js

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

function getOpenRouterKey() {
  return localStorage.getItem('openRouterKey') || '';
}

function saveOpenRouterKey(key) {
  localStorage.setItem('openRouterKey', key.trim());
}

async function callOpenRouter(messages) {
  const key = getOpenRouterKey();
  if (!key) {
    throw new Error('Missing OpenRouter API Key');
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'HTTP-Referer': window.location.href, // Recommended for OpenRouter
      'X-Title': 'French CEFR Concept Explorer', // Recommended for OpenRouter
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini', // Default fast model
      messages: messages
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API Error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
