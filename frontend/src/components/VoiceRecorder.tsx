import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Play, Pause, Send, Trash2 } from 'lucide-react';

interface VoiceRecorderProps {
  onVoiceMessage: (audioBlob: Blob, duration: number) => void;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onVoiceMessage }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const playAudio = () => {
    if (audioBlob && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const sendVoiceMessage = () => {
    if (audioBlob) {
      onVoiceMessage(audioBlob, duration);
      resetRecorder();
    }
  };

  const resetRecorder = () => {
    setAudioBlob(null);
    setDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2">
      {!audioBlob ? (
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`p-2 rounded-full transition-all duration-200 ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
              : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300'
          }`}
        >
          {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
      ) : (
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-full px-3 py-2">
          <button
            onClick={playAudio}
            className="p-1 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-colors duration-200"
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </button>
          
          <span className="text-xs text-gray-600 dark:text-gray-300">
            {formatTime(duration)}
          </span>
          
          <button
            onClick={sendVoiceMessage}
            className="p-1 rounded-full bg-green-500 hover:bg-green-600 text-white transition-colors duration-200"
          >
            <Send className="w-3 h-3" />
          </button>
          
          <button
            onClick={resetRecorder}
            className="p-1 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors duration-200"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}

      {isRecording && (
        <span className="text-sm text-red-500 font-medium">
          Recording... {formatTime(duration)}
        </span>
      )}

      {audioBlob && (
        <audio
          ref={audioRef}
          src={URL.createObjectURL(audioBlob)}
          onEnded={() => setIsPlaying(false)}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        />
      )}
    </div>
  );
};

export default VoiceRecorder;
