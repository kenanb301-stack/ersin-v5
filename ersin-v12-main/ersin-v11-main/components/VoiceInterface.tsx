
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { encode, decode, decodeAudioData } from '../utils/audio';

// Fix: Completed the truncated VoiceInterface component to ensure it returns a valid React Node
const VoiceInterface: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [transcriptions, setTranscriptions] = useState<{ type: 'user' | 'model'; text: string }[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const transcriptionRef = useRef<{ user: string; model: string }>({ user: '', model: '' });

  const stopSession = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (outputContextRef.current) {
      outputContextRef.current.close();
      outputContextRef.current = null;
    }
    setIsActive(false);
    setIsConnecting(false);
  }, []);

  const startSession = async () => {
    setIsConnecting(true);
    try {
      // Fix: Always initialize GoogleGenAI with a named parameter using the process.env.API_KEY
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = inputAudioContext;
      outputContextRef.current = outputAudioContext;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            console.log('Live session opened');
            setIsActive(true);
            setIsConnecting(false);

            // Stream audio from microphone to model
            const source = inputAudioContext.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob: Blob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              
              // CRITICAL: Solely rely on sessionPromise resolves and then call `session.sendRealtimeInput`
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Audio Output Handling
            const base64EncodedAudioString = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64EncodedAudioString) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);
              // Use manual audio decoding logic as browser native decodeAudioData doesn't support raw PCM
              const audioBuffer = await decodeAudioData(
                decode(base64EncodedAudioString),
                outputAudioContext,
                24000,
                1,
              );
              const source = outputAudioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputAudioContext.destination);
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
              });
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            // Interruption Handling
            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
              for (const source of sourcesRef.current.values()) {
                source.stop();
                sourcesRef.current.delete(source);
              }
              nextStartTimeRef.current = 0;
            }

            // Transcription Handling
            if (message.serverContent?.outputTranscription) {
              transcriptionRef.current.model += message.serverContent.outputTranscription.text;
            } else if (message.serverContent?.inputTranscription) {
              transcriptionRef.current.user += message.serverContent.inputTranscription.text;
            }

            if (message.serverContent?.turnComplete) {
              const u = transcriptionRef.current.user;
              const m = transcriptionRef.current.model;
              if (u || m) {
                setTranscriptions(prev => [
                  ...prev,
                  ...(u ? [{ type: 'user' as const, text: u }] : []),
                  ...(m ? [{ type: 'model' as const, text: m }] : [])
                ]);
              }
              transcriptionRef.current = { user: '', model: '' };
            }
          },
          onerror: (e: any) => {
            console.error('Live API error:', e);
            stopSession();
          },
          onclose: (e: any) => {
            console.log('Live session closed:', e);
            stopSession();
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          systemInstruction: 'You are a friendly and helpful assistant for the warehouse manager. You can help with stock levels, orders, and general warehouse operations.',
        },
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error('Failed to start Live Session:', err);
      setIsConnecting(false);
      setIsActive(false);
    }
  };

  useEffect(() => {
    return () => {
      stopSession();
    };
  }, [stopSession]);

  return (
    <div className="flex flex-col h-full glass rounded-3xl overflow-hidden shadow-2xl border border-gray-800">
      {/* Header */}
      <div className="p-6 bg-gray-900/50 border-b border-gray-800 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold gradient-text">Voice Lounge</h2>
          <p className="text-sm text-gray-500">Real-time AI voice assistant</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isActive ? 'bg-green-500/20 text-green-400 animate-pulse' : 'bg-gray-800 text-gray-500'}`}>
          {isActive ? 'Live' : 'Offline'}
        </div>
      </div>

      {/* Transcriptions Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
        {transcriptions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
            <div className="text-5xl mb-4">🎙️</div>
            <p className="max-w-[200px]">Start a session to talk with Gemini about your warehouse.</p>
          </div>
        ) : (
          transcriptions.map((t, i) => (
            <div key={i} className={`flex ${t.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-4 rounded-2xl ${t.type === 'user' ? 'bg-blue-600/20 text-blue-100 border border-blue-500/30' : 'bg-gray-800/50 text-gray-200 border border-gray-700/50'}`}>
                <p className="text-sm leading-relaxed">{t.text}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Control Area */}
      <div className="p-8 bg-gray-900/30 flex flex-col items-center gap-4">
        {!isActive ? (
          <button
            onClick={startSession}
            disabled={isConnecting}
            className="group relative w-20 h-20 rounded-full bg-blue-600 hover:bg-blue-500 transition-all duration-300 flex items-center justify-center shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnecting ? (
              <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <div className="text-3xl group-hover:scale-110 transition-transform">🎙️</div>
            )}
            <div className="absolute -inset-2 bg-blue-500/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ) : (
          <button
            onClick={stopSession}
            className="group relative w-20 h-20 rounded-full bg-red-600 hover:bg-red-500 transition-all duration-300 flex items-center justify-center shadow-lg shadow-red-500/20"
          >
            <div className="text-2xl group-hover:scale-90 transition-transform">⏹️</div>
            <div className="absolute -inset-2 bg-red-500/20 rounded-full blur-xl animate-pulse" />
          </button>
        )}
        
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
          {isConnecting ? 'Establishing Connection...' : isActive ? 'Listening... Tap to stop' : 'Tap microphone to start'}
        </p>
      </div>
    </div>
  );
};

export default VoiceInterface;
