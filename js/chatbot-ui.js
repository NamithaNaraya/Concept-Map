// js/chatbot-ui.js

let chatHistory = [
  { role: 'system', content: 'IMPORTANT: Always respond in the same language that the user asks the question in. If the user asks in English, you must reply in English. If they ask in French, reply in French. You are an expert French teacher and assistant. The user is exploring a dataset of French CEFR concepts (A1 to B2). Answer their questions helpfully and concisely. If they ask about a specific concept they are looking at, explain it to them.' }
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
    { role: 'system', content: 'IMPORTANT: Always respond in the same language that the user asks the question in. If the user asks in English, you must reply in English. If they ask in French, reply in French. You are an expert French teacher and assistant. The user is exploring a dataset of French CEFR concepts (A1 to B2). Answer their questions helpfully and concisely. If they ask about a specific concept they are looking at, explain it to them.' }
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

// State for custom searchable dropdown
let selectedModelValue = 'openai/gpt-4o-mini';

function toggleCustomDropdown(e) {
  if (e) e.stopPropagation();
  const dropdown = document.getElementById('customDropdown');
  dropdown.classList.toggle('open');
  if (dropdown.classList.contains('open')) {
    const input = document.getElementById('modelSearchInput');
    input.value = '';
    filterCustomModels();
    setTimeout(() => input.focus(), 50);
  }
}

function closeCustomDropdown() {
  const dropdown = document.getElementById('customDropdown');
  if (dropdown) dropdown.classList.remove('open');
}

function selectCustomModel(value, innerHTML) {
  selectedModelValue = value;
  document.getElementById('customSelectLabel').innerHTML = innerHTML;
  
  // Update selected class in options
  const options = document.querySelectorAll('.custom-option');
  options.forEach(opt => {
    if (opt.getAttribute('data-value') === value) {
      opt.classList.add('selected');
    } else {
      opt.classList.remove('selected');
    }
  });
  
  closeCustomDropdown();
}

function filterCustomModels() {
  const input = document.getElementById('modelSearchInput').value.toLowerCase();
  const options = document.querySelectorAll('.custom-option');
  
  options.forEach(opt => {
    const text = opt.innerText.toLowerCase();
    if (text.includes(input)) {
      opt.style.display = 'flex'; // Changed to flex since options use flex layout
    } else {
      opt.style.display = 'none';
    }
  });
}

// Close custom dropdown when clicking outside
window.addEventListener('click', (e) => {
  const container = document.getElementById('customModelSelectContainer');
  if (container && !container.contains(e.target)) {
    closeCustomDropdown();
  }
});

function openChatSettings() {
  const modal = document.getElementById('chatSettingsModal');
  const keyInput = document.getElementById('openRouterKeyInput');
  keyInput.value = getOpenRouterKey();
  
  // Set the current model
  const currentModel = getOpenRouterModel() || 'openai/gpt-4o-mini';
  selectedModelValue = currentModel;
  
  // Find if it exists in the list, otherwise add it
  const optionsContainer = document.getElementById('customOptions');
  let found = false;
  const options = optionsContainer.querySelectorAll('.custom-option');
  options.forEach(opt => {
    if (opt.getAttribute('data-value') === currentModel) {
      opt.classList.add('selected');
      document.getElementById('customSelectLabel').innerHTML = opt.innerHTML;
      found = true;
    } else {
      opt.classList.remove('selected');
    }
  });
  
  if (!found) {
    // Dynamically append current model if not in the default options list
    const optDiv = document.createElement('div');
    optDiv.className = 'custom-option selected';
    optDiv.setAttribute('data-value', currentModel);
    optDiv.innerHTML = `<span class="model-name">${currentModel}</span>`;
    optDiv.onclick = function() { selectCustomModel(currentModel, this.innerHTML); };
    optionsContainer.appendChild(optDiv);
    document.getElementById('customSelectLabel').innerHTML = `<span class="model-name">${currentModel}</span>`;
  }
  
  document.getElementById('balanceDisplay').style.display = 'none';
  modal.classList.add('open');
}

function closeChatSettings() {
  document.getElementById('chatSettingsModal').classList.remove('open');
}

function saveChatSettings() {
  const keyInput = document.getElementById('openRouterKeyInput');
  saveOpenRouterKey(keyInput.value);
  saveOpenRouterModel(selectedModelValue);
  closeChatSettings();
}

async function refreshModelsList() {
  const btn = event.target;
  const originalText = btn.innerText;
  btn.innerText = 'Loading...';
  btn.disabled = true;
  try {
      const models = await fetchOpenRouterModelsAPI();
      const optionsContainer = document.getElementById('customOptions');
      optionsContainer.innerHTML = '';
      
      models.forEach(m => {
          let isFree = false;
          if (m.id.endsWith(':free') || m.id === 'openrouter/free') isFree = true;
          if (m.pricing && parseFloat(m.pricing.prompt) === 0 && parseFloat(m.pricing.completion) === 0) isFree = true;
          
          let innerHTML = `<span class="model-name">${m.id}</span>`;
          if (isFree) {
              innerHTML += ` <span class="free-badge">FREE</span>`;
          }
          
          const optDiv = document.createElement('div');
          optDiv.className = 'custom-option';
          if (m.id === selectedModelValue) {
              optDiv.className += ' selected';
              document.getElementById('customSelectLabel').innerHTML = innerHTML;
          }
          optDiv.setAttribute('data-value', m.id);
          optDiv.innerHTML = innerHTML;
          optDiv.onclick = function() { selectCustomModel(m.id, this.innerHTML); };
          optionsContainer.appendChild(optDiv);
      });
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
1. Always respond in the same language that the user asks the question in (e.g., if they ask in English, answer in English; if they ask in French, answer in French).
2. You MUST ONLY answer using the provided JSON data below.
3. DO NOT hallucinate or use any outside knowledge that is not explicitly inside the JSON data.
4. If the user asks for something that is not in the JSON data below, you must reply: "I cannot answer this as the information is not present in the selected concept's data."

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
  sysMsg.content = 'IMPORTANT: Always respond in the same language that the user asks the question in. If the user asks in English, you must reply in English. If they ask in French, reply in French. You are an expert French teacher and assistant. The user is exploring a dataset of French CEFR concepts (A1 to B2). Answer their questions helpfully and concisely. If they ask about a specific concept they are looking at, explain it to them.';
}

function renderMessage(role, text) {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = `chat-bubble ${role}`;
  
  if (window.marked) {
    div.innerHTML = marked.parse(text);
  } else {
    // Fallback: Basic markdown to HTML (just for bolding and line breaks)
    let htmlText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    htmlText = htmlText.replace(/\n/g, '<br>');
    div.innerHTML = htmlText;
  }
  
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
  
  // Create assistant bubble for streaming response
  const container = document.getElementById('chatMessages');
  const assistantBubble = document.createElement('div');
  assistantBubble.className = 'chat-bubble assistant';
  assistantBubble.innerHTML = '<span style="font-size:12px; opacity:0.7">Typing...</span>';
  container.appendChild(assistantBubble);
  container.scrollTop = container.scrollHeight;
  
  let fullResponse = "";
  
  try {
    const key = getOpenRouterKey();
    const model = getOpenRouterModel();
    
    // Construct messagesToSend with suffix instruction to guarantee response language
    const messagesToSend = chatHistory.map((msg, idx) => {
      if (idx === chatHistory.length - 1 && msg.role === 'user') {
        const lang = detectLanguage(msg.content);
        const suffix = lang === 'en'
          ? "\n\n(IMPORTANT: Respond entirely in English. Do not write any French explanations unless requested.)"
          : "\n\n(IMPORTANT: Réponds en français. Ne réponds pas en anglais.)";
        return { role: msg.role, content: msg.content + suffix };
      }
      return msg;
    });

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'HTTP-Referer': window.location.href,
        'X-Title': 'French CEFR Concept Explorer',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: messagesToSend,
        stream: true
      })
    });
    
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`API Error: ${response.status} - ${err}`);
    }
    
    // Clear typing text
    assistantBubble.innerHTML = "";
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop(); // keep partial line in buffer
      
      for (const line of lines) {
        const cleanLine = line.trim();
        if (!cleanLine) continue;
        if (cleanLine === "data: [DONE]") continue;
        if (cleanLine.startsWith("data: ")) {
          try {
            const json = JSON.parse(cleanLine.substring(6));
            const content = json.choices[0]?.delta?.content || "";
            if (content) {
              fullResponse += content;
              if (window.marked) {
                assistantBubble.innerHTML = marked.parse(fullResponse);
              } else {
                let htmlText = fullResponse.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                htmlText = htmlText.replace(/\n/g, '<br>');
                assistantBubble.innerHTML = htmlText;
              }
              container.scrollTop = container.scrollHeight;
            }
          } catch (err) {
            console.error("Error parsing stream line:", err);
          }
        }
      }
    }
    
    // Parse remainder in buffer
    if (buffer && buffer.trim().startsWith("data: ")) {
      const cleanLine = buffer.trim();
      if (cleanLine !== "data: [DONE]") {
        try {
          const json = JSON.parse(cleanLine.substring(6));
          const content = json.choices[0]?.delta?.content || "";
          if (content) {
            fullResponse += content;
            if (window.marked) {
              assistantBubble.innerHTML = marked.parse(fullResponse);
            } else {
              let htmlText = fullResponse.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
              htmlText = htmlText.replace(/\n/g, '<br>');
              assistantBubble.innerHTML = htmlText;
            }
          }
        } catch (e) {}
      }
    }
    
    chatHistory.push({ role: 'assistant', content: fullResponse });
  } catch (error) {
    if (assistantBubble.innerHTML === "" || assistantBubble.innerHTML.includes("Typing...")) {
      assistantBubble.innerHTML = `⚠️ Error: ${error.message}`;
    } else {
      const errorDiv = document.createElement('div');
      errorDiv.style.color = 'var(--bad)';
      errorDiv.style.marginTop = '8px';
      errorDiv.style.fontSize = '12.5px';
      errorDiv.innerHTML = `⚠️ Stream Interrupted: ${error.message}`;
      assistantBubble.appendChild(errorDiv);
    }
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

function detectLanguage(text) {
  const clean = text.toLowerCase();
  
  // English common words/pronouns
  const englishCount = (clean.match(/\b(the|be|to|of|and|a|in|that|have|i|it|for|not|on|with|he|as|you|do|at|this|but|his|by|from|they|we|say|her|she|or|an|will|my|one|all|would|there|their|what|so|up|out|if|about|who|get|which|go|me|when|make|can|like|time|no|just|him|know|take|people|into|year|your|good|some|could|them|see|other|than|then|now|look|only|come|its|over|think|also|back|after|use|two|how|our|work|first|well|way|even|new|want|because|any|these|give|day|most|us)\b/g) || []).length;
  
  // French common words/pronouns
  const frenchCount = (clean.match(/\b(le|la|les|de|des|un|une|et|en|que|est|dans|pour|qui|ce|il|elle|nous|vous|ils|elles|je|tu|on|mon|ma|mes|ton|ta|tes|son|sa|ses|notre|votre|leur|leurs|mais|ou|et|donc|or|ni|car|avec|sans|sur|sous|dans|par|pour|quand|comme|si|plus|moins|très|bien|trop|assez|tout|tous|toute|toutes|fait|faire|dire|aller|voir|savoir|pouvoir|vouloir|devoir|falloir|ceux|celles|celui|celle|ceci|cela|ça|ici|là|non|oui|moi|toi|lui|eux)\b/g) || []).length;

  if (englishCount > frenchCount) return 'en';
  if (frenchCount > englishCount) return 'fr';
  
  // Fallback: search for English characters/questions
  const hasEnglishIndicator = /\b(what|how|why|where|who|are|is|does|did|can|explain|lexicon|dataset|concept|concepts|level)\b/i.test(clean);
  return hasEnglishIndicator ? 'en' : 'fr';
}
