import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { useTranslation } from '../utils/i18n';

const VoiceInput = ({ 
  onTranscript, 
  language = 'en-US',
  className = '',
  disabled = false 
}) => {
  const { t } = useTranslation();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasPermission, setHasPermission] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);

  // Language mappings for speech recognition
  const getRecognitionLanguage = (lang) => {
    const languageMap = {
      'zh-CN': 'zh-CN',
      'zh-TW': 'zh-TW',
      'en-US': 'en-US',
      'en-GB': 'en-GB',
      'ja-JP': 'ja-JP',
      'ko-KR': 'ko-KR',
      'es-ES': 'es-ES',
      'fr-FR': 'fr-FR',
      'de-DE': 'de-DE',
      'ru-RU': 'ru-RU',
      'ar-SA': 'ar-SA',
      'hi-IN': 'hi-IN',
      'pt-BR': 'pt-BR',
      'it-IT': 'it-IT',
    };
    return languageMap[lang] || 'en-US';
  };

  // Initialize speech recognition
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = getRecognitionLanguage(language);

    let finalTranscript = '';
    let interimTranscript = '';

    recognitionRef.current.onresult = (event) => {
      interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
          // Send final transcript
          if (onTranscript) {
            onTranscript(finalTranscript.trim(), false);
          }
        } else {
          interimTranscript += transcript;
          // Send interim transcript for real-time feedback
          if (onTranscript) {
            onTranscript(finalTranscript + interimTranscript, true);
          }
        }
      }
    };

    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setHasPermission(false);
      }
      stopRecording();
    };

    recognitionRef.current.onend = () => {
      if (isRecording) {
        // Restart recognition if still recording
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.error('Failed to restart recognition:', e);
          stopRecording();
        }
      }
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [language]);

  // Update language when it changes
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = getRecognitionLanguage(language);
    }
  }, [language]);

  // Visualize audio level
  const updateAudioLevel = () => {
    if (analyserRef.current && isRecording) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      setAudioLevel(Math.min(100, average));
      
      animationRef.current = requestAnimationFrame(updateAudioLevel);
    }
  };

  const startRecording = async () => {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Setup audio context for visualization
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      
      // Start speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.start();
        setIsRecording(true);
        updateAudioLevel();
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
      setHasPermission(false);
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    setAudioLevel(0);
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  if (!hasPermission) {
    const isLocalNetwork = window.location.hostname.match(/^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\.|^localhost$/);
    
    return (
      <div className="relative">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => {
            // Show permission dialog
            const dialog = document.createElement('div');
            dialog.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50';
            dialog.innerHTML = `
              <div class="permission-dialog">
                <h3>${t('microphonePermissionRequired')}</h3>
                <p>${t('microphonePermissionDesc') || 'This app needs microphone access for voice input.'}</p>
                ${isLocalNetwork ? `
                  <div class="warning-box">
                    <p><strong>${t('httpsRequired') || 'HTTPS Required'}</strong></p>
                    <p>${t('httpsRequiredDesc') || 'Microphone access requires HTTPS. You are accessing via local network IP. Please use a domain name with HTTPS or localhost.'}</p>
                  </div>
                ` : ''}
                <div class="flex gap-2 mt-4">
                  <button class="px-4 py-2 bg-primary text-primary-foreground rounded-md" onclick="this.closest('.fixed').remove()">
                    ${t('close') || 'Close'}
                  </button>
                </div>
              </div>
            `;
            document.body.appendChild(dialog);
            dialog.querySelector('button').onclick = () => dialog.remove();
          }}
          className="opacity-50"
          title={t('microphonePermissionRequired')}
        >
          <Mic className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <Button
        type="button"
        variant={isRecording ? "destructive" : "outline"}
        size="icon"
        onClick={toggleRecording}
        disabled={disabled || isProcessing}
        className={cn(
          "relative transition-all",
          isRecording && "animate-pulse"
        )}
        title={isRecording ? t('stopRecording') : t('startRecording')}
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isRecording ? (
          <MicOff className="w-4 h-4" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
        
        {/* Audio level indicator */}
        {isRecording && (
          <div 
            className="absolute inset-0 bg-red-500 opacity-20 rounded-md"
            style={{
              transform: `scale(${1 + audioLevel / 200})`,
              transition: 'transform 0.1s'
            }}
          />
        )}
      </Button>
      
      {/* Recording indicator */}
      {isRecording && (
        <div className="absolute -top-1 -right-1 w-3 h-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </div>
      )}
    </div>
  );
};

export default VoiceInput;