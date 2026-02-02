import * as THREE from 'three';
import { Text } from 'troika-three-text';
import type { TextObject } from '../../../shared/types.ts';
import { FADE_START_MS, EXPIRE_MS } from '../../../shared/constants.ts';

// Map of text ID to troika Text mesh
const textMeshes = new Map<string, Text>();

export class TextRenderer {
  private scene: THREE.Scene;
  private textGroup: THREE.Group;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.textGroup = new THREE.Group();
    this.textGroup.name = 'texts';
    this.scene.add(this.textGroup);
  }

  public addText(textObj: TextObject): void {
    // Remove existing if updating
    this.removeText(textObj.id);

    const mesh = new Text();

    // Position
    mesh.position.set(textObj.x, textObj.y, 1);
    mesh.rotation.z = (textObj.rotation * Math.PI) / 180;

    // Content
    mesh.text = textObj.content;

    // Typography
    mesh.fontSize = textObj.fontSize;
    mesh.font = this.getFontUrl(textObj.fontFamily);
    mesh.letterSpacing = textObj.letterSpacing;
    mesh.lineHeight = textObj.lineHeight;

    // Styling
    mesh.color = textObj.color;
    mesh.fillOpacity = this.calculateOpacity(textObj);

    // Outline (stroke)
    if (textObj.outlineWidth > 0) {
      mesh.outlineWidth = textObj.outlineWidth;
      mesh.outlineColor = textObj.outlineColor;
    }

    // Anchor text at baseline for natural text positioning
    mesh.anchorX = 'left';
    mesh.anchorY = 'baseline';

    // Store reference
    mesh.userData = { textId: textObj.id, textObj };

    // Sync to update geometry
    mesh.sync();

    textMeshes.set(textObj.id, mesh);
    this.textGroup.add(mesh);
  }

  public updateText(update: Partial<TextObject> & { id: string }): void {
    const mesh = textMeshes.get(update.id);
    if (!mesh) return;

    const textObj = mesh.userData.textObj as TextObject;
    Object.assign(textObj, update);
    mesh.userData.textObj = textObj;

    // Update properties
    if (update.content !== undefined) mesh.text = update.content;
    if (update.x !== undefined || update.y !== undefined) {
      mesh.position.set(textObj.x, textObj.y, 1);
    }
    if (update.rotation !== undefined) {
      mesh.rotation.z = (update.rotation * Math.PI) / 180;
    }
    if (update.fontSize !== undefined) mesh.fontSize = update.fontSize;
    if (update.fontFamily !== undefined) {
      mesh.font = this.getFontUrl(update.fontFamily);
    }
    if (update.color !== undefined) mesh.color = update.color;
    if (update.letterSpacing !== undefined) mesh.letterSpacing = update.letterSpacing;
    if (update.lineHeight !== undefined) mesh.lineHeight = update.lineHeight;

    if (update.outlineWidth !== undefined || update.outlineColor !== undefined) {
      mesh.outlineWidth = textObj.outlineWidth;
      mesh.outlineColor = textObj.outlineColor;
    }

    // Recalculate opacity if lifecycle changed
    mesh.fillOpacity = this.calculateOpacity(textObj);

    mesh.sync();
  }

  public removeText(id: string): void {
    const mesh = textMeshes.get(id);
    if (mesh) {
      this.textGroup.remove(mesh);
      mesh.dispose();
      textMeshes.delete(id);
    }
  }

  public getTextAt(worldX: number, worldY: number): string | null {
    // Simple bounding box hit test
    for (const [id, mesh] of textMeshes) {
      const bounds = mesh.textRenderInfo?.blockBounds;
      if (!bounds) continue;

      // Get mesh position
      const x = mesh.position.x;
      const y = mesh.position.y;

      // Block bounds are [minX, minY, maxX, maxY] relative to anchor
      const minX = x + bounds[0];
      const maxX = x + bounds[2];
      const minY = y + bounds[1];
      const maxY = y + bounds[3];

      if (worldX >= minX && worldX <= maxX && worldY >= minY && worldY <= maxY) {
        return id;
      }
    }
    return null;
  }

  public getTextMesh(id: string): Text | undefined {
    return textMeshes.get(id);
  }

  public updateOpacities(): void {
    // Called periodically to update fading texts
    for (const mesh of textMeshes.values()) {
      const textObj = mesh.userData.textObj as TextObject;
      const newOpacity = this.calculateOpacity(textObj);
      if (mesh.fillOpacity !== newOpacity) {
        mesh.fillOpacity = newOpacity;
        mesh.sync();
      }
    }
  }

  private calculateOpacity(textObj: TextObject): number {
    const now = Date.now();
    const age = now - textObj.createdAt;

    if (age < FADE_START_MS) {
      // Not fading yet
      return textObj.opacity;
    }

    // Calculate fade progress
    const fadeElapsed = age - FADE_START_MS;
    const fadeDuration = EXPIRE_MS - FADE_START_MS;
    const fadeProgress = Math.min(1, fadeElapsed / fadeDuration);

    // Ease out cubic for smooth fade
    const easedProgress = 1 - Math.pow(1 - fadeProgress, 3);

    return textObj.opacity * (1 - easedProgress);
  }

  private getFontUrl(fontFamily: string): string | undefined {
    // Use system fonts for now, troika will use them directly
    // For custom fonts, we'd return URLs to .woff2 files
    const fontMap: Record<string, string | undefined> = {
      'Inter': undefined, // Use system sans-serif
      'Roboto': undefined,
      'Open Sans': undefined,
      'Lato': undefined,
      'Playfair Display': undefined,
    };
    return fontMap[fontFamily];
  }

  public dispose(): void {
    for (const mesh of textMeshes.values()) {
      mesh.dispose();
    }
    textMeshes.clear();
    this.scene.remove(this.textGroup);
  }
}
