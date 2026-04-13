/**
 * Digital Dubai Authority - Voice & Chat Agent
 * Frontend logic: chat, voice recording (STT), text-to-speech (TTS), i18n.
 */

// ---- State ----
const state = {
    language: "en",
    sessionId: crypto.randomUUID(),
    isRecording: false,
    isSending: false,
    mediaRecorder: null,
    audioChunks: [],
    currentAudio: null,
};

// ---- i18n ----
const i18n = {
    en: {
        title: "Digital Dubai",
        subtitle: "Government Services Assistant",
        welcome_title: "Welcome to Digital Dubai",
        welcome_desc:
            "I can help you with Dubai government services. Ask me about DubaiNow, UAE PASS, visa services, fine payments, and more.",
        quick_1: "Pay a traffic fine",
        quick_2: "Register for UAE PASS",
        quick_3: "DubaiNow services",
        quick_4: "Government jobs",
        input_placeholder: "Type your message...",
        listening: "Listening...",
        transcribing: "Transcribing...",
        thinking: "Thinking...",
        speak: "Listen",
        stop: "Stop",
        copy: "Copy",
        copied: "Copied",
        error_mic: "Microphone access denied. Please allow microphone access.",
        error_network: "Network error. Please try again.",
        quick_1_msg: "How do I pay a traffic fine using DubaiNow?",
        quick_2_msg: "How do I register for UAE PASS?",
        quick_3_msg: "What services are available on DubaiNow?",
        quick_4_msg: "How can I apply for a job in Dubai government?",
    },
    ar: {
        title: "دبي الرقمية",
        subtitle: "مساعد الخدمات الحكومية",
        welcome_title: "مرحباً بكم في دبي الرقمية",
        welcome_desc:
            "يمكنني مساعدتك في الخدمات الحكومية في دبي. اسألني عن دبي الآن، الهوية الرقمية، خدمات التأشيرات، دفع المخالفات، والمزيد.",
        quick_1: "دفع مخالفة مرورية",
        quick_2: "التسجيل في الهوية الرقمية",
        quick_3: "خدمات دبي الآن",
        quick_4: "وظائف حكومية",
        input_placeholder: "اكتب رسالتك...",
        listening: "جارٍ الاستماع...",
        transcribing: "جارٍ النسخ...",
        thinking: "جارٍ التفكير...",
        speak: "استمع",
        stop: "إيقاف",
        copy: "نسخ",
        copied: "تم النسخ",
        error_mic: "تم رفض الوصول إلى الميكروفون. يرجى السماح بالوصول.",
        error_network: "خطأ في الشبكة. يرجى المحاولة مرة أخرى.",
        quick_1_msg: "كيف أدفع مخالفة مرورية عبر تطبيق دبي الآن؟",
        quick_2_msg: "كيف أسجل في الهوية الرقمية UAE PASS؟",
        quick_3_msg: "ما هي الخدمات المتوفرة على تطبيق دبي الآن؟",
        quick_4_msg: "كيف يمكنني التقدم لوظيفة في حكومة دبي؟",
    },
};

// ---- DOM refs ----
const chatArea = document.getElementById("chat-area");
const welcome = document.getElementById("welcome");
const msgInput = document.getElementById("msg-input");
const btnSend = document.getElementById("btn-send");
const btnMic = document.getElementById("btn-mic");
const micPulse = document.getElementById("mic-pulse");
const btnReset = document.getElementById("btn-reset");
const langToggle = document.getElementById("lang-toggle");
const langLabel = document.getElementById("lang-label");
const ttsAudio = document.getElementById("tts-audio");

// ---- Helpers ----
function t(key) {
    return i18n[state.language][key] || key;
}

function applyLanguage() {
    const lang = state.language;
    const html = document.documentElement;
    html.setAttribute("lang", lang);
    html.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    langLabel.textContent = lang === "en" ? "AR" : "EN";

    // Update all i18n elements
    document.querySelectorAll("[data-i18n]").forEach((el) => {
        const key = el.getAttribute("data-i18n");
        if (i18n[lang][key]) el.textContent = i18n[lang][key];
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
        const key = el.getAttribute("data-i18n-placeholder");
        if (i18n[lang][key]) el.placeholder = i18n[lang][key];
    });

    // Update quick action messages
    document.querySelectorAll(".quick-btn").forEach((btn) => {
        const key = btn.getAttribute("data-i18n");
        if (key && i18n[lang][key + "_msg"]) {
            btn.setAttribute("data-msg", i18n[lang][key + "_msg"]);
        }
    });
}

function scrollToBottom() {
    requestAnimationFrame(() => {
        chatArea.scrollTop = chatArea.scrollHeight;
    });
}

function showError(msg) {
    const toast = document.createElement("div");
    toast.className = "error-toast";
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function autoResize(textarea) {
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
}

// ---- Message rendering ----
function hideWelcome() {
    if (welcome) welcome.style.display = "none";
}

function addMessage(role, text) {
    hideWelcome();
    const row = document.createElement("div");
    row.className = `msg-row ${role}`;

    const avatar = document.createElement("div");
    avatar.className = "msg-avatar";
    avatar.textContent = role === "user" ? "U" : "DD";

    const content = document.createElement("div");
    content.className = "msg-content";

    const bubble = document.createElement("div");
    bubble.className = "msg-bubble";
    bubble.textContent = text;

    content.appendChild(bubble);

    // Action buttons for assistant messages
    if (role === "assistant") {
        const actions = document.createElement("div");
        actions.className = "msg-actions";

        // TTS button
        const ttsBtn = document.createElement("button");
        ttsBtn.className = "msg-action-btn";
        ttsBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg> ${t("speak")}`;
        ttsBtn.onclick = () => playTTS(text, ttsBtn);
        actions.appendChild(ttsBtn);

        // Copy button
        const copyBtn = document.createElement("button");
        copyBtn.className = "msg-action-btn";
        copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> ${t("copy")}`;
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(text);
            copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> ${t("copied")}`;
            setTimeout(() => {
                copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> ${t("copy")}`;
            }, 2000);
        };
        actions.appendChild(copyBtn);

        content.appendChild(actions);
    }

    row.appendChild(avatar);
    row.appendChild(content);
    chatArea.appendChild(row);
    scrollToBottom();
}

function addTypingIndicator() {
    hideWelcome();
    const row = document.createElement("div");
    row.className = "msg-row assistant";
    row.id = "typing-indicator";

    const avatar = document.createElement("div");
    avatar.className = "msg-avatar";
    avatar.textContent = "DD";

    const content = document.createElement("div");
    content.className = "msg-content";

    const bubble = document.createElement("div");
    bubble.className = "msg-bubble";
    bubble.innerHTML =
        '<div class="typing-indicator"><span></span><span></span><span></span></div>';

    content.appendChild(bubble);
    row.appendChild(avatar);
    row.appendChild(content);
    chatArea.appendChild(row);
    scrollToBottom();
}

function removeTypingIndicator() {
    const el = document.getElementById("typing-indicator");
    if (el) el.remove();
}

function addStatusBar(text) {
    const bar = document.createElement("div");
    bar.className = "status-bar";
    bar.id = "status-bar";
    bar.innerHTML = `<span class="dot"></span> ${text}`;
    chatArea.appendChild(bar);
    scrollToBottom();
}

function removeStatusBar() {
    const el = document.getElementById("status-bar");
    if (el) el.remove();
}

// ---- Chat API ----
async function sendMessage(text) {
    if (!text.trim() || state.isSending) return;

    state.isSending = true;
    btnSend.disabled = true;

    addMessage("user", text.trim());
    addTypingIndicator();

    const formData = new FormData();
    formData.append("message", text.trim());
    formData.append("session_id", state.sessionId);
    formData.append("language", state.language);

    try {
        const resp = await fetch("/api/chat", {
            method: "POST",
            body: formData,
        });

        removeTypingIndicator();

        if (!resp.ok) {
            const err = await resp.text();
            throw new Error(err);
        }

        const data = await resp.json();
        addMessage("assistant", data.reply);
    } catch (err) {
        removeTypingIndicator();
        showError(t("error_network"));
        console.error("Chat error:", err);
    } finally {
        state.isSending = false;
        btnSend.disabled = false;
    }
}

// ---- STT (Voice Input) ----
async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
        });
        state.audioChunks = [];

        // Use webm/opus if available, fallback to whatever the browser supports
        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
            ? "audio/webm;codecs=opus"
            : MediaRecorder.isTypeSupported("audio/webm")
              ? "audio/webm"
              : "audio/mp4";

        state.mediaRecorder = new MediaRecorder(stream, { mimeType });

        state.mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) state.audioChunks.push(e.data);
        };

        state.mediaRecorder.onstop = async () => {
            // Stop all tracks
            stream.getTracks().forEach((track) => track.stop());

            const audioBlob = new Blob(state.audioChunks, { type: mimeType });
            await transcribeAudio(audioBlob);
        };

        state.mediaRecorder.start();
        state.isRecording = true;
        btnMic.classList.add("recording");
        micPulse.classList.remove("hidden");
        addStatusBar(t("listening"));
    } catch (err) {
        showError(t("error_mic"));
        console.error("Mic error:", err);
    }
}

function stopRecording() {
    if (state.mediaRecorder && state.isRecording) {
        state.mediaRecorder.stop();
        state.isRecording = false;
        btnMic.classList.remove("recording");
        micPulse.classList.add("hidden");
        removeStatusBar();
    }
}

async function transcribeAudio(blob) {
    addStatusBar(t("transcribing"));

    const formData = new FormData();
    formData.append("audio", blob, "recording.webm");
    if (state.language) {
        formData.append("language", state.language);
    }

    try {
        const resp = await fetch("/api/stt", {
            method: "POST",
            body: formData,
        });

        removeStatusBar();

        if (!resp.ok) {
            const err = await resp.text();
            throw new Error(err);
        }

        const data = await resp.json();
        if (data.text && data.text.trim()) {
            await sendMessage(data.text);
        }
    } catch (err) {
        removeStatusBar();
        showError(t("error_network"));
        console.error("STT error:", err);
    }
}

// ---- TTS (Voice Output) ----
async function playTTS(text, btn) {
    // If already playing, stop
    if (state.currentAudio && !state.currentAudio.paused) {
        state.currentAudio.pause();
        state.currentAudio.currentTime = 0;
        state.currentAudio = null;
        if (btn) btn.classList.remove("playing");
        return;
    }

    if (btn) {
        btn.classList.add("playing");
        const origHTML = btn.innerHTML;
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg> ${t("stop")}`;

        const restore = () => {
            btn.classList.remove("playing");
            btn.innerHTML = origHTML;
        };

        try {
            const formData = new FormData();
            formData.append("text", text);

            const resp = await fetch("/api/tts", {
                method: "POST",
                body: formData,
            });

            if (!resp.ok) throw new Error(await resp.text());

            const data = await resp.json();
            if (data.audio_data) {
                const audio = new Audio(
                    `data:audio/wav;base64,${data.audio_data}`,
                );
                state.currentAudio = audio;
                audio.onended = restore;
                audio.onerror = restore;
                await audio.play();
            } else {
                restore();
            }
        } catch (err) {
            restore();
            showError(t("error_network"));
            console.error("TTS error:", err);
        }
    }
}

// ---- Event Listeners ----

// Send on button click
btnSend.addEventListener("click", () => {
    const text = msgInput.value;
    msgInput.value = "";
    msgInput.style.height = "auto";
    sendMessage(text);
});

// Send on Enter (Shift+Enter for newline)
msgInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        btnSend.click();
    }
});

// Auto-resize textarea
msgInput.addEventListener("input", () => autoResize(msgInput));

// Mic toggle
btnMic.addEventListener("click", () => {
    if (state.isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
});

// Reset conversation
btnReset.addEventListener("click", async () => {
    try {
        const formData = new FormData();
        formData.append("session_id", state.sessionId);
        await fetch("/api/reset", { method: "POST", body: formData });
    } catch (_) {
        // ignore
    }

    // Generate new session
    state.sessionId = crypto.randomUUID();

    // Clear chat UI
    chatArea.innerHTML = "";
    chatArea.appendChild(welcome);
    welcome.style.display = "";
    applyLanguage();
});

// Language toggle
langToggle.addEventListener("click", () => {
    state.language = state.language === "en" ? "ar" : "en";
    applyLanguage();
});

// Quick action buttons
document.querySelectorAll(".quick-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
        const msg = btn.getAttribute("data-msg");
        if (msg) sendMessage(msg);
    });
});

// ---- Init ----
applyLanguage();
