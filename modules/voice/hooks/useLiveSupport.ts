
import { useState, useRef, useCallback, useEffect } from 'react';
import type { TranscriptEntry, SessionStatus } from '@/modules/voice/types';
import { TranscriptSpeaker } from '@/modules/voice/types';
import { connectToLiveSession, decode, playAudio, startRecording, stopPlayer, stopRecording } from '@/modules/voice/services/geminiService';
import type { LiveSession, LiveServerMessage } from '@google/genai';

export const useLiveSupport = () => {
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [currentUserTranscript, setCurrentUserTranscript] = useState('');
  const [currentAgentTranscript, setCurrentAgentTranscript] = useState('');

  const sessionPromise = useRef<Promise<LiveSession> | null>(null);
  const isSessionActive = status !== 'idle' && status !== 'error';

  const userTranscriptRef = useRef('');
  const agentTranscriptRef = useRef('');

  useEffect(() => {
    userTranscriptRef.current = currentUserTranscript;
    agentTranscriptRef.current = currentAgentTranscript;
  }, [currentUserTranscript, currentAgentTranscript]);

  const handleMessage = useCallback(async (message: LiveServerMessage) => {
    if (message.serverContent) {
      if (message.serverContent.inputTranscription) {
        setStatus('listening');
        setCurrentUserTranscript(prev => prev + message.serverContent.inputTranscription.text);
      }

      if (message.serverContent.outputTranscription) {
        setStatus('speaking');
        setCurrentAgentTranscript(prev => prev + message.serverContent.outputTranscription.text);
      }

      const audioData = message.serverContent.modelTurn?.parts[0]?.inlineData?.data;
      if (audioData) {
        setStatus('speaking');
        await playAudio(decode(audioData));
        setStatus('listening');
      }

      if (message.serverContent.turnComplete) {
        const fullUserTranscript = userTranscriptRef.current;
        const fullAgentTranscript = agentTranscriptRef.current;

        setTranscripts(prev => {
          const newTranscripts: TranscriptEntry[] = [...prev];
          if (fullUserTranscript.trim()) newTranscripts.push({ speaker: TranscriptSpeaker.User, text: fullUserTranscript });
          if (fullAgentTranscript.trim()) newTranscripts.push({ speaker: TranscriptSpeaker.Agent, text: fullAgentTranscript });
          return newTranscripts;
        });

        setCurrentUserTranscript('');
        setCurrentAgentTranscript('');
      }

      if (message.serverContent.interrupted) {
        await stopPlayer();
        setStatus('listening');
      }
    }
  }, []);

  const stopSession = useCallback(async () => {
    setStatus('closing');
    if (sessionPromise.current) {
      try {
        const session = await sessionPromise.current;
        session.close();
        await stopRecording();
        await stopPlayer();
      } catch (e) {
        console.error("Error closing session:", e);
      }
    }
    sessionPromise.current = null;
  }, []);

  const startSession = useCallback(async () => {
    setError(null);
    setStatus('connecting');
    setTranscripts([]);
    setCurrentUserTranscript('');
    setCurrentAgentTranscript('');

    try {
      sessionPromise.current = connectToLiveSession({
        onmessage: handleMessage,
        onerror: (e) => {
          console.error("Session error:", e);
          setError("Connection failed. Please try again.");
          setStatus('error');
        },
        onclose: () => {
          setStatus('idle');
        }
      });
      const session = await sessionPromise.current;
      await startRecording(session);
      setStatus('listening');
    } catch (e) {
      console.error("Failed to start session:", e);
      setError(e instanceof Error ? e.message : "An unknown error occurred.");
      setStatus('error');
    }
  }, [handleMessage]);

  return {
    status,
    isSessionActive,
    startSession,
    stopSession,
    transcripts,
    currentUserTranscript,
    currentAgentTranscript,
    error,
  };
};
