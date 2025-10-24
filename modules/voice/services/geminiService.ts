
import { GoogleGenAI, Modality, LiveSession } from "@google/genai";
import type { LiveCallbacks } from "@google/genai";
import Voice from '@react-native-voice/voice';
import { Buffer } from 'buffer';
import AudioRecorderPlayer from 'react-native-nitro-sound';
import Constants from 'expo-constants';

const SYSTEM_INSTRUCTION = `You are a live support agent for property claims inspectors. You are an expert in building systems that use Retrieval-Augmented Generation (RAG) to reference technical documents. Be prepared to explain the steps for implementing RAG, including document processing, vector embeddings, and integrating with a large language model. Be concise, clear, and very responsive.`;

// Lazy initialization to avoid module-level crashes
let audioRecorderPlayer: AudioRecorderPlayer | null = null;

function getAudioRecorderPlayer(): AudioRecorderPlayer {
  if (!audioRecorderPlayer) {
    try {
      audioRecorderPlayer = new AudioRecorderPlayer();
    } catch (error) {
      console.error('Failed to initialize AudioRecorderPlayer:', error);
      throw new Error('Audio recording is not available on this device');
    }
  }
  return audioRecorderPlayer;
}

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
  try {
    Voice.onSpeechResults = (e) => {
      // This event is not used for sending audio data in this implementation
    };

    Voice.onSpeechPartialResults = (e) => {
      // This event is not used for sending audio data in this implementation
    };

    await Voice.start('en-US');

    const recorder = getAudioRecorderPlayer();
    recorder.startRecorder(undefined, undefined, true);
    recorder.addRecordBackListener((e) => {
      const chunk = e.isLastChunk ? e.chunk : e.buffer;
      const pcmBlob = {
        data: Buffer.from(chunk).toString('base64'),
        mimeType: 'audio/pcm;rate=16000',
      };
      session.sendRealtimeInput({ media: pcmBlob });
      return;
    });
  } catch (error) {
    console.error('Failed to start recording:', error);
    throw error;
  }
};

export const stopRecording = async () => {
  try {
    await Voice.stop();
    if (audioRecorderPlayer) {
      await audioRecorderPlayer.stopRecorder();
      audioRecorderPlayer.removeRecordBackListener();
    }
  } catch (error) {
    console.error('Failed to stop recording:', error);
  }
};

export const stopPlayer = async () => {
  try {
    if (audioRecorderPlayer) {
      await audioRecorderPlayer.stopPlayer();
    }
  } catch (error) {
    console.error('Failed to stop player:', error);
  }
};

export function decode(base64: string) {
  return Buffer.from(base64, 'base64');
}

export async function playAudio(data: Uint8Array) {
  try {
    const recorder = getAudioRecorderPlayer();
    const path = await recorder.startPlayer();
    await recorder.play(path, data);
  } catch (error) {
    console.error('Failed to play audio:', error);
    throw error;
  }
}
