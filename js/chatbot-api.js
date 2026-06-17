// js/chatbot-api.js

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

function getOpenRouterKey() {
  return localStorage.getItem('openRouterKey') || '';
}

function saveOpenRouterKey(key) {
  localStorage.setItem('openRouterKey', key.trim());
}

function getOpenRouterModel() {
  return localStorage.getItem('openRouterModel') || 'openai/gpt-4o-mini';
}

function saveOpenRouterModel(model) {
  localStorage.setItem('openRouterModel', model.trim());
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
      model: getOpenRouterModel(),
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

async function fetchOpenRouterModelsAPI() {
  const response = await fetch("https://openrouter.ai/api/v1/models");
  if (!response.ok) throw new Error("Failed to fetch models");
  const data = await response.json();
  return data.data; // array of models
}

async function checkOpenRouterBalanceAPI() {
  const key = getOpenRouterKey();
  if (!key) throw new Error('Missing API Key');

  const response = await fetch("https://openrouter.ai/api/v1/auth/key", {
    headers: { 'Authorization': `Bearer ${key}` }
  });
  if (!response.ok) throw new Error("Failed to check balance");
  const data = await response.json();
  return data.data;
}
