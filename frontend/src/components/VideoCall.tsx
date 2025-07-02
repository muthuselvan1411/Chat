import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PhoneOff, Mic, MicOff, Video, VideoOff, ArrowLeft } from 'lucide-react';
import Peer from 'simple-peer';

interface VideoCallProps {
  roomId: string;
  isInitiator: boolean;
  onEndCall: () => void;
  onBack: () => void;
  partnerName: string;
  strangerPartner?: any;
  strangerRoomId?: string;
  socket: any;
}

const VideoCall: React.FC<VideoCallProps> = ({ 
  roomId, 
  isInitiator, 
  onEndCall, 
  onBack, 
  partnerName,
  strangerPartner,
  strangerRoomId,
  socket
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Initializing...');

  const myVideo = useRef<HTMLVideoElement>(null);
  const userVideo = useRef<HTMLVideoElement>(null);
  const connectionRef = useRef<Peer.Instance | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Enhanced ICE configuration for better connectivity
  const iceConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' }
    ],
    iceCandidatePoolSize: 10
  };

  // Get user media with better error handling
  const getUserMedia = useCallback(async () => {
    try {
      console.log('📹 Requesting user media...');
      
      const constraints = {
        video: {
          width: { min: 320, ideal: 640, max: 1280 },
          height: { min: 240, ideal: 480, max: 720 },
          frameRate: { min: 15, ideal: 30, max: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('✅ Got user media:', mediaStream.getTracks().map(t => `${t.kind}: ${t.label}`));
      
      setStream(mediaStream);
      streamRef.current = mediaStream;
      
      if (myVideo.current) {
        myVideo.current.srcObject = mediaStream;
      }
      
      return mediaStream;
      
    } catch (error) {
      console.error('❌ Error getting user media:', error);
      throw error;
    }
  }, []);

  // Create peer with enhanced configuration
  const createPeer = useCallback((initiator: boolean, stream: MediaStream) => {
    console.log('🔗 Creating peer connection, initiator:', initiator);
    
    // Destroy existing peer first
    if (connectionRef.current) {
      console.log('🧹 Destroying existing peer');
      connectionRef.current.destroy();
      connectionRef.current = null;
    }
    
    const peer = new Peer({
      initiator,
      trickle: true,
      stream,
      config: iceConfiguration,
      channelConfig: {},
      channelName: `datachannel-${roomId}`,
      objectMode: false
    });

    // Enhanced event handlers
    peer.on('signal', (data) => {
      console.log('📡 Peer signal generated:', data.type);
      
      if (data.type === 'offer') {
        console.log('📡 Sending offer');
        setConnectionStatus('Sending offer...');
        socket.emit('webrtc_offer', { offer: data });
      } else if (data.type === 'answer') {
        console.log('📡 Sending answer');
        setConnectionStatus('Sending answer...');
        socket.emit('webrtc_answer', { answer: data });
      } else if (data.candidate) {
        console.log('🧊 Sending ICE candidate');
        socket.emit('webrtc_ice_candidate', { candidate: data });
      }
    });

    peer.on('stream', (incomingStream) => {
      console.log('📺 Remote stream received!');
      console.log('📺 Stream ID:', incomingStream.id);
      console.log('📺 Stream tracks:', incomingStream.getTracks().map(t => `${t.kind}: ${t.enabled} (${t.readyState})`));
      
      setRemoteStream(incomingStream);
      setCallAccepted(true);
      setConnectionStatus('Connected');
      
      // Assign stream to video element with multiple attempts
      const assignStream = () => {
        if (userVideo.current) {
          console.log('📺 Assigning remote stream to video element');
          userVideo.current.srcObject = incomingStream;
          
          // Force video properties
          userVideo.current.autoplay = true;
          userVideo.current.playsInline = true;
          
          // Attempt to play
          userVideo.current.play()
            .then(() => {
              console.log('▶️ Remote video playing successfully');
            })
            .catch(e => {
              console.warn('⚠️ Auto-play failed:', e);
              setTimeout(() => {
                if (userVideo.current) {
                  userVideo.current.play().catch(console.error);
                }
              }, 1000);
            });
        }
      };
      
      assignStream();
      setTimeout(assignStream, 500);
    });

    peer.on('connect', () => {
      console.log('✅ Peer data channel connected');
      setConnectionStatus('Connected');
    });

    peer.on('error', (error) => {
      console.error('❌ Peer error:', error);
      setConnectionStatus(`Error: ${error.message}`);
      
      if (error.message.includes('setRemoteDescription') || error.message.includes('Connection failed')) {
        console.log('🔄 Attempting to recover from connection error...');
        setTimeout(() => {
          if (streamRef.current && !callEnded) {
            console.log('🔄 Recreating peer connection...');
            const newPeer = createPeer(initiator, streamRef.current);
            connectionRef.current = newPeer;
          }
        }, 2000);
      }
    });

    peer.on('close', () => {
      console.log('📞 Peer connection closed');
      if (!callEnded) {
        setConnectionStatus('Connection lost');
      }
    });

    return peer;
  }, [socket, roomId, callEnded]);

  // Handle incoming offer with better error handling
  const handleOffer = useCallback((data: any) => {
    console.log('📨 Received offer from:', data.from);
    
    if (!streamRef.current) {
      console.error('❌ No stream available');
      return;
    }

    setConnectionStatus('Received offer, creating answer...');
    
    try {
      const peer = createPeer(false, streamRef.current);
      connectionRef.current = peer;
      
      setTimeout(() => {
        if (peer && !peer.destroyed) {
          peer.signal(data.offer);
        }
      }, 100);
    } catch (error) {
      console.error('❌ Error handling offer:', error);
      setConnectionStatus('Failed to handle offer');
    }
  }, [createPeer]);

  // Handle incoming answer
  const handleAnswer = useCallback((data: any) => {
    console.log('📨 Received answer from:', data.from);
    
    if (connectionRef.current && !connectionRef.current.destroyed) {
      try {
        connectionRef.current.signal(data.answer);
        setConnectionStatus('Processing answer...');
      } catch (error) {
        console.error('❌ Error processing answer:', error);
      }
    }
  }, []);

  // Handle ICE candidate
  const handleIceCandidate = useCallback((data: any) => {
    console.log('🧊 Received ICE candidate');
    
    if (connectionRef.current && !connectionRef.current.destroyed) {
      try {
        connectionRef.current.signal(data.candidate);
      } catch (error) {
        console.error('❌ Error processing ICE candidate:', error);
      }
    }
  }, []);

  // Initialize call
  useEffect(() => {
    const initializeCall = async () => {
      try {
        console.log('🎥 Initializing video call...');
        setConnectionStatus('Getting camera access...');
        
        const mediaStream = await getUserMedia();
        
        if (isInitiator) {
          console.log('📞 Creating offer as initiator');
          setConnectionStatus('Creating offer...');
          
          setTimeout(() => {
            if (streamRef.current && socket && !callEnded) {
              const peer = createPeer(true, streamRef.current);
              connectionRef.current = peer;
            }
          }, 1500);
        } else {
          console.log('📞 Waiting for offer as receiver');
          setConnectionStatus('Waiting for offer...');
        }
        
      } catch (error) {
        console.error('❌ Failed to initialize call:', error);
        setConnectionStatus('Failed to get camera access');
      }
    };

    if (socket && socket.connected) {
      initializeCall();
    }
  }, [socket, isInitiator, getUserMedia, createPeer, callEnded]);

  // Setup socket listeners
  useEffect(() => {
    if (!socket) return;

    console.log('🔌 Setting up socket listeners');
    
    socket.on('webrtc_offer', handleOffer);
    socket.on('webrtc_answer', handleAnswer);
    socket.on('webrtc_ice_candidate', handleIceCandidate);

    return () => {
      console.log('🧹 Cleaning up socket listeners');
      socket.off('webrtc_offer', handleOffer);
      socket.off('webrtc_answer', handleAnswer);
      socket.off('webrtc_ice_candidate', handleIceCandidate);
    };
  }, [socket, handleOffer, handleAnswer, handleIceCandidate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 Cleaning up video call');
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (connectionRef.current) {
        connectionRef.current.destroy();
      }
    };
  }, []);

  const leaveCall = () => {
    console.log('📞 Leaving call');
    setCallEnded(true);
    
    if (socket) {
      socket.emit('end_video_call', { room_id: roomId });
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (connectionRef.current) {
      connectionRef.current.destroy();
    }
    
    onEndCall();
  };

  const toggleMute = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  return (
    <div className="h-screen bg-black flex flex-col relative overflow-hidden">
      {/* Header - Fixed positioning */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 via-black/60 to-transparent p-4">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition-all duration-200 backdrop-blur-sm"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-semibold">Video Call</h1>
              <p className="text-sm text-gray-300">{connectionStatus}</p>
              <div className="flex items-center gap-2 text-xs mt-1">
                <span className={`px-2 py-1 rounded-full ${isInitiator ? 'bg-blue-500/80' : 'bg-green-500/80'} backdrop-blur-sm`}>
                  {isInitiator ? 'INITIATOR' : 'RECEIVER'}
                </span>
                <span className={`px-2 py-1 rounded-full ${callAccepted ? 'bg-green-500/80' : 'bg-yellow-500/80'} backdrop-blur-sm`}>
                  {callAccepted ? 'CONNECTED' : 'CONNECTING'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="text-sm text-gray-300 bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
            Room: {roomId.slice(-8)}...
          </div>
        </div>
      </div>

      {/* Video Container - Full screen */}
      <div className="flex-1 relative">
        {/* Remote Video (Main) */}
        <div className="w-full h-full bg-gray-900 flex items-center justify-center">
          {callAccepted && remoteStream ? (
            <video
              ref={userVideo}
              autoPlay
              playsInline
              controls={false}
              className="w-full h-full object-cover"
              onLoadedMetadata={() => {
                console.log('📺 Remote video metadata loaded');
                console.log('📺 Video dimensions:', userVideo.current?.videoWidth, 'x', userVideo.current?.videoHeight);
              }}
              onCanPlay={() => {
                console.log('✅ Remote video can play');
              }}
              onPlay={() => {
                console.log('▶️ Remote video started playing');
              }}
              onError={(e) => {
                console.error('❌ Remote video error:', e);
              }}
            />
          ) : (
            <div className="text-center text-white">
              <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-semibold">
                  {partnerName.charAt(0)}
                </span>
              </div>
              <p className="text-lg">{connectionStatus}</p>
              <p className="text-sm text-gray-400 mt-2">
                {isInitiator ? 'Waiting for partner to join...' : 'Connecting to call...'}
              </p>
            </div>
          )}
        </div>

        {/* My Video (Picture-in-Picture) - Better positioning */}
        <div className="absolute top-20 right-4 w-48 h-36 bg-gray-800 rounded-xl overflow-hidden border-2 border-white/30 shadow-2xl z-10">
          <video
            ref={myVideo}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          {isVideoOff && (
            <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
              <VideoOff className="w-8 h-8 text-white" />
            </div>
          )}
          <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
            YOU
          </div>
        </div>

        {/* Connection Status Indicator */}
        <div className="absolute top-20 left-4 z-10">
          <div className="bg-black/60 text-white px-4 py-2 rounded-full text-sm backdrop-blur-sm border border-white/20">
            {callAccepted ? '📺 Video Connected' : '⏳ Establishing Connection...'}
          </div>
        </div>
      </div>

      {/* Controls - Fixed bottom with better styling */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-6 pb-8">
        <div className="flex items-center justify-center gap-8">
          {/* Mute Button */}
          <button
            onClick={toggleMute}
            className={`p-4 rounded-full transition-all duration-200 transform hover:scale-110 shadow-lg backdrop-blur-sm ${
              isMuted 
                ? 'bg-red-500 hover:bg-red-600 shadow-red-500/50' 
                : 'bg-white/20 hover:bg-white/30 border border-white/30'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <MicOff className="w-6 h-6 text-white" />
            ) : (
              <Mic className="w-6 h-6 text-white" />
            )}
          </button>

          {/* Video Toggle Button */}
          <button
            onClick={toggleVideo}
            className={`p-4 rounded-full transition-all duration-200 transform hover:scale-110 shadow-lg backdrop-blur-sm ${
              isVideoOff 
                ? 'bg-red-500 hover:bg-red-600 shadow-red-500/50' 
                : 'bg-white/20 hover:bg-white/30 border border-white/30'
            }`}
            title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
          >
            {isVideoOff ? (
              <VideoOff className="w-6 h-6 text-white" />
            ) : (
              <Video className="w-6 h-6 text-white" />
            )}
          </button>

          {/* End Call Button */}
          <button
            onClick={leaveCall}
            className="p-4 rounded-full bg-red-500 hover:bg-red-600 transition-all duration-200 transform hover:scale-110 shadow-lg shadow-red-500/50"
            title="End call"
          >
            <PhoneOff className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Call Duration or Status */}
        <div className="text-center mt-4">
          <p className="text-white/80 text-sm">
            {callAccepted ? '🔴 Live' : 'Connecting...'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default VideoCall;
