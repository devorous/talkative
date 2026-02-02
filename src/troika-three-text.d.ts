declare module 'troika-three-text' {
  import type { Mesh, Color, Material } from 'three';

  export interface TextRenderInfo {
    blockBounds: [number, number, number, number];
  }

  export class Text extends Mesh {
    text: string;
    font: string | undefined;
    fontSize: number;
    color: string | number | Color;
    fillOpacity: number;
    outlineWidth: number;
    outlineColor: string | number | Color;
    anchorX: 'left' | 'center' | 'right' | number;
    anchorY: 'top' | 'top-baseline' | 'middle' | 'bottom-baseline' | 'bottom' | number;
    letterSpacing: number;
    lineHeight: number;
    textRenderInfo: TextRenderInfo | null;

    sync(callback?: () => void): void;
    dispose(): void;
  }
}
