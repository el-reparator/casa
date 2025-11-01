// app.js - prototipo
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const status = document.getElementById('status');

let micStream = null;
let audioContext = null;
let analyser = null;
let raf = null;
let modelRecognizer = null;
let isListening = false;

// Config: backend endpoint che invia email
const ALERT_ENDPOINT = '/api/alert'; // sarà proxato in dev e hostato in produzione

// Semplice strategy: 1) prova con energy threshold; 2) poi sostituisci con modello tensorflow
async function startListening() {
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(micStream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);

    isListening = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    status.textContent = 'Stato: ascolto attivo';

    // Opzionale: carica modello speech-commands per riconoscimento avanzato
    try {
      const URL = 'https://storage.googleapis.com/tm-model/your-model/'; // se hai un modello tf
      // esempio di uso del modello integrato speech-commands (fallback a energy)
      modelRecognizer = await speechCommands.create('BROWSER_FFT');
      await modelRecognizer.ensureModelLoaded();
      console.log('speech-commands loaded');
    } catch(e) {
      console.log('No TF model loaded, user energy threshold fallback', e);
      modelRecognizer = null;
    }

    monitorLoop();
  } catch (err) {
    console.error(err);
    alert('Permesso microfono richiesto o errore: ' + err.message);
  }
}

function stopListening() {
  isListening = false;
  startBtn.disabled = false;
  stopBtn.disabled = true;
  status.textContent = 'Stato: fermo';
  if (raf) cancelAnimationFrame(raf);
  if (micStream) {
    micStream.getTracks().forEach(t => t.stop());
    micStream = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
}

// Semplice monitor: misura energia del segnale e invia alert se supera soglia per N frame
let consecutive = 0;
const ENERGY_THRESHOLD = 0.02; // da tarare
const REQUIRED_FRAMES = 3;

function monitorLoop() {
  if (!analyser || !isListening) return;
  const buf = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(buf);
  let sum = 0;
  for (let i=0;i<buf.length;i++){
    sum += buf[i]*buf[i];
  }
  const rms = Math.sqrt(sum / buf.length);
  // Se hai modello TF, usa predict al posto della soglia
  if (modelRecognizer && modelRecognizer.isListening) {
    // se usi un modello custom, integra qui (esempio semplificato)
  } else {
    if (rms > ENERGY_THRESHOLD) {
      consecutive++;
      if (consecutive >= REQUIRED_FRAMES) {
        // rilevamento!
        console.log('Possibile suono rilevato, rms=', rms);
        sendAlert({ type: 'sound', rms: rms, timestamp: Date.now() });
        consecutive = 0;
      }
    } else {
      consecutive = 0;
    }
  }
  raf = requestAnimationFrame(monitorLoop);
}

async function sendAlert(payload) {
  status.textContent = 'Stato: inviando alert...';
  try {
    await fetch(ALERT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    status.textContent = 'Stato: alert inviato';
  } catch (e) {
    console.error('Errore invio alert', e);
    status.textContent = 'Stato: errore invio alert';
  }
  // torna ad ascolto
  setTimeout(()=>status.textContent='Stato: ascolto attivo', 1500);
}

startBtn.addEventListener('click', startListening);
stopBtn.addEventListener('click', stopListening);
