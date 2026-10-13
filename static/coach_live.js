/**
 * coach_live.js
 * --------------------------------------------------------------------------------
 * Клиентский модуль живого голосового общения (Gemini Multimodal Live API)
 * для проекта "AI Коуч для Жены" (Алина).
 *
 * ФУНКЦИОНАЛ:
 * 1. window.GeminiLiveCoach — глобальный унифицированный движок:
 *    - Поддержка AudioWorklet 16кГц PCM (iPhone Safari, Android, Desktop)
 *    - Потоковый плеер 24кГц PCM без задержек и щелчков
 *    - Двусторонний VAD, Barge-in (перебивание голосом в реальном времени)
 *    - Управление из вкладки #tab-live ("Голос"), модального окна и диалогов
 * 2. Уютный оверлей с пульсирующим 3D-орбом и субтитрами (автономный режим)
 * --------------------------------------------------------------------------------
 */

(function() {
  if (window.__COACH_LIVE_INITIALIZED__) return;
  window.__COACH_LIVE_INITIALIZED__ = true;

  // --------------------------------------------------------------------------
  // СТИЛИ ИНТЕРФЕЙСА (Пастельно-фиолетовый / розовый дизайн)
  // --------------------------------------------------------------------------
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    #coach-live-trigger-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 99990;
      background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%);
      color: #ffffff;
      border: none;
      border-radius: 30px;
      padding: 12px 20px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 8px 24px rgba(236, 72, 153, 0.4);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    #coach-live-trigger-btn:hover {
      transform: translateY(-2px) scale(1.02);
      box-shadow: 0 12px 28px rgba(236, 72, 153, 0.5);
    }
    .coach-live-pulse-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #ffffff;
      animation: coachPulse 2s infinite;
    }
    @keyframes coachPulse {
      0% { transform: scale(0.9); opacity: 0.8; }
      50% { transform: scale(1.4); opacity: 1; }
      100% { transform: scale(0.9); opacity: 0.8; }
    }

    /* Модальное окно звонка */
    #coach-live-modal {
      position: fixed;
      inset: 0;
      background: rgba(15, 12, 29, 0.88);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      z-index: 99999;
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 24px;
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    #coach-live-modal.active { display: flex; }

    .coach-live-header {
      width: 100%;
      max-width: 500px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .coach-mode-select {
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #ffffff;
      padding: 8px 14px;
      border-radius: 20px;
      font-size: 14px;
      outline: none;
      cursor: pointer;
    }
    .coach-mode-select option {
      background: #1e1b4b;
      color: #ffffff;
    }

    .coach-close-btn {
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: #ffffff;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      font-size: 18px;
      cursor: pointer;
    }

    /* Пульсирующий Орб */
    .coach-orb-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
    }
    #coach-orb-canvas {
      width: 220px;
      height: 220px;
      border-radius: 50%;
      cursor: pointer;
    }
    .coach-status-label {
      color: #e9d5ff;
      font-size: 15px;
      font-weight: 500;
      letter-spacing: 0.5px;
      text-align: center;
    }

    /* Субтитры и диалог */
    .coach-transcript-box {
      width: 100%;
      max-width: 500px;
      height: 120px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      padding: 12px 16px;
      overflow-y: auto;
      font-size: 14px;
      line-height: 1.5;
      color: #f5d0fe;
      display: flex;
      flex-direction: column;
      gap: 6px;
      box-sizing: border-box;
    }

    /* Кнопки управления */
    .coach-controls-row {
      display: flex;
      gap: 16px;
      margin-bottom: 12px;
    }
    .coach-ctrl-btn {
      border: none;
      border-radius: 50%;
      width: 56px;
      height: 56px;
      font-size: 22px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s;
    }
    .coach-ctrl-btn:active { transform: scale(0.92); }
    .coach-mic-btn {
      background: rgba(255, 255, 255, 0.15);
      color: #ffffff;
    }
    .coach-mic-btn.muted {
      background: #ef4444;
      color: #ffffff;
    }
    .coach-hangup-btn {
      background: #ef4444;
      color: #ffffff;
    }

    @media (max-width: 600px) {
      #coach-orb-canvas { width: 180px; height: 180px; }
      .coach-transcript-box { height: 100px; font-size: 13px; }
    }
  `;
  document.head.appendChild(styleEl);

  // --------------------------------------------------------------------------
  // DOM РАЗМЕТКА МОДАЛЬНОГО ОКНА И КНОПКИ
  // --------------------------------------------------------------------------
  const triggerBtn = document.createElement('button');
  triggerBtn.id = 'coach-live-trigger-btn';
  triggerBtn.innerHTML = `<span class="coach-live-pulse-dot"></span><span>Голосовой коуч</span>`;
  document.body.appendChild(triggerBtn);

  const modal = document.createElement('div');
  modal.id = 'coach-live-modal';
  modal.innerHTML = `
    <div class="coach-live-header">
      <select id="coach-mode-select" class="coach-mode-select">
        <option value="coach" selected>🧘 Личный коуч (Психолог)</option>
        <option value="german">🇩🇪 Практика немецкого (A1-B2)</option>
      </select>
      <button id="coach-close-modal" class="coach-close-btn" title="Закрыть">✕</button>
    </div>

    <div class="coach-orb-container">
      <canvas id="coach-orb-canvas" width="440" height="440"></canvas>
      <div id="coach-status-label" class="coach-status-label">Нажмите для соединения...</div>
    </div>

    <div id="coach-transcript-box" class="coach-transcript-box">
      <div><em>Нажмите кнопку микрофона, чтобы начать живой разговор...</em></div>
    </div>

    <div class="coach-controls-row">
      <button id="coach-mic-toggle" class="coach-ctrl-btn coach-mic-btn" title="Микрофон">🎙️</button>
      <button id="coach-hangup-btn" class="coach-ctrl-btn coach-hangup-btn" title="Завершить">📞</button>
    </div>
  `;
  document.body.appendChild(modal);

  // --------------------------------------------------------------------------
  // AUDIO RESAMPLER WORKLET (Ресемплер микрофона в 16кГц PCM)
  // --------------------------------------------------------------------------
  const AudioRecordingWorkletCode = `
    class AudioRecorderWorklet extends AudioWorkletProcessor {
      constructor() {
        super();
        this.bufferSize = 2048;
        this.inputSampleRate = 48000;
        this.targetSampleRate = 16000;
        this.resampleRatio = 1;
        this.resampleBuffer = [];
      }

      process(inputs) {
        const input = inputs[0];
        if (!input || !input[0] || input[0].length === 0) return true;
        const channelData = input[0];

        if (typeof sampleRate !== 'undefined' && this.inputSampleRate !== sampleRate) {
          this.inputSampleRate = sampleRate;
          this.resampleRatio = this.inputSampleRate / this.targetSampleRate;
        }

        const newLen = Math.floor(channelData.length / this.resampleRatio);
        const resampled = new Float32Array(newLen);
        for (let i = 0; i < newLen; i++) {
          const srcIdx = i * this.resampleRatio;
          const idx = Math.floor(srcIdx);
          const frac = srcIdx - idx;
          const nextIdx = Math.min(idx + 1, channelData.length - 1);
          resampled[i] = channelData[idx] * (1 - frac) + channelData[nextIdx] * frac;
        }

        for (let i = 0; i < resampled.length; i++) {
          this.resampleBuffer.push(resampled[i]);
        }

        while (this.resampleBuffer.length >= this.bufferSize) {
          const chunk = this.resampleBuffer.splice(0, this.bufferSize);
          const int16Array = new Int16Array(chunk.length);
          let sumAmp = 0;
          for (let i = 0; i < chunk.length; i++) {
            const s = Math.max(-1, Math.min(1, chunk[i]));
            int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            sumAmp += Math.abs(chunk[i]);
          }
          const energy = Math.min(1.0, (sumAmp / chunk.length) * 4);
          this.port.postMessage({
            event: "chunk",
            energy: energy,
            data: { int16arrayBuffer: int16Array.buffer }
          }, [int16Array.buffer]);
        }
        return true;
      }
    }
    registerProcessor("audio-recorder-worklet", AudioRecorderWorklet);
  `;

  // --------------------------------------------------------------------------
  // AUDIO STREAMER (Плеер входящего звука 24кГц от Gemini)
  // --------------------------------------------------------------------------
  class AudioStreamer {
    constructor(ctx) {
      this.context = ctx;
      this.audioQueue = [];
      this.isPlaying = false;
      this.scheduledTime = 0;
      this.inputSampleRate = 24000;
      this.gainNode = this.context.createGain();
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 128;
      this.gainNode.connect(this.analyser);
      this.analyser.connect(this.context.destination);
    }

    addPCM16(bytes) {
      const float32 = new Float32Array(bytes.length / 2);
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      for (let i = 0; i < float32.length; i++) {
        float32[i] = view.getInt16(i * 2, true) / 32768;
      }
      this.audioQueue.push(float32);
      if (!this.isPlaying) {
        this.isPlaying = true;
        this.scheduledTime = this.context.currentTime + 0.05;
        this.schedule();
      }
    }

    schedule() {
      while (this.audioQueue.length > 0 && this.scheduledTime < this.context.currentTime + 0.25) {
        const data = this.audioQueue.shift();
        const buffer = this.context.createBuffer(1, data.length, this.inputSampleRate);
        buffer.getChannelData(0).set(data);
        const source = this.context.createBufferSource();
        source.buffer = buffer;
        source.connect(this.gainNode);
        source.start(this.scheduledTime);
        this.scheduledTime += buffer.duration;
      }
      if (this.audioQueue.length > 0) {
        setTimeout(() => this.schedule(), 40);
      } else {
        this.isPlaying = false;
      }
    }

    stop() {
      this.audioQueue = [];
      this.isPlaying = false;
      this.scheduledTime = 0;
      if (this.gainNode) {
        try {
          this.gainNode.gain.cancelScheduledValues(this.context.currentTime);
          this.gainNode.gain.setValueAtTime(0, this.context.currentTime);
          setTimeout(() => {
            if (this.gainNode) this.gainNode.gain.setValueAtTime(1, this.context.currentTime);
          }, 50);
        } catch(e) {}
      }
    }

    getEnergy() {
      if (!this.analyser || !this.isPlaying) return 0;
      const freq = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(freq);
      return freq.reduce((a, b) => a + b, 0) / freq.length / 255;
    }
  }

  // --------------------------------------------------------------------------
  // ЕДИНЫЙ КОНТРОЛЛЕР СЕССИИ (Core Engine)
  // --------------------------------------------------------------------------
  let audioCtx = null;
  let workletLoaded = false;
  let micStream = null;
  let workletNode = null;
  let streamer = null;
  let ws = null;
  let isConnected = false;
  let isMicMuted = false;
  let isModalActive = false;
  let currentMode = 'coach';
  let activeCallbacks = {};
  let lastUserEnergy = 0;

  // Разблокировка аудио для iPhone / Safari
  async function unlockAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }
  }

  // Запуск сессии Gemini Live
  async function startGeminiSession(options = {}) {
    const {
      mode = 'coach',
      customPrompt = null,
      voice = 'Aoede',
      useModal = false,
      callbacks = {}
    } = options;

    activeCallbacks = callbacks || {};
    currentMode = mode;

    try {
      if (activeCallbacks.onStatus) activeCallbacks.onStatus('ПОДКЛЮЧЕНИЕ...', 'CONNECTING');

      if (useModal) {
        isModalActive = true;
        modal.classList.add('active');
        triggerBtn.style.display = 'none';
        const statusLbl = document.getElementById('coach-status-label');
        if (statusLbl) statusLbl.textContent = 'ПОДКЛЮЧЕНИЕ К GEMINI LIVE...';
      }

      await unlockAudio();

      // Захват микрофона
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Загрузка Worklet модуля (только 1 раз на AudioContext)
      if (!workletLoaded) {
        const blob = new Blob([AudioRecordingWorkletCode], { type: "application/javascript" });
        const workletUrl = URL.createObjectURL(blob);
        await audioCtx.audioWorklet.addModule(workletUrl);
        URL.revokeObjectURL(workletUrl);
        workletLoaded = true;
      }

      workletNode = new AudioWorkletNode(audioCtx, "audio-recorder-worklet");
      const source = audioCtx.createMediaStreamSource(micStream);
      source.connect(workletNode);

      const silentGain = audioCtx.createGain();
      silentGain.gain.value = 0;
      workletNode.connect(silentGain);
      silentGain.connect(audioCtx.destination);

      streamer = new AudioStreamer(audioCtx);

      // WebSocket подключение
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${proto}//${window.location.host}/api/voice/live`;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        const startPayload = {
          type: "start",
          mode: mode,
          voice: voice
        };
        if (customPrompt) {
          startPayload.custom_prompt = customPrompt;
        }
        ws.send(JSON.stringify(startPayload));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "ready") {
            isConnected = true;
            const readyMsg = (mode === 'german') 
              ? 'Hallo! Ich bin bereit. Worüber möchtest du sprechen?'
              : 'Я на связи! Чем я могу тебе сегодня помочь?';
            
            if (activeCallbacks.onStatus) activeCallbacks.onStatus('СЛУШАЮ (ГОВОРИТЕ)', 'LISTENING');
            if (activeCallbacks.onTranscript) activeCallbacks.onTranscript('Коуч', readyMsg, true);
            
            if (isModalActive) {
              const statusLbl = document.getElementById('coach-status-label');
              if (statusLbl) statusLbl.textContent = 'СЛУШАЮ (ГОВОРИТЕ)';
              appendModalTranscript('Коуч', readyMsg);
            }

          } else if (msg.type === "audio") {
            if (activeCallbacks.onStatus) activeCallbacks.onStatus('ГОВОРИТ КОУЧ...', 'SPEAKING');
            if (isModalActive) {
              const statusLbl = document.getElementById('coach-status-label');
              if (statusLbl) statusLbl.textContent = 'ГОВОРИТ КОУЧ...';
            }
            const raw = atob(msg.data);
            const bytes = new Uint8Array(raw.length);
            for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
            streamer.addPCM16(bytes);

          } else if (msg.type === "interrupted") {
            if (streamer) streamer.stop();
            if (activeCallbacks.onInterrupted) activeCallbacks.onInterrupted();
            if (activeCallbacks.onStatus) activeCallbacks.onStatus('СЛУШАЮ (ГОВОРИТЕ)', 'LISTENING');
            if (isModalActive) {
              const statusLbl = document.getElementById('coach-status-label');
              if (statusLbl) statusLbl.textContent = 'СЛУШАЮ (ГОВОРИТЕ)';
            }

          } else if (msg.type === "transcript") {
            if (activeCallbacks.onTranscript) activeCallbacks.onTranscript('Коуч', msg.text, true);
            if (isModalActive) {
              appendModalTranscript('Коуч', msg.text);
            }

          } else if (msg.type === "turn_complete") {
            if (activeCallbacks.onTurnComplete) activeCallbacks.onTurnComplete();
            if (activeCallbacks.onStatus) activeCallbacks.onStatus('СЛУШАЮ (ГОВОРИТЕ)', 'LISTENING');
            if (isModalActive) {
              const statusLbl = document.getElementById('coach-status-label');
              if (statusLbl) statusLbl.textContent = 'СЛУШАЮ (ГОВОРИТЕ)';
            }

          } else if (msg.type === "error") {
            const errText = msg.message || 'Ошибка подключения к Gemini Live';
            console.error('Gemini Live error:', errText);
            if (activeCallbacks.onError) activeCallbacks.onError(errText);
            stopGeminiSession();
          }
        } catch(e) {
          console.warn('Live message parse error:', e);
        }
      };

      workletNode.port.onmessage = (ev) => {
        if (ev.data.event === "chunk") {
          lastUserEnergy = ev.data.energy || 0;
          if (activeCallbacks.onAudioEnergy && !streamer.isPlaying) {
            activeCallbacks.onAudioEnergy(lastUserEnergy);
          }
          if (ws && ws.readyState === WebSocket.OPEN && isConnected) {
            if (isMicMuted) return;
            const u8 = new Uint8Array(ev.data.data.int16arrayBuffer);
            let binary = '';
            for (let i = 0; i < u8.byteLength; i++) binary += String.fromCharCode(u8[i]);
            ws.send(JSON.stringify({
              type: "audio",
              data: btoa(binary)
            }));
          }
        }
      };

      ws.onerror = (err) => {
        console.error('Gemini Live WS error:', err);
        if (activeCallbacks.onError) activeCallbacks.onError('Сбой вебсокета Gemini Live');
        stopGeminiSession();
      };

      ws.onclose = () => {
        stopGeminiSession();
      };

      return true;

    } catch (e) {
      console.error('Gemini Live start failed:', e);
      if (activeCallbacks.onError) activeCallbacks.onError(e.message || 'Ошибка запуска микрофона');
      stopGeminiSession();
      return false;
    }
  }

  function stopGeminiSession() {
    if (ws) {
      try { ws.close(); } catch(e){}
      ws = null;
    }
    if (micStream) {
      try { micStream.getTracks().forEach(t => t.stop()); } catch(e){}
      micStream = null;
    }
    if (workletNode) {
      try { workletNode.disconnect(); } catch(e){}
      workletNode = null;
    }
    if (streamer) {
      try { streamer.stop(); } catch(e){}
      streamer = null;
    }
    isConnected = false;

    if (activeCallbacks.onEnded) activeCallbacks.onEnded();
    if (activeCallbacks.onStatus) activeCallbacks.onStatus('Сессия завершена', 'IDLE');

    if (isModalActive) {
      isModalActive = false;
      modal.classList.remove('active');
      triggerBtn.style.display = 'flex';
    }
  }

  function sendTextToGemini(text) {
    if (ws && ws.readyState === WebSocket.OPEN && isConnected) {
      ws.send(JSON.stringify({
        type: "text",
        text: text
      }));
      return true;
    }
    return false;
  }

  function toggleMicMute() {
    isMicMuted = !isMicMuted;
    const micBtn = document.getElementById('coach-mic-toggle');
    if (micBtn) micBtn.classList.toggle('muted', isMicMuted);
    const statusLbl = document.getElementById('coach-status-label');
    if (statusLbl && isModalActive) {
      statusLbl.textContent = isMicMuted ? "МИКРОФОН ВЫКЛ" : "СЛУШАЮ (ГОВОРИТЕ)";
    }
    return isMicMuted;
  }

  function appendModalTranscript(speaker, text) {
    const transcriptBox = document.getElementById('coach-transcript-box');
    if (transcriptBox) {
      const div = document.createElement('div');
      div.innerHTML = `<strong>${speaker}:</strong> ${text}`;
      transcriptBox.appendChild(div);
      transcriptBox.scrollTop = transcriptBox.scrollHeight;
    }
  }

  // --------------------------------------------------------------------------
  // АНИМАЦИЯ ОРБА (Для модального окна)
  // --------------------------------------------------------------------------
  const canvas = document.getElementById('coach-orb-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let animAngle = 0;
    function drawOrb() {
      if (!isModalActive) {
        requestAnimationFrame(drawOrb);
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      animAngle += 0.02;

      let energy = 0;
      if (streamer && streamer.isPlaying) {
        energy = streamer.getEnergy();
      } else if (!isMicMuted) {
        energy = lastUserEnergy;
      }

      const r = 90 + energy * 40;
      const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, r);
      if (isMicMuted) {
        grad.addColorStop(0, '#fca5a5');
        grad.addColorStop(0.7, '#ef4444');
        grad.addColorStop(1, '#991b1b');
      } else if (streamer && streamer.isPlaying) {
        grad.addColorStop(0, '#fef08a');
        grad.addColorStop(0.6, '#ec4899');
        grad.addColorStop(1, '#7e22ce');
      } else {
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.5, '#a855f7');
        grad.addColorStop(1, '#3b0764');
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 25 + energy * 30;
      ctx.fill();
      ctx.restore();

      requestAnimationFrame(drawOrb);
    }
    requestAnimationFrame(drawOrb);
  }

  // События кнопок модального окна
  triggerBtn.addEventListener('click', () => {
    // Если приложение на вкладке 'live', запускаем сессию прямо во вкладке
    if (window.currentTab === 'live' && typeof window.startLiveVoice === 'function') {
      window.startLiveVoice();
    } else {
      const modeSelect = document.getElementById('coach-mode-select');
      startGeminiSession({
        mode: modeSelect ? modeSelect.value : 'coach',
        useModal: true
      });
    }
  });

  document.getElementById('coach-close-modal').addEventListener('click', stopGeminiSession);
  document.getElementById('coach-hangup-btn').addEventListener('click', stopGeminiSession);
  document.getElementById('coach-mic-toggle').addEventListener('click', toggleMicMute);

  // --------------------------------------------------------------------------
  // ПУБЛИЧНЫЙ API ДЛЯ ВНЕШНЕГО УПРАВЛЕНИЯ (window.GeminiLiveCoach)
  // --------------------------------------------------------------------------
  window.GeminiLiveCoach = {
    start: startGeminiSession,
    stop: stopGeminiSession,
    toggleMute: toggleMicMute,
    setMuted: (muted) => { isMicMuted = !!muted; },
    isMuted: () => isMicMuted,
    sendText: sendTextToGemini,
    isConnected: () => isConnected,
    isAudioPlaying: () => !!(streamer && streamer.isPlaying),
    getEnergy: () => {
      if (streamer && streamer.isPlaying) return streamer.getEnergy();
      return lastUserEnergy;
    },
    openModal: (mode = 'coach') => {
      startGeminiSession({ mode, useModal: true });
    },
    closeModal: stopGeminiSession,
    setTriggerButtonVisible: (visible) => {
      triggerBtn.style.display = visible ? 'flex' : 'none';
    }
  };

})();
