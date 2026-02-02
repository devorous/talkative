import type { FontFamily } from './constants.ts';

// Text object as stored in database
export interface TextObject {
  id: string;
  ownerId: string;
  content: string;
  x: number;
  y: number;
  chunkX: number;
  chunkY: number;
  fontFamily: FontFamily;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  color: string; // #RRGGBB or #RRGGBBAA
  rotation: number; // degrees
  outlineWidth: number;
  outlineColor: string;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowBlur: number;
  shadowColor: string;
  opacity: number;
  letterSpacing: number;
  lineHeight: number;
  createdAt: number; // timestamp
  fadeStartAt: number; // timestamp
  expiresAt: number; // timestamp
}

// Minimal text style for creating new text
export interface TextStyle {
  fontFamily: FontFamily;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  color: string;
  rotation: number;
  outlineWidth: number;
  outlineColor: string;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowBlur: number;
  shadowColor: string;
  opacity: number;
  letterSpacing: number;
  lineHeight: number;
}

// Default text style
export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFamily: 'Inter',
  fontSize: 24,
  fontWeight: 'normal',
  fontStyle: 'normal',
  color: '#000000',
  rotation: 0,
  outlineWidth: 0,
  outlineColor: '#000000',
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  shadowBlur: 0,
  shadowColor: '#00000040',
  opacity: 1,
  letterSpacing: 0,
  lineHeight: 1.2,
};

// Cursor data for live collaboration
export interface CursorData {
  sessionId: string;
  x: number;
  y: number;
  color: string;
}

export interface CursorTypingData {
  sessionId: string;
  x: number;
  y: number;
  content: string;
  style: TextStyle;
}

// WebSocket events
export interface ClientToServerEvents {
  'text:create': (data: CreateTextData) => void;
  'text:update': (data: UpdateTextData) => void;
  'text:delete': (data: { id: string }) => void;
  'chunks:subscribe': (chunks: ChunkId[]) => void;
  'chunks:unsubscribe': (chunks: ChunkId[]) => void;
  // Cursor events
  'cursor:move': (data: { x: number; y: number }) => void;
  'cursor:typing': (data: { x: number; y: number; content: string; style: TextStyle }) => void;
  'cursor:commit': (data: CreateTextData) => void;
  'cursor:stop': () => void;
}

export interface ServerToClientEvents {
  'session:assigned': (sessionId: string, color: string) => void;
  'text:created': (text: TextObject) => void;
  'text:updated': (text: Partial<TextObject> & { id: string }) => void;
  'text:deleted': (data: { id: string }) => void;
  'chunks:data': (texts: TextObject[]) => void;
  // Cursor events
  'cursor:moved': (data: CursorData) => void;
  'cursor:typed': (data: CursorTypingData) => void;
  'cursor:stopped': (data: { sessionId: string }) => void;
}

export interface CreateTextData {
  content: string;
  x: number;
  y: number;
  style: TextStyle;
}

export interface UpdateTextData {
  id: string;
  content?: string;
  x?: number;
  y?: number;
  style?: Partial<TextStyle>;
}

export type ChunkId = `${number},${number}`;

// Utility to calculate chunk from position
export function getChunkId(x: number, y: number, chunkSize: number): ChunkId {
  const chunkX = Math.floor(x / chunkSize);
  const chunkY = Math.floor(y / chunkSize);
  return `${chunkX},${chunkY}`;
}

export function parseChunkId(chunkId: ChunkId): { x: number; y: number } {
  const [x, y] = chunkId.split(',').map(Number);
  return { x, y };
}
