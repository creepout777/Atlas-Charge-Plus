/**
 * Voice Service — 100% Free Web Speech API Helpers
 * Speech Recognition (Voice Input / Speech-to-Text)
 * Speech Synthesis (Voice Output / Text-to-Speech)
 */

class VoiceService {
  constructor() {
    this.recognition = null;
    this.synthesis = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
    this.isListening = false;
    this.currentUtterance = null;
  }

  /**
   * Check if speech recognition is supported in this browser environment
   */
  isRecognitionSupported() {
    return typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  }

  /**
   * Check if text-to-speech synthesis is supported in this browser environment
   */
  isSynthesisSupported() {
    return !!this.synthesis;
  }

  /**
   * Start dictating voice to text
   * @param {function(string): void} onResult - Callback with final transcribed text
   * @param {function(string): void} onError - Callback on error
   * @param {function(boolean): void} onStateChange - Callback when listening state changes
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
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        const currentText = finalTranscript || interimTranscript;
        if (onResult && currentText) {
          onResult(currentText);
        }
      };

      this.recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
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

  /**
   * Stop active speech recognition dictation
   */
  stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore stop errors
      }
      this.isListening = false;
    }
  }

  /**
   * Speak a text string aloud using native Web SpeechSynthesis
   * @param {string} text - Clean text to speak
   * @param {function(): void} onEnd - Callback when speech ends
   * @param {function(): void} onError - Callback on speech error
   */
  speakText(text, onEnd, onError) {
    if (!this.isSynthesisSupported()) {
      if (onError) onError('Speech synthesis is not supported on this device.');
      return;
    }

    // Stop any active utterance first
    this.stopSpeech();

    // Clean markdown formatting characters for natural speech
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

      // Pick a clean natural voice if available
      const voices = this.synthesis.getVoices();
      const preferredVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Daniel')));
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onend = () => {
        this.currentUtterance = null;
        if (onEnd) onEnd();
      };

      utterance.onerror = (e) => {
        this.currentUtterance = null;
        if (onError) onError(e.error);
      };

      this.currentUtterance = utterance;
      this.synthesis.speak(utterance);
    } catch (err) {
      if (onError) onError(err.message);
    }
  }

  /**
   * Stop currently playing text-to-speech audio
   */
  stopSpeech() {
    if (this.synthesis && this.synthesis.speaking) {
      try {
        this.synthesis.cancel();
      } catch {
        // Ignore cancel errors
      }
    }
    this.currentUtterance = null;
  }

  /**
   * Check if speech is currently playing
   */
  isSpeaking() {
    return !!(this.synthesis && this.synthesis.speaking);
  }
}

export const voiceService = new VoiceService();
