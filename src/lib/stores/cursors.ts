import { writable, derived } from 'svelte/store';
import type { CursorData, CursorTypingData, TextStyle } from '../../../shared/types.ts';
import { CURSOR_INACTIVE_TIMEOUT } from '../../../shared/constants.ts';

export interface RemoteCursor {
  sessionId: string;
  x: number;
  y: number;
  color: string;
  content: string;
  style: TextStyle | null;
  lastActive: number;
}

// All remote cursors keyed by session ID
export const remoteCursors = writable<Map<string, RemoteCursor>>(new Map());

// Get all cursors as array
export const cursors = derived(remoteCursors, ($remoteCursors) =>
  Array.from($remoteCursors.values())
);

// Update cursor position
export function updateCursorPosition(data: CursorData): void {
  remoteCursors.update((map) => {
    const existing = map.get(data.sessionId);
    map.set(data.sessionId, {
      sessionId: data.sessionId,
      x: data.x,
      y: data.y,
      color: data.color,
      content: existing?.content ?? '',
      style: existing?.style ?? null,
      lastActive: Date.now(),
    });
    return new Map(map);
  });
}

// Update cursor typing content
export function updateCursorTyping(data: CursorTypingData): void {
  remoteCursors.update((map) => {
    const existing = map.get(data.sessionId);
    map.set(data.sessionId, {
      sessionId: data.sessionId,
      x: data.x,
      y: data.y,
      color: existing?.color ?? '#888888',
      content: data.content,
      style: data.style,
      lastActive: Date.now(),
    });
    return new Map(map);
  });
}

// Remove cursor when user stops or disconnects
export function removeCursor(sessionId: string): void {
  remoteCursors.update((map) => {
    map.delete(sessionId);
    return new Map(map);
  });
}

// Clear typing content when user commits (but keep cursor visible)
export function clearCursorContent(sessionId: string): void {
  remoteCursors.update((map) => {
    const existing = map.get(sessionId);
    if (existing) {
      map.set(sessionId, {
        ...existing,
        content: '',
        style: null,
        lastActive: Date.now(),
      });
    }
    return new Map(map);
  });
}

// Clean up inactive cursors
export function cleanupInactiveCursors(): void {
  const now = Date.now();
  remoteCursors.update((map) => {
    for (const [sessionId, cursor] of map) {
      if (now - cursor.lastActive > CURSOR_INACTIVE_TIMEOUT) {
        map.delete(sessionId);
      }
    }
    return new Map(map);
  });
}

// Clear all cursors
export function clearAllCursors(): void {
  remoteCursors.set(new Map());
}
