<script lang="ts">
  import { FONTS, MIN_FONT_SIZE, MAX_FONT_SIZE } from '../../shared/constants.ts';
  import type { TextStyle } from '../../shared/types.ts';
  import { DEFAULT_TEXT_STYLE } from '../../shared/types.ts';

  // Current style that will be applied to new text
  export let currentStyle: TextStyle = { ...DEFAULT_TEXT_STYLE };

  const presetColors = [
    '#000000',
    '#374151',
    '#dc2626',
    '#ea580c',
    '#ca8a04',
    '#16a34a',
    '#0891b2',
    '#2563eb',
    '#7c3aed',
    '#db2777',
  ];

  function handleColorChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    currentStyle = { ...currentStyle, color: target.value };
  }

  function selectPresetColor(color: string): void {
    currentStyle = { ...currentStyle, color };
  }

  function handleFontChange(e: Event): void {
    const target = e.target as HTMLSelectElement;
    currentStyle = { ...currentStyle, fontFamily: target.value as typeof currentStyle.fontFamily };
  }

  function handleSizeChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    currentStyle = { ...currentStyle, fontSize: Number(target.value) };
  }

  function toggleBold(): void {
    currentStyle = {
      ...currentStyle,
      fontWeight: currentStyle.fontWeight === 'bold' ? 'normal' : 'bold',
    };
  }

  function toggleItalic(): void {
    currentStyle = {
      ...currentStyle,
      fontStyle: currentStyle.fontStyle === 'italic' ? 'normal' : 'italic',
    };
  }
</script>

<div class="toolbar">
  <div class="toolbar-section keyboard-hints" title="Shortcuts: Shift+Space for non-breaking space, Shift+Enter for newline, Enter to commit, Escape to cancel">
    <span class="hint-icon">⌨️</span>
  </div>

  <div class="toolbar-section">
    <label class="toolbar-label">Font</label>
    <select value={currentStyle.fontFamily} onchange={handleFontChange}>
      {#each FONTS as font}
        <option value={font}>{font}</option>
      {/each}
    </select>
  </div>

  <div class="toolbar-section">
    <label class="toolbar-label">Size</label>
    <input
      type="range"
      min={MIN_FONT_SIZE}
      max={MAX_FONT_SIZE}
      value={currentStyle.fontSize}
      oninput={handleSizeChange}
      class="size-slider"
    />
    <span class="size-value">{currentStyle.fontSize}px</span>
  </div>

  <div class="toolbar-section">
    <button
      class="style-button"
      class:active={currentStyle.fontWeight === 'bold'}
      onclick={toggleBold}
      title="Bold"
    >
      <strong>B</strong>
    </button>
    <button
      class="style-button"
      class:active={currentStyle.fontStyle === 'italic'}
      onclick={toggleItalic}
      title="Italic"
    >
      <em>I</em>
    </button>
  </div>

  <div class="toolbar-section">
    <label class="toolbar-label">Color</label>
    <div class="color-row">
      {#each presetColors as color}
        <button
          class="color-swatch"
          class:active={currentStyle.color === color}
          style="background-color: {color}"
          onclick={() => selectPresetColor(color)}
          title={color}
        ></button>
      {/each}
      <input
        type="color"
        value={currentStyle.color}
        onchange={handleColorChange}
        class="color-picker"
        title="Custom color"
      />
    </div>
  </div>
</div>

<style>
  .toolbar {
    position: fixed;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 8px 16px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    z-index: 100;
  }

  .toolbar-section {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .keyboard-hints {
    cursor: help;
    padding: 4px 8px;
    background: #f3f4f6;
    border-radius: 4px;
  }

  .keyboard-hints:hover {
    background: #e5e7eb;
  }

  .hint-icon {
    font-size: 16px;
  }

  .toolbar-label {
    font-size: 12px;
    font-weight: 500;
    color: #6b7280;
  }

  select {
    padding: 4px 8px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 14px;
    background: white;
    cursor: pointer;
  }

  select:hover {
    border-color: #9ca3af;
  }

  .size-slider {
    width: 80px;
    cursor: pointer;
  }

  .size-value {
    font-size: 12px;
    color: #374151;
    min-width: 40px;
  }

  .style-button {
    width: 28px;
    height: 28px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .style-button:hover {
    background: #f3f4f6;
  }

  .style-button.active {
    background: #2563eb;
    border-color: #2563eb;
    color: white;
  }

  .color-row {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .color-swatch {
    width: 20px;
    height: 20px;
    border: 2px solid transparent;
    border-radius: 4px;
    cursor: pointer;
    padding: 0;
  }

  .color-swatch:hover {
    transform: scale(1.1);
  }

  .color-swatch.active {
    border-color: #2563eb;
  }

  .color-picker {
    width: 24px;
    height: 24px;
    padding: 0;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    cursor: pointer;
  }
</style>
