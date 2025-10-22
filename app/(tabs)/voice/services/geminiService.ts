
import { GoogleGenAI, Modality, LiveSession } from "@google/genai";
import type { LiveCallbacks } from "@google/genai";
import Voice from '@react-native-voice/voice';
import { Buffer } from 'buffer';
import AudioRecorderPlayer from 'react-native-nitro-sound';
import Constants from 'expo-constants';

const SYSTEM_INSTRUCTION = `You are a live support agent for property claims inspectors. You are an expert in building systems that use Retrieval-Augmented Generation (RAG) to reference technical documents. Be prepared to explain the steps for implementing RAG, including document processing, vector embeddings, and integrating with a large language model. Be concise, clear, and very responsive.`;

const audioRecorderPlayer = new AudioRecorderPlayer();

export const connectToLiveSession = async (callbacks: LiveCallbacks): Promise<LiveSession> => {
  const apiKey = Constants.expoConfig?.extra?.geminiApiKey;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in your app config. Please set it in app.json or app.config.js");
  }

  console.warn("GEMINI_API_KEY is exposed on the client side. This is not recommended for production apps.");

  const ai = new GoogleGenAI({ apiKey });

  const sessionPromise = ai.live.connect({
    model: 'gemini-1.5-flash-preview-0514',
    callbacks,
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
      },
      systemInstruction: SYSTEM_INSTRUCTION,
      inputAudioTranscription: {},
      outputAudioTranscription: {},
    },
  });

  return sessionPromise;
};

// --- Audio Helper Functions ---

export const startRecording = async (session: LiveSession) => {
  Voice.onSpeechResults = (e) => {
    // This event is not used for sending audio data in this implementation
  };

  Voice.onSpeechPartialResults = (e) => {
    // This event is not used for sending audio data in this implementation
  };

  await Voice.start('en-US');

  audioRecorderPlayer.startRecorder(undefined, undefined, true);
  audioRecorderPlayer.addRecordBackListener((e) => {
    const chunk = e.isLastChunk ? e.chunk : e.buffer;
    const pcmBlob = {
      data: Buffer.from(chunk).toString('base64'),
      mimeType: 'audio/pcm;rate=16000',
    };
    session.sendRealtimeInput({ media: pcmBlob });
    return;
  });
};

export const stopRecording = async () => {
  await Voice.stop();
  await audioRecorderPlayer.stopRecorder();
  audioRecorderPlayer.removeRecordBackListener();
};

export const stopPlayer = async () => {
  await audioRecorderPlayer.stopPlayer();
};

export function decode(base64: string) {
  return Buffer.from(base64, 'base64');
}

export async function playAudio(data: Uint8Array) {
  const path = await audioRecorderPlayer.startPlayer();
  await audioRecorderPlayer.play(path, data);
}
