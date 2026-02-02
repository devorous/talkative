import { writable } from 'svelte/store';

export const sessionId = writable<string | null>(null);
export const userColor = writable<string>('#3b82f6'); // default blue
export const isConnected = writable(false);
