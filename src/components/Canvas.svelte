<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { CanvasScene } from '../lib/canvas/Scene.ts';
  import {
    subscribeToChunks,
    unsubscribeFromChunks,
    moveCursor,
    typeCursor,
    commitCursor,
    stopCursor,
    getUserColor,
  } from '../lib/network/socket.ts';
  import {
    viewportX,
    viewportY,
    zoom,
    viewportWidth,
    viewportHeight,
    visibleChunks,
  } from '../lib/stores/canvas.ts';
  import { texts } from '../lib/stores/texts.ts';
  import { cursors, cleanupInactiveCursors } from '../lib/stores/cursors.ts';
  import { userColor } from '../lib/stores/session.ts';
  import type { ChunkId, TextStyle } from '../../shared/types.ts';
  import { DEFAULT_TEXT_STYLE } from '../../shared/types.ts';
  import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../shared/constants.ts';

  // Props
  export let currentStyle: TextStyle = { ...DEFAULT_TEXT_STYLE };

  let container: HTMLDivElement;
  let scene: CanvasScene | null = null;
  let currentChunks: ChunkId[] = [];

  // Local cursor state
  let cursorX = CANVAS_WIDTH / 2;
  let cursorY = CANVAS_HEIGHT / 2;
  let currentText = '';
  let hasFocus = false;

  // Track rendered texts
  let renderedTextIds = new Set<string>();

  // Debounce timers
  let chunkUpdateTimeout: ReturnType<typeof setTimeout> | null = null;
  let cursorMoveTimeout: ReturnType<typeof setTimeout> | null = null;
  let typingTimeout: ReturnType<typeof setTimeout> | null = null;

  function updateChunkSubscriptions(newChunks: ChunkId[]): void {
    const toSubscribe = newChunks.filter((c) => !currentChunks.includes(c));
    const toUnsubscribe = currentChunks.filter((c) => !newChunks.includes(c));

    if (toUnsubscribe.length > 0) {
      unsubscribeFromChunks(toUnsubscribe);
    }
    if (toSubscribe.length > 0) {
      subscribeToChunks(toSubscribe);
    }

    currentChunks = newChunks;
  }

  // Subscribe to visible chunks changes
  const unsubscribeChunks = visibleChunks.subscribe((chunks) => {
    if (chunkUpdateTimeout) {
      clearTimeout(chunkUpdateTimeout);
    }
    chunkUpdateTimeout = setTimeout(() => {
      updateChunkSubscriptions(chunks);
    }, 100);
  });

  // Subscribe to texts store to render them
  const unsubscribeTexts = texts.subscribe((allTexts) => {
    if (!scene) return;

    const currentIds = new Set(allTexts.map((t) => t.id));

    // Remove texts that are no longer in store
    for (const id of renderedTextIds) {
      if (!currentIds.has(id)) {
        scene.textRenderer.removeText(id);
        renderedTextIds.delete(id);
      }
    }

    // Add or update texts
    for (const text of allTexts) {
      if (!renderedTextIds.has(text.id)) {
        scene.textRenderer.addText(text);
        renderedTextIds.add(text.id);
      }
    }
  });

  // Subscribe to remote cursors
  const unsubscribeCursors = cursors.subscribe((allCursors) => {
    if (!scene) return;
    scene.cursorRenderer.updateFromCursors(allCursors);
  });

  function handleCanvasClick(e: MouseEvent): void {
    if (!scene) return;

    // Only handle left clicks
    if (e.button !== 0) return;

    const worldPos = scene.getWorldPosition(e.clientX, e.clientY);

    // Check if position is within canvas bounds
    if (!scene.isWithinCanvas(worldPos.x, worldPos.y)) {
      return;
    }

    // If we have text, commit it first
    if (currentText.trim()) {
      commitCurrentText();
    }

    // Move cursor to click position
    cursorX = worldPos.x;
    cursorY = worldPos.y;

    // Update local cursor display
    scene.cursorRenderer.updateLocalCursor(cursorX, cursorY, currentStyle.fontSize, $userColor);
    scene.cursorRenderer.showLocalCursor();

    // Broadcast cursor position
    moveCursor(cursorX, cursorY);

    // Focus canvas for keyboard input
    container.focus();
    hasFocus = true;
  }

  function handleMouseMove(e: MouseEvent): void {
    if (!scene || !hasFocus) return;

    const worldPos = scene.getWorldPosition(e.clientX, e.clientY);

    // Only update if within canvas
    if (!scene.isWithinCanvas(worldPos.x, worldPos.y)) return;

    cursorX = worldPos.x;
    cursorY = worldPos.y;

    // Update cursor and text position
    if (currentText) {
      updateTypingDisplay();
    } else {
      scene.cursorRenderer.updateLocalCursor(cursorX, cursorY, currentStyle.fontSize, $userColor);
    }

    // Debounce cursor move broadcast
    if (cursorMoveTimeout) {
      clearTimeout(cursorMoveTimeout);
    }
    cursorMoveTimeout = setTimeout(() => {
      moveCursor(cursorX, cursorY);
    }, 16); // ~60fps
  }

  function handleKeyDown(e: KeyboardEvent): void {
    if (!scene || !hasFocus) return;

    // Escape - cancel current text
    if (e.key === 'Escape') {
      currentText = '';
      scene.cursorRenderer.clearLocalText();
      stopCursor();
      return;
    }

    // Enter - commit text (keep cursor ready for more typing)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (currentText.trim()) {
        commitCursor({
          content: currentText,
          x: cursorX,
          y: cursorY,
          style: currentStyle,
        });
        currentText = '';
        scene.cursorRenderer.clearLocalText();
      }
      return;
    }

    // Shift+Space - non-breaking space (like reference project)
    if (e.key === ' ' && e.shiftKey) {
      e.preventDefault();
      currentText += '\u00A0'; // Unicode non-breaking space
      updateTypingDisplay();
      return;
    }

    // Shift+Enter - newline support
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      currentText += '\n';
      updateTypingDisplay();
      return;
    }

    // Backspace - handle special characters
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (currentText.length > 0) {
        // Check for non-breaking space at end
        if (currentText.endsWith('\u00A0')) {
          currentText = currentText.slice(0, -1);
        } else {
          currentText = currentText.slice(0, -1);
        }
        updateTypingDisplay();
      }
      return;
    }

    // Regular character input
    if (e.key.length === 1) {
      e.preventDefault();
      currentText += e.key;
      updateTypingDisplay();
    }
  }

  function updateTypingDisplay(): void {
    if (!scene) return;

    // Update local text display
    scene.cursorRenderer.updateLocalText(currentText, cursorX, cursorY, {
      fontSize: currentStyle.fontSize,
      color: currentStyle.color,
      fontWeight: currentStyle.fontWeight,
      fontStyle: currentStyle.fontStyle,
    });

    // Debounce typing broadcast
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    typingTimeout = setTimeout(() => {
      typeCursor(cursorX, cursorY, currentText, currentStyle);
    }, 50);
  }

  function commitCurrentText(): void {
    if (!currentText.trim()) {
      currentText = '';
      scene?.cursorRenderer.clearLocalText();
      return;
    }

    // Send to server
    commitCursor({
      content: currentText,
      x: cursorX,
      y: cursorY,
      style: currentStyle,
    });

    // Clear local state
    currentText = '';
    scene?.cursorRenderer.clearLocalText();
  }

  function handleFocus(): void {
    hasFocus = true;
    scene?.cursorRenderer.showLocalCursor();
  }

  function handleBlur(): void {
    // Don't immediately lose focus - allow clicking elsewhere
    setTimeout(() => {
      if (document.activeElement !== container) {
        hasFocus = false;
        if (currentText.trim()) {
          commitCurrentText();
        }
        scene?.cursorRenderer.hideLocalCursor();
      }
    }, 100);
  }

  onMount(() => {
    scene = new CanvasScene(container);

    // Hide cursor on the Three.js canvas element
    scene.renderer.domElement.style.cursor = 'none';

    // Set initial viewport dimensions
    viewportWidth.set(container.clientWidth);
    viewportHeight.set(container.clientHeight);

    // Make container focusable
    container.tabIndex = 0;

    // Add event handlers
    scene.renderer.domElement.addEventListener('click', handleCanvasClick);
    scene.renderer.domElement.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('keydown', handleKeyDown);
    container.addEventListener('focus', handleFocus);
    container.addEventListener('blur', handleBlur);

    // Initialize local cursor with user color
    const color = getUserColor();
    userColor.set(color);
    scene.cursorRenderer.createLocalCursor(color, currentStyle.fontSize);
    scene.cursorRenderer.hideLocalCursor(); // Hidden until user clicks

    // Update stores when viewport changes
    const updateViewport = (): void => {
      if (!scene) return;
      const pan = scene.getPan();
      const z = scene.getZoom();
      viewportX.set(pan.x);
      viewportY.set(pan.y);
      zoom.set(z);
    };

    // Update text opacities periodically (for fading effect)
    const opacityInterval = setInterval(() => {
      scene?.textRenderer.updateOpacities();
    }, 1000);

    // Cleanup inactive cursors periodically
    const cursorCleanupInterval = setInterval(() => {
      cleanupInactiveCursors();
    }, 1000);

    // Listen for viewport changes
    const pollInterval = setInterval(updateViewport, 100);

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      viewportWidth.set(container.clientWidth);
      viewportHeight.set(container.clientHeight);
    });
    resizeObserver.observe(container);

    return () => {
      clearInterval(pollInterval);
      clearInterval(opacityInterval);
      clearInterval(cursorCleanupInterval);
      resizeObserver.disconnect();
    };
  });

  onDestroy(() => {
    unsubscribeChunks();
    unsubscribeTexts();
    unsubscribeCursors();

    if (chunkUpdateTimeout) clearTimeout(chunkUpdateTimeout);
    if (cursorMoveTimeout) clearTimeout(cursorMoveTimeout);
    if (typingTimeout) clearTimeout(typingTimeout);

    if (scene) {
      scene.renderer.domElement.removeEventListener('click', handleCanvasClick);
      scene.renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('keydown', handleKeyDown);
      container.removeEventListener('focus', handleFocus);
      container.removeEventListener('blur', handleBlur);
      scene.dispose();
    }
  });

  // Update cursor style when currentStyle changes
  $: if (scene && hasFocus) {
    scene.cursorRenderer.updateLocalCursor(cursorX, cursorY, currentStyle.fontSize, $userColor);
    if (currentText) {
      updateTypingDisplay();
    }
  }
</script>

<div
  class="canvas-container"
  bind:this={container}
  class:focused={hasFocus}
></div>

<style>
  .canvas-container {
    width: 100%;
    height: 100%;
    outline: none;
    cursor: none;
  }
</style>
