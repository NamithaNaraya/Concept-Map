// js/chatbot-ui.js

let chatHistory = [
  { role: 'system', content: 'You are an expert French teacher and assistant. The user is exploring a dataset of French CEFR concepts (A1 to B2). Answer their questions helpfully and concisely. If they ask about a specific concept they are looking at, explain it to them.' }
];

let currentContextName = null;

function toggleChat() {
  const panel = document.getElementById('chatbotPanel');
  panel.classList.toggle('open');
}

function openChatSettings() {
  const modal = document.getElementById('chatSettingsModal');
  const input = document.getElementById('openRouterKeyInput');
  input.value = getOpenRouterKey();
  modal.classList.add('open');
}

function closeChatSettings() {
  document.getElementById('chatSettingsModal').classList.remove('open');
}

function saveChatSettings() {
  const input = document.getElementById('openRouterKeyInput');
  saveOpenRouterKey(input.value);
  closeChatSettings();
}

// Called from app.js when a node is clicked
window.setChatContext = function(conceptName, chapterStr, levelArr) {
  currentContextName = conceptName;
  const banner = document.getElementById('chatContextBanner');
  banner.style.display = 'block';
  banner.innerHTML = `Context: Looking at <strong>${conceptName}</strong>`;
  
  // Update system prompt subtly with the new context
  let sysMsg = chatHistory.find(m => m.role === 'system');
  sysMsg.content = `You are an expert French teacher. The user is exploring a dataset of French CEFR concepts. Currently, they are looking at the concept "${conceptName}" (Chapter: ${chapterStr}, Levels: ${levelArr ? levelArr.join(', ') : 'N/A'}). Use this context to answer their questions. Keep it concise.`;
  
  // Optionally auto-open the chat panel when clicking a node, disabled for now so it's less intrusive
  // const panel = document.getElementById('chatbotPanel');
  // if (!panel.classList.contains('open')) { toggleChat(); }
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
