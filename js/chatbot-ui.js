// js/chatbot-ui.js

let chatHistory = [
  { role: 'system', content: 'You are an expert French teacher and assistant. The user is exploring a dataset of French CEFR concepts (A1 to B2). Answer their questions helpfully and concisely. If they ask about a specific concept they are looking at, explain it to them.' }
];

let currentContextName = null;

function toggleChat() {
  const panel = document.getElementById('chatbotPanel');
  panel.classList.toggle('open');
}

function toggleMaximizeChat() {
  const panel = document.getElementById('chatbotPanel');
  panel.classList.toggle('maximized');
}

function clearChatSession() {
  if(!confirm("Are you sure you want to clear the chat history?")) return;
  chatHistory = [
    { role: 'system', content: 'You are an expert French teacher and assistant. The user is exploring a dataset of French CEFR concepts (A1 to B2). Answer their questions helpfully and concisely. If they ask about a specific concept they are looking at, explain it to them.' }
  ];
  document.getElementById('chatMessages').innerHTML = '<div class="chat-bubble assistant">Bonjour! I am your CEFR French Tutor. How can I help you today?</div>';
  if (currentContextName) {
      window.clearChatContext(); // Also clear the context just in case
  }
}

function downloadChat() {
  const messagesText = chatHistory
      .filter(m => m.role !== 'system')
      .map(m => `[${m.role.toUpperCase()}]\n${m.content}\n`)
      .join('\n----------------------------------------\n\n');
  if(!messagesText.trim()) { alert('No chat history to download.'); return; }
  
  const blob = new Blob([messagesText], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'cefr-tutor-chat.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function openChatSettings() {
  const modal = document.getElementById('chatSettingsModal');
  const keyInput = document.getElementById('openRouterKeyInput');
  const modelSelect = document.getElementById('openRouterModelSelect');
  keyInput.value = getOpenRouterKey();
  
  // Set the current model in the dropdown if it exists
  const currentModel = getOpenRouterModel();
  if (!Array.from(modelSelect.options).some(o => o.value === currentModel)) {
      const opt = document.createElement('option');
      opt.value = currentModel;
      opt.innerText = currentModel;
      modelSelect.appendChild(opt);
  }
  modelSelect.value = currentModel;
  
  document.getElementById('balanceDisplay').style.display = 'none';
  modal.classList.add('open');
}

function closeChatSettings() {
  document.getElementById('chatSettingsModal').classList.remove('open');
}

function saveChatSettings() {
  const keyInput = document.getElementById('openRouterKeyInput');
  const modelSelect = document.getElementById('openRouterModelSelect');
  saveOpenRouterKey(keyInput.value);
  saveOpenRouterModel(modelSelect.value);
  closeChatSettings();
}

async function refreshModelsList() {
  const btn = event.target;
  const originalText = btn.innerText;
  btn.innerText = 'Loading...';
  btn.disabled = true;
  try {
      const models = await fetchOpenRouterModelsAPI();
      const select = document.getElementById('openRouterModelSelect');
      const currentModel = select.value;
      select.innerHTML = '';
      models.forEach(m => {
          const opt = document.createElement('option');
          opt.value = m.id;
          opt.innerText = m.id + (m.pricing ? ` ($${m.pricing.prompt} / $${m.pricing.completion})` : '');
          select.appendChild(opt);
      });
      // Try to reselect the previously selected model
      if (Array.from(select.options).some(o => o.value === currentModel)) {
          select.value = currentModel;
      }
  } catch (e) {
      alert("Could not fetch models: " + e.message);
  } finally {
      btn.innerText = originalText;
      btn.disabled = false;
  }
}

async function checkBalance() {
  const btn = event.target;
  const disp = document.getElementById('balanceDisplay');
  const originalText = btn.innerText;
  btn.innerText = 'Checking...';
  btn.disabled = true;
  disp.style.display = 'none';
  
  try {
      const data = await checkOpenRouterBalanceAPI();
      disp.innerHTML = `
        <strong>Limit:</strong> ${data.limit !== null ? '$'+data.limit : 'Unlimited'}<br>
        <strong>Usage:</strong> $${data.usage}<br>
        <strong>Is Free Tier:</strong> ${data.is_free_tier ? 'Yes' : 'No'}
      `;
      disp.style.display = 'block';
  } catch (e) {
      disp.innerHTML = `<span style="color:var(--error);">Error: ${e.message}</span>`;
      disp.style.display = 'block';
  } finally {
      btn.innerText = originalText;
      btn.disabled = false;
  }
}

// Called from app.js when a node is clicked
// Called from app.js when a node is clicked
window.setChatContext = function(conceptName, chapterStr, levelArr, rawJSON) {
  currentContextName = conceptName;
  const banner = document.getElementById('chatContextBanner');
  banner.style.display = 'flex';
  banner.style.alignItems = 'center';
  banner.innerHTML = `
    <div style="flex:1;">Context: Looking at <strong>${conceptName}</strong></div>
    <button onclick="clearChatContext()" style="background:transparent; border:none; cursor:pointer; color:inherit; font-size:16px; line-height:1; padding:0 4px; border-radius:50%;" title="Clear Context">×</button>
  `;
  
  // Update system prompt subtly with the new context
  let sysMsg = chatHistory.find(m => m.role === 'system');
  sysMsg.content = `You are an expert French teacher. The user is exploring a dataset of French CEFR concepts. 
Currently, they are looking at the concept "${conceptName}" (Chapter: ${chapterStr}, Levels: ${levelArr ? levelArr.join(', ') : 'N/A'}). 

CRITICAL RULES FOR YOU:
1. You MUST ONLY answer using the provided JSON data below.
2. DO NOT hallucinate or use any outside knowledge that is not explicitly inside the JSON data.
3. If the user asks for something that is not in the JSON data below, you must reply: "I cannot answer this as the information is not present in the selected concept's data."

RAW JSON DATA FOR SELECTED CONCEPT:
${rawJSON || 'No detailed JSON data provided.'}
`;
}

window.clearChatContext = function() {
  currentContextName = null;
  const banner = document.getElementById('chatContextBanner');
  banner.style.display = 'none';
  banner.innerHTML = '';
  
  // Reset system prompt to default
  let sysMsg = chatHistory.find(m => m.role === 'system');
  sysMsg.content = 'You are an expert French teacher and assistant. The user is exploring a dataset of French CEFR concepts (A1 to B2). Answer their questions helpfully and concisely. If they ask about a specific concept they are looking at, explain it to them.';
}

function renderMessage(role, text) {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = `chat-bubble ${role}`;
  
  // Basic markdown to HTML (just for bolding and line breaks for now)
  let htmlText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  htmlText = htmlText.replace(/\n/g, '<br>');
  
  div.innerHTML = htmlText;
  container.appendChild(div);
  
  // Scroll to bottom
  container.scrollTop = container.scrollHeight;
}

async function handleChatSend() {
  const input = document.getElementById('chatInput');
  const btn = document.getElementById('chatSendBtn');
  const text = input.value.trim();
  
  if (!text) return;
  if (!getOpenRouterKey()) {
    openChatSettings();
    return;
  }
  
  // Add user msg
  renderMessage('user', text);
  chatHistory.push({ role: 'user', content: text });
  
  input.value = '';
  btn.disabled = true;
  
  // Loading bubble
  const container = document.getElementById('chatMessages');
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'chat-bubble assistant loading';
  loadingDiv.innerHTML = '<span style="font-size:12px; opacity:0.7">Typing...</span>';
  container.appendChild(loadingDiv);
  container.scrollTop = container.scrollHeight;
  
  try {
    const aiResponse = await callOpenRouter(chatHistory);
    // Remove loading
    container.removeChild(loadingDiv);
    
    renderMessage('assistant', aiResponse);
    chatHistory.push({ role: 'assistant', content: aiResponse });
  } catch (error) {
    container.removeChild(loadingDiv);
    renderMessage('assistant', `⚠️ Error: ${error.message}`);
  } finally {
    btn.disabled = false;
  }
}

// Input key event setup
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('chatInput');
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleChatSend();
      }
    });
  }
});
