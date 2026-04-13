/* ─── Digital Dubai Authority - Citizen Chat Interface ────────────────────── */

let sessionId = crypto.randomUUID();
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
let currentLanguage = 'en';

const messagesArea = document.getElementById('messagesArea');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const voiceBtn = document.getElementById('voiceBtn');
const welcomeBanner = document.getElementById('welcomeBanner');

// ─── Translations ───────────────────────────────────────────────────────────

const i18n = {
  en: {
    headerTitle: 'Digital Dubai Authority',
    headerSubtitle: 'Government Services Assistant',
    welcomeTitle: 'Welcome to Digital Dubai',
    welcomeDesc: 'How can I help you with government services today?',
    placeholder: 'Type your message...',
    svc1: 'Visa Services', svc2: 'Business License', svc3: 'Utility Payments',
    svc4: 'Housing', svc5: 'Healthcare', svc6: 'Education',
    listening: 'Listening...',
    processing: 'Processing your voice...',
    speakNow: 'Speak now',
  },
  ar: {
    headerTitle: 'هيئة دبي الرقمية',
    headerSubtitle: 'مساعد الخدمات الحكومية',
    welcomeTitle: 'مرحباً بكم في دبي الرقمية',
    welcomeDesc: 'كيف يمكنني مساعدتك في الخدمات الحكومية اليوم؟',
    placeholder: 'اكتب رسالتك...',
    svc1: 'خدمات التأشيرات', svc2: 'رخصة تجارية', svc3: 'دفع المرافق',
    svc4: 'الإسكان', svc5: 'الرعاية الصحية', svc6: 'التعليم',
    listening: 'جارٍ الاستماع...',
    processing: 'جارٍ معالجة صوتك...',
    speakNow: 'تحدث الآن',
  }
};

// ─── Init ───────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const config = await fetchConfig();
  if (config) {
    currentLanguage = config.language || 'en';
    applyLanguage(currentLanguage);
  }
  messageInput.addEventListener('input', () => {
    sendBtn.disabled = !messageInput.value.trim();
  });
});

async function fetchConfig() {
  try {
    const res = await fetch('/api/config');
    return await res.json();
  } catch { return null; }
}

// ─── Language ───────────────────────────────────────────────────────────────

function setLanguage(lang) {
  currentLanguage = lang;
  applyLanguage(lang);
  fetch('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language: lang })
  });
}

function applyLanguage(lang) {
  const t = i18n[lang];
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.body.classList.toggle('rtl', lang === 'ar');

  document.getElementById('headerTitle').textContent = t.headerTitle;
  document.getElementById('headerSubtitle').textContent = t.headerSubtitle;
  document.getElementById('welcomeTitle').textContent = t.welcomeTitle;
  document.getElementById('welcomeDesc').textContent = t.welcomeDesc;
  messageInput.placeholder = t.placeholder;

  document.getElementById('svc1').textContent = t.svc1;
  document.getElementById('svc2').textContent = t.svc2;
  document.getElementById('svc3').textContent = t.svc3;
  document.getElementById('svc4').textContent = t.svc4;
  document.getElementById('svc5').textContent = t.svc5;
  document.getElementById('svc6').textContent = t.svc6;

  document.getElementById('langEn').classList.toggle('active', lang === 'en');
  document.getElementById('langAr').classList.toggle('active', lang === 'ar');
}

// ─── Chat ───────────────────────────────────────────────────────────────────

function handleKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function quickAsk(text) {
  messageInput.value = text;
  sendBtn.disabled = false;
  sendMessage();
}

async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  // Hide welcome banner on first message
  welcomeBanner.style.display = 'none';

  addMessage('user', text);
  messageInput.value = '';
  messageInput.style.height = 'auto';
  sendBtn.disabled = true;

  const typingEl = addTypingIndicator();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, session_id: sessionId })
    });

    const data = await res.json();
    removeTypingIndicator(typingEl);

    if (res.ok) {
      addMessage('assistant', data.response, true);
    } else {
      addMessage('assistant', data.detail || 'An error occurred. Please try again.');
    }
  } catch (err) {
    removeTypingIndicator(typingEl);
    addMessage('assistant', 'Connection error. Please check your network and try again.');
  }
}

function addMessage(role, content, withTTS = false) {
  const div = document.createElement('div');
  div.className = `message message-${role}`;

  const avatarText = role === 'user' ? 'U' : 'DD';
  let actionsHTML = '';

  if (withTTS) {
    actionsHTML = `
      <div class="message-actions">
        <button class="message-action-btn" onclick="speakText(this, \`${content.replace(/`/g, '\\`').replace(/\\/g, '\\\\')}\`)" title="Listen">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
          </svg>
          Listen
        </button>
      </div>`;
  }

  div.innerHTML = `
    <div class="message-avatar">${avatarText}</div>
    <div>
      <div class="message-bubble">${escapeHTML(content)}</div>
      ${actionsHTML}
    </div>`;

  messagesArea.appendChild(div);
  messagesArea.scrollTop = messagesArea.scrollHeight;
}

function addTypingIndicator() {
  const div = document.createElement('div');
  div.className = 'message message-assistant';
  div.id = 'typingIndicator';
  div.innerHTML = `
    <div class="message-avatar">DD</div>
    <div class="message-bubble">
      <div class="typing-indicator">
        <span></span><span></span><span></span>
      </div>
    </div>`;
  messagesArea.appendChild(div);
  messagesArea.scrollTop = messagesArea.scrollHeight;
  return div;
}

function removeTypingIndicator(el) {
  if (el && el.parentNode) el.parentNode.removeChild(el);
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ─── Voice Recording (STT) ─────────────────────────────────────────────────

async function toggleRecording() {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    audioChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(audioChunks, { type: 'audio/webm' });
      await transcribeAudio(blob);
    };

    mediaRecorder.start();
    isRecording = true;
    voiceBtn.classList.add('recording');
    showToast(i18n[currentLanguage].speakNow, 'info');
  } catch (err) {
    showToast('Microphone access denied. Please allow microphone access.', 'error');
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  isRecording = false;
  voiceBtn.classList.remove('recording');
}

async function transcribeAudio(blob) {
  showToast(i18n[currentLanguage].processing, 'info');

  const formData = new FormData();
  formData.append('audio', blob, 'recording.webm');

  try {
    const res = await fetch('/api/stt', { method: 'POST', body: formData });
    const data = await res.json();

    if (res.ok && data.text) {
      messageInput.value = data.text;
      sendBtn.disabled = false;
      autoResize(messageInput);
      // Auto-send the transcribed message
      sendMessage();
    } else {
      showToast('Could not transcribe audio. Please try again.', 'error');
    }
  } catch {
    showToast('Transcription failed. Please check your connection.', 'error');
  }
}

// ─── TTS Playback ───────────────────────────────────────────────────────────

async function speakText(btn, text) {
  btn.disabled = true;
  btn.textContent = 'Loading...';

  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    if (!res.ok) throw new Error('TTS failed');

    const audioBlob = await res.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      btn.disabled = false;
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
      </svg> Listen`;
    };

    audio.play();
    btn.textContent = 'Playing...';
  } catch {
    btn.disabled = false;
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
    </svg> Listen`;
    showToast('Failed to generate speech.', 'error');
  }
}

// ─── Toast Notifications ────────────────────────────────────────────────────

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
