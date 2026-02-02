import { writable, derived } from 'svelte/store';
import { CHUNK_SIZE } from '../../../shared/constants.ts';
import type { ChunkId } from '../../../shared/types.ts';

// Viewport state
export const viewportX = writable(5000); // Center of canvas
export const viewportY = writable(5000);
export const zoom = writable(1);
export const viewportWidth = writable(0);
export const viewportHeight = writable(0);

// Calculate visible chunks based on viewport
export const visibleChunks = derived(
  [viewportX, viewportY, zoom, viewportWidth, viewportHeight],
  ([$viewportX, $viewportY, $zoom, $viewportWidth, $viewportHeight]) => {
    const worldWidth = $viewportWidth / $zoom;
    const worldHeight = $viewportHeight / $zoom;

    const left = $viewportX - worldWidth / 2;
    const right = $viewportX + worldWidth / 2;
    const bottom = $viewportY - worldHeight / 2;
    const top = $viewportY + worldHeight / 2;

    const minChunkX = Math.max(0, Math.floor(left / CHUNK_SIZE));
    const maxChunkX = Math.min(9, Math.floor(right / CHUNK_SIZE));
    const minChunkY = Math.max(0, Math.floor(bottom / CHUNK_SIZE));
    const maxChunkY = Math.min(9, Math.floor(top / CHUNK_SIZE));

    const chunks: ChunkId[] = [];
    for (let x = minChunkX; x <= maxChunkX; x++) {
      for (let y = minChunkY; y <= maxChunkY; y++) {
        chunks.push(`${x},${y}`);
      }
    }
    return chunks;
  }
);

// Currently selected text ID
export const selectedTextId = writable<string | null>(null);

// Tool state
export type Tool = 'select' | 'text';
export const currentTool = writable<Tool>('text');
