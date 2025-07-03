import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile, X, Mic, MicOff, Play, Pause, Trash2 } from 'lucide-react';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import FileUpload from './FileUpload';
import { useTheme } from '../contexts/ThemeContext';

interface MessageInputProps {
  onSendMessage: (content: string, fileInfo?: any) => void;
  onTyping: (isTyping: boolean) => void;
  placeholder?: string;
  isDarkMode: boolean;
  replyingTo?: {
    messageId: string;
    username: string;
    content: string;
  } | null;
  onCancelReply?: () => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ 
  onSendMessage, 
  onTyping, 
  placeholder = "Type a message...",
  isDarkMode: propIsDarkMode,
  replyingTo,
  onCancelReply
}) => {
  const { isDarkMode: contextIsDarkMode } = useTheme();
  const isDarkMode = propIsDarkMode ?? contextIsDarkMode;

  // Text message states
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioLevels, setAudioLevels] = useState<number[]>([]);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
      if (currentAudioUrl) URL.revokeObjectURL(currentAudioUrl);
    };
  }, [currentAudioUrl]);

  // File upload handler
  const handleFileUpload = async (file: File, message?: string) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload failed:', response.status, errorText);
        throw new Error(`Upload failed: ${response.status}`);
      }

      const fileInfo = await response.json();
      onSendMessage(message || '', fileInfo);
    } catch (error) {
      console.error('File upload error:', error);
      alert('Failed to upload file. Please try again.');
    }
  };

  // Enhanced audio level monitoring
  const monitorAudioLevels = () => {
    if (!analyserRef.current || !isRecording) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateLevels = () => {
      if (!isRecording || !analyserRef.current) return;

      // Use getByteFrequencyData for better audio level detection
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Calculate average volume across all frequencies
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      
      // Normalize and amplify the level (0-255 range to 0-1 range)
      const normalizedLevel = Math.min((average / 255) * 3, 1); // Multiply by 3 for sensitivity
      
      // Always add levels during recording (even if quiet)
      setAudioLevels(prev => {
        const newLevels = [...prev, Math.max(normalizedLevel, 0.1)]; // Minimum 0.1 for visibility
        return newLevels.slice(-50); // Keep last 50 levels
      });

      animationFrameRef.current = requestAnimationFrame(updateLevels);
    };

    updateLevels();
  };

  // Enhanced voice recording with better audio detection
  const startRecording = async () => {
    try {
      console.log('🎤 Starting voice recording...');
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Voice recording not supported in this browser');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: false, // Turn OFF noise suppression for better level detection
          autoGainControl: false,  // Turn OFF auto gain for consistent levels
          sampleRate: 44100
        }
      });

      console.log('✅ Microphone access granted');

      // Setup audio context for real-time visualization
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      // Optimize analyser settings for better sensitivity
      analyserRef.current.fftSize = 512; // Smaller for faster updates
      analyserRef.current.smoothingTimeConstant = 0.1; // Less smoothing for more responsive
      analyserRef.current.minDecibels = -90; // Lower threshold
      analyserRef.current.maxDecibels = -10; // Higher threshold

      // Setup media recorder with better format support
      let mimeType = '';
      const supportedTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/wav',
        'audio/ogg'
      ];

      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          console.log('✅ Using MIME type:', mimeType);
          break;
        }
      }

      if (!mimeType) {
        console.warn('⚠️ No supported MIME type found, using default');
      }

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          console.log('📊 Audio chunk received:', event.data.size, 'bytes');
        }
      };

      mediaRecorder.onstop = () => {
        console.log('🛑 Recording stopped, creating blob...');
        
        // Create blob with explicit type
        const blob = new Blob(chunksRef.current, { 
          type: mimeType || 'audio/webm' 
        });
        
        console.log('📦 Audio blob created:', {
          size: blob.size,
          type: blob.type,
          chunks: chunksRef.current.length
        });
        
        // Verify blob is not empty
        if (blob.size === 0) {
          console.error('❌ Empty audio blob created!');
          alert('Recording failed - no audio data captured');
          return;
        }
        
        setAudioBlob(blob);
        
        // Clean up stream
        stream.getTracks().forEach(track => {
          track.stop();
          console.log('🔇 Stopped track:', track.kind, track.label);
        });
      };

      mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event);
      };

      mediaRecorder.start(100); // Smaller chunks for more responsive recording
      setIsRecording(true);
      setRecordingDuration(0);
      setAudioLevels([]);

      console.log('🔴 Recording started with format:', mimeType);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          const newDuration = prev + 1;
          console.log('⏱️ Recording duration:', newDuration, 'seconds');
          return newDuration;
        });
      }, 1000);

      // Start real-time audio level monitoring
      monitorAudioLevels();

    } catch (error: any) {
      console.error('❌ Error starting recording:', error);
      
      let errorMessage = 'Could not start recording. ';
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Please allow microphone access.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No microphone found.';
      } else if (error.name === 'NotReadableError') {
        errorMessage += 'Microphone is being used by another application.';
      } else {
        errorMessage += error.message || 'Unknown error occurred.';
      }
      
      alert(errorMessage);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      console.log('⏹️ Stopping recording...');
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    }
  };

  // Enhanced audio playback function
  const playAudio = async () => {
    if (!audioBlob || !audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setIsPlaying(false);
        console.log('⏸️ Audio paused');
      } else {
        // Clean up previous URL
        if (currentAudioUrl) {
          URL.revokeObjectURL(currentAudioUrl);
        }
        
        // Create a fresh URL for the blob
        const audioUrl = URL.createObjectURL(audioBlob);
        setCurrentAudioUrl(audioUrl);
        audioRef.current.src = audioUrl;
        
        // Load the audio first
        audioRef.current.load();
        
        // Wait for it to be ready and then play
        await audioRef.current.play();
        setIsPlaying(true);
        console.log('▶️ Audio playback started');
      }
    } catch (error) {
      console.error('❌ Audio playback failed:', error);
      setIsPlaying(false);
      
      // Try alternative playback method
      if (audioBlob) {
        const audioUrl = URL.createObjectURL(audioBlob);
        const tempAudio = new Audio(audioUrl);
        tempAudio.play().then(() => {
          console.log('✅ Alternative playback method worked');
        }).catch(e => {
          console.error('❌ Alternative playback also failed:', e);
          alert('Cannot play audio. The recording might be corrupted.');
        });
      }
    }
  };

  // Audio format testing function
  const testAudioPlayback = () => {
    if (!audioBlob) return;
    
    console.log('🧪 Testing audio playback...');
    console.log('Blob size:', audioBlob.size);
    console.log('Blob type:', audioBlob.type);
    
    // Test with different methods
    const url = URL.createObjectURL(audioBlob);
    
    // Method 1: Direct audio element
    const audio1 = new Audio(url);
    audio1.play().then(() => {
      console.log('✅ Method 1 (new Audio) works');
    }).catch(e => {
      console.log('❌ Method 1 failed:', e);
    });
    
    // Method 2: Create audio element
    const audio2 = document.createElement('audio');
    audio2.src = url;
    audio2.play().then(() => {
      console.log('✅ Method 2 (createElement) works');
    }).catch(e => {
      console.log('❌ Method 2 failed:', e);
    });
    
    // Check if browser supports the format
    const audio3 = document.createElement('audio');
    const canPlay = audio3.canPlayType('audio/webm;codecs=opus');
    console.log('Can play webm/opus:', canPlay);
    
    const canPlayWebm = audio3.canPlayType('audio/webm');
    console.log('Can play webm:', canPlayWebm);
  };
const sendVoiceMessage = async () => {
  if (!audioBlob) return;

  try {
    console.log('📤 Sending voice message...', audioBlob.size, 'bytes');
    
    const formData = new FormData();
    formData.append('file', audioBlob, `voice-${Date.now()}.webm`);

    const response = await fetch('http://localhost:8000/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Upload failed:', response.status, errorText);
      throw new Error(`Upload failed: ${response.status}`);
    }

    const fileInfo = await response.json();
    console.log('✅ Voice message uploaded:', fileInfo);
    
    // IMPORTANT: Send as file message with proper structure
    onSendMessage('🎤 Voice message', {
      ...fileInfo,
      isVoiceMessage: true,
      duration: recordingDuration,
      waveform: audioLevels,
      file_type: 'voice' // Ensure this matches what backend expects
    });
    
    resetVoiceRecorder();
    
  } catch (error) {
    console.error('❌ Voice message upload error:', error);
    alert('Failed to send voice message. Please try again.');
  }
};


  const resetVoiceRecorder = () => {
    // Clean up audio URL
    if (currentAudioUrl) {
      URL.revokeObjectURL(currentAudioUrl);
      setCurrentAudioUrl(null);
    }
    
    setAudioBlob(null);
    setRecordingDuration(0);
    setAudioLevels([]);
    setIsPlaying(false);
  };

  // Text message functions
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
      handleStopTyping();
      setShowEmojiPicker(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessage(value);

    if (value.trim() && !isTyping) {
      setIsTyping(true);
      onTyping(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, 1000);
  };

  const handleStopTyping = () => {
    if (isTyping) {
      setIsTyping(false);
      onTyping(false);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const handleEmojiSelect = (emoji: any) => {
    setMessage(prevMessage => prevMessage + emoji.native);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // WhatsApp-like minimal voice interface
  if (isRecording || audioBlob) {
    return (
      <div className="space-y-3">
        {/* Reply Preview */}
        {replyingTo && (
          <div className="glass-effect rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Replying to
                </span>
                <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {replyingTo.username}
                </span>
              </div>
              {onCancelReply && (
                <button
                  onClick={onCancelReply}
                  className={`text-lg leading-none ${
                    isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  ×
                </button>
              )}
            </div>
            <p className={`text-sm truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {replyingTo.content}
            </p>
          </div>
        )}

        {/* Minimal Voice Interface */}
        <div className={`flex items-center gap-3 p-4 rounded-2xl ${
          isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
        } transition-all duration-300`}>
          
          {/* Recording/Play Button */}
          <button
            onClick={isRecording ? stopRecording : (audioBlob ? playAudio : undefined)}
            className={`p-3 rounded-full transition-all duration-200 ${
              isRecording 
                ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                : audioBlob
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-blue-500 hover:bg-blue-600'
            } shadow-lg`}
          >
            {isRecording ? (
              <MicOff className="w-5 h-5 text-white" />
            ) : audioBlob ? (
              isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white" />
            ) : (
              <Mic className="w-5 h-5 text-white" />
            )}
          </button>

          {/* WhatsApp-like Waveform */}
          <div className="flex-1 flex items-center gap-1 h-8">
            {isRecording ? (
              // Live recording visualization
              audioLevels.slice(-30).map((level, index) => (
                <div
                  key={index}
                  className="bg-red-500 rounded-full transition-all duration-100"
                  style={{
                    width: '3px',
                    height: `${Math.max(4, level * 32)}px`,
                    opacity: 0.7 + level * 0.3
                  }}
                />
              ))
            ) : audioBlob ? (
              // Static waveform for recorded audio
              audioLevels.map((level, index) => (
                <div
                  key={index}
                  className="rounded-full transition-all duration-200 bg-green-500"
                  style={{
                    width: '3px',
                    height: `${Math.max(4, level * 32)}px`
                  }}
                />
              ))
            ) : (
              // Placeholder bars
              Array(20).fill(0).map((_, index) => (
                <div
                  key={index}
                  className={`w-1 h-2 rounded-full ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}
                />
              ))
            )}
          </div>

          {/* Duration */}
          <span className={`text-sm font-mono ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {formatTime(recordingDuration)}
          </span>

          {/* Action Buttons */}
          {!isRecording && audioBlob && (
            <>
              <button
                onClick={testAudioPlayback}
                className="p-2 rounded-full bg-yellow-500 hover:bg-yellow-600 text-white transition-colors duration-200"
                title="Test Playback"
              >
                🧪
              </button>
              <button
                onClick={resetVoiceRecorder}
                className="p-2 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors duration-200"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={sendVoiceMessage}
                className="p-2 rounded-full bg-green-500 hover:bg-green-600 text-white transition-colors duration-200"
                title="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Enhanced audio element for playback */}
        {audioBlob && (
          <audio
            ref={audioRef}
            preload="auto"
            controls={false}
            onEnded={() => {
              setIsPlaying(false);
              console.log('🔚 Audio playback ended');
              if (currentAudioUrl) {
                URL.revokeObjectURL(currentAudioUrl);
                setCurrentAudioUrl(null);
              }
            }}
            onError={(e) => {
              console.error('❌ Audio element error:', e);
              setIsPlaying(false);
            }}
            onLoadedData={() => {
              console.log('✅ Audio data loaded successfully');
            }}
            onCanPlay={() => {
              console.log('✅ Audio can play');
            }}
          />
        )}
      </div>
    );
  }

  // Regular text input interface
  return (
    <div className="space-y-2">
      {/* Reply Preview */}
      {replyingTo && (
        <div className="glass-effect rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                Replying to
              </span>
              <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {replyingTo.username}
              </span>
            </div>
            {onCancelReply && (
              <button
                onClick={onCancelReply}
                className={`text-lg leading-none ${
                  isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                ×
              </button>
            )}
          </div>
          <p className={`text-sm truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {replyingTo.content}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-3 w-full">
        {/* File Upload Component */}
        <FileUpload 
          onFileSelect={handleFileUpload}
          isDarkMode={isDarkMode}
        />
        
        {/* Voice Recording Button */}
        <button
          type="button"
          onClick={startRecording}
          className="floating-button"
          title="Record voice message"
        >
          <Mic className="w-5 h-5" />
        </button>
        
        {/* Message Input */}
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            className="chat-input pr-12"
            maxLength={500}
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-colors duration-200 ${
              isDarkMode ? 'text-gray-400 hover:text-blue-400' : 'text-gray-500 hover:text-blue-500'
            }`}
            aria-label="Toggle emoji picker"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* Emoji Picker */}
          {showEmojiPicker && (
            <div ref={emojiPickerRef} className="absolute bottom-full right-0 mb-2 z-20">
              <Picker
                data={data}
                onEmojiSelect={handleEmojiSelect}
                theme={isDarkMode ? 'dark' : 'light'}
                set="native"
                previewPosition="none"
                skinTonePosition="none"
                emojiSize={20}
                emojiButtonSize={28}
                maxFrequentRows={2}
                perLine={8}
                searchPosition="sticky"
                navPosition="bottom"
              />
            </div>
          )}
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={!message.trim()}
          className="btn-primary"
          aria-label="Send message"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
