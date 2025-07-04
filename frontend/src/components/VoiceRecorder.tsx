import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Play, Pause, Send, Trash2, Volume2, StopCircle } from 'lucide-react';

// Import the fix library (you'll need to install it)
// npm install fix-webm-duration
declare global {
  interface Window {
    ysFixWebmDuration: (blob: Blob, duration: number, options?: any) => Promise<Blob>;
  }
}

interface VoiceRecorderProps {
  onVoiceMessage: (audioBlob: Blob, duration: number, waveform?: number[]) => void;
  isDarkMode?: boolean;
  disabled?: boolean;
  maxDuration?: number;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ 
  onVoiceMessage, 
  isDarkMode = false,
  disabled = false,
  maxDuration = 300
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioLevels, setAudioLevels] = useState<number[]>([]);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const recordingStartTime = useRef<number>(0);

  // Load the fix library
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/fix-webm-duration@1.0.6/fix-webm-duration.js';
    script.async = true;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, []);

  // Audio level visualization
  const updateAudioLevels = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    const normalizedLevel = Math.min(1, average / 128);
    
    setAudioLevels(prev => {
      const newLevels = [...prev, normalizedLevel];
      return newLevels.slice(-50);
    });

    if (isRecording) {
      animationFrameRef.current = requestAnimationFrame(updateAudioLevels);
    }
  }, [isRecording]);

  // Fix WebM duration using the library
  const fixWebmDuration = async (blob: Blob, durationMs: number): Promise<Blob> => {
    try {
      if (window.ysFixWebmDuration) {
        console.log('🔧 Fixing WebM duration...', durationMs, 'ms');
        const fixedBlob = await window.ysFixWebmDuration(blob, durationMs, { logger: false });
        console.log('✅ WebM duration fixed successfully');
        return fixedBlob;
      } else {
        console.warn('⚠️ WebM fix library not loaded, using original blob');
        return blob;
      }
    } catch (error) {
      console.error('❌ Failed to fix WebM duration:', error);
      return blob; // Return original blob if fix fails
    }
  };

  const startRecording = async () => {
    if (disabled) return;
    
    setIsInitializing(true);
    setError(null);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });

      // Setup audio context for visualization
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      recordingStartTime.current = Date.now();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const recordingEndTime = Date.now();
        const actualDuration = recordingEndTime - recordingStartTime.current;
        
        console.log('📦 Creating audio blob with duration:', actualDuration, 'ms');
        
        const originalBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        
        // Fix the WebM duration metadata
        const fixedBlob = await fixWebmDuration(originalBlob, actualDuration);
        
        setAudioBlob(fixedBlob);
        setDuration(Math.floor(actualDuration / 1000)); // Convert to seconds
        
        stream.getTracks().forEach(track => track.stop());
        
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setIsInitializing(false);
      setRecordingDuration(0);
      setAudioLevels([]);

      // Start timer for recording duration
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          const newDuration = prev + 1;
          if (newDuration >= maxDuration) {
            stopRecording();
          }
          return newDuration;
        });
      }, 1000);

      updateAudioLevels();

    } catch (error: any) {
      console.error('Error accessing microphone:', error);
      setError('Microphone access denied. Please check permissions.');
      setIsInitializing(false);
    }
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  }, [isRecording]);

  const playAudio = async () => {
    if (!audioBlob || !audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setIsPlaying(false);
        setCurrentTime(0);
      } else {
        // Clean up previous URL
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
        }
        
        // Create fresh URL
        audioUrlRef.current = URL.createObjectURL(audioBlob);
        audioRef.current.src = audioUrlRef.current;
        
        // Load and play
        audioRef.current.load();
        
        // Wait for the audio to be ready
        await new Promise<void>((resolve, reject) => {
          const audio = audioRef.current!;
          
          const onCanPlay = () => {
            audio.removeEventListener('canplay', onCanPlay);
            audio.removeEventListener('error', onError);
            resolve();
          };
          
          const onError = (e: any) => {
            audio.removeEventListener('canplay', onCanPlay);
            audio.removeEventListener('error', onError);
            reject(e);
          };
          
          audio.addEventListener('canplay', onCanPlay);
          audio.addEventListener('error', onError);
        });
        
        await audioRef.current.play();
        setIsPlaying(true);
        console.log('▶️ Audio playback started successfully');
      }
    } catch (error) {
      console.error('❌ Audio playback failed:', error);
      setIsPlaying(false);
      alert('Cannot play audio. Please try recording again.');
    }
  };

  const sendVoiceMessage = () => {
    if (audioBlob) {
      onVoiceMessage(audioBlob, duration, audioLevels);
      resetRecorder();
    }
  };

  const resetRecorder = () => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    
    setAudioBlob(null);
    setDuration(0);
    setRecordingDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);
    setAudioLevels([]);
    setError(null);
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    if (!duration || duration === 0 || !currentTime) return 0;
    return Math.min(100, (currentTime / duration) * 100);
  };

  // Error state
  if (error) {
    return (
      <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <MicOff className="w-4 h-4 text-red-500" />
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
        <button
          onClick={() => setError(null)}
          className="text-xs text-red-500 hover:text-red-700 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  // Recording state
  if (isRecording) {
    return (
      <div className={`flex items-center gap-3 p-3 rounded-xl min-w-[200px] max-w-[300px] transition-all duration-200 ${
      isDarkMode 
        ? 'bg-gray-700/50 hover:bg-gray-700/70' 
        : 'bg-blue-50 hover:bg-blue-100 border border-blue-200' // Enhanced for light mode
    }`}>
        <button
          onClick={stopRecording}
          className="p-2 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all duration-200 animate-pulse"
        >
          <StopCircle className="w-5 h-5" />
        </button>

        <div className="flex-1 flex items-center gap-1 h-8">
          {audioLevels.slice(-20).map((level, index) => (
            <div
              key={index}
              className="bg-red-500 rounded-full transition-all duration-100"
              style={{
                width: '3px',
                height: `${Math.max(4, level * 24)}px`,
                opacity: 0.7 + (index / 20) * 0.3
              }}
            />
          ))}
          {audioLevels.length < 20 && Array.from({ length: 20 - audioLevels.length }).map((_, index) => (
            <div
              key={`empty-${index}`}
              className="bg-gray-300 dark:bg-gray-600 rounded-full"
              style={{ width: '3px', height: '4px' }}
            />
          ))}
        </div>

        <div className="flex flex-col items-end">
          <span className="text-sm font-medium text-red-600 dark:text-red-400">
            {formatTime(recordingDuration)}
          </span>
          <span className="text-xs text-red-500 dark:text-red-400">
            Recording...
          </span>
        </div>
      </div>
    );
  }

  // Playback state
  if (audioBlob) {
    return (
      <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 min-w-[320px]">
        <button
          onClick={playAudio}
          className="p-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-all duration-200 hover:scale-105"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>

        <div className="flex-1 space-y-1">
          <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="absolute left-0 top-0 h-full bg-blue-500 transition-all duration-100 rounded-full"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={sendVoiceMessage}
            className="p-2 rounded-full bg-green-500 hover:bg-green-600 text-white transition-all duration-200 hover:scale-105"
            title="Send voice message"
          >
            <Send className="w-4 h-4" />
          </button>
          
          <button
            onClick={resetRecorder}
            className="p-2 rounded-full bg-gray-400 hover:bg-gray-500 text-white transition-all duration-200 hover:scale-105"
            title="Delete recording"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <audio
          ref={audioRef}
          preload="metadata"
          onEnded={() => {
            setIsPlaying(false);
            setCurrentTime(0);
          }}
          onTimeUpdate={(e) => {
            const time = e.currentTarget.currentTime;
            if (isFinite(time)) {
              setCurrentTime(time);
            }
          }}
          onLoadedMetadata={(e) => {
            const audioDuration = e.currentTarget.duration;
            console.log('📊 Audio metadata loaded, duration:', audioDuration);
            if (isFinite(audioDuration) && audioDuration > 0) {
              setDuration(audioDuration);
            }
          }}
          onError={(e) => {
            console.error('Audio element error:', e);
            setIsPlaying(false);
          }}
        />
      </div>
    );
  }

  // Initial state
  return (
    <button
      onClick={startRecording}
      disabled={disabled || isInitializing}
      className={`p-2 rounded-full transition-all duration-200 hover:scale-105 ${
        disabled
          ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
          : isInitializing
            ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-500 animate-pulse'
            : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300'
      }`}
      title={disabled ? 'Voice recording disabled' : 'Start voice recording'}
    >
      {isInitializing ? (
        <Volume2 className="w-5 h-5 animate-pulse" />
      ) : (
        <Mic className="w-5 h-5" />
      )}
    </button>
  );
};

export default VoiceRecorder;
