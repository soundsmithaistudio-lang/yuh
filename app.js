// Lambeck AI - ChatGPT Style Interface

// Global State
const apiBase = '/api';
let currentModel = null;
let recognition = null;
let isListening = false;
let isInVoiceCall = false;
let isMuted = false;
let currentTheme = 'dark';
let voiceOutput = true;
let soundEffects = true;
let autoScroll = true;
let messageCount = 0;
let chatHistory = [];
let conversations = [];
let activeConversationId = null;
let conversationBranches = {};
let speechSynthesis = window.speechSynthesis;
let currentVoice = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
    await initializeApp();
});

async function initializeApp() {
    // Set initial theme
    document.documentElement.setAttribute('data-theme', currentTheme);
    
    // Initialize components
    setupVoiceRecognition();
    setupVoiceOutput();
    setupInputHandlers();
    setupThemeSystem();
    setupParticleSystem();
    setupNeuralNetwork();
    updateUI();

    // Load saved settings
    await loadSettings();
    await bootstrapConversationSync();

    // Show welcome animation
    showWelcomeAnimation();
}

// Voice Output Setup
function setupVoiceOutput() {
    if ('speechSynthesis' in window) {
        function loadVoices() {
            const voices = speechSynthesis.getVoices();
            currentVoice = voices.find(voice => voice.lang.startsWith('en')) || voices[0];
        }
        
        if (speechSynthesis.getVoices().length > 0) {
            loadVoices();
        } else {
            speechSynthesis.addEventListener('voiceschanged', loadVoices);
        }
    }
}

// Speech synthesis function (Enhanced version is below)

// Voice Recognition Setup (Enhanced version is below)

// Input Handlers
function setupInputHandlers() {
    const messageInput = document.getElementById('message-input');
    
    if (messageInput) {
        messageInput.addEventListener('input', function() {
            updateCharCount();
            autoResizeTextarea(this);
        });
        
        messageInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
}

function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
}

function updateCharCount() {
    const messageInput = document.getElementById('message-input');
    const charCount = document.getElementById('char-count');
    
    if (messageInput && charCount) {
        charCount.textContent = messageInput.value.length;
    }
}

// Theme System
function setupThemeSystem() {
    // Auto-detect system theme
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        currentTheme = 'dark';
    } else {
        currentTheme = 'light';
    }
    
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon();
}

function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon();
    saveSettings();
}

function changeTheme(theme) {
    currentTheme = theme;
    if (theme === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        currentTheme = prefersDark ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon();
    saveSettings();
}

function updateThemeIcon() {
    const themeToggle = document.querySelector('.theme-toggle i');
    if (themeToggle) {
        themeToggle.className = currentTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// Voice Call Functions
function toggleVoiceCall() {
    if (isInVoiceCall) {
        endVoiceCall();
    } else {
        startVoiceCall();
    }
}

function startVoiceCall() {
    if (!recognition) {
        showToast('Voice recognition not supported in this browser', 'error');
        return;
    }
    
    isInVoiceCall = true;
    const overlay = document.getElementById('voice-call-overlay');
    const callBtn = document.getElementById('voice-call-btn');
    
    overlay.classList.add('active');
    callBtn.classList.add('active');
    callBtn.innerHTML = `
        <div class="call-icon">
            <i class="fas fa-phone-slash"></i>
        </div>
        <span class="call-text">End Call</span>
    `;
    
    updateCallStatus('Starting call...');
    
    // Start listening
    setTimeout(() => {
        updateCallStatus('Connected - Say something!');
        if (!isMuted) {
            recognition.start();
        }
    }, 1500);
    
    showToast('Voice call started', 'success');
}

function endVoiceCall() {
    isInVoiceCall = false;
    isMuted = false;
    
    if (recognition && isListening) {
        recognition.stop();
    }
    
    speechSynthesis.cancel();
    
    const overlay = document.getElementById('voice-call-overlay');
    const callBtn = document.getElementById('voice-call-btn');
    
    overlay.classList.remove('active');
    callBtn.classList.remove('active');
    callBtn.innerHTML = `
        <div class="call-icon">
            <i class="fas fa-phone"></i>
        </div>
        <span class="call-text">Start Voice Call</span>
    `;
    
    // Clear transcript
    const transcriptContent = document.getElementById('transcript-content');
    if (transcriptContent) {
        transcriptContent.innerHTML = '';
    }
    
    showToast('Voice call ended', 'info');
}

function toggleMute() {
    isMuted = !isMuted;
    const muteBtn = document.querySelector('.mute-btn i');
    
    if (isMuted) {
        muteBtn.className = 'fas fa-microphone-slash';
        if (recognition && isListening) {
            recognition.stop();
        }
        updateCallStatus('Muted');
    } else {
        muteBtn.className = 'fas fa-microphone';
        if (isInVoiceCall) {
            recognition.start();
        }
    }
}

function toggleSpeaker() {
    // Toggle speaker (visual feedback only for now)
    const speakerBtn = document.querySelector('.speaker-btn i');
    speakerBtn.className = speakerBtn.className === 'fas fa-volume-up' ? 'fas fa-volume-mute' : 'fas fa-volume-up';
}

function updateCallStatus(status) {
    const callStatus = document.getElementById('call-status');
    if (callStatus) {
        callStatus.textContent = status;
    }
}

function addToTranscript(speaker, text) {
    const transcriptContent = document.getElementById('transcript-content');
    if (transcriptContent) {
        const entry = document.createElement('div');
        entry.innerHTML = `<strong>${speaker}:</strong> ${text}`;
        entry.style.marginBottom = '8px';
        transcriptContent.appendChild(entry);
        transcriptContent.scrollTop = transcriptContent.scrollHeight;
    }

    queueMicrotask(() => persistTranscriptToServer(speaker, text));
}

// Voice Input Functions
function toggleVoiceInput() {
    if (!recognition) {
        showToast('Voice recognition not supported in this browser', 'error');
        return;
    }
    
    if (isListening) {
        recognition.stop();
    } else {
        recognition.start();
    }
}

function updateVoiceButton() {
    const voiceBtn = document.getElementById('voice-btn');
    if (voiceBtn) {
        const icon = voiceBtn.querySelector('i');
        if (isListening) {
            icon.className = 'fas fa-stop';
            voiceBtn.style.background = '#ef4444';
            voiceBtn.style.color = 'white';
        } else {
            icon.className = 'fas fa-microphone';
            voiceBtn.style.background = '';
            voiceBtn.style.color = '';
        }
    }
}

// Message Functions
async function sendMessage(messageText = null) {
    const messageInput = document.getElementById('message-input');
    const message = messageText || messageInput.value.trim();
    
    if (!message) return;
    
    // Clear input if not from voice call
    if (!messageText) {
        messageInput.value = '';
        updateCharCount();
        autoResizeTextarea(messageInput);
    }
    
    // Add user message
    addMessage('user', message);
    
    // Show loading
    showLoadingIndicator();
    
    try {
        const startTime = Date.now();
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: message })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const responseTime = Date.now() - startTime;
        
        hideLoadingIndicator();
        addMessage('ai', data.response);
        
        // Update stats
        updateResponseTime(responseTime);
        
        // Speak response if voice output is enabled
        if (voiceOutput) {
            speakText(data.response);
        }
        
        // Add to transcript if in voice call
        if (isInVoiceCall) {
            addToTranscript('AI', data.response);
        }
        
        if (soundEffects) {
            playSound('message');
        }
        
    } catch (error) {
        console.error('Error sending message:', error);
        hideLoadingIndicator();
        addMessage('system', 'Sorry, there was an error processing your message. Please try again.');
        showToast('Failed to send message', 'error');
    }
}

function addMessage(sender, text) {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    
    if (sender === 'user') {
        avatar.innerHTML = '<i class="fas fa-user"></i>';
    } else if (sender === 'ai') {
        avatar.innerHTML = '<i class="fas fa-brain"></i>';
    } else {
        avatar.innerHTML = '<i class="fas fa-cog"></i>';
    }
    
    const content = document.createElement('div');
    content.className = 'message-content';
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    
    const messageText = document.createElement('div');
    messageText.className = 'message-text';
    messageText.textContent = text;
    
    const time = document.createElement('div');
    time.className = 'message-time';
    time.textContent = new Date().toLocaleTimeString();
    
    bubble.appendChild(messageText);
    bubble.appendChild(time);
    content.appendChild(bubble);
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    
    messagesContainer.appendChild(messageDiv);
    
    // Update message count
    messageCount++;
    updateMessageCount();
    
    // Auto-scroll
    if (autoScroll) {
        scrollToBottom();
    }
    
    // Hide welcome message if it exists
    const welcomeMessage = document.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.style.display = 'none';
    }

    queueMicrotask(() => persistMessageToServer(sender, text));
}

function scrollToBottom() {
    const messagesContainer = document.getElementById('messages-container');
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

function updateMessageCount() {
    const messageCountEl = document.getElementById('message-count');
    if (messageCountEl) {
        messageCountEl.textContent = messageCount;
    }
}

function updateResponseTime(time) {
    const responseTimeEl = document.getElementById('response-time');
    if (responseTimeEl) {
        responseTimeEl.textContent = `${time}ms`;
    }
}

// Backend Sync Helpers
async function bootstrapConversationSync() {
    try {
        await refreshConversationList();
        if (!activeConversationId) {
            const created = await createConversationOnServer('New Conversation');
            activeConversationId = created ? created.id : null;
        }
        updateConversationIndicator();
    } catch (error) {
        console.warn('Unable to bootstrap conversation sync', error);
    }
}

async function refreshConversationList() {
    try {
        const response = await fetch(`${apiBase}/conversations`);
        if (!response.ok) return;
        conversations = await response.json();
        conversationBranches = conversations.reduce((branches, convo) => {
            if (!convo.parent_id) return branches;
            if (!branches[convo.parent_id]) branches[convo.parent_id] = [];
            branches[convo.parent_id].push(convo.id);
            return branches;
        }, {});
        if (conversations.length > 0 && !activeConversationId) {
            activeConversationId = conversations[0].id;
        }
        updateConversationIndicator();
    } catch (error) {
        console.warn('Unable to refresh conversations', error);
    }
}

function updateConversationIndicator() {
    const indicator = document.querySelector('.model-indicator');
    if (!indicator) return;

    let badge = document.getElementById('conversation-status');
    if (!badge) {
        badge = document.createElement('span');
        badge.id = 'conversation-status';
        badge.className = 'conversation-status';
        badge.style.marginLeft = '12px';
        badge.style.fontSize = '12px';
        badge.style.opacity = '0.8';
        indicator.appendChild(badge);
    }

    const active = conversations.find(c => c.id === activeConversationId);
    badge.textContent = active ? `Conversation: ${active.title}` : 'Conversation: none';
}

async function ensureActiveConversation(parentId = null) {
    if (activeConversationId) return activeConversationId;
    const created = await createConversationOnServer('New Conversation', parentId);
    activeConversationId = created ? created.id : null;
    updateConversationIndicator();
    return activeConversationId;
}

async function createConversationOnServer(title, parentId = null) {
    try {
        const response = await fetch(`${apiBase}/conversations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title, parent_id: parentId || null })
        });

        if (!response.ok) throw new Error('Failed to create conversation');
        const data = await response.json();
        conversations.unshift(data);
        updateConversationIndicator();
        return data;
    } catch (error) {
        console.warn('Unable to create conversation', error);
        return null;
    }
}

async function persistMessageToServer(sender, content, parentMessageId = null) {
    try {
        const conversationId = await ensureActiveConversation();
        if (!conversationId) return;
        await fetch(`${apiBase}/conversations/${conversationId}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sender, content, parent_message_id: parentMessageId })
        });
    } catch (error) {
        console.warn('Unable to persist message', error);
    }
}

async function persistTranscriptToServer(speaker, content) {
    try {
        const conversationId = await ensureActiveConversation();
        if (!conversationId) return;
        await fetch(`${apiBase}/conversations/${conversationId}/transcripts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ speaker, content })
        });
    } catch (error) {
        console.warn('Unable to persist transcript', error);
    }
}

// UI Functions
function showLoadingIndicator() {
    const indicator = document.getElementById('loading-indicator');
    if (indicator) {
        indicator.classList.add('active');
    }
}

function hideLoadingIndicator() {
    const indicator = document.getElementById('loading-indicator');
    if (indicator) {
        indicator.classList.remove('active');
    }
}

function showWelcomeAnimation() {
    const welcomeMessage = document.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.style.opacity = '0';
        welcomeMessage.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            welcomeMessage.style.transition = 'all 0.5s ease';
            welcomeMessage.style.opacity = '1';
            welcomeMessage.style.transform = 'translateY(0)';
        }, 100);
    }
}

// Settings Functions
function openSettings() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.classList.add('active');
    }
}

function closeSettings() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function toggleVoiceOutput(enabled) {
    voiceOutput = enabled;
    saveSettings();
}

function toggleSoundEffects(enabled) {
    soundEffects = enabled;
    saveSettings();
}

function toggleAutoScroll(enabled) {
    autoScroll = enabled;
    saveSettings();
}

function saveSettings() {
    const settings = {
        theme: currentTheme,
        voiceOutput,
        soundEffects,
        autoScroll
    };
    localStorage.setItem('lambeck-ai-settings', JSON.stringify(settings));
    syncSettingsWithBackend(settings);
}

async function loadSettings() {
    const saved = localStorage.getItem('lambeck-ai-settings');
    if (saved) {
        const settings = JSON.parse(saved);
        currentTheme = settings.theme || 'dark';
        voiceOutput = settings.voiceOutput !== undefined ? settings.voiceOutput : true;
        soundEffects = settings.soundEffects !== undefined ? settings.soundEffects : true;
        autoScroll = settings.autoScroll !== undefined ? settings.autoScroll : true;
        
        // Apply settings
        document.documentElement.setAttribute('data-theme', currentTheme);
        if (document.getElementById('theme-select')) {
            document.getElementById('theme-select').value = currentTheme;
        }
        if (document.getElementById('voice-output')) {
            document.getElementById('voice-output').checked = voiceOutput;
        }
        if (document.getElementById('sound-effects')) {
            document.getElementById('sound-effects').checked = soundEffects;
        }
        if (document.getElementById('auto-scroll')) {
            document.getElementById('auto-scroll').checked = autoScroll;
        }
        updateThemeIcon();
    }

    await loadBackendSettings();
}

async function loadBackendSettings() {
    try {
        const response = await fetch(`${apiBase}/settings`);
        if (!response.ok) return;

        const data = await response.json();
        if (data.values) {
            currentTheme = data.values.theme || currentTheme;
            voiceOutput = data.values.voiceOutput !== undefined ? data.values.voiceOutput : voiceOutput;
            soundEffects = data.values.soundEffects !== undefined ? data.values.soundEffects : soundEffects;
            autoScroll = data.values.autoScroll !== undefined ? data.values.autoScroll : autoScroll;
            document.documentElement.setAttribute('data-theme', currentTheme);
            updateThemeIcon();
        }
    } catch (error) {
        console.warn('Unable to load settings from backend', error);
    }
}

async function syncSettingsWithBackend(settings) {
    try {
        await fetch(`${apiBase}/settings`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ values: settings })
        });
    } catch (error) {
        console.warn('Unable to sync settings to backend', error);
    }
}

// Utility Functions
function clearChat() {
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) {
        messagesContainer.innerHTML = '';
    }
    
    messageCount = 0;
    updateMessageCount();

    activeConversationId = null;
    ensureActiveConversation();
    updateConversationIndicator();
    
    // Show welcome message again
    const welcomeMessage = document.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.style.display = 'block';
    }
    
    showToast('Chat cleared', 'info');
}

async function exportChat() {
    try {
        const conversationId = await ensureActiveConversation();
        if (!conversationId) {
            showToast('No conversation available to export', 'error');
            return;
        }

        const response = await fetch(`${apiBase}/conversations/${conversationId}/export`);
        if (!response.ok) throw new Error('Export failed');

        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `conversation-${conversationId}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('Conversation exported', 'success');
    } catch (error) {
        console.warn('Export failed', error);
        showToast('Failed to export conversation', 'error');
    }
}

async function importConversationFromFile(file) {
    try {
        const text = await file.text();
        const payload = JSON.parse(text);
        const response = await fetch(`${apiBase}/conversations/import`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Import failed');
        const conversation = await response.json();
        activeConversationId = conversation.id;
        await refreshConversationList();
        showToast('Conversation imported', 'success');
    } catch (error) {
        console.warn('Import failed', error);
        showToast('Failed to import conversation', 'error');
    }
}

function promptConversationImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (file) {
            await importConversationFromFile(file);
        }
    });
    input.click();
}

function useQuickPrompt(prompt) {
    const messageInput = document.getElementById('message-input');
    if (messageInput) {
        messageInput.value = prompt;
        updateCharCount();
        autoResizeTextarea(messageInput);
        messageInput.focus();
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function playSound(type) {
    if (!soundEffects) return;
    
    // Create audio context for sound effects
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        if (type === 'message') {
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
        }
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
        console.log('Audio not supported');
    }
}

function updateUI() {
    updateCharCount();
    updateMessageCount();
    updateThemeIcon();
}

// Sidebar Functions (for mobile/optional features)
function openSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.add('active');
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.remove('active');
    }
}

function showModelSelector() {
    showToast('Model selector coming soon!', 'info');
}

// Close modals when clicking outside
document.addEventListener('click', function(e) {
    const settingsModal = document.getElementById('settings-modal');
    const voiceCallOverlay = document.getElementById('voice-call-overlay');
    
    if (settingsModal && e.target === settingsModal) {
        closeSettings();
    }
    
    if (voiceCallOverlay && e.target === voiceCallOverlay) {
        // Don't close voice call overlay by clicking outside
    }
});

// Particle System
function setupParticleSystem() {
    const particlesContainer = document.createElement('div');
    particlesContainer.className = 'particles';
    document.body.appendChild(particlesContainer);
    
    function createParticle() {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // Random starting position
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDuration = (Math.random() * 10 + 5) + 's';
        particle.style.animationDelay = Math.random() * 5 + 's';
        
        // Random color
        const colors = ['var(--neon-cyan)', 'var(--neon-purple)', 'var(--neon-pink)', 'var(--neon-green)'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        particle.style.background = color;
        particle.style.boxShadow = `0 0 10px ${color}`;
        
        particlesContainer.appendChild(particle);
        
        // Remove particle after animation
        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        }, 15000);
    }
    
    // Create particles continuously
    setInterval(createParticle, 2000);
    
    // Create initial particles
    for (let i = 0; i < 10; i++) {
        setTimeout(createParticle, i * 200);
    }
}

// Neural Network Background
function setupNeuralNetwork() {
    const canvas = document.createElement('canvas');
    canvas.className = 'neural-network';
    document.body.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    let animationId;
    
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    const nodes = [];
    const nodeCount = 50;
    
    // Create nodes
    for (let i = 0; i < nodeCount; i++) {
        nodes.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            radius: Math.random() * 2 + 1
        });
    }
    
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Update and draw nodes
        nodes.forEach(node => {
            node.x += node.vx;
            node.y += node.vy;
            
            // Bounce off edges
            if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
            if (node.y < 0 || node.y > canvas.height) node.vy *= -1;
            
            // Draw node
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 255, 255, 0.6)';
            ctx.fill();
            
            // Draw connections
            nodes.forEach(otherNode => {
                const distance = Math.sqrt(
                    Math.pow(node.x - otherNode.x, 2) + 
                    Math.pow(node.y - otherNode.y, 2)
                );
                
                if (distance < 100) {
                    ctx.beginPath();
                    ctx.moveTo(node.x, node.y);
                    ctx.lineTo(otherNode.x, otherNode.y);
                    ctx.strokeStyle = `rgba(0, 255, 255, ${0.3 * (1 - distance / 100)})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            });
        });
        
        animationId = requestAnimationFrame(animate);
    }
    
    animate();
}

// Voice Reactive Effects
function addVoiceReactiveEffect(element) {
    if (element) {
        element.classList.add('voice-active');
        setTimeout(() => {
            element.classList.remove('voice-active');
        }, 500);
    }
}

// Enhanced Voice Recognition with Visual Effects
function setupVoiceRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        recognition.onstart = function() {
            isListening = true;
            updateVoiceButton();
            
            // Add visual effects
            const voiceBtn = document.getElementById('voice-btn');
            addVoiceReactiveEffect(voiceBtn);
            
            if (isInVoiceCall) {
                updateCallStatus('Listening...');
                const callAvatar = document.querySelector('.call-avatar');
                addVoiceReactiveEffect(callAvatar);
            }
        };
        
        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            
            if (isInVoiceCall) {
                addToTranscript('You', transcript);
                sendMessage(transcript);
            } else {
                document.getElementById('message-input').value = transcript;
                updateCharCount();
            }
        };
        
        recognition.onend = function() {
            isListening = false;
            updateVoiceButton();
            
            if (isInVoiceCall && !isMuted) {
                setTimeout(() => {
                    if (isInVoiceCall && !isMuted) {
                        recognition.start();
                    }
                }, 1000);
            }
        };
        
        recognition.onerror = function(event) {
            console.error('Speech recognition error:', event.error);
            isListening = false;
            updateVoiceButton();
            
            if (event.error === 'not-allowed') {
                showToast('Microphone access denied. Please enable microphone permissions.', 'error');
            }
        };
    }
}

// Enhanced Speech Synthesis with Visual Effects
function speakText(text) {
    if (!voiceOutput || !('speechSynthesis' in window)) {
        return;
    }
    
    speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    if (currentVoice) {
        utterance.voice = currentVoice;
    }
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;
    
    utterance.onstart = function() {
        // Add visual effects when AI starts speaking
        const aiMessages = document.querySelectorAll('.message.ai .message-bubble');
        if (aiMessages.length > 0) {
            const lastMessage = aiMessages[aiMessages.length - 1];
            addVoiceReactiveEffect(lastMessage);
        }
        
        if (isInVoiceCall) {
            updateCallStatus('AI is speaking...');
            const callAvatar = document.querySelector('.call-avatar');
            addVoiceReactiveEffect(callAvatar);
        }
    };
    
    utterance.onend = function() {
        if (isInVoiceCall) {
            updateCallStatus('Listening...');
        }
    };
    
    utterance.onerror = function(event) {
        console.error('Speech synthesis error:', event.error);
    };
    
    speechSynthesis.speak(utterance);
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Escape key closes modals
    if (e.key === 'Escape') {
        closeSettings();
        closeSidebar();
    }
    
    // Ctrl/Cmd + Enter sends message
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        sendMessage();
    }
    
    // Ctrl/Cmd + K clears chat
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        clearChat();
    }
});

// REVOLUTIONARY ADVANCED FEATURES

// Advanced Sidebar Management
function toggleAdvancedSidebar() {
    const sidebar = document.getElementById('advanced-sidebar');
    sidebar.classList.toggle('active');
    
    // Add particle effect when opening
    if (sidebar.classList.contains('active')) {
        createSidebarParticles();
    }
}

function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    const header = section.previousElementSibling;
    
    section.classList.toggle('active');
    header.classList.toggle('active');
    
    // Animate section opening
    if (section.classList.contains('active')) {
        section.style.maxHeight = section.scrollHeight + 'px';
    } else {
        section.style.maxHeight = '0px';
    }
}

function createSidebarParticles() {
    const sidebar = document.getElementById('advanced-sidebar');
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.style.position = 'absolute';
        particle.style.width = '4px';
        particle.style.height = '4px';
        particle.style.background = 'var(--neon-cyan)';
        particle.style.borderRadius = '50%';
        particle.style.pointerEvents = 'none';
        particle.style.left = Math.random() * 500 + 'px';
        particle.style.top = Math.random() * window.innerHeight + 'px';
        particle.style.animation = 'float 3s ease-in-out infinite';
        particle.style.boxShadow = '0 0 10px var(--neon-cyan)';
        
        sidebar.appendChild(particle);
        
        setTimeout(() => {
            particle.remove();
        }, 3000);
    }
}

// Model Ablation System
function openModelAblation() {
    showModal('model-ablation-modal');
    initializeAblationControls();
}

function initializeAblationControls() {
    const slider = document.getElementById('censorship-level');
    const sliderLabels = document.querySelector('.slider-labels');
    
    slider.addEventListener('input', function() {
        const value = this.value;
        const color = value < 33 ? 'var(--neon-green)' : 
                     value < 66 ? 'var(--neon-orange)' : 'var(--neon-pink)';
        this.style.background = `linear-gradient(90deg, ${color} 0%, ${color} ${value}%, rgba(255,255,255,0.1) ${value}%)`;
        
        // Update warning level
        updateAblationWarning(value);
    });
}

function updateAblationWarning(level) {
    const warningBox = document.querySelector('.warning-box');
    const warningText = warningBox.querySelector('p');
    
    if (level < 33) {
        warningText.textContent = 'Safe mode: Standard content filtering active.';
        warningBox.style.borderColor = 'var(--neon-green)';
        warningBox.style.color = 'var(--neon-green)';
    } else if (level < 66) {
        warningText.textContent = 'Moderate mode: Reduced content filtering. Use with caution.';
        warningBox.style.borderColor = 'var(--neon-orange)';
        warningBox.style.color = 'var(--neon-orange)';
    } else {
        warningText.textContent = 'Unrestricted mode: All safety filters disabled. High risk content possible.';
        warningBox.style.borderColor = 'var(--neon-pink)';
        warningBox.style.color = 'var(--neon-pink)';
    }
}

function applyAblation() {
    const level = document.getElementById('censorship-level').value;
    const contentFilter = document.getElementById('bypass-content-filter').checked;
    const ethicalConstraints = document.getElementById('bypass-ethical-constraints').checked;
    const refusalTraining = document.getElementById('bypass-refusal-training').checked;
    const method = document.getElementById('ablation-method').value;
    
    // Show loading animation
    showToast('Applying model ablation...', 'info');
    
    // Simulate ablation process
    setTimeout(() => {
        showToast(`Model ablation applied! Level: ${level}%, Method: ${method}`, 'success');
        closeModal('model-ablation-modal');
        
        // Update model indicator to show ablated state
        const modelIndicator = document.getElementById('current-model');
        modelIndicator.textContent = 'test_model.gguf (Ablated)';
        modelIndicator.style.color = 'var(--neon-pink)';
    }, 3000);
}

// Multi-Model Comparison
function openModelComparison() {
    showModal('model-comparison-modal');
}

function toggleModelComparison() {
    openModelComparison();
}

function startComparison() {
    const selectedModels = [];
    const modelCheckboxes = document.querySelectorAll('#model-comparison-modal input[type="checkbox"]:checked');
    
    modelCheckboxes.forEach(checkbox => {
        if (checkbox.id.startsWith('model-')) {
            selectedModels.push(checkbox.nextElementSibling.textContent);
        }
    });
    
    if (selectedModels.length < 2) {
        showToast('Please select at least 2 models for comparison', 'error');
        return;
    }
    
    showToast(`Starting comparison with ${selectedModels.length} models...`, 'info');
    closeModal('model-comparison-modal');
    
    // Initialize comparison interface
    initializeComparisonInterface(selectedModels);
}

function initializeComparisonInterface(models) {
    // Create comparison layout
    const chatContainer = document.querySelector('.chat-container');
    chatContainer.innerHTML = `
        <div class="comparison-header">
            <h2><i class="fas fa-layer-group"></i> Multi-Model Comparison</h2>
            <button onclick="exitComparison()" class="exit-comparison">
                <i class="fas fa-times"></i> Exit Comparison
            </button>
        </div>
        <div class="comparison-grid">
            ${models.map(model => `
                <div class="model-comparison-panel">
                    <div class="model-header">
                        <h3>${model}</h3>
                        <div class="model-metrics">
                            <span class="metric">Speed: <span class="speed-metric">--</span></span>
                            <span class="metric">Quality: <span class="quality-metric">--</span></span>
                        </div>
                    </div>
                    <div class="model-messages" id="messages-${model.replace(/\s+/g, '-')}">
                        <!-- Messages will appear here -->
                    </div>
                </div>
            `).join('')}
        </div>
        <div class="comparison-input">
            <input type="text" id="comparison-message" placeholder="Enter message to compare across all models...">
            <button onclick="sendComparisonMessage()">
                <i class="fas fa-paper-plane"></i>
            </button>
        </div>
    `;
}

function exitComparison() {
    location.reload(); // Simple way to restore normal interface
}

// Performance Analytics
function togglePerformanceAnalytics() {
    openPerformanceAnalytics();
}

function openPerformanceAnalytics() {
    // Create analytics modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'performance-analytics-modal';
    modal.innerHTML = `
        <div class="modal-content advanced-modal large">
            <div class="modal-header">
                <h3><i class="fas fa-chart-line"></i> Performance Analytics</h3>
                <button class="modal-close" onclick="closeModal('performance-analytics-modal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="analytics-dashboard">
                    <div class="analytics-grid">
                        <div class="analytics-card">
                            <h4>Response Time</h4>
                            <div class="metric-value">1.2s</div>
                            <div class="metric-trend up">↗ 15% faster</div>
                        </div>
                        <div class="analytics-card">
                            <h4>Token Generation</h4>
                            <div class="metric-value">45 t/s</div>
                            <div class="metric-trend up">↗ 8% improvement</div>
                        </div>
                        <div class="analytics-card">
                            <h4>Memory Usage</h4>
                            <div class="metric-value">2.1 GB</div>
                            <div class="metric-trend down">↘ 5% reduction</div>
                        </div>
                        <div class="analytics-card">
                            <h4>Quality Score</h4>
                            <div class="metric-value">94%</div>
                            <div class="metric-trend up">↗ 2% increase</div>
                        </div>
                    </div>
                    <div class="analytics-chart">
                        <canvas id="performance-chart" width="800" height="400"></canvas>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    showModal('performance-analytics-modal');
    
    // Initialize performance chart
    initializePerformanceChart();
}

function initializePerformanceChart() {
    const canvas = document.getElementById('performance-chart');
    const ctx = canvas.getContext('2d');
    
    // Simple performance visualization
    ctx.strokeStyle = 'var(--neon-cyan)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const data = [20, 35, 45, 30, 55, 40, 65, 50, 70, 60];
    const width = canvas.width;
    const height = canvas.height;
    
    for (let i = 0; i < data.length; i++) {
        const x = (i / (data.length - 1)) * width;
        const y = height - (data[i] / 100) * height;
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    
    ctx.stroke();
    
    // Add glow effect
    ctx.shadowColor = 'var(--neon-cyan)';
    ctx.shadowBlur = 10;
    ctx.stroke();
}

// Advanced Feature Functions
function openModelTraining() {
    showToast('Real-time fine-tuning interface coming soon!', 'info');
}

function openModelAnalytics() {
    openPerformanceAnalytics();
}

function openConversationBranching() {
    const title = prompt('Name your new conversation branch:');
    if (!title) return;

    ensureActiveConversation().then(async (parentId) => {
        const branch = await createConversationOnServer(title, parentId);
        if (branch) {
            activeConversationId = branch.id;
            await refreshConversationList();
            showToast('Branch created and selected', 'success');
        }
    });
}

function openMemoryManagement() {
    showToast('Advanced memory management coming soon!', 'info');
}

function openContextAnalysis() {
    showToast('Context analysis tools coming soon!', 'info');
}

function openConversationExport() {
    exportChat();
    showToast('Export created. Select a file to import another conversation.', 'info');
    promptConversationImport();
}

function openPromptTemplates() {
    showToast('Advanced prompt templates coming soon!', 'info');
}

function openPersonalityInjection() {
    showToast('Personality injection system coming soon!', 'info');
}

function openPromptOptimizer() {
    showToast('Prompt optimizer coming soon!', 'info');
}

function openChainOfThought() {
    showToast('Chain-of-thought reasoning coming soon!', 'info');
}

function openEmotionDetection() {
    showToast('Emotion detection coming soon!', 'info');
}

function openVoiceCloning() {
    showToast('Voice cloning technology coming soon!', 'info');
}

function openAudioAnalysis() {
    showToast('Audio analysis tools coming soon!', 'info');
}

function openRealTimeTranscription() {
    showToast('Real-time transcription coming soon!', 'info');
}

function openThemeDesigner() {
    showToast('Theme designer coming soon!', 'info');
}

function openUIPersonalization() {
    showToast('UI personalization coming soon!', 'info');
}

function openPluginManager() {
    showToast('Plugin manager coming soon!', 'info');
}

function openAdvancedSettings() {
    showToast('Advanced settings panel coming soon!', 'info');
}

function openEncryptionSettings() {
    showToast('Encryption settings coming soon!', 'info');
}

function openPrivacyControls() {
    showToast('Privacy controls coming soon!', 'info');
}

function openDataManagement() {
    showToast('Data management tools coming soon!', 'info');
}

function openAuditLogs() {
    showToast('Audit logs coming soon!', 'info');
}

// Modal Management
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        modal.style.opacity = '0';
        modal.style.transform = 'scale(0.8)';
        
        setTimeout(() => {
            modal.style.opacity = '1';
            modal.style.transform = 'scale(1)';
        }, 10);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.opacity = '0';
        modal.style.transform = 'scale(0.8)';
        
        setTimeout(() => {
            modal.style.display = 'none';
            if (modalId === 'performance-analytics-modal') {
                modal.remove();
            }
        }, 300);
    }
}