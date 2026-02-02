// Canvas dimensions
export const CANVAS_WIDTH = 10000;
export const CANVAS_HEIGHT = 10000;

// Chunk configuration
export const CHUNK_SIZE = 1000;
export const CHUNKS_X = CANVAS_WIDTH / CHUNK_SIZE;
export const CHUNKS_Y = CANVAS_HEIGHT / CHUNK_SIZE;

// Text lifecycle (in milliseconds)
export const FADE_START_MS = 5 * 60 * 1000; // 5 minutes
export const EXPIRE_MS = 10 * 60 * 60 * 1000; // 10 hours

// Text limits
export const MAX_TEXT_LENGTH = 500;
export const MIN_FONT_SIZE = 8;
export const MAX_FONT_SIZE = 200;

// Viewport
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 5;
export const DEFAULT_ZOOM = 1;

// Grid
export const GRID_SIZE = 50; // pixels between grid lines
export const GRID_COLOR = '#e0e0e0';
export const GRID_MAJOR_EVERY = 5; // every 5th line is darker

// Available fonts
export const FONTS = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Playfair Display',
] as const;

export type FontFamily = (typeof FONTS)[number];

// Cursor colors for users
export const CURSOR_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f59e0b', // amber
] as const;

// Cursor settings
export const CURSOR_WIDTH = 2;
export const CURSOR_HEIGHT_FACTOR = 1.2; // relative to font size
export const CURSOR_BLINK_RATE = 530; // ms
export const CURSOR_INACTIVE_TIMEOUT = 5000; // ms before hiding inactive cursor
