
export enum TranscriptSpeaker {
  User = 'user',
  Agent = 'agent',
}

export interface TranscriptEntry {
  speaker: TranscriptSpeaker;
  text: string;
}

export type SessionStatus =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'speaking'
  | 'closing'
  | 'error';
