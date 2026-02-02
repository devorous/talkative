import { io, type Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  TextObject,
  CreateTextData,
  UpdateTextData,
  ChunkId,
  CursorData,
  CursorTypingData,
  TextStyle,
} from '../../../shared/types.ts';

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;
let sessionId: string | null = null;
let userColor: string = '#3b82f6';

// Event callbacks
type TextCreatedCallback = (text: TextObject) => void;
type TextUpdatedCallback = (text: Partial<TextObject> & { id: string }) => void;
type TextDeletedCallback = (data: { id: string }) => void;
type ChunksDataCallback = (texts: TextObject[]) => void;
type SessionAssignedCallback = (sessionId: string, color: string) => void;
type CursorMovedCallback = (data: CursorData) => void;
type CursorTypedCallback = (data: CursorTypingData) => void;
type CursorStoppedCallback = (data: { sessionId: string }) => void;

const callbacks = {
  textCreated: new Set<TextCreatedCallback>(),
  textUpdated: new Set<TextUpdatedCallback>(),
  textDeleted: new Set<TextDeletedCallback>(),
  chunksData: new Set<ChunksDataCallback>(),
  sessionAssigned: new Set<SessionAssignedCallback>(),
  cursorMoved: new Set<CursorMovedCallback>(),
  cursorTyped: new Set<CursorTypedCallback>(),
  cursorStopped: new Set<CursorStoppedCallback>(),
};

export function connect(): void {
  if (socket?.connected) return;

  const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
  socket = io(serverUrl);

  socket.on('connect', () => {
    console.log('Connected to server');
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from server');
  });

  socket.on('session:assigned', (id: string, color: string) => {
    sessionId = id;
    userColor = color;
    console.log('Session assigned:', id, 'color:', color);
    callbacks.sessionAssigned.forEach((cb) => cb(id, color));
  });

  socket.on('text:created', (text: TextObject) => {
    callbacks.textCreated.forEach((cb) => cb(text));
  });

  socket.on('text:updated', (text: Partial<TextObject> & { id: string }) => {
    callbacks.textUpdated.forEach((cb) => cb(text));
  });

  socket.on('text:deleted', (data: { id: string }) => {
    callbacks.textDeleted.forEach((cb) => cb(data));
  });

  socket.on('chunks:data', (texts: TextObject[]) => {
    callbacks.chunksData.forEach((cb) => cb(texts));
  });

  // Cursor events
  socket.on('cursor:moved', (data: CursorData) => {
    // Don't process our own cursor
    if (data.sessionId === sessionId) return;
    callbacks.cursorMoved.forEach((cb) => cb(data));
  });

  socket.on('cursor:typed', (data: CursorTypingData) => {
    // Don't process our own cursor
    if (data.sessionId === sessionId) return;
    callbacks.cursorTyped.forEach((cb) => cb(data));
  });

  socket.on('cursor:stopped', (data: { sessionId: string }) => {
    callbacks.cursorStopped.forEach((cb) => cb(data));
  });
}

export function disconnect(): void {
  socket?.disconnect();
  socket = null;
}

export function getSessionId(): string | null {
  return sessionId;
}

export function getUserColor(): string {
  return userColor;
}

export function isConnected(): boolean {
  return socket?.connected ?? false;
}

// Subscribe to chunks
export function subscribeToChunks(chunks: ChunkId[]): void {
  socket?.emit('chunks:subscribe', chunks);
}

export function unsubscribeFromChunks(chunks: ChunkId[]): void {
  socket?.emit('chunks:unsubscribe', chunks);
}

// Text operations
export function createText(data: CreateTextData): void {
  socket?.emit('text:create', data);
}

export function updateText(data: UpdateTextData): void {
  socket?.emit('text:update', data);
}

export function deleteText(id: string): void {
  socket?.emit('text:delete', { id });
}

// Cursor operations
export function moveCursor(x: number, y: number): void {
  socket?.emit('cursor:move', { x, y });
}

export function typeCursor(x: number, y: number, content: string, style: TextStyle): void {
  socket?.emit('cursor:typing', { x, y, content, style });
}

export function commitCursor(data: CreateTextData): void {
  socket?.emit('cursor:commit', data);
}

export function stopCursor(): void {
  socket?.emit('cursor:stop');
}

// Event subscriptions
export function onTextCreated(callback: TextCreatedCallback): () => void {
  callbacks.textCreated.add(callback);
  return () => callbacks.textCreated.delete(callback);
}

export function onTextUpdated(callback: TextUpdatedCallback): () => void {
  callbacks.textUpdated.add(callback);
  return () => callbacks.textUpdated.delete(callback);
}

export function onTextDeleted(callback: TextDeletedCallback): () => void {
  callbacks.textDeleted.add(callback);
  return () => callbacks.textDeleted.delete(callback);
}

export function onChunksData(callback: ChunksDataCallback): () => void {
  callbacks.chunksData.add(callback);
  return () => callbacks.chunksData.delete(callback);
}

export function onSessionAssigned(callback: SessionAssignedCallback): () => void {
  callbacks.sessionAssigned.add(callback);
  return () => callbacks.sessionAssigned.delete(callback);
}

export function onCursorMoved(callback: CursorMovedCallback): () => void {
  callbacks.cursorMoved.add(callback);
  return () => callbacks.cursorMoved.delete(callback);
}

export function onCursorTyped(callback: CursorTypedCallback): () => void {
  callbacks.cursorTyped.add(callback);
  return () => callbacks.cursorTyped.delete(callback);
}

export function onCursorStopped(callback: CursorStoppedCallback): () => void {
  callbacks.cursorStopped.add(callback);
  return () => callbacks.cursorStopped.delete(callback);
}
