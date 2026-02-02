<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Canvas from './components/Canvas.svelte';
  import Toolbar from './components/Toolbar.svelte';
  import {
    connect,
    disconnect,
    onTextCreated,
    onTextUpdated,
    onTextDeleted,
    onChunksData,
    onSessionAssigned,
    onCursorMoved,
    onCursorTyped,
    onCursorStopped,
  } from './lib/network/socket.ts';
  import { sessionId, userColor, isConnected } from './lib/stores/session.ts';
  import { upsertText, updateText, removeText, loadTexts } from './lib/stores/texts.ts';
  import {
    updateCursorPosition,
    updateCursorTyping,
    clearCursorContent,
  } from './lib/stores/cursors.ts';
  import type { TextStyle } from '../shared/types.ts';
  import { DEFAULT_TEXT_STYLE } from '../shared/types.ts';

  let unsubscribers: (() => void)[] = [];
  let currentStyle: TextStyle = { ...DEFAULT_TEXT_STYLE };

  onMount(() => {
    connect();
    isConnected.set(true);

    unsubscribers = [
      onSessionAssigned((id, color) => {
        sessionId.set(id);
        userColor.set(color);
      }),
      onTextCreated((text) => {
        upsertText(text);
      }),
      onTextUpdated((update) => {
        updateText(update);
      }),
      onTextDeleted(({ id }) => {
        removeText(id);
      }),
      onChunksData((texts) => {
        loadTexts(texts);
      }),
      // Cursor events
      onCursorMoved((data) => {
        updateCursorPosition(data);
      }),
      onCursorTyped((data) => {
        updateCursorTyping(data);
      }),
      onCursorStopped(({ sessionId }) => {
        // Clear the cursor's text content but keep showing the cursor briefly
        clearCursorContent(sessionId);
      }),
    ];
  });

  onDestroy(() => {
    unsubscribers.forEach((unsub) => unsub());
    disconnect();
    isConnected.set(false);
  });
</script>

<main>
  <Toolbar bind:currentStyle />
  <Canvas {currentStyle} />
</main>

<style>
  main {
    width: 100vw;
    height: 100vh;
    overflow: hidden;
  }
</style>
