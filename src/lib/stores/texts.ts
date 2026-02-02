import { writable, derived } from 'svelte/store';
import type { TextObject } from '../../../shared/types.ts';

// All loaded text objects keyed by ID
export const textsById = writable<Map<string, TextObject>>(new Map());

// Get all texts as array
export const texts = derived(textsById, ($textsById) =>
  Array.from($textsById.values())
);

// Add or update a text object
export function upsertText(text: TextObject): void {
  textsById.update((map) => {
    map.set(text.id, text);
    return new Map(map);
  });
}

// Update a text object partially
export function updateText(update: Partial<TextObject> & { id: string }): void {
  textsById.update((map) => {
    const existing = map.get(update.id);
    if (existing) {
      map.set(update.id, { ...existing, ...update });
    }
    return new Map(map);
  });
}

// Remove a text object
export function removeText(id: string): void {
  textsById.update((map) => {
    map.delete(id);
    return new Map(map);
  });
}

// Load multiple texts (from chunk data)
export function loadTexts(newTexts: TextObject[]): void {
  textsById.update((map) => {
    for (const text of newTexts) {
      map.set(text.id, text);
    }
    return new Map(map);
  });
}

// Clear all texts
export function clearTexts(): void {
  textsById.set(new Map());
}
