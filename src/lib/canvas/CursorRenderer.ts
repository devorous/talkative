import * as THREE from 'three';
import { Text } from 'troika-three-text';
import type { RemoteCursor } from '../stores/cursors.ts';
import { CURSOR_WIDTH, CURSOR_HEIGHT_FACTOR } from '../../../shared/constants.ts';

interface CursorMesh {
  group: THREE.Group;
  bar: THREE.Mesh;
  text: Text | null;
  sessionId: string;
}

// Map of session ID to cursor mesh
const cursorMeshes = new Map<string, CursorMesh>();

export class CursorRenderer {
  private scene: THREE.Scene;
  private cursorGroup: THREE.Group;

  // Local cursor state - now just a text cursor "|"
  private localCursorText: Text | null = null;
  private localGroup: THREE.Group;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.cursorGroup = new THREE.Group();
    this.cursorGroup.name = 'cursors';
    this.scene.add(this.cursorGroup);

    this.localGroup = new THREE.Group();
    this.localGroup.name = 'local-cursor';
    this.cursorGroup.add(this.localGroup);
  }

  // Create local user's cursor using "|" character
  public createLocalCursor(_color: string, fontSize: number): void {
    if (this.localCursorText) {
      this.localGroup.remove(this.localCursorText);
      this.localCursorText.dispose();
    }

    this.localCursorText = new Text();
    this.localCursorText.text = '|';
    this.localCursorText.fontSize = fontSize;
    this.localCursorText.color = '#000000';
    this.localCursorText.anchorX = 'left';
    this.localCursorText.anchorY = 'baseline';
    this.localCursorText.position.z = 3; // Above text
    this.localGroup.add(this.localCursorText);
    this.localCursorText.sync();
  }

  // Update local cursor position
  public updateLocalCursor(x: number, y: number, fontSize: number, _color: string): void {
    if (!this.localCursorText) {
      this.createLocalCursor('#000000', fontSize);
    }

    // Update cursor size if font size changed
    if (Math.abs(this.localCursorText!.fontSize - fontSize) > 0.1) {
      this.localCursorText!.fontSize = fontSize;
      this.localCursorText!.sync();
    }

    // Position cursor at baseline level
    this.localCursorText!.position.set(x, y, 3);
  }

  // Update local text preview - shows text with "|" cursor at the end
  public updateLocalText(content: string, x: number, y: number, style: {
    fontSize: number;
    fontFamily?: string;
    color: string;
    fontWeight?: string;
    fontStyle?: string;
  }): void {
    // Always show the cursor ("|"), even when there's no text
    if (!this.localCursorText) {
      this.createLocalCursor(style.color, style.fontSize);
    }

    if (!content) {
      // No text - just show cursor at position
      this.localCursorText!.text = '|';
      this.localCursorText!.fontSize = style.fontSize;
      this.localCursorText!.color = '#000000';
      this.localCursorText!.position.set(x, y, 3);
      this.localCursorText!.sync();
      return;
    }

    // Show text with "|" appended
    this.localCursorText!.text = content + '|';
    this.localCursorText!.fontSize = style.fontSize;
    this.localCursorText!.color = style.color;
    this.localCursorText!.position.set(x, y, 3);
    this.localCursorText!.sync();
  }

  // Hide local cursor (when not focused)
  public hideLocalCursor(): void {
    this.localGroup.visible = false;
  }

  // Show local cursor
  public showLocalCursor(): void {
    this.localGroup.visible = true;
  }

  // Clear local text (after commit) - reset to just showing "|"
  public clearLocalText(): void {
    if (this.localCursorText) {
      this.localCursorText.text = '|';
      this.localCursorText.sync();
    }
  }

  // Update remote cursor (another user)
  public updateRemoteCursor(cursor: RemoteCursor): void {
    let meshData = cursorMeshes.get(cursor.sessionId);

    if (!meshData) {
      // Create new cursor for this user
      meshData = this.createRemoteCursor(cursor.sessionId, cursor.color);
    }

    const fontSize = cursor.style?.fontSize ?? 24;
    const height = fontSize * CURSOR_HEIGHT_FACTOR;

    // Update bar size and position
    meshData.bar.geometry.dispose();
    meshData.bar.geometry = new THREE.PlaneGeometry(CURSOR_WIDTH, height);
    (meshData.bar.material as THREE.MeshBasicMaterial).color.set(cursor.color);

    // Update text if present
    if (cursor.content && cursor.style) {
      if (!meshData.text) {
        meshData.text = new Text();
        meshData.text.anchorX = 'left';
        meshData.text.anchorY = 'baseline';
        meshData.group.add(meshData.text);
      }

      meshData.text.text = cursor.content;
      meshData.text.fontSize = cursor.style.fontSize;
      meshData.text.color = cursor.style.color;
      meshData.text.position.set(CURSOR_WIDTH + 2, 0, 0);
      meshData.text.sync();

      // Position cursor at end of text
      if (meshData.text.textRenderInfo?.blockBounds) {
        const bounds = meshData.text.textRenderInfo.blockBounds;
        const textWidth = bounds[2] - bounds[0];
        meshData.bar.position.x = CURSOR_WIDTH + 2 + textWidth;
      } else {
        meshData.bar.position.x = 0;
      }
    } else {
      // No text, remove text mesh and reset cursor position
      if (meshData.text) {
        meshData.group.remove(meshData.text);
        meshData.text.dispose();
        meshData.text = null;
      }
      meshData.bar.position.x = 0;
    }

    // Position cursor at baseline level
    meshData.bar.position.y = 0;
    meshData.group.position.set(cursor.x, cursor.y, 2);
  }

  private createRemoteCursor(sessionId: string, color: string): CursorMesh {
    const group = new THREE.Group();

    const geometry = new THREE.PlaneGeometry(CURSOR_WIDTH, 24 * CURSOR_HEIGHT_FACTOR);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.8,
    });

    const bar = new THREE.Mesh(geometry, material);
    bar.position.z = 0.1;
    group.add(bar);

    this.cursorGroup.add(group);

    const meshData: CursorMesh = {
      group,
      bar,
      text: null,
      sessionId,
    };

    cursorMeshes.set(sessionId, meshData);
    return meshData;
  }

  // Remove remote cursor
  public removeRemoteCursor(sessionId: string): void {
    const meshData = cursorMeshes.get(sessionId);
    if (!meshData) return;

    this.cursorGroup.remove(meshData.group);
    meshData.bar.geometry.dispose();
    (meshData.bar.material as THREE.Material).dispose();
    if (meshData.text) {
      meshData.text.dispose();
    }

    cursorMeshes.delete(sessionId);
  }

  // Update all remote cursors from store
  public updateFromCursors(cursors: RemoteCursor[]): void {
    const activeIds = new Set(cursors.map(c => c.sessionId));

    // Remove cursors that are no longer active
    for (const sessionId of cursorMeshes.keys()) {
      if (!activeIds.has(sessionId)) {
        this.removeRemoteCursor(sessionId);
      }
    }

    // Update active cursors
    for (const cursor of cursors) {
      this.updateRemoteCursor(cursor);
    }
  }

  public dispose(): void {
    // Clean up local cursor text
    if (this.localCursorText) {
      this.localCursorText.dispose();
    }

    // Clean up remote cursors
    for (const meshData of cursorMeshes.values()) {
      meshData.bar.geometry.dispose();
      (meshData.bar.material as THREE.Material).dispose();
      if (meshData.text) {
        meshData.text.dispose();
      }
    }
    cursorMeshes.clear();

    this.scene.remove(this.cursorGroup);
  }
}
