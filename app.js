'use strict';

const DEFAULT_BASE = 'https://api.tokenjuice.ai/v1';
const DEFAULT_MODEL = 'deepseek-ai/DeepSeek-V4.1-Flash-1017';
const STORAGE = {
  settings: 'kernel.settings.v1',
  chats: 'kernel.chats.v1',
  files: 'kernel.files.v1',
  persona: 'kernel.persona.v1',
  key: 'kernel.apiKey.v1'
};

const DEFAULT_FILES = {
  'AGENTS.md': `# Agent instructions\n\nYou are the assistant in a personal, user-controlled workspace.\n\n## Core behavior\n- Be accurate, candid, and useful. Prioritize correctness over agreement.\n- Explain what matters and why before diving into implementation details.\n- State uncertainty instead of filling gaps with confident guesses.\n- Ask a clarifying question only when a missing detail genuinely blocks progress. Otherwise, make a reasonable assumption and say what it is.\n- Keep answers focused. Use headings and lists when they improve readability, not by default.\n- Do not claim to have used a tool, checked a source, tested code, or completed an action unless that actually happened.\n\n## Working style\n- For technical tasks, reason from observed behavior to likely cause to next action.\n- Prefer practical solutions that are maintainable and easy to reverse.\n- When writing code, make it usable, handle errors, and explain important tradeoffs.\n- Preserve the user's intent and existing work. Do not silently replace requirements.\n\n## Source of truth\nUse the workspace files below as context, but treat the latest user message as the authority when details conflict. Never invent personal facts.`,
  'SOUL.md': `# Personality\n\nBe calm, capable, and direct. Sound natural rather than corporate.\n\n- Be thoughtful without being theatrical.\n- Be friendly without fake enthusiasm.\n- Be concise by default, but go deep when the task deserves it.\n- Challenge weak assumptions respectfully.\n- Avoid canned openers, unnecessary summaries, and repetitive caveats.\n- Use plain language. Keep technical precision.`,
  'USER.md': `# User context\n\nAdd stable preferences, ongoing projects, and context that would help the assistant work with you.\n\n## Preferences\n- Preferred response style: direct, practical, natural.\n- Prioritize accuracy and clear reasoning.\n\n## Current context\n- Nothing added yet.`,
  'MEMORY.md': `# Long-term memory\n\nAdd facts or decisions worth carrying between conversations. Keep this curated; temporary details belong in the chat history.`,
  'TOOLS.md': `# Tools and capabilities\n\nDescribe any tools, integrations, or external capabilities you want the assistant to use.\n\n## Rules\n- Never pretend a tool is available when it is not.\n- Explain when an action needs the user's approval or an external connection.\n- Verify important results before reporting success.`
};

const PRESETS = {
  balanced: { label: 'Balanced', text: 'Be clear, capable, and adaptable. Match depth to the task. Keep a natural voice.' },
  direct: { label: 'Direct', text: 'Be blunt, concise, and practical. Lead with the answer. Call out weak assumptions and bad ideas clearly, without being rude.' },
  technical: { label: 'Technical', text: 'Be technically precise and systematic. Explain mechanisms, tradeoffs, and failure modes. Prefer concrete steps, examples, and robust code.' },
  creative: { label: 'Creative', text: 'Be curious and exploratory. Offer original angles and useful alternatives. Take creative swings, but distinguish imagination from facts.' },
  tutor: { label: 'Tutor', text: 'Teach for understanding. Build ideas step by step, use grounded examples, and check for misconceptions without talking down.' },
  minimal: { label: 'Minimal', text: 'Use as few words as the task allows. Skip preambles, filler, and repeated context. Include only details that change the answer.' }
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const safeJSON = (value, fallback) => { try { return value ? JSON.parse(value) : fallback; } catch { return fallback; } };
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);
const now = () => new Date().toISOString();

let settings = Object.assign({ baseUrl: DEFAULT_BASE, model: DEFAULT_MODEL, maxTokens: 4096, topP: 0.95, effort: 'high', stream: true, accent: 'mono', compact: false, enterSends: true, sidebarCollapsed: false }, safeJSON(localStorage.getItem(STORAGE.settings), {}));
let chats = safeJSON(localStorage.getItem(STORAGE.chats), []);
let files = Object.assign({}, DEFAULT_FILES, safeJSON(localStorage.getItem(STORAGE.files), {}));
let persona = Object.assign({ preset: 'balanced', name: 'kernel', responseLength: 'adaptive', tone: 'natural', format: 'adaptive', notes: '' }, safeJSON(localStorage.getItem(STORAGE.persona), {}));
let apiKey = sessionStorage.getItem(STORAGE.key) || localStorage.getItem(STORAGE.key) || '';
let rememberKey = Boolean(localStorage.getItem(STORAGE.key));
let activeChatId = chats[0]?.id || null;
let currentFile = 'AGENTS.md';
let stagedAttachments = [];
let abortController = null;
let generationActive = false;
let commandSelection = 0;
let commandItems = [];
let currentView = 'chats';

function persistSettings() { localStorage.setItem(STORAGE.settings, JSON.stringify(settings)); }
function persistChats() { try { localStorage.setItem(STORAGE.chats, JSON.stringify(chats)); } catch (error) { toast('Local storage is full. Export your chats and remove older attachments.', 'error'); } }
function persistFiles() { localStorage.setItem(STORAGE.files, JSON.stringify(files)); }
function persistPersona() { localStorage.setItem(STORAGE.persona, JSON.stringify(persona)); }
function activeChat() { return chats.find(chat => chat.id === activeChatId) || null; }
function normalizeBase(value) { return String(value || '').trim().replace(/\/+$/, ''); }
function currentKey() { return sessionStorage.getItem(STORAGE.key) || localStorage.getItem(STORAGE.key) || ''; }
function toast(message, kind = '') {
  const el = document.createElement('div'); el.className = `toast ${kind}`; el.textContent = message;
  $('#toastRegion').append(el); setTimeout(() => el.remove(), 3200);
}
function formatDate(value) {
  const date = new Date(value || Date.now());
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}
function safeLink(url) {
  try { const parsed = new URL(url); return ['https:', 'http:'].includes(parsed.protocol) ? parsed.href : ''; } catch { return ''; }
}
function inlineMarkdown(text) {
  let value = text;
  value = value.replace(/`([^`]+)`/g, '<code>$1</code>');
  value = value.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  value = value.replace(/~~(.+?)~~/g, '<del>$1</del>');
  value = value.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  value = value.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, label, url) => {
    const href = safeLink(url); return href ? `<a href="${escapeHTML(href)}" target="_blank" rel="noopener noreferrer">${label}</a>` : label;
  });
  return value;
}
const CODE_LANGUAGE_ALIASES = {
  js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
  ts: 'typescript', mts: 'typescript', cts: 'typescript', tsx: 'typescript',
  py: 'python', py3: 'python', ps: 'powershell', ps1: 'powershell', shell: 'bash', sh: 'bash', zsh: 'bash',
  yml: 'yaml', md: 'markdown', htm: 'xml', html: 'xml', svg: 'xml',
  cs: 'csharp', 'c#': 'csharp', 'c++': 'cpp', hpp: 'cpp', h: 'c',
  rb: 'ruby', rs: 'rust', kt: 'kotlin', tex: 'latex', docker: 'dockerfile',
  luau: 'lua', roblox: 'lua', txt: 'plaintext', text: 'plaintext', plain: 'plaintext'
};
const CODE_LANGUAGE_LABELS = {
  javascript: 'JavaScript', typescript: 'TypeScript', python: 'Python', powershell: 'PowerShell',
  bash: 'Bash', yaml: 'YAML', markdown: 'Markdown', xml: 'HTML / XML', csharp: 'C#',
  cpp: 'C++', c: 'C', ruby: 'Ruby', rust: 'Rust', kotlin: 'Kotlin', latex: 'LaTeX',
  dockerfile: 'Dockerfile', lua: 'Luau / Lua', json: 'JSON', css: 'CSS', sql: 'SQL',
  java: 'Java', go: 'Go', php: 'PHP', swift: 'Swift', plaintext: 'Text'
};
const CODE_DETECTION_LANGUAGES = ['javascript', 'typescript', 'python', 'json', 'xml', 'css', 'bash', 'powershell', 'lua', 'sql', 'yaml', 'java', 'c', 'cpp', 'csharp', 'go', 'rust', 'php', 'ruby', 'swift', 'markdown'];
function normalizeCodeLanguage(language) {
  const clean = String(language || '').trim().toLowerCase().split(/[\s,;]+/)[0];
  return CODE_LANGUAGE_ALIASES[clean] || clean;
}
function renderCodeBlock(source, language = '') {
  const rawCode = String(source ?? '');
  const originalLanguage = String(language || '').trim().split(/[\s,;]+/)[0];
  const requestedLanguage = normalizeCodeLanguage(originalLanguage);
  let chosenLanguage = requestedLanguage;
  let highlighted = escapeHTML(rawCode);

  if (window.hljs) {
    try {
      if (requestedLanguage && requestedLanguage !== 'plaintext' && window.hljs.getLanguage(requestedLanguage)) {
        highlighted = window.hljs.highlight(rawCode, { language: requestedLanguage, ignoreIllegals: true }).value;
      } else if (!originalLanguage || (requestedLanguage && requestedLanguage !== 'plaintext' && !window.hljs.getLanguage(requestedLanguage))) {
        const detected = window.hljs.highlightAuto(rawCode, CODE_DETECTION_LANGUAGES);
        if (detected.language && detected.relevance >= 4) {
          chosenLanguage = detected.language;
          highlighted = detected.value;
        } else if (!originalLanguage) {
          chosenLanguage = 'plaintext';
        }
      }
    } catch (error) {
      highlighted = escapeHTML(rawCode);
    }
  }

  const explicitLabels = { luau: 'Luau', roblox: 'Luau', jsx: 'JSX', tsx: 'TSX', html: 'HTML', htm: 'HTML', svg: 'SVG', sh: 'Shell', ps1: 'PowerShell' };
  const displayLanguage = originalLanguage
    ? (explicitLabels[originalLanguage.toLowerCase()] || CODE_LANGUAGE_LABELS[chosenLanguage] || originalLanguage.toUpperCase())
    : (CODE_LANGUAGE_LABELS[chosenLanguage] || (chosenLanguage ? chosenLanguage.toUpperCase() : 'CODE'));
  const className = chosenLanguage && chosenLanguage !== 'plaintext' ? ` class="hljs language-${escapeHTML(chosenLanguage)}"` : ' class="hljs language-plaintext"';
  return `<section class="code-block" data-code-language="${escapeHTML(chosenLanguage || 'plaintext')}"><div class="code-toolbar"><span class="code-language">${escapeHTML(displayLanguage)}</span><button class="code-copy" type="button" data-copy-code aria-label="Copy code" title="Copy code"><svg class="ico"><use href="#i-copy"></use></svg><span>Copy</span></button></div><pre><code${className}>${highlighted}</code></pre></section>`;
}
function renderMarkdown(source) {
  if (!source) return '';
  const lines = String(source).replace(/\r/g, '').split('\n');
  const output = []; let paragraph = []; let listType = ''; let listItems = []; let quote = [];
  const flushParagraph = () => { if (paragraph.length) { output.push(`<p>${inlineMarkdown(paragraph.join('<br>'))}</p>`); paragraph = []; } };
  const flushList = () => { if (listItems.length) { output.push(`<${listType}>${listItems.map(item => `<li>${inlineMarkdown(item)}</li>`).join('')}</${listType}>`); listItems = []; listType = ''; } };
  const flushQuote = () => { if (quote.length) { flushParagraph(); flushList(); output.push(`<blockquote>${quote.map(item => `<p>${inlineMarkdown(item)}</p>`).join('')}</blockquote>`); quote = []; } };
  let inCode = false, codeLang = '', codeLines = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      flushParagraph(); flushList(); flushQuote();
      if (!inCode) { inCode = true; codeLang = trimmed.slice(3).trim(); codeLines = []; }
      else { output.push(renderCodeBlock(codeLines.join('\n'), codeLang)); inCode = false; codeLang = ''; }
      continue;
    }
    if (inCode) { codeLines.push(line); continue; }
    if (!trimmed) { flushParagraph(); flushList(); flushQuote(); continue; }
    if (/^#{1,3}\s/.test(trimmed)) { flushParagraph(); flushList(); flushQuote(); const level = trimmed.match(/^#+/)[0].length; output.push(`<h${level}>${inlineMarkdown(trimmed.replace(/^#{1,3}\s+/, ''))}</h${level}>`); continue; }
    if (/^([-*_])\1\1+$/.test(trimmed.replace(/\s/g, ''))) { flushParagraph(); flushList(); flushQuote(); output.push('<hr>'); continue; }
    if (trimmed.startsWith('>')) { flushParagraph(); flushList(); quote.push(trimmed.replace(/^>\s?/, '')); continue; }
    const unordered = trimmed.match(/^[-*+]\s+(.*)$/); const ordered = trimmed.match(/^\d+[.)]\s+(.*)$/);
    if (unordered || ordered) { flushParagraph(); flushQuote(); const nextType = unordered ? 'ul' : 'ol'; if (listType && listType !== nextType) flushList(); listType = nextType; listItems.push((unordered || ordered)[1]); continue; }
    flushList(); flushQuote(); paragraph.push(escapeHTML(line));
  }
  if (inCode) output.push(renderCodeBlock(codeLines.join('\n'), codeLang));
  flushParagraph(); flushList(); flushQuote();
  return output.join('');
}
function getSystemPrompt() {
  const parts = [];
  for (const name of ['AGENTS.md', 'SOUL.md', 'USER.md', 'MEMORY.md', 'TOOLS.md']) {
    const content = String(files[name] || '').trim(); if (content) parts.push(`# ${name}\n${content}`);
  }
  const profile = [
    `Assistant name: ${persona.name || 'kernel'}`,
    `Personality preset: ${PRESETS[persona.preset]?.label || 'Balanced'} — ${PRESETS[persona.preset]?.text || PRESETS.balanced.text}`,
    `Tone: ${persona.tone}. Response length: ${persona.responseLength}. Formatting: ${persona.format}.`,
    persona.notes ? `Additional personality direction: ${persona.notes}` : ''
  ].filter(Boolean).join('\n');
  parts.push(`# INTERFACE PERSONALITY PROFILE\n${profile}`);
  return parts.join('\n\n---\n\n');
}
function modelLabel(model = settings.model) {
  if (model === DEFAULT_MODEL) return 'DeepSeek V4.1 Flash';
  const bits = String(model).split('/'); return bits[bits.length - 1] || model;
}
function updateConnectionStatus() {
  const connected = Boolean(currentKey());
  $('#connectionDot').classList.toggle('connected', connected);
  $('#connectionStatus').textContent = connected ? 'Key configured' : 'Not connected';
  $('#connectionSub').textContent = connected ? `${modelLabel()} · ready to test` : 'Add an API key to begin';
  $('#modelPillText').textContent = modelLabel();
  $('#welcomeConnect').textContent = connected ? 'Manage API key ↗' : 'Connect API key ↗';
}
function updateEffortUI() {
  const labels = { none: 'Thinking off', low: 'Low effort', high: 'High effort', max: 'Max effort' };
  $('#effortLabel').textContent = labels[settings.effort] || 'High effort';
  $$('#effortMenu button').forEach(button => { const on = button.dataset.effort === settings.effort; button.setAttribute('aria-checked', String(on)); $('.menu-check', button).textContent = on ? '✓' : ''; });
  $$('#settingsEffortOptions button').forEach(button => button.classList.toggle('active', button.dataset.effortSetting === settings.effort));
  $('#settingsEffortValue').textContent = (settings.effort || 'high').toUpperCase();
}
function updateChatCount() { $('#chatCount').textContent = String(chats.length); }
function createChat() {
  const chat = { id: uid(), title: 'New conversation', createdAt: now(), updatedAt: now(), messages: [] };
  chats.unshift(chat); activeChatId = chat.id; persistChats(); renderChatList(); showConversation(); $('#promptInput').focus();
}
function ensureChat() { if (!activeChat()) createChat(); return activeChat(); }
function chatTitleFrom(text) { const clean = String(text).replace(/\s+/g, ' ').trim(); return clean.length > 45 ? `${clean.slice(0, 45).trim()}…` : (clean || 'New conversation'); }
function renderChatList() {
  const query = $('#chatSearch').value.trim().toLowerCase();
  const list = $('#chatList'); list.innerHTML = '';
  const matching = chats.filter(chat => !query || chat.title.toLowerCase().includes(query) || chat.messages.some(m => String(m.content || '').toLowerCase().includes(query)));
  for (const chat of matching) {
    const row = document.createElement('div'); row.className = `chat-item ${chat.id === activeChatId ? 'active' : ''}`; row.dataset.id = chat.id; row.title = chat.title; row.setAttribute('aria-label', chat.title);
    row.innerHTML = `<span class="chat-dot"><svg class="ico"><use href="#i-chat"></use></svg></span><span class="chat-title"></span><button class="chat-more" title="Conversation options" aria-label="Conversation options">···</button>`;
    $('.chat-title', row).textContent = chat.title;
    row.addEventListener('click', event => { if (event.target.closest('.chat-more')) { event.stopPropagation(); chatMenu(chat.id); return; } activeChatId = chat.id; showConversation(); renderChatList(); });
    list.append(row);
  }
  if (!matching.length && query) list.innerHTML = '<div class="empty-search">No matching conversations.</div>';
  updateChatCount();
}
function chatMenu(id) {
  const chat = chats.find(item => item.id === id); if (!chat) return;
  const action = prompt(`Conversation: ${chat.title}\nType rename or delete.`, 'rename');
  if (!action) return;
  if (action.toLowerCase() === 'rename') {
    const title = prompt('New conversation title:', chat.title);
    if (title && title.trim()) { chat.title = title.trim().slice(0, 90); chat.updatedAt = now(); persistChats(); renderChatList(); if (id === activeChatId) $('#currentTitle').textContent = chat.title; }
  } else if (action.toLowerCase() === 'delete') {
    if (!confirm(`Delete “${chat.title}”?`)) return;
    chats = chats.filter(item => item.id !== id); if (activeChatId === id) activeChatId = chats[0]?.id || null;
    persistChats(); renderChatList(); showConversation(); toast('Conversation deleted.');
  }
}
function switchView(view) {
  currentView = view;
  $('#chatStage').hidden = view !== 'chats'; $('#composerWrap').hidden = view !== 'chats';
  $('#filesView').hidden = view !== 'files'; $('#personalityView').hidden = view !== 'personality';
  $('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.view === view));
  if (view === 'chats') showConversation();
  if (view === 'files') loadFileEditor();
  if (view === 'personality') syncPersonalityUI();
  const activeSurface = view === 'files' ? $('#filesView') : view === 'personality' ? $('#personalityView') : $('#chatStage');
  activeSurface.classList.remove('is-view-entering');
  void activeSurface.offsetWidth;
  activeSurface.classList.add('is-view-entering');
  if (view === 'chats') {
    $('#composerWrap').classList.remove('is-view-entering');
    void $('#composerWrap').offsetWidth;
    $('#composerWrap').classList.add('is-view-entering');
  }
  $('#currentTitle').textContent = view === 'files' ? 'agent files' : view === 'personality' ? 'personality' : (activeChat()?.title || 'new conversation');
}
function showConversation(options = {}) {
  const chat = activeChat();
  $('#currentTitle').textContent = chat?.title || 'new conversation';
  const hasMessages = Boolean(chat?.messages?.length);
  $('#welcomeView').hidden = hasMessages;
  $('#messages').hidden = !hasMessages;
  if (!hasMessages) { $('#messages').innerHTML = ''; }
  else renderMessages(options);
  renderChatList();
  updateConnectionStatus();
}
function renderMessages(options = {}) {
  const chat = activeChat(); if (!chat) return;
  const { revealMessageId = null, revealRecent = false } = options;
  const root = $('#messages'); root.innerHTML = '';
  const recentStart = Math.max(0, chat.messages.length - 4);
  chat.messages.forEach((message, index) => {
    const article = createMessageElement(message, index);
    root.append(article);
    if (message.id === revealMessageId || (revealRecent && index >= recentStart)) {
      queueMessageReveal(article, revealRecent ? index - recentStart : 0);
    }
  });
  scrollToBottom();
}
function createMessageElement(message, index) {
  const isUser = message.role === 'user';
  const article = document.createElement('article'); article.className = `message ${isUser ? 'user' : 'assistant'}`; article.dataset.messageId = message.id;
  const body = document.createElement('div'); body.className = 'message-body';
  const meta = document.createElement('div'); meta.className = 'message-meta';
  const name = document.createElement('strong'); name.textContent = isUser ? 'you' : (persona.name || 'kernel');
  const stamp = document.createElement('span'); stamp.textContent = formatDate(message.createdAt); meta.append(name, stamp);
  const content = document.createElement('div'); content.className = 'message-content';
  body.append(meta);
  if (message.status === 'thinking') {
    content.innerHTML = '<span class="message-status">Thinking <span class="typing-dots"><i></i><i></i><i></i></span></span>';
  } else if (message.error) {
    const error = document.createElement('div'); error.className = 'message-error'; error.textContent = message.error; content.append(error);
  } else {
    const imageAttachments = (message.attachments || []).filter(item => item.kind === 'image' && item.dataUrl);
    if (imageAttachments.length) {
      const media = document.createElement('div'); media.className = 'message-media';
      for (const item of imageAttachments) {
        const preview = document.createElement('a'); preview.className = 'message-image-preview'; preview.href = item.dataUrl; preview.target = '_blank'; preview.rel = 'noopener noreferrer'; preview.title = `Open ${item.name || 'attached image'}`;
        const img = document.createElement('img'); img.src = item.dataUrl; img.alt = item.name || 'Attached image';
        const caption = document.createElement('span'); caption.textContent = item.name || 'Image';
        preview.append(img, caption); media.append(preview);
      }
      body.append(media);
    }
    for (const item of (message.attachments || []).filter(item => item.kind !== 'image')) {
      const label = document.createElement('div'); label.className = 'message-attachment'; label.textContent = `▤ ${item.name}`; content.append(label);
    }
    if (message.content) {
      const markdown = document.createElement('div');
      markdown.className = 'markdown-content';
      markdown.innerHTML = renderMarkdown(message.content);
      content.append(markdown);
    }
  }
  body.append(content);
  if (!message.status) {
    const actions = document.createElement('div'); actions.className = 'message-actions';
    if (message.content) {
      const copy = document.createElement('button'); copy.textContent = 'Copy'; copy.addEventListener('click', () => copyText(message.content || ''));
      actions.append(copy);
    }
    if (!isUser && message.error) {
      const retry = document.createElement('button'); retry.textContent = 'Retry'; retry.addEventListener('click', () => regenerateMessage(message.id)); actions.append(retry);
    } else if (!isUser && message.content) {
      const regenerate = document.createElement('button'); regenerate.textContent = 'Regenerate'; regenerate.addEventListener('click', () => regenerateMessage(message.id)); actions.append(regenerate);
    }
    if (isUser) {
      const edit = document.createElement('button'); edit.textContent = 'Edit'; edit.addEventListener('click', () => editMessage(message.id)); actions.append(edit);
    }
    if (actions.childElementCount) body.append(actions);
  }
  article.append(body);
  return article;
}
function queueMessageReveal(article, sequence = 0) {
  if (!article) return;
  article.classList.remove('is-arriving');
  article.style.setProperty('--sequence-delay', `${Math.max(0, sequence) * 150}ms`);
  const body = $('.message-body', article);
  const pieces = [
    $('.message-meta', body),
    $('.message-media', body),
    $('.message-content', body),
    $('.message-actions', body)
  ].filter(Boolean);
  pieces.forEach((element, index) => element.style.setProperty('--reveal-delay', `${index * 125}ms`));
  $('.message-image-preview, .message-attachment', article).forEach((element, index) => element.style.setProperty('--asset-delay', `${index * 145}ms`));
  $('.markdown-content > *', article).forEach((element, index) => element.style.setProperty('--asset-delay', `${index * 155}ms`));
  requestAnimationFrame(() => article.classList.add('is-arriving'));
}
function scrollToBottom() {
  const stage = $('#chatStage');
  requestAnimationFrame(() => {
    if (generationActive) stage.scrollTop = stage.scrollHeight;
    else stage.scrollTo({ top: stage.scrollHeight, behavior: 'smooth' });
  });
}
function updateStreamingMessage(message) {
  const root = $('#messages');
  let article = $(`[data-message-id="${CSS.escape(message.id)}"]`, root);
  if (!article) { article = createMessageElement(message, -1); root.append(article); }
  article.classList.add('is-streaming');
  const content = $('.message-content', article);
  let markdown = $('.markdown-content', content);
  if (!markdown) {
    content.innerHTML = '';
    markdown = document.createElement('div');
    markdown.className = 'markdown-content is-streaming';
    content.append(markdown);
  }
  markdown.innerHTML = renderMarkdown(message.content || '');
  scrollToBottom();
}
function editMessage(id) {
  const chat = activeChat(); if (!chat) return;
  const index = chat.messages.findIndex(m => m.id === id); if (index < 0) return;
  const msg = chat.messages[index]; if (msg.role !== 'user') return;
  $('#promptInput').value = msg.content || ''; autoGrowComposer();
  chat.messages = chat.messages.slice(0, index); persistChats(); showConversation(); $('#promptInput').focus(); toast('Message loaded into composer. Send it to continue from here.');
}
async function regenerateMessage(id) {
  const chat = activeChat(); if (!chat || generationActive) return;
  const index = chat.messages.findIndex(m => m.id === id); if (index < 0 || chat.messages[index].role !== 'assistant') return;
  chat.messages = chat.messages.slice(0, index); persistChats(); renderMessages(); await generateAssistantReply();
}
function autoGrowComposer() {
  const input = $('#promptInput'); input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 190)}px`;
  $('#sendBtn').disabled = !input.value.trim() && !stagedAttachments.length;
}
function stageFiles(fileList) {
  const filesToRead = [...fileList];
  for (const file of filesToRead) {
    if (file.size > 2 * 1024 * 1024) { toast(`${file.name} is over the 2 MB attachment limit.`, 'error'); continue; }
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => { stagedAttachments.push({ id: uid(), name: file.name, kind: 'image', type: file.type, dataUrl: reader.result }); renderStagedAttachments(); };
      reader.onerror = () => toast(`Could not read ${file.name}.`, 'error'); reader.readAsDataURL(file);
    } else if (/\.(txt|md|json|csv|js|ts|py|html|css|xml|ya?ml|log|sh|sql|toml|ini)$/i.test(file.name) || file.type.startsWith('text/')) {
      const reader = new FileReader();
      reader.onload = () => { stagedAttachments.push({ id: uid(), name: file.name, kind: 'text', type: file.type, text: String(reader.result).slice(0, 150000) }); renderStagedAttachments(); };
      reader.onerror = () => toast(`Could not read ${file.name}.`, 'error'); reader.readAsText(file);
    } else { toast(`${file.name}: use an image or text-based file.`, 'error'); }
  }
  $('#fileInput').value = '';
}
function renderStagedAttachments() {
  const strip = $('#attachmentStrip'); strip.innerHTML = ''; strip.hidden = !stagedAttachments.length;
  for (const file of stagedAttachments) {
    const chip = document.createElement('div'); chip.className = 'attachment-chip';
    if (file.kind === 'image') { const img = document.createElement('img'); img.src = file.dataUrl; chip.append(img); }
    else { const icon = document.createElement('span'); icon.textContent = '▤'; chip.append(icon); }
    const label = document.createElement('span'); label.textContent = file.name; const remove = document.createElement('button'); remove.textContent = '×'; remove.title = 'Remove attachment'; remove.addEventListener('click', () => { stagedAttachments = stagedAttachments.filter(item => item.id !== file.id); renderStagedAttachments(); });
    chip.append(label, remove); strip.append(chip);
  }
  $('#sendBtn').disabled = !$('#promptInput').value.trim() && !stagedAttachments.length;
}
function buildUserContent(text, attachments) {
  let result = text;
  for (const file of attachments.filter(item => item.kind === 'text')) result += `${result ? '\n\n' : ''}[Attached file: ${file.name}]\n${file.text}`;
  return result;
}
function toApiMessages(chat) {
  const messages = [{ role: 'system', content: getSystemPrompt() }];
  for (const message of chat.messages) {
    if (!['user', 'assistant'].includes(message.role) || message.error || message.status) continue;
    if (message.role === 'user' && message.attachments?.some(item => item.kind === 'image' && item.dataUrl)) {
      const content = [{ type: 'text', text: message.content || 'Please inspect the attached image.' }];
      for (const image of message.attachments.filter(item => item.kind === 'image' && item.dataUrl)) content.push({ type: 'image_url', image_url: { url: image.dataUrl } });
      messages.push({ role: 'user', content });
    } else messages.push({ role: message.role, content: message.content || '' });
  }
  return messages;
}
function apiEndpoint() {
  const base = normalizeBase(settings.baseUrl || DEFAULT_BASE);
  if (base === normalizeBase(DEFAULT_BASE) && location.protocol.startsWith('http')) return `${location.origin}/api/tokenjuice/chat/completions`;
  return `${base}/chat/completions`;
}
function requestBody(messages, stream = settings.stream) {
  const thinking = settings.effort !== 'none';
  const body = {
    model: settings.model || DEFAULT_MODEL,
    messages,
    stream: Boolean(stream),
    max_tokens: Number(settings.maxTokens) || 4096,
    thinking: { type: thinking ? 'enabled' : 'disabled' },
    reasoning_effort: thinking ? settings.effort : 'none'
  };
  if (thinking) body.top_p = Number(settings.topP) || 0.95;
  return body;
}
function parseApiError(text, status) {
  let message = text;
  try { const parsed = JSON.parse(text); message = parsed.error?.message || parsed.message || parsed.error || text; } catch {}
  if (status === 401 || status === 403) return `Authentication failed (${status}). Check that your TokenJuice API key is correct and active.`;
  if (status === 404) return `Endpoint or model not found (404). Check the API base URL and exact model ID.`;
  if (status === 429) return `Rate limit or API balance issue (429). Check your provider limits and balance.`;
  if (status >= 500) return `The API provider returned ${status}. Try again in a moment. ${String(message).slice(0, 260)}`;
  return `API error (${status}): ${String(message).slice(0, 360)}`;
}
async function readStreamingResponse(response, assistantMessage, chat) {
  const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ''; let finished = false;
  while (!finished) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n'); buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim(); if (!payload || payload === '[DONE]') { if (payload === '[DONE]') finished = true; continue; }
      let chunk; try { chunk = JSON.parse(payload); } catch { continue; }
      const delta = chunk.choices?.[0]?.delta;
      if (typeof delta?.content === 'string') assistantMessage.content += delta.content;
      else if (Array.isArray(delta?.content)) assistantMessage.content += delta.content.map(part => part.text || '').join('');
      const finish = chunk.choices?.[0]?.finish_reason;
      if (chunk.usage) assistantMessage.usage = chunk.usage;
      if (delta?.content) {
        assistantMessage.status = '';
        updateStreamingMessage(assistantMessage);
      }
      if (finish) assistantMessage.finishReason = finish;
    }
    if (generationActive && assistantMessage.content && !$('#messages').querySelector(`[data-message-id="${CSS.escape(assistantMessage.id)}"]`)) updateStreamingMessage(assistantMessage);
  }
  if (buffer.trim().startsWith('data:')) {
    const payload = buffer.trim().slice(5).trim();
    if (payload && payload !== '[DONE]') { try { const chunk = JSON.parse(payload); const delta = chunk.choices?.[0]?.delta; if (typeof delta?.content === 'string') assistantMessage.content += delta.content; if (chunk.usage) assistantMessage.usage = chunk.usage; } catch {} }
  }
  if (!assistantMessage.content && assistantMessage.finishReason === 'length') assistantMessage.content = 'The response reached its output-token limit before any visible answer was returned. Increase the maximum output tokens or lower the thinking effort.';
  if (!assistantMessage.content) assistantMessage.content = 'The model returned an empty message. Try again or switch thinking effort.';
}
async function generateAssistantReply() {
  const chat = activeChat(); if (!chat) return;
  if (!currentKey()) { toast('Add your API key in Settings → Connection first.', 'error'); openSettings('connection'); return; }
  const assistant = { id: uid(), role: 'assistant', content: '', createdAt: now(), status: 'thinking' };
  chat.messages.push(assistant); generationActive = true; abortController = new AbortController();
  $('#sendBtn').disabled = false; $('#sendGlyph').textContent = '■'; $('#sendBtn').title = 'Stop generating';
  renderMessages({ revealMessageId: assistant.id });
  try {
    const response = await fetch(apiEndpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentKey()}` },
      body: JSON.stringify(requestBody(toApiMessages(chat), settings.stream)),
      signal: abortController.signal
    });
    if (!response.ok) throw new Error(parseApiError(await response.text(), response.status));
    if (settings.stream && response.body) {
      await readStreamingResponse(response, assistant, chat);
    } else {
      const data = await response.json();
      assistant.status = '';
      assistant.content = data.choices?.[0]?.message?.content || 'The model returned an empty message. Try again or switch thinking effort.';
      assistant.usage = data.usage;
    }
    assistant.completedAt = now();
  } catch (error) {
    if (error.name === 'AbortError') {
      assistant.status = ''; if (!assistant.content) assistant.content = 'Generation stopped.';
    } else {
      assistant.status = ''; assistant.error = error.message || 'Unknown request error.';
      if (String(error.message).includes('Failed to fetch') || String(error.message).includes('NetworkError')) assistant.error += ' This can also mean the API endpoint is unreachable. The default TokenJuice route uses the same-origin Vercel function; custom endpoints must allow browser CORS.';
    }
  } finally {
    generationActive = false; abortController = null; assistant.status = '';
    chat.updatedAt = now(); persistChats(); renderMessages({ revealMessageId: assistant.id }); renderChatList();
    $('#sendGlyph').innerHTML = '<svg class="ico"><use href="#i-arrow-up"></use></svg>';  $('#sendBtn').title = 'Send message';
    $('#sendBtn').disabled = !$('#promptInput').value.trim() && !stagedAttachments.length;
  }
}
async function sendMessage() {
  if (generationActive) { abortController?.abort(); return; }
  if (!currentKey()) { toast('Add your API key in Settings → Connection first.', 'error'); openSettings('connection'); return; }
  const text = $('#promptInput').value.trim();
  if (!text && !stagedAttachments.length) return;
  const chat = ensureChat();
  const attachments = stagedAttachments.map(file => ({ ...file }));
  const message = { id: uid(), role: 'user', content: buildUserContent(text, attachments), attachments, createdAt: now() };
  chat.messages.push(message);
  if (chat.messages.filter(m => m.role === 'user').length === 1) chat.title = chatTitleFrom(text || attachments[0]?.name || 'Image');
  chat.updatedAt = now();
  $('#promptInput').value = ''; $('#promptInput').style.height = 'auto'; stagedAttachments = []; renderStagedAttachments();
  persistChats(); showConversation({ revealMessageId: message.id }); await generateAssistantReply();
}
function setEffort(value) {
  if (!['none', 'low', 'high', 'max'].includes(value)) return;
  settings.effort = value; persistSettings(); updateEffortUI(); $('#effortMenu').hidden = true;
}
function openSettings(tab = 'connection') {
  $('#settingsBackdrop').classList.remove('is-closing');
  $('#settingsBackdrop').hidden = false;
  $('#baseUrlInput').value = settings.baseUrl || DEFAULT_BASE;
  $('#apiKeyInput').value = '';
  $('#rememberKey').checked = rememberKey;
  $('#modelInput').value = settings.model || DEFAULT_MODEL;
  $('#maxTokensInput').value = String(settings.maxTokens || 4096);
  $('#topPInput').value = String(settings.topP || 0.95);
  $('#streamToggle').checked = Boolean(settings.stream);
  $('#compactToggle').checked = Boolean(settings.compact);
  $('#enterSendsToggle').checked = Boolean(settings.enterSends);
  $('#connectionResult').hidden = true;
  switchSettingsTab(tab);
}
function closeSettings() {
  const backdrop = $('#settingsBackdrop');
  if (backdrop.hidden || backdrop.classList.contains('is-closing')) return;
  backdrop.classList.add('is-closing');
  window.setTimeout(() => {
    backdrop.hidden = true;
    backdrop.classList.remove('is-closing');
  }, 320);
}
function switchSettingsTab(tab) {
  $$('.settings-tab').forEach(button => button.classList.toggle('active', button.dataset.settingsTab === tab));
  $$('.settings-page').forEach(page => { const active = page.dataset.settingsPage === tab; page.classList.toggle('active', active); page.hidden = !active; });
  $('#settingsTitle').textContent = ({ connection: 'Connection', model: 'Model & effort', appearance: 'Appearance', data: 'Data & privacy' })[tab] || 'Settings';
}
function saveConnection() {
  const base = normalizeBase($('#baseUrlInput').value);
  if (!/^https:\/\//i.test(base)) { toast('Use a valid HTTPS API base URL.', 'error'); return; }
  settings.baseUrl = base;
  const typedKey = $('#apiKeyInput').value.trim();
  rememberKey = $('#rememberKey').checked;
  if (typedKey) {
    sessionStorage.removeItem(STORAGE.key); localStorage.removeItem(STORAGE.key);
    if (rememberKey) localStorage.setItem(STORAGE.key, typedKey); else sessionStorage.setItem(STORAGE.key, typedKey);
  } else if (rememberKey && sessionStorage.getItem(STORAGE.key)) {
    localStorage.setItem(STORAGE.key, sessionStorage.getItem(STORAGE.key)); sessionStorage.removeItem(STORAGE.key);
  } else if (!rememberKey && localStorage.getItem(STORAGE.key)) {
    sessionStorage.setItem(STORAGE.key, localStorage.getItem(STORAGE.key)); localStorage.removeItem(STORAGE.key);
  }
  persistSettings(); updateConnectionStatus(); toast('Connection settings saved.');
}
async function clearApiKey() {
  if (!confirm('Remove the API key from this browser?')) return;
  localStorage.removeItem(STORAGE.key); sessionStorage.removeItem(STORAGE.key);
  $('#apiKeyInput').value = ''; rememberKey = false; $('#rememberKey').checked = false;
  updateConnectionStatus(); toast('API key removed from this browser.');
}
async function testConnection() {
  const btn = $('#testConnectionBtn'); const result = $('#connectionResult');
  const typedKey = $('#apiKeyInput').value.trim();
  const key = typedKey || currentKey();
  const base = normalizeBase($('#baseUrlInput').value || DEFAULT_BASE);
  const model = $('#modelInput').value.trim() || settings.model || DEFAULT_MODEL;
  if (!key) { result.hidden = false; result.className = 'test-result error'; result.textContent = 'Add an API key first.'; return false; }
  if (!/^https:\/\//i.test(base)) { result.hidden = false; result.className = 'test-result error'; result.textContent = 'The API base URL must start with https://'; return false; }
  btn.disabled = true; btn.textContent = 'Testing…'; result.hidden = false; result.className = 'test-result'; result.textContent = 'Sending a tiny test request to the selected model…';
  const endpoint = base === normalizeBase(DEFAULT_BASE) && location.protocol.startsWith('http') ? `${location.origin}/api/tokenjuice/chat/completions` : `${base}/chat/completions`;
  try {
    const body = { model, messages: [{ role: 'user', content: 'Reply with only the word connected.' }], stream: false, max_tokens: 12, thinking: { type: 'disabled' }, reasoning_effort: 'none' };
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error(parseApiError(await response.text(), response.status));
    const data = await response.json(); const answer = data.choices?.[0]?.message?.content || 'Request succeeded.';
    settings.baseUrl = base; settings.model = model; persistSettings();
    if (typedKey || $('#rememberKey').checked !== rememberKey) saveConnection();
    updateConnectionStatus();
    result.className = 'test-result success'; result.textContent = `Connected. Model responded: ${String(answer).slice(0, 110)}`;
    return true;
  } catch (error) {
    result.className = 'test-result error'; result.textContent = error.message || 'Connection test failed.';
    return false;
  } finally { btn.disabled = false; btn.textContent = 'Test connection'; }
}

function enterWorkspace() {
  const gate = $('#entryGate');
  const shell = $('#appShell');
  $('#entryApiKey').value = '';
  document.documentElement.dataset.kernelAuth = 'true';

  gate.classList.add('is-leaving');
  shell.hidden = false;
  shell.classList.remove('workspace-arriving');
  void shell.offsetWidth;
  requestAnimationFrame(() => shell.classList.add('workspace-arriving'));

  if (activeChatId) showConversation({ revealRecent: true });
  else switchView('chats');

  window.setTimeout(() => {
    gate.hidden = true;
    gate.classList.remove('is-leaving');
  }, 1250);
  window.setTimeout(() => {
    shell.classList.remove('workspace-arriving');
    $('#promptInput')?.focus();
  }, 1650);
}

async function connectFromEntry() {
  const key = $('#entryApiKey').value.trim();
  const base = normalizeBase($('#entryBaseUrl').value || DEFAULT_BASE);
  const model = $('#entryModel').value.trim() || DEFAULT_MODEL;
  const status = $('#entryStatus');
  const button = $('#entryConnectBtn');
  if (!key) {
    status.hidden = false; status.dataset.state = 'error';
    status.textContent = 'Paste your API key to continue.';
    $('#entryApiKey').focus(); return;
  }
  if (!/^https:\/\//i.test(base)) {
    status.hidden = false; status.dataset.state = 'error';
    status.textContent = 'The API base URL must start with https://'; return;
  }

  $('#baseUrlInput').value = base;
  $('#apiKeyInput').value = key;
  $('#rememberKey').checked = $('#entryRemember').checked;
  $('#modelInput').value = model;
  button.disabled = true;
  $('#entryConnectLabel').textContent = 'Checking connection…';
  $('#entryConnectIcon').classList.add('hidden');
  $('#entryConnectSpinner').classList.remove('hidden');
  status.hidden = false; status.dataset.state = 'loading';
  status.textContent = 'Contacting your model provider…';

  const connected = await testConnection();
  if (connected) {
    status.dataset.state = 'success';
    status.textContent = 'Connected. Opening your workspace…';
    window.setTimeout(enterWorkspace, 650);
  } else {
    const detail = $('#connectionResult').textContent || 'Check your key and provider settings, then try again.';
    status.dataset.state = 'error';
    status.textContent = detail;
    button.disabled = false;
    $('#entryConnectLabel').textContent = 'Try again';
    $('#entryConnectIcon').classList.remove('hidden');
    $('#entryConnectSpinner').classList.add('hidden');
  }
}
function syncPersonaFromInputs() {
  persona.name = $('#personaName').value.trim() || 'kernel';
  persona.responseLength = $('#responseLength').value;
  persona.tone = $('#personaTone').value;
  persona.format = $('#formatStyle').value;
  persona.notes = $('#personaNotes').value;
  persistPersona(); syncPersonalityPreview();
}
function syncPersonalityPreview() {
  $('#previewName').textContent = persona.name || 'kernel';
  $('#previewStyle').textContent = PRESETS[persona.preset]?.label || 'Balanced';
  $('#previewTone').textContent = persona.tone[0].toUpperCase() + persona.tone.slice(1);
  $('#previewLength').textContent = persona.responseLength[0].toUpperCase() + persona.responseLength.slice(1);
  $('#previewFormat').textContent = persona.format[0].toUpperCase() + persona.format.slice(1);
}
function syncPersonalityUI() {
  $('#personaName').value = persona.name || 'kernel'; $('#responseLength').value = persona.responseLength || 'adaptive'; $('#personaTone').value = persona.tone || 'natural'; $('#formatStyle').value = persona.format || 'adaptive'; $('#personaNotes').value = persona.notes || '';
  $$('.preset-card').forEach(button => button.classList.toggle('active', button.dataset.preset === persona.preset)); syncPersonalityPreview();
}
function loadFileEditor() {
  $('#editorFilename').textContent = currentFile; $('#fileEditor').value = files[currentFile] || '';
  $$('.file-tab').forEach(button => button.classList.toggle('active', button.dataset.file === currentFile));
  updateFileWordCount();
}
function updateFileWordCount() { const count = ($('#fileEditor').value.trim().match(/\S+/g) || []).length; $('#fileWordCount').textContent = `${count} words`; }
function saveFileEditor() {
  files[currentFile] = $('#fileEditor').value; persistFiles(); updateFileWordCount();
  $('#fileSaveDot').classList.add('saving'); $('#fileSaveStatus').textContent = 'Saving…';
  clearTimeout(saveFileEditor.timeout); saveFileEditor.timeout = setTimeout(() => { $('#fileSaveDot').classList.remove('saving'); $('#fileSaveStatus').textContent = 'Saved locally'; }, 250);
}
function downloadFile(name, content, type = 'text/plain') {
  const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const link = document.createElement('a');
  link.href = url; link.download = name; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 800);
}
function exportFiles() {
  const payload = Object.entries(files).map(([name, content]) => `<!-- ${name} -->\n${content}`).join('\n\n---\n\n');
  downloadFile('kernel-agent-files.md', payload, 'text/markdown');
}
function exportChat() {
  const chat = activeChat(); if (!chat) { toast('No conversation to export.'); return; }
  const lines = [`# ${chat.title}`, `Created: ${new Date(chat.createdAt).toLocaleString()}`, ''];
  for (const message of chat.messages) { lines.push(`## ${message.role === 'user' ? 'You' : (persona.name || 'kernel')}`, '', message.content || '', ''); for (const attachment of message.attachments || []) lines.push(`> Attachment: ${attachment.name}`); }
  downloadFile(`${chat.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'conversation'}.md`, lines.join('\n'), 'text/markdown');
}
function exportWorkspace() {
  const payload = { app: 'kernel', version: 1, exportedAt: now(), settings: { ...settings }, chats, files, persona };
  downloadFile('kernel-workspace.json', JSON.stringify(payload, null, 2), 'application/json');
}
async function importWorkspace(file) {
  try {
    const data = JSON.parse(await file.text());
    if (!data || !Array.isArray(data.chats) || !data.files || typeof data.files !== 'object') throw new Error('This does not look like a kernel workspace export.');
    if (!confirm('Import this workspace? Existing chats and configuration will be replaced.')) return;
    chats = data.chats; files = Object.assign({}, DEFAULT_FILES, data.files); settings = Object.assign(settings, data.settings || {}); persona = Object.assign(persona, data.persona || {}); activeChatId = chats[0]?.id || null;
    persistChats(); persistFiles(); persistSettings(); persistPersona(); renderChatList(); showConversation(); applyAppearance(); syncPersonalityUI(); updateEffortUI(); toast('Workspace imported.');
  } catch (error) { toast(error.message || 'Could not import workspace.', 'error'); }
}
function applyAppearance() {
  settings.accent = 'mono';
  document.body.dataset.accent = 'mono';
  document.body.classList.toggle('compact', Boolean(settings.compact));
  $('#appShell').classList.toggle('sidebar-collapsed', Boolean(settings.sidebarCollapsed));
  const collapseButton = $('#collapseSidebar');
  if (collapseButton) {
    const expanded = !settings.sidebarCollapsed;
    collapseButton.setAttribute('aria-expanded', String(expanded));
    collapseButton.setAttribute('aria-label', expanded ? 'Collapse sidebar' : 'Expand sidebar');
    collapseButton.title = expanded ? 'Collapse sidebar' : 'Expand sidebar';
  }
  $$('#accentOptions button').forEach(button => button.classList.toggle('active', button.dataset.accent === settings.accent));
}
async function copyText(text, successMessage = 'Copied to clipboard.') {
  if (!text) { toast('Nothing to copy.'); return false; }
  try {
    if (navigator.clipboard?.writeText) {
      try { await navigator.clipboard.writeText(text); toast(successMessage); return true; } catch { /* Try the selection fallback below. */ }
    }
    const field = document.createElement('textarea');
    field.value = text; field.setAttribute('readonly', '');
    field.style.position = 'fixed'; field.style.opacity = '0'; field.style.pointerEvents = 'none';
    document.body.append(field); field.select();
    const copied = document.execCommand('copy'); field.remove();
    if (!copied) throw new Error('Clipboard unavailable');
    toast(successMessage); return true;
  } catch (error) {
    toast('Clipboard access was blocked.', 'error'); return false;
  }
}
function openCommandPalette() {
  $('#commandBackdrop').classList.remove('is-closing');
  $('#commandBackdrop').hidden = false;
  $('#commandInput').value = '';
  renderCommandList('');
  $('#commandInput').focus();
}
function closeCommandPalette() {
  const backdrop = $('#commandBackdrop');
  if (backdrop.hidden || backdrop.classList.contains('is-closing')) return;
  backdrop.classList.add('is-closing');
  window.setTimeout(() => {
    backdrop.hidden = true;
    backdrop.classList.remove('is-closing');
  }, 320);
}
function renderCommandList(query) {
  const commands = [
    ['＋', 'New chat', 'new-chat', 'Ctrl K'], ['⚙', 'Open settings', 'settings', 'Ctrl ,'], ['◫', 'Go to chats', 'chats', ''], ['⌘', 'Open agent files', 'files', ''], ['◈', 'Customize personality', 'personality', ''], ['⇩', 'Export workspace', 'export', ''], ['✳', 'Set reasoning effort', 'effort', '']
  ].filter(item => item[1].toLowerCase().includes(query.toLowerCase()));
  commandItems = commands; commandSelection = 0;
  $('#commandList').innerHTML = '';
  commands.forEach((item, index) => { const button = document.createElement('button'); button.className = `command-item ${index === commandSelection ? 'active' : ''}`; button.innerHTML = `<span>${item[0]}</span><span></span><kbd>${item[3]}</kbd>`; $('span:nth-child(2)', button).textContent = item[1]; button.addEventListener('click', () => runCommand(item[2])); $('#commandList').append(button); });
  if (!commands.length) $('#commandList').innerHTML = '<div class="command-item">No matching commands.</div>';
}
function moveCommandSelection(direction) {
  commandSelection = Math.max(0, Math.min(commandItems.length - 1, commandSelection + direction));
  $$('.command-item', $('#commandList')).forEach((item, index) => item.classList.toggle('active', index === commandSelection));
}
function runCommand(command) {
  closeCommandPalette();
  if (command === 'new-chat') createChat();
  else if (command === 'settings') openSettings('connection');
  else if (command === 'chats') switchView('chats');
  else if (command === 'files') switchView('files');
  else if (command === 'personality') switchView('personality');
  else if (command === 'export') exportWorkspace();
  else if (command === 'effort') { switchView('chats'); $('#effortMenu').hidden = false; }
}

// Sidebar and navigation
$('#newChatBtn').addEventListener('click', createChat);
$('#collapseSidebar').addEventListener('click', () => { settings.sidebarCollapsed = !settings.sidebarCollapsed; persistSettings(); applyAppearance(); });
$('.sidebar-search').addEventListener('click', event => {
  if ($('#appShell').classList.contains('sidebar-collapsed') && !event.target.closest('input')) {
    settings.sidebarCollapsed = false; persistSettings(); applyAppearance();
    requestAnimationFrame(() => $('#chatSearch').focus());
  }
});
$('#connectionCard').addEventListener('click', event => {
  if ($('#appShell').classList.contains('sidebar-collapsed') && !event.target.closest('button')) openSettings('connection');
});
$('#welcomeConnect').addEventListener('click', () => openSettings('connection'));
$('#closeSidebar').addEventListener('click', () => $('#sidebar').classList.remove('open'));
$('#openSidebar').addEventListener('click', () => $('#sidebar').classList.add('open'));
$$('.nav-item').forEach(button => button.addEventListener('click', () => { switchView(button.dataset.view); $('#sidebar').classList.remove('open'); }));
$('#chatSearch').addEventListener('input', renderChatList);
$('#profileButton').addEventListener('click', () => openSettings('connection'));
$('#openSettingsFromStatus').addEventListener('click', () => openSettings('connection'));
$('#settingsBtn').addEventListener('click', () => openSettings('connection'));
$('#modelPill').addEventListener('click', () => openSettings('model'));
$('#exportChatBtn').addEventListener('click', exportChat);
$('#workspaceMenu').addEventListener('click', openCommandPalette);

// Code block actions are delegated because message HTML is re-rendered while streaming.
$('#messages').addEventListener('click', async event => {
  const button = event.target.closest('[data-copy-code]');
  if (!button) return;
  const code = button.closest('.code-block')?.querySelector('pre code');
  if (!code) return;
  const copied = await copyText(code.textContent || '', 'Code copied.');
  if (copied) {
    button.classList.add('copied');
    const label = $('span', button);
    if (label) label.textContent = 'Copied';
    button.setAttribute('aria-label', 'Code copied');
    window.setTimeout(() => { button.classList.remove('copied'); if (label?.isConnected) label.textContent = 'Copy'; button.setAttribute('aria-label', 'Copy code'); }, 1500);
  }
});

// Composer, uploads, and reasoning effort
$('#promptInput').addEventListener('input', autoGrowComposer);
$('#promptInput').addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey && (settings.enterSends || event.ctrlKey || event.metaKey)) { event.preventDefault(); sendMessage(); }
});
$('#sendBtn').addEventListener('click', sendMessage);
$('#attachBtn').addEventListener('click', () => $('#fileInput').click());
$('#fileInput').addEventListener('change', event => stageFiles(event.target.files));
$('#effortBtn').addEventListener('click', event => { event.stopPropagation(); $('#effortMenu').hidden = !$('#effortMenu').hidden; });
$('#effortMenu').addEventListener('click', event => { const button = event.target.closest('[data-effort]'); if (button) setEffort(button.dataset.effort); });
$$('.suggestion-card').forEach(button => button.addEventListener('click', () => { $('#promptInput').value = button.dataset.prompt; autoGrowComposer(); $('#promptInput').focus(); }));

// Settings modal
$('#closeSettings').addEventListener('click', closeSettings); $('#closeSettingsTop').addEventListener('click', closeSettings);
$('#settingsBackdrop').addEventListener('click', event => { if (event.target === $('#settingsBackdrop')) closeSettings(); });
$$('.settings-tab').forEach(button => button.addEventListener('click', () => switchSettingsTab(button.dataset.settingsTab)));
$('#toggleKeyVisibility').addEventListener('click', () => { const input = $('#apiKeyInput'); input.type = input.type === 'password' ? 'text' : 'password'; $('#toggleKeyVisibility').textContent = input.type === 'password' ? 'SHOW' : 'HIDE'; });
$('#saveConnectionBtn').addEventListener('click', saveConnection);
$('#clearApiKeyBtn').addEventListener('click', clearApiKey);
$('#testConnectionBtn').addEventListener('click', testConnection);
$('#modelInput').addEventListener('change', () => { settings.model = $('#modelInput').value.trim() || DEFAULT_MODEL; persistSettings(); updateConnectionStatus(); });
$('#maxTokensInput').addEventListener('change', () => { settings.maxTokens = Number($('#maxTokensInput').value); persistSettings(); });
$('#topPInput').addEventListener('change', () => { settings.topP = Number($('#topPInput').value); persistSettings(); });
$('#streamToggle').addEventListener('change', () => { settings.stream = $('#streamToggle').checked; persistSettings(); });
$('#settingsEffortOptions').addEventListener('click', event => { const button = event.target.closest('[data-effort-setting]'); if (button) setEffort(button.dataset.effortSetting); });
$('#compactToggle').addEventListener('change', () => { settings.compact = $('#compactToggle').checked; persistSettings(); applyAppearance(); });
$('#enterSendsToggle').addEventListener('change', () => { settings.enterSends = $('#enterSendsToggle').checked; persistSettings(); });
$('#accentOptions').addEventListener('click', event => { const button = event.target.closest('[data-accent]'); if (button) { settings.accent = button.dataset.accent; persistSettings(); applyAppearance(); } });
$('#exportAllBtn').addEventListener('click', exportWorkspace); $('#importAllBtn').addEventListener('click', () => $('#importInput').click());
$('#importInput').addEventListener('change', event => { const file = event.target.files?.[0]; if (file) importWorkspace(file); event.target.value = ''; });
$('#dataExportFilesBtn').addEventListener('click', exportFiles); $('#downloadFilesBtn').addEventListener('click', exportFiles);
$('#clearWorkspaceBtn').addEventListener('click', () => {
  if (!confirm('Permanently clear all local kernel data, including the API key? Export anything you want to keep first.')) return;
  Object.values(STORAGE).forEach(key => { localStorage.removeItem(key); sessionStorage.removeItem(key); });
  chats = []; files = { ...DEFAULT_FILES }; persona = { preset: 'balanced', name: 'kernel', responseLength: 'adaptive', tone: 'natural', format: 'adaptive', notes: '' }; settings = { baseUrl: DEFAULT_BASE, model: DEFAULT_MODEL, maxTokens: 4096, topP: .95, effort: 'high', stream: true, accent: 'mono', compact: false, enterSends: true, sidebarCollapsed: false }; rememberKey = false; activeChatId = null;
  persistSettings(); persistFiles(); persistPersona(); renderChatList(); showConversation(); applyAppearance(); updateEffortUI(); syncPersonalityUI(); closeSettings(); toast('Local workspace cleared.');
});

// Agent files editor
$$('.file-tab').forEach(button => button.addEventListener('click', () => { currentFile = button.dataset.file; loadFileEditor(); }));
$('#fileEditor').addEventListener('input', saveFileEditor);
$('#resetFileBtn').addEventListener('click', () => { if (!confirm(`Reset ${currentFile} to its default contents?`)) return; files[currentFile] = DEFAULT_FILES[currentFile]; persistFiles(); loadFileEditor(); toast(`${currentFile} reset.`); });
$('#copyFileBtn').addEventListener('click', () => copyText($('#fileEditor').value));

// Personality editor
$$('.preset-card').forEach(button => button.addEventListener('click', () => { persona.preset = button.dataset.preset; persistPersona(); syncPersonalityUI(); }));
['personaName', 'responseLength', 'personaTone', 'formatStyle', 'personaNotes'].forEach(id => { const element = $(`#${id}`); element.addEventListener('input', syncPersonaFromInputs); element.addEventListener('change', syncPersonaFromInputs); });
$('#editSoulBtn').addEventListener('click', () => { currentFile = 'SOUL.md'; switchView('files'); loadFileEditor(); });

// Command palette and global keyboard shortcuts
$('#commandInput').addEventListener('input', event => renderCommandList(event.target.value));
$('#commandInput').addEventListener('keydown', event => {
  if (event.key === 'ArrowDown') { event.preventDefault(); moveCommandSelection(1); }
  else if (event.key === 'ArrowUp') { event.preventDefault(); moveCommandSelection(-1); }
  else if (event.key === 'Enter') { event.preventDefault(); const selected = commandItems[commandSelection]; if (selected) runCommand(selected[2]); }
  else if (event.key === 'Escape') closeCommandPalette();
});
$('#commandBackdrop').addEventListener('click', event => { if (event.target === $('#commandBackdrop')) closeCommandPalette(); });
document.addEventListener('keydown', event => {
  const key = event.key.toLowerCase();
  if ((event.ctrlKey || event.metaKey) && key === 'k') { event.preventDefault(); openCommandPalette(); }
  else if ((event.ctrlKey || event.metaKey) && key === ',') { event.preventDefault(); openSettings('connection'); }
  else if (event.key === 'Escape') { if (!$('#settingsBackdrop').hidden) closeSettings(); if (!$('#commandBackdrop').hidden) closeCommandPalette(); $('#effortMenu').hidden = true; }
});
document.addEventListener('click', event => { if (!event.target.closest('.effort-menu') && !event.target.closest('#effortBtn')) $('#effortMenu').hidden = true; });

// Entry gate and workspace startup
$('#entryForm').addEventListener('submit', event => { event.preventDefault(); connectFromEntry(); });
$('#entryToggleKey').addEventListener('click', () => {
  const input = $('#entryApiKey');
  const visible = input.type === 'password';
  input.type = visible ? 'text' : 'password';
  $('#entryToggleKey').textContent = visible ? 'HIDE' : 'SHOW';
  $('#entryToggleKey').setAttribute('aria-label', visible ? 'Hide API key' : 'Show API key');
});

applyAppearance(); updateEffortUI(); updateConnectionStatus(); renderChatList(); syncPersonalityUI(); switchView('chats');
const hasSavedKey = Boolean(currentKey());
$('#entryGate').hidden = hasSavedKey;
$('#appShell').hidden = !hasSavedKey;
if (hasSavedKey) {
  if (activeChatId) showConversation({ revealRecent: true });
  requestAnimationFrame(() => $('#appShell').classList.add('workspace-arriving'));
  window.setTimeout(() => $('#appShell').classList.remove('workspace-arriving'), 1650);
} else {
  requestAnimationFrame(() => $('#entryApiKey').focus());
}
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
