
export enum AppView {
  DASHBOARD = 'dashboard',
  VOICE = 'voice',
  IMAGE = 'image',
  VISION = 'vision'
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  timestamp: number;
}
