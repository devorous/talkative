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

  // Local cursor state
  private localCursor: THREE.Mesh | null = null;
  private localText: Text | null = null;
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

  // Create local user's cursor
  public createLocalCursor(_color: string, fontSize: number): void {
    if (this.localCursor) {
      this.localGroup.remove(this.localCursor);
      this.localCursor.geometry.dispose();
      (this.localCursor.material as THREE.Material).dispose();
    }

    const height = fontSize * CURSOR_HEIGHT_FACTOR;
    const geometry = new THREE.PlaneGeometry(CURSOR_WIDTH, height);
    const material = new THREE.MeshBasicMaterial({
      color: 0x000000, // Always black
      transparent: true,
      opacity: 1,
    });

    this.localCursor = new THREE.Mesh(geometry, material);
    this.localCursor.position.z = 2; // Above text
    this.localGroup.add(this.localCursor);
  }

  // Update local cursor position
  public updateLocalCursor(x: number, y: number, fontSize: number, _color: string): void {
    if (!this.localCursor) {
      this.createLocalCursor('#000000', fontSize);
    }

    // Update cursor size if font size changed
    const height = fontSize * CURSOR_HEIGHT_FACTOR;
    const currentHeight = (this.localCursor!.geometry as THREE.PlaneGeometry).parameters.height;
    if (Math.abs(currentHeight - height) > 0.1) {
      this.localCursor!.geometry.dispose();
      this.localCursor!.geometry = new THREE.PlaneGeometry(CURSOR_WIDTH, height);
    }

    // Position cursor - offset to align with text baseline
    this.localCursor!.position.set(x, y - height / 2, 2);
  }

  // Update local text preview
  public updateLocalText(content: string, x: number, y: number, style: {
    fontSize: number;
    fontFamily?: string;
    color: string;
    fontWeight?: string;
    fontStyle?: string;
  }): void {
    if (!content) {
      if (this.localText) {
        this.localGroup.remove(this.localText);
        this.localText.dispose();
        this.localText = null;
      }
      return;
    }

    if (!this.localText) {
      this.localText = new Text();
      this.localText.anchorX = 'left';
      this.localText.anchorY = 'top';
      this.localGroup.add(this.localText);
    }

    this.localText.text = content;
    this.localText.fontSize = style.fontSize;
    this.localText.color = style.color;
    this.localText.position.set(x + CURSOR_WIDTH + 2, y, 1.5);
    this.localText.sync();

    // Move cursor to end of text
    if (this.localCursor && this.localText.textRenderInfo?.blockBounds) {
      const bounds = this.localText.textRenderInfo.blockBounds;
      const textWidth = bounds[2] - bounds[0];
      this.localCursor.position.x = x + CURSOR_WIDTH + 2 + textWidth;
    }
  }

  // Hide local cursor (when not focused)
  public hideLocalCursor(): void {
    this.localGroup.visible = false;
  }

  // Show local cursor
  public showLocalCursor(): void {
    this.localGroup.visible = true;
  }

  // Clear local text (after commit)
  public clearLocalText(): void {
    if (this.localText) {
      this.localGroup.remove(this.localText);
      this.localText.dispose();
      this.localText = null;
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
        meshData.text.anchorY = 'top';
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

    meshData.bar.position.y = -height / 2;
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
    // Clean up local cursor
    if (this.localCursor) {
      this.localCursor.geometry.dispose();
      (this.localCursor.material as THREE.Material).dispose();
    }
    if (this.localText) {
      this.localText.dispose();
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
