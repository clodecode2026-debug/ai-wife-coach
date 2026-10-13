/**
 * coach_live.js
 * --------------------------------------------------------------------------------
 * Клиентский модуль живого голосового общения (Gemini Live) для проекта "Коуч для Жены".
 * 
 * ПОДКЛЮЧЕНИЕ В index.html:
 *   <script src="/static/coach_live.js"></script>
 *
 * ФУНКЦИОНАЛ:
 * - Кнопка голосового звонка в правом нижнем углу.
 * - Красивый уютный оверлей с пульсирующим орбом и субтитрами.
 * - Переключение режимов: "🧘 Личный коуч" / "🇩🇪 Практика немецкого".
 * - Встроенный AudioWorklet с ресемплингом в 16кГц (работает на iPhone Safari и Android).
 * - Бесшовный плеер 24кГц PCM без задержек и щелчков.
 * --------------------------------------------------------------------------------
 */

(function() {
  if (window.__COACH_LIVE_INITIALIZED__) return;
  window.__COACH_LIVE_INITIALIZED__ = true;

  // --------------------------------------------------------------------------
  // СТИЛИ ИНТЕРФЕЙСА (Уютный пастельно-фиолетовый / розовый дизайн)
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
      background: rgba(15, 12, 29, 0.85);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
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
  // DOM РАЗМЕТКА
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
      <button id="coach-close-modal" class="coach-close-btn">✕</button>
    </div>

    <div class="coach-orb-container">
      <canvas id="coach-orb-canvas" width="440" height="440"></canvas>
      <div id="coach-status-label" class="coach-status-label">Нажмите для соединения...</div>
    </div>

    <div id="coach-transcript-box" class="coach-transcript-box">
      <div><em>Нажмите кнопку микрофона, чтобы начать разговор...</em></div>
    </div>

    <div class="coach-controls-row">
      <button id="coach-mic-toggle" class="coach-ctrl-btn coach-mic-btn" title="Микрофон">🎙️</button>
      <button id="coach-hangup-btn" class="coach-ctrl-btn coach-hangup-btn" title="Завершить">📞</button>
    </div>
  `;
  document.body.appendChild(modal);

  // --------------------------------------------------------------------------
  // AUDIO RESAMPLER WORKLET (Universal downsampler -> 16kHz)
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

        if (this.inputSampleRate !== currentFrame && sampleRate) {
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
          for (let i = 0; i < chunk.length; i++) {
            const s = Math.max(-1, Math.min(1, chunk[i]));
            int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          this.port.postMessage({
            event: "chunk",
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
    }
  }

  // --------------------------------------------------------------------------
  // СОСТОЯНИЕ И ЛОГИКА СЕССИИ
  // --------------------------------------------------------------------------
  let audioCtx = null;
  let micStream = null;
  let workletNode = null;
  let streamer = null;
  let ws = null;
  let isConnected = false;
  let isMicMuted = false;

  const canvas = document.getElementById('coach-orb-canvas');
  const ctx = canvas.getContext('2d');
  const statusLabel = document.getElementById('coach-status-label');
  const transcriptBox = document.getElementById('coach-transcript-box');
  const modeSelect = document.getElementById('coach-mode-select');
  const micBtn = document.getElementById('coach-mic-toggle');

  // Анимация визуализации Орба
  let animAngle = 0;
  function drawOrb() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    animAngle += 0.02;

    let energy = 0;
    if (streamer && streamer.analyser && streamer.isPlaying) {
      const freq = new Uint8Array(streamer.analyser.frequencyBinCount);
      streamer.analyser.getByteFrequencyData(freq);
      energy = freq.reduce((a, b) => a + b, 0) / freq.length / 255;
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

  function appendTranscript(speaker, text) {
    const div = document.createElement('div');
    div.innerHTML = `<strong>${speaker}:</strong> ${text}`;
    transcriptBox.appendChild(div);
    transcriptBox.scrollTop = transcriptBox.scrollHeight;
  }

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

  async function startCall() {
    try {
      await unlockAudio();
      statusLabel.textContent = "ПОДКЛЮЧЕНИЕ...";

      modal.classList.add('active');
      triggerBtn.style.display = 'none';

      // Микрофон
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true }
      });

      const blob = new Blob([AudioRecordingWorkletCode], { type: "application/javascript" });
      const workletUrl = URL.createObjectURL(blob);
      await audioCtx.audioWorklet.addModule(workletUrl);
      URL.revokeObjectURL(workletUrl);

      workletNode = new AudioWorkletNode(audioCtx, "audio-recorder-worklet");
      const source = audioCtx.createMediaStreamSource(micStream);
      source.connect(workletNode);

      const silentGain = audioCtx.createGain();
      silentGain.gain.value = 0;
      workletNode.connect(silentGain);
      silentGain.connect(audioCtx.destination);

      streamer = new AudioStreamer(audioCtx);

      // WebSocket
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${proto}//${window.location.host}/api/voice/live`;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: "start",
          mode: modeSelect.value
        }));
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === "ready") {
          isConnected = true;
          statusLabel.textContent = "СЛУШАЮ (ГОВОРИТЕ)";
          appendTranscript('Коуч', 'Я на связи! Чем я могу тебе сегодня помочь?');
        } else if (msg.type === "audio") {
          statusLabel.textContent = "ГОВОРИТ КОУЧ...";
          const raw = atob(msg.data);
          const bytes = new Uint8Array(raw.length);
          for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
          streamer.addPCM16(bytes);
        } else if (msg.type === "interrupted") {
          if (streamer) streamer.stop();
          statusLabel.textContent = "СЛУШАЮ (ГОВОРИТЕ)";
        } else if (msg.type === "transcript") {
          appendTranscript('Коуч', msg.text);
        } else if (msg.type === "turn_complete") {
          statusLabel.textContent = "СЛУШАЮ (ГОВОРИТЕ)";
        }
      };

      workletNode.port.onmessage = (ev) => {
        if (ev.data.event === "chunk" && ws && ws.readyState === WebSocket.OPEN && isConnected) {
          if (isMicMuted) return;
          const u8 = new Uint8Array(ev.data.data.int16arrayBuffer);
          let binary = '';
          for (let i = 0; i < u8.byteLength; i++) binary += String.fromCharCode(u8[i]);
          ws.send(JSON.stringify({
            type: "audio",
            data: btoa(binary)
          }));
        }
      };

      ws.onclose = () => endCall();

    } catch (e) {
      console.error(e);
      statusLabel.textContent = "ОШИБКА МИКРОФОНА";
    }
  }

  function endCall() {
    if (ws) { ws.close(); ws = null; }
    if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null; }
    if (streamer) { streamer.stop(); streamer = null; }
    isConnected = false;
    modal.classList.remove('active');
    triggerBtn.style.display = 'flex';
  }

  triggerBtn.addEventListener('click', startCall);
  document.getElementById('coach-close-modal').addEventListener('click', endCall);
  document.getElementById('coach-hangup-btn').addEventListener('click', endCall);

  micBtn.addEventListener('click', () => {
    isMicMuted = !isMicMuted;
    micBtn.classList.toggle('muted', isMicMuted);
    statusLabel.textContent = isMicMuted ? "МИКРОФОН ВЫКЛ" : "СЛУШАЮ (ГОВОРИТЕ)";
  });

})();
