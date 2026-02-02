import * as THREE from 'three';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  GRID_SIZE,
  GRID_MAJOR_EVERY,
} from '../../../shared/constants.ts';

export class Grid {
  private scene: THREE.Scene;
  private gridGroup: THREE.Group;
  private minorLines: THREE.LineSegments;
  private majorLines: THREE.LineSegments;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.gridGroup = new THREE.Group();

    // Create minor grid lines
    const minorGeometry = this.createGridGeometry(GRID_SIZE);
    const minorMaterial = new THREE.LineBasicMaterial({
      color: 0xe0e0e0,
      transparent: true,
      opacity: 0.5,
    });
    this.minorLines = new THREE.LineSegments(minorGeometry, minorMaterial);
    this.gridGroup.add(this.minorLines);

    // Create major grid lines (every 5th line)
    const majorGeometry = this.createGridGeometry(GRID_SIZE * GRID_MAJOR_EVERY);
    const majorMaterial = new THREE.LineBasicMaterial({
      color: 0xcccccc,
      transparent: true,
      opacity: 0.8,
    });
    this.majorLines = new THREE.LineSegments(majorGeometry, majorMaterial);
    this.gridGroup.add(this.majorLines);

    // Add canvas border
    const borderGeometry = new THREE.BufferGeometry();
    const borderVertices = new Float32Array([
      0, 0, 0,
      CANVAS_WIDTH, 0, 0,
      CANVAS_WIDTH, 0, 0,
      CANVAS_WIDTH, CANVAS_HEIGHT, 0,
      CANVAS_WIDTH, CANVAS_HEIGHT, 0,
      0, CANVAS_HEIGHT, 0,
      0, CANVAS_HEIGHT, 0,
      0, 0, 0,
    ]);
    borderGeometry.setAttribute('position', new THREE.BufferAttribute(borderVertices, 3));
    const borderMaterial = new THREE.LineBasicMaterial({ color: 0x999999 });
    const border = new THREE.LineSegments(borderGeometry, borderMaterial);
    this.gridGroup.add(border);

    this.scene.add(this.gridGroup);
  }

  private createGridGeometry(spacing: number): THREE.BufferGeometry {
    const vertices: number[] = [];

    // Vertical lines
    for (let x = 0; x <= CANVAS_WIDTH; x += spacing) {
      vertices.push(x, 0, 0);
      vertices.push(x, CANVAS_HEIGHT, 0);
    }

    // Horizontal lines
    for (let y = 0; y <= CANVAS_HEIGHT; y += spacing) {
      vertices.push(0, y, 0);
      vertices.push(CANVAS_WIDTH, y, 0);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    return geometry;
  }

  public updateForZoom(zoom: number): void {
    // Fade out minor grid lines at low zoom levels
    const minorMaterial = this.minorLines.material as THREE.LineBasicMaterial;
    const majorMaterial = this.majorLines.material as THREE.LineBasicMaterial;

    if (zoom < 0.3) {
      // Very zoomed out - hide minor, fade major
      minorMaterial.opacity = 0;
      majorMaterial.opacity = Math.max(0.2, zoom);
    } else if (zoom < 0.6) {
      // Somewhat zoomed out - fade minor
      minorMaterial.opacity = (zoom - 0.3) / 0.3 * 0.5;
      majorMaterial.opacity = 0.8;
    } else {
      // Normal zoom - show both
      minorMaterial.opacity = 0.5;
      majorMaterial.opacity = 0.8;
    }
  }

  public dispose(): void {
    this.scene.remove(this.gridGroup);
    this.minorLines.geometry.dispose();
    (this.minorLines.material as THREE.Material).dispose();
    this.majorLines.geometry.dispose();
    (this.majorLines.material as THREE.Material).dispose();
  }
}
