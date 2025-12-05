// Lambeck LLM Studio - Advanced JavaScript

// Global State
let currentModel = null;
let recognition = null;
let isListening = false;
let currentTheme = 'dark';
let animationSpeed = 1;
let autoScroll = true;
let soundEffects = true;
let voiceOutput = true;
let messageCount = 0;
let tokenCount = 0;
let chatHistory = [];
let currentSection = 'chat';
let speechSynthesis = window.speechSynthesis;
let currentVoice = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Set initial theme
    document.documentElement.setAttribute('data-theme', currentTheme);
    
    // Initialize UI components
    setupNavigation();
    setupVoiceRecognition();
    setupVoiceOutput();
    setupInputHandlers();
    setupThemeSystem();
    setupAnimations();
    updateUI();
    
    // Load saved settings
    loadSettings();
    
    // Show welcome animation
    showWelcomeAnimation();
}

// Navigation System
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.getAttribute('data-section');
            switchSection(section);
        });
    });
}

function switchSection(sectionName) {
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');
    
    // Update content sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(`${sectionName}-section`).classList.add('active');
    
    // Update header
    const titles = {
        chat: 'Chat Interface',
        models: 'Model Management',
        history: 'Chat History',
        analytics: 'Usage Analytics'
    };
    
    document.getElementById('section-title').textContent = titles[sectionName];
    document.getElementById('breadcrumb-current').textContent = sectionName.charAt(0).toUpperCase() + sectionName.slice(1);
    
    currentSection = sectionName;
    
    // Play sound effect
    if (soundEffects) {
        playSound('navigation');
    }
}

// Theme System
function setupThemeSystem() {
    // Auto-detect system theme preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        currentTheme = 'light';
        document.documentElement.setAttribute('data-theme', 'light');
        document.getElementById('theme-icon').className = 'fas fa-sun';
    }
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (document.getElementById('theme-select').value === 'auto') {
            currentTheme = e.matches ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', currentTheme);
            updateThemeIcon();
        }
    });
}

function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    document.getElementById('theme-select').value = currentTheme;
    updateThemeIcon();
    saveSettings();
    
    if (soundEffects) {
        playSound('theme');
    }
}

function changeTheme(theme) {
    if (theme === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        currentTheme = prefersDark ? 'dark' : 'light';
    } else {
        currentTheme = theme;
    }
    
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon();
    saveSettings();
}

function updateThemeIcon() {
    const icon = document.getElementById('theme-icon');
    icon.className = currentTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
}

// Settings Management
function toggleSettings() {
    const panel = document.getElementById('settings-panel');
    panel.classList.toggle('open');
    
    if (soundEffects) {
        playSound('panel');
    }
}

function setAnimationSpeed(speed) {
    animationSpeed = parseFloat(speed);
    document.documentElement.style.setProperty('--animation-speed', animationSpeed);
    saveSettings();
}

function toggleAutoScroll(enabled) {
    autoScroll = enabled;
    saveSettings();
}

function toggleSoundEffects(enabled) {
    soundEffects = enabled;
    saveSettings();
}

function toggleVoiceOutput(enabled) {
    voiceOutput = enabled;
    saveSettings();
}

function saveSettings() {
    const settings = {
        theme: currentTheme,
        animationSpeed,
        autoScroll,
        soundEffects,
        voiceOutput
    };
    localStorage.setItem('lambeck-llm-settings', JSON.stringify(settings));
}

function loadSettings() {
    const saved = localStorage.getItem('lambeck-llm-settings');
    if (saved) {
        const settings = JSON.parse(saved);
        currentTheme = settings.theme || 'dark';
        animationSpeed = settings.animationSpeed || 1;
        autoScroll = settings.autoScroll !== undefined ? settings.autoScroll : true;
        soundEffects = settings.soundEffects !== undefined ? settings.soundEffects : true;
        voiceOutput = settings.voiceOutput !== undefined ? settings.voiceOutput : true;
        
        // Apply settings
        document.documentElement.setAttribute('data-theme', currentTheme);
        document.documentElement.style.setProperty('--animation-speed', animationSpeed);
        document.getElementById('theme-select').value = currentTheme;
        document.getElementById('animation-speed').value = animationSpeed;
        document.getElementById('auto-scroll').checked = autoScroll;
        document.getElementById('sound-effects').checked = soundEffects;
        if (document.getElementById('voice-output')) {
            document.getElementById('voice-output').checked = voiceOutput;
        }
        updateThemeIcon();
    }
}

// Input Handlers
function setupInputHandlers() {
    const messageInput = document.getElementById('message-input');
    
    // Auto-resize textarea
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        
        // Update character count
        const charCount = this.value.length;
        document.getElementById('char-count').textContent = charCount;
        
        // Estimate token count (rough approximation)
        const estimatedTokens = Math.ceil(charCount / 4);
        tokenCount = estimatedTokens;
    });
    
    // Enter key to send
    messageInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Focus handling
    messageInput.addEventListener('focus', function() {
        document.querySelector('.input-container').classList.add('focused');
    });
    
    messageInput.addEventListener('blur', function() {
        document.querySelector('.input-container').classList.remove('focused');
    });
}

// Animation System
function setupAnimations() {
    // Intersection Observer for scroll animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, { threshold: 0.1 });
    
    // Observe elements for animation
    document.querySelectorAll('.model-card, .analytics-card').forEach(el => {
        observer.observe(el);
    });
}

function showWelcomeAnimation() {
    // Add a subtle welcome animation
    document.body.style.opacity = '0';
    document.body.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        document.body.style.transition = 'all 0.5s ease';
        document.body.style.opacity = '1';
        document.body.style.transform = 'translateY(0)';
    }, 100);
}

// UI Update Functions
function updateUI() {
    const hasModel = currentModel !== null && currentModel !== '';
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const voiceBtn = document.getElementById('voice-btn');
    const unloadBtn = document.getElementById('unload-btn');
    
    // Update input states
    if (messageInput) {
        messageInput.disabled = !hasModel;
        messageInput.placeholder = hasModel ? 
            `Chat with ${currentModel}...` : 
            'Load a model to start chatting...';
    }
    
    if (sendBtn) sendBtn.disabled = !hasModel;
    if (voiceBtn) voiceBtn.disabled = !hasModel;
    if (unloadBtn) unloadBtn.disabled = !hasModel;
    
    // Update model status indicators
    const statusIndicators = document.querySelectorAll('.status-indicator');
    statusIndicators.forEach(indicator => {
        if (hasModel) {
            indicator.classList.add('active');
        } else {
            indicator.classList.remove('active');
        }
    });
    
    // Update model name displays
    const modelDisplays = document.querySelectorAll('#header-model-name, #current-model-display');
    modelDisplays.forEach(display => {
        if (display) {
            display.textContent = currentModel || 'No model loaded';
        }
    });
    
    // Update chat info
    updateChatInfo();
}

function updateChatInfo() {
    const messageCountEl = document.getElementById('message-count');
    const tokenCountEl = document.getElementById('token-count');
    
    if (messageCountEl) messageCountEl.textContent = messageCount;
    if (tokenCountEl) tokenCountEl.textContent = tokenCount;
}

// Model Management
async function loadModel(modelName) {
    try {
        showLoading(`Loading ${modelName}...`);
        
        const startTime = Date.now();
        const response = await fetch(`/load_model/${encodeURIComponent(modelName)}`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error(`Failed to load model: ${response.statusText}`);
        }
        
        const data = await response.json();
        currentModel = data.model;
        
        const loadTime = Date.now() - startTime;
        document.getElementById('model-load-time').textContent = `${loadTime}ms`;
        
        addMessage('system', `Model "${currentModel}" loaded successfully!`);
        updateUI();
        
        if (soundEffects) {
            playSound('success');
        }
        
        showToast('Model loaded successfully!', 'success');
        
    } catch (error) {
        console.error('Error loading model:', error);
        addMessage('system', `Error loading model: ${error.message}`, 'error');
        showToast(`Error loading model: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

async function unloadModel() {
    try {
        showLoading('Unloading model...');
        
        const response = await fetch('/unload_model', {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error(`Failed to unload model: ${response.statusText}`);
        }
        
        currentModel = null;
        addMessage('system', 'Model unloaded successfully!');
        updateUI();
        
        if (soundEffects) {
            playSound('success');
        }
        
        showToast('Model unloaded successfully!', 'success');
        
    } catch (error) {
        console.error('Error unloading model:', error);
        addMessage('system', `Error unloading model: ${error.message}`, 'error');
        showToast(`Error unloading model: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

async function ablateModel(modelName) {
    const confirmed = await showConfirmDialog(
        'Create Ablated Model',
        `Create an ablated copy of "${modelName}"? This will duplicate the model file.`
    );
    
    if (!confirmed) return;
    
    try {
        showLoading(`Creating ablated copy of ${modelName}...`);
        
        const response = await fetch(`/ablate_model/${encodeURIComponent(modelName)}`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Failed to ablate model: ${response.statusText}`);
        }
        
        const data = await response.json();
        addMessage('system', `Ablated model created: "${data.model}"`);
        
        if (soundEffects) {
            playSound('success');
        }
        
        showToast('Ablated model created successfully!', 'success');
        
        // Refresh the page to show the new model
        setTimeout(() => {
            window.location.reload();
        }, 1500);
        
    } catch (error) {
        console.error('Error ablating model:', error);
        addMessage('system', `Error creating ablated model: ${error.message}`, 'error');
        showToast(`Error creating ablated model: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

// Chat Functions
async function sendMessage() {
    const messageInput = document.getElementById('message-input');
    const message = messageInput.value.trim();
    
    if (!message) return;
    
    if (!currentModel) {
        addMessage('system', 'Please load a model first!', 'error');
        showToast('Please load a model first!', 'warning');
        return;
    }
    
    // Add user message to chat
    addMessage('user', message);
    messageInput.value = '';
    messageInput.style.height = 'auto';
    document.getElementById('char-count').textContent = '0';
    
    // Show typing indicator
    showTypingIndicator();
    
    try {
        const startTime = Date.now();
        
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: message })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Failed to get response: ${response.statusText}`);
        }
        
        const data = await response.json();
        const responseTime = Date.now() - startTime;
        
        hideTypingIndicator();
        addMessage('ai', data.response);
        
        // Update response time
        document.getElementById('response-time').textContent = `${responseTime}ms`;
        
        // Speak the AI response
        if (voiceOutput) {
            speakText(data.response);
        }
        
        if (soundEffects) {
            playSound('message');
        }
        
    } catch (error) {
        console.error('Error sending message:', error);
        hideTypingIndicator();
        addMessage('system', `Error: ${error.message}`, 'error');
        showToast(`Error: ${error.message}`, 'error');
    }
}

function addMessage(type, content, variant = '') {
    const chatMessages = document.getElementById('chat-messages');
    const messageGroup = document.createElement('div');
    messageGroup.className = 'message-group';
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    
    // Create avatar
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    
    let avatarIcon = '';
    switch (type) {
        case 'user':
            avatarIcon = '<i class="fas fa-user"></i>';
            break;
        case 'ai':
            avatarIcon = '<i class="fas fa-robot"></i>';
            break;
        case 'system':
            avatarIcon = '<i class="fas fa-cog"></i>';
            break;
    }
    avatar.innerHTML = avatarIcon;
    
    // Create content
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    const messageHeader = document.createElement('div');
    messageHeader.className = 'message-header';
    
    const sender = document.createElement('span');
    sender.className = 'message-sender';
    sender.textContent = type.charAt(0).toUpperCase() + type.slice(1);
    
    const time = document.createElement('span');
    time.className = 'message-time';
    time.textContent = new Date().toLocaleTimeString();
    
    messageHeader.appendChild(sender);
    messageHeader.appendChild(time);
    
    const messageText = document.createElement('div');
    messageText.className = 'message-text';
    messageText.textContent = content;
    
    if (variant === 'error') {
        messageText.style.background = 'var(--error-color)';
        messageText.style.color = 'white';
    }
    
    messageContent.appendChild(messageHeader);
    messageContent.appendChild(messageText);
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);
    messageGroup.appendChild(messageDiv);
    
    chatMessages.appendChild(messageGroup);
    
    // Update message count
    messageCount++;
    updateChatInfo();
    
    // Auto-scroll
    if (autoScroll) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Add to history
    chatHistory.push({
        type,
        content,
        timestamp: new Date().toISOString()
    });
}

function showTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.style.display = 'flex';
        
        if (autoScroll) {
            const chatMessages = document.getElementById('chat-messages');
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }
}

function hideTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

function clearChat() {
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = `
        <div class="message-group">
            <div class="message system-message">
                <div class="message-avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="message-content">
                    <div class="message-header">
                        <span class="message-sender">System</span>
                        <span class="message-time">${new Date().toLocaleTimeString()}</span>
                    </div>
                    <div class="message-text">Chat cleared.</div>
                </div>
            </div>
        </div>
    `;
    
    messageCount = 0;
    chatHistory = [];
    updateChatInfo();
    
    if (soundEffects) {
        playSound('clear');
    }
    
    showToast('Chat cleared', 'info');
}

// Voice Output Setup
function setupVoiceOutput() {
    if ('speechSynthesis' in window) {
        // Load available voices
        function loadVoices() {
            const voices = speechSynthesis.getVoices();
            // Prefer English voices
            currentVoice = voices.find(voice => voice.lang.startsWith('en')) || voices[0];
        }
        
        // Load voices when they become available
        if (speechSynthesis.getVoices().length > 0) {
            loadVoices();
        } else {
            speechSynthesis.addEventListener('voiceschanged', loadVoices);
        }
    }
}

function speakText(text) {
    if (!voiceOutput || !('speechSynthesis' in window)) {
        return;
    }
    
    // Stop any current speech
    speechSynthesis.cancel();
    
    // Create utterance
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configure voice settings
    if (currentVoice) {
        utterance.voice = currentVoice;
    }
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;
    
    // Add event listeners
    utterance.onstart = function() {
        console.log('AI started speaking');
        // Add visual indicator
        const indicator = document.createElement('div');
        indicator.id = 'speaking-indicator';
        indicator.innerHTML = `
            <div style="
                position: fixed;
                bottom: 100px;
                right: 20px;
                background: var(--primary-accent);
                color: white;
                padding: 12px 20px;
                border-radius: 25px;
                display: flex;
                align-items: center;
                gap: 10px;
                z-index: 1000;
                animation: pulse 1s infinite;
                box-shadow: var(--shadow-lg);
            ">
                <i class="fas fa-volume-up"></i>
                <span>AI is speaking...</span>
            </div>
        `;
        document.body.appendChild(indicator);
    };
    
    utterance.onend = function() {
        console.log('AI finished speaking');
        // Remove visual indicator
        const indicator = document.getElementById('speaking-indicator');
        if (indicator) {
            document.body.removeChild(indicator);
        }
    };
    
    utterance.onerror = function(event) {
        console.error('Speech synthesis error:', event.error);
    };
    
    // Speak the text
    speechSynthesis.speak(utterance);
}

// Voice Recognition
function setupVoiceRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        recognition.onstart = function() {
            isListening = true;
            document.getElementById('voice-controls').style.display = 'block';
            document.getElementById('voice-btn').innerHTML = '<i class="fas fa-stop"></i>';
        };
        
        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            document.getElementById('message-input').value = transcript;
            addMessage('system', `Voice input: "${transcript}"`);
            
            if (soundEffects) {
                playSound('voice');
            }
        };
        
        recognition.onerror = function(event) {
            console.error('Speech recognition error:', event.error);
            addMessage('system', `Voice input error: ${event.error}`, 'error');
            showToast(`Voice input error: ${event.error}`, 'error');
        };
        
        recognition.onend = function() {
            isListening = false;
            document.getElementById('voice-controls').style.display = 'none';
            document.getElementById('voice-btn').innerHTML = '<i class="fas fa-microphone"></i>';
        };
    } else {
        // Hide voice button if not supported
        const voiceBtn = document.getElementById('voice-btn');
        if (voiceBtn) {
            voiceBtn.style.display = 'none';
        }
    }
}

function startVoiceInput() {
    if (!recognition) {
        addMessage('system', 'Voice recognition not supported in this browser.', 'error');
        showToast('Voice recognition not supported', 'error');
        return;
    }
    
    if (isListening) {
        stopVoiceInput();
        return;
    }
    
    try {
        recognition.start();
        if (soundEffects) {
            playSound('voice-start');
        }
    } catch (error) {
        console.error('Error starting voice recognition:', error);
        addMessage('system', 'Error starting voice input.', 'error');
        showToast('Error starting voice input', 'error');
    }
}

function stopVoiceInput() {
    if (recognition && isListening) {
        recognition.stop();
    }
}

// Quick Prompts
function usePrompt(prompt) {
    const messageInput = document.getElementById('message-input');
    messageInput.value = prompt;
    messageInput.focus();
    
    // Auto-resize
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
    
    if (soundEffects) {
        playSound('prompt');
    }
}

// Utility Functions
function refreshModels() {
    window.location.reload();
}

function exportChat() {
    const chatData = {
        timestamp: new Date().toISOString(),
        model: currentModel,
        messages: chatHistory
    };
    
    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Chat exported successfully!', 'success');
}

// Loading States
function showLoading(message = 'Loading...') {
    const overlay = document.getElementById('loading-overlay');
    const text = document.getElementById('loading-text');
    
    if (overlay && text) {
        text.textContent = message;
        overlay.classList.add('active');
    }
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

// Toast Notifications
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas fa-${getToastIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    container.appendChild(toast);
    
    // Show toast
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Hide and remove toast
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => container.removeChild(toast), 300);
    }, 3000);
}

function getToastIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Modal System
function showConfirmDialog(title, message) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.innerHTML = `
            <div style="
                background: var(--secondary-bg);
                border: 1px solid var(--border-color);
                border-radius: var(--radius-lg);
                padding: var(--spacing-xl);
                max-width: 400px;
                margin: auto;
                margin-top: 20vh;
                text-align: center;
            ">
                <h3 style="margin-bottom: var(--spacing-lg); color: var(--primary-text);">${title}</h3>
                <p style="margin-bottom: var(--spacing-xl); color: var(--secondary-text);">${message}</p>
                <div style="display: flex; gap: var(--spacing-md); justify-content: center;">
                    <button class="btn btn-secondary" onclick="closeConfirmDialog(false)">Cancel</button>
                    <button class="btn btn-primary" onclick="closeConfirmDialog(true)">Confirm</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        window.closeConfirmDialog = (result) => {
            document.body.removeChild(modal);
            delete window.closeConfirmDialog;
            resolve(result);
        };
    });
}

// Sound Effects
function playSound(type) {
    if (!soundEffects) return;
    
    // Create audio context for sound effects
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    const sounds = {
        navigation: { frequency: 800, duration: 100 },
        theme: { frequency: 600, duration: 150 },
        panel: { frequency: 400, duration: 100 },
        success: { frequency: 880, duration: 200 },
        message: { frequency: 440, duration: 100 },
        voice: { frequency: 660, duration: 150 },
        'voice-start': { frequency: 880, duration: 100 },
        prompt: { frequency: 550, duration: 100 },
        clear: { frequency: 330, duration: 150 }
    };
    
    const sound = sounds[type];
    if (!sound) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(sound.frequency, audioContext.currentTime);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration / 1000);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + sound.duration / 1000);
}

// Sidebar Functions
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
    
    if (soundEffects) {
        playSound('panel');
    }
}

// Header Functions
function showNotifications() {
    showToast('No new notifications', 'info');
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

// Placeholder functions for future features
function uploadModel() {
    showToast('Upload feature coming soon!', 'info');
}

function attachFile() {
    showToast('File attachment coming soon!', 'info');
}

function showModelInfo(modelName) {
    showToast(`Model info for ${modelName} coming soon!`, 'info');
}

function deleteModel(modelName) {
    showToast(`Delete feature for ${modelName} coming soon!`, 'info');
}

function clearHistory() {
    showToast('History cleared!', 'info');
}

function exportHistory() {
    showToast('History export coming soon!', 'info');
}

// Close modal function
function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}