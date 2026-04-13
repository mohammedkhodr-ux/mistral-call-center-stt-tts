/* ─── DDA Admin Panel JavaScript ─────────────────────────────────────────── */

let adminRecording = false;
let adminMediaRecorder = null;
let adminAudioChunks = [];
let testSTTRecording = false;
let testSTTMediaRecorder = null;
let testSTTAudioChunks = [];

// ─── Init ───────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', loadConfigIntoForm);

async function loadConfigIntoForm() {
  try {
    const res = await fetch('/api/config');
    const cfg = await res.json();

    // Model settings
    setVal('cfg-chat-model', cfg.chat_model);
    setVal('cfg-language', cfg.language);
    setVal('cfg-temperature', cfg.temperature);
    document.getElementById('temp-val').textContent = cfg.temperature;
    setVal('cfg-top-p', cfg.top_p);
    document.getElementById('topp-val').textContent = cfg.top_p;
    setVal('cfg-max-tokens', cfg.max_tokens);

    // TTS
    setVal('cfg-tts-model', cfg.tts_model);
    setVal('cfg-voice-id', cfg.voice_id);
    setVal('cfg-tts-format', cfg.tts_response_format);

    // STT
    setVal('cfg-stt-model', cfg.stt_model);
    setVal('cfg-stt-diarize', String(cfg.stt_diarize));

    // Prompts
    setVal('cfg-prompt-en', cfg.system_prompt_en);
    setVal('cfg-prompt-ar', cfg.system_prompt_ar);
  } catch (err) {
    showToast('Failed to load configuration', 'error');
  }
}

function setVal(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

// ─── Section Navigation ────────────────────────────────────────────────────

function showSection(sectionId, btn) {
  // Hide all sections
  document.querySelectorAll('.config-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.sidebar-item').forEach(s => s.classList.remove('active'));

  // Show selected
  const section = document.getElementById('section-' + sectionId);
  if (section) section.classList.add('active');
  if (btn) btn.classList.add('active');
}

// ─── Save Config ────────────────────────────────────────────────────────────

async function saveConfig() {
  const config = {
    chat_model: document.getElementById('cfg-chat-model').value,
    language: document.getElementById('cfg-language').value,
    temperature: parseFloat(document.getElementById('cfg-temperature').value),
    top_p: parseFloat(document.getElementById('cfg-top-p').value),
    max_tokens: parseInt(document.getElementById('cfg-max-tokens').value),
    tts_model: document.getElementById('cfg-tts-model').value,
    voice_id: document.getElementById('cfg-voice-id').value,
    tts_response_format: document.getElementById('cfg-tts-format').value,
    stt_model: document.getElementById('cfg-stt-model').value,
    stt_diarize: document.getElementById('cfg-stt-diarize').value === 'true',
    system_prompt_en: document.getElementById('cfg-prompt-en').value,
    system_prompt_ar: document.getElementById('cfg-prompt-ar').value,
  };

  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });

    if (res.ok) {
      showToast('Configuration saved', 'success');
    } else {
      const data = await res.json();
      showToast(data.detail || 'Failed to save', 'error');
    }
  } catch {
    showToast('Network error', 'error');
  }
}

// ─── Test Chat ──────────────────────────────────────────────────────────────

async function testChat() {
  const btn = document.getElementById('testChatBtn');
  btn.disabled = true;
  btn.textContent = 'Running...';

  const payload = {
    model: document.getElementById('test-chat-model').value,
    temperature: parseFloat(document.getElementById('test-chat-temp').value),
    message: document.getElementById('test-chat-message').value,
    system_prompt: document.getElementById('test-chat-system').value,
  };

  try {
    const res = await fetch('/api/test/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    const resultDiv = document.getElementById('testChatResult');
    const outputDiv = document.getElementById('testChatOutput');
    const statsDiv = document.getElementById('testChatStats');

    resultDiv.style.display = 'block';

    if (res.ok) {
      outputDiv.textContent = data.response;
      outputDiv.classList.remove('error');
      statsDiv.innerHTML = `
        <div class="stat-card">
          <div class="stat-value">${data.usage.prompt_tokens}</div>
          <div class="stat-label">Prompt Tokens</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${data.usage.completion_tokens}</div>
          <div class="stat-label">Completion Tokens</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${data.usage.total_tokens}</div>
          <div class="stat-label">Total Tokens</div>
        </div>`;
    } else {
      outputDiv.textContent = data.detail || 'Error occurred';
      outputDiv.classList.add('error');
      statsDiv.innerHTML = '';
    }
  } catch (err) {
    showToast('Test failed: ' + err.message, 'error');
  }

  btn.disabled = false;
  btn.textContent = 'Run Test';
}

// ─── Test TTS ───────────────────────────────────────────────────────────────

async function testTTS() {
  const btn = document.getElementById('testTTSBtn');
  btn.disabled = true;
  btn.textContent = 'Generating...';

  const payload = {
    model: document.getElementById('test-tts-model').value,
    text: document.getElementById('test-tts-text').value,
    voice_id: document.getElementById('test-tts-voice').value,
    response_format: document.getElementById('test-tts-format').value,
  };

  try {
    const res = await fetch('/api/test/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = document.getElementById('testTTSAudio');
      audio.src = url;
      document.getElementById('testTTSResult').style.display = 'block';
      showToast('Speech generated', 'success');
    } else {
      const data = await res.json();
      showToast(data.detail || 'TTS failed', 'error');
    }
  } catch (err) {
    showToast('TTS test failed: ' + err.message, 'error');
  }

  btn.disabled = false;
  btn.textContent = 'Generate Speech';
}

// ─── Test STT ───────────────────────────────────────────────────────────────

function toggleTestSTTRecording() {
  if (testSTTRecording) {
    stopTestSTTRecording();
  } else {
    startTestSTTRecording();
  }
}

async function startTestSTTRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    testSTTMediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    testSTTAudioChunks = [];

    testSTTMediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) testSTTAudioChunks.push(e.data);
    };

    testSTTMediaRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(testSTTAudioChunks, { type: 'audio/webm' });
      await runTestSTT(blob);
    };

    testSTTMediaRecorder.start();
    testSTTRecording = true;
    document.getElementById('testSTTRecordBtn').classList.add('recording');
    document.getElementById('testSTTRecorder').classList.add('recording');
    document.getElementById('testSTTStatus').textContent = 'Recording... Click to stop';
  } catch {
    showToast('Microphone access denied', 'error');
  }
}

function stopTestSTTRecording() {
  if (testSTTMediaRecorder && testSTTMediaRecorder.state !== 'inactive') {
    testSTTMediaRecorder.stop();
  }
  testSTTRecording = false;
  document.getElementById('testSTTRecordBtn').classList.remove('recording');
  document.getElementById('testSTTRecorder').classList.remove('recording');
  document.getElementById('testSTTStatus').textContent = 'Processing...';
}

async function testSTTFromFile(input) {
  if (!input.files.length) return;
  const blob = input.files[0];
  await runTestSTT(blob);
}

async function runTestSTT(blob) {
  const formData = new FormData();
  formData.append('audio', blob, 'recording.webm');
  formData.append('model', document.getElementById('test-stt-model').value);
  formData.append('diarize', document.getElementById('test-stt-diarize').value);

  try {
    const res = await fetch('/api/test/stt', { method: 'POST', body: formData });
    const data = await res.json();

    const resultDiv = document.getElementById('testSTTResult');
    const outputDiv = document.getElementById('testSTTOutput');
    resultDiv.style.display = 'block';

    if (res.ok) {
      let output = data.text;
      if (data.segments && data.segments.length > 0) {
        output += '\n\n--- Segments ---\n';
        data.segments.forEach(s => {
          const speaker = s.speaker_id ? ` [${s.speaker_id}]` : '';
          output += `[${s.start} -> ${s.end}]${speaker}: ${s.text}\n`;
        });
      }
      outputDiv.textContent = output;
      outputDiv.classList.remove('error');
    } else {
      outputDiv.textContent = data.detail || 'Transcription failed';
      outputDiv.classList.add('error');
    }
  } catch (err) {
    showToast('STT test failed: ' + err.message, 'error');
  }

  document.getElementById('testSTTStatus').textContent = 'Click to record audio for transcription';
}

// ─── Voice Recording (Admin) ───────────────────────────────────────────────

function toggleAdminRecording() {
  if (adminRecording) {
    stopAdminRecording();
  } else {
    startAdminRecording();
  }
}

async function startAdminRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    adminMediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    adminAudioChunks = [];

    adminMediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) adminAudioChunks.push(e.data);
    };

    adminMediaRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(adminAudioChunks, { type: 'audio/webm' });

      // Show preview
      const url = URL.createObjectURL(blob);
      document.getElementById('voicePreview').src = url;
      document.getElementById('voicePlayback').style.display = 'block';

      // Upload
      await uploadVoiceBlob(blob);
    };

    adminMediaRecorder.start();
    adminRecording = true;
    document.getElementById('adminRecordBtn').classList.add('recording');
    document.getElementById('voiceRecorder').classList.add('recording');
    document.getElementById('voiceRecordStatus').textContent = 'Recording... Click to stop';
  } catch {
    showToast('Microphone access denied', 'error');
  }
}

function stopAdminRecording() {
  if (adminMediaRecorder && adminMediaRecorder.state !== 'inactive') {
    adminMediaRecorder.stop();
  }
  adminRecording = false;
  document.getElementById('adminRecordBtn').classList.remove('recording');
  document.getElementById('voiceRecorder').classList.remove('recording');
}

async function uploadVoiceBlob(blob) {
  const formData = new FormData();
  formData.append('audio', blob, 'custom_voice.webm');

  try {
    const res = await fetch('/api/voice/upload', { method: 'POST', body: formData });
    const data = await res.json();

    if (res.ok) {
      document.getElementById('voiceRecordStatus').textContent =
        'Custom voice uploaded (' + Math.round(data.size_bytes / 1024) + ' KB)';
      document.getElementById('voiceRecordStatus').classList.add('has-voice');
      showToast('Custom voice saved', 'success');
    } else {
      showToast('Upload failed', 'error');
    }
  } catch {
    showToast('Upload failed', 'error');
  }
}

async function uploadVoiceFile(input) {
  if (!input.files.length) return;
  const blob = input.files[0];

  // Show preview
  const url = URL.createObjectURL(blob);
  document.getElementById('voicePreview').src = url;
  document.getElementById('voicePlayback').style.display = 'block';

  await uploadVoiceBlob(blob);
}

async function deleteCustomVoice() {
  try {
    const res = await fetch('/api/voice/upload', { method: 'DELETE' });
    if (res.ok) {
      document.getElementById('voiceRecordStatus').textContent = 'Click to start recording a reference voice';
      document.getElementById('voiceRecordStatus').classList.remove('has-voice');
      document.getElementById('voicePlayback').style.display = 'none';
      showToast('Custom voice removed', 'success');
    }
  } catch {
    showToast('Failed to remove voice', 'error');
  }
}

// ─── Toast ──────────────────────────────────────────────────────────────────

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
