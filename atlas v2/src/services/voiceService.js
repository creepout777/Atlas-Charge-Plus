/**
 * Voice Service — 100% Free Web Speech API Helpers
 * Speech Recognition (Voice Input / Speech-to-Text)
 * Speech Synthesis (Voice Output / Text-to-Speech)
 * Zero paid APIs — uses native browser capabilities only.
 */

class VoiceService {
  constructor() {
    this.recognition = null;
    this.synthesis = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
    this.isListening = false;
    this.currentUtterance = null;
  }

  isRecognitionSupported() {
    return typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  }

  isSynthesisSupported() {
    return !!this.synthesis;
  }

  /**
   * Start voice dictation via microphone
   * @param {function(string): void} onResult — callback with live transcription text
   * @param {function(string): void} onError — callback on recognition error
   * @param {function(boolean): void} onStateChange — callback with listening state
   */
  startListening(onResult, onError, onStateChange) {
    if (!this.isRecognitionSupported()) {
      if (onError) onError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      let finalTranscript = '';

      this.recognition.onstart = () => {
        this.isListening = true;
        if (onStateChange) onStateChange(true);
      };

      this.recognition.onresult = (event) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalTranscript += t;
          else interimTranscript += t;
        }
        const currentText = finalTranscript || interimTranscript;
        if (onResult && currentText) onResult(currentText);
      };

      this.recognition.onerror = (event) => {
        this.isListening = false;
        if (onStateChange) onStateChange(false);
        if (onError) onError(`Voice error: ${event.error}`);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (onStateChange) onStateChange(false);
      };

      this.recognition.start();
    } catch (err) {
      this.isListening = false;
      if (onStateChange) onStateChange(false);
      if (onError) onError(err.message || 'Failed to start microphone');
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      try { this.recognition.stop(); } catch { /* ignore */ }
      this.isListening = false;
    }
  }

  /**
   * Read text aloud using native SpeechSynthesis
   * @param {string} text — text to speak (markdown is stripped automatically)
   * @param {function(): void} onEnd — called when speech finishes
   * @param {function(): void} onError — called on error
   */
  speakText(text, onEnd, onError) {
    if (!this.isSynthesisSupported()) {
      if (onError) onError('Speech synthesis is not supported on this device.');
      return;
    }
    this.stopSpeech();

    const cleanText = text
      .replace(/[*_#`~[\]()]/g, '')
      .replace(/https?:\/\/\S+/g, 'link')
      .replace(/[\r\n]+/g, ' ')
      .trim();

    if (!cleanText) return;

    try {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';

      const voices = this.synthesis.getVoices();
      const preferredVoice = voices.find(v =>
        v.lang.startsWith('en') &&
        (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Daniel'))
      );
      if (preferredVoice) utterance.voice = preferredVoice;

      utterance.onend = () => { this.currentUtterance = null; if (onEnd) onEnd(); };
      utterance.onerror = (e) => { this.currentUtterance = null; if (onError) onError(e.error); };

      this.currentUtterance = utterance;
      this.synthesis.speak(utterance);
    } catch (err) {
      if (onError) onError(err.message);
    }
  }

  stopSpeech() {
    if (this.synthesis && this.synthesis.speaking) {
      try { this.synthesis.cancel(); } catch { /* ignore */ }
    }
    this.currentUtterance = null;
  }

  isSpeaking() {
    return !!(this.synthesis && this.synthesis.speaking);
  }
}

export const voiceService = new VoiceService();
