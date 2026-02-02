import * as THREE from 'three';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  MIN_ZOOM,
  MAX_ZOOM,
  DEFAULT_ZOOM,
} from '../../../shared/constants.ts';
import { Grid } from './Grid.ts';
import { TextRenderer } from './TextRenderer.ts';
import { CursorRenderer } from './CursorRenderer.ts';

export class CanvasScene {
  public scene: THREE.Scene;
  public camera: THREE.OrthographicCamera;
  public renderer: THREE.WebGLRenderer;
  public grid: Grid;
  public textRenderer: TextRenderer;
  public cursorRenderer: CursorRenderer;

  private container: HTMLElement;
  private animationId: number | null = null;

  // Viewport state
  private zoom = DEFAULT_ZOOM;
  private panX = CANVAS_WIDTH / 2;
  private panY = CANVAS_HEIGHT / 2;

  // Interaction state
  private isDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;

  constructor(container: HTMLElement) {
    this.container = container;

    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xfafafa);

    // Create orthographic camera
    const aspect = container.clientWidth / container.clientHeight;
    const viewHeight = container.clientHeight / this.zoom;
    const viewWidth = viewHeight * aspect;

    this.camera = new THREE.OrthographicCamera(
      -viewWidth / 2,
      viewWidth / 2,
      viewHeight / 2,
      -viewHeight / 2,
      0.1,
      1000
    );
    this.camera.position.set(this.panX, this.panY, 100);
    this.camera.lookAt(this.panX, this.panY, 0);

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    // Create grid
    this.grid = new Grid(this.scene);

    // Create text renderer
    this.textRenderer = new TextRenderer(this.scene);

    // Create cursor renderer
    this.cursorRenderer = new CursorRenderer(this.scene);

    // Set up event listeners
    this.setupEventListeners();

    // Start render loop
    this.animate();
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    // Mouse events for panning
    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mouseup', this.onMouseUp);
    canvas.addEventListener('mouseleave', this.onMouseUp);

    // Wheel event for zooming
    canvas.addEventListener('wheel', this.onWheel, { passive: false });

    // Touch events
    canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd);

    // Resize event
    window.addEventListener('resize', this.onResize);
  }

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button === 0 || e.button === 1) {
      // Left or middle click
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.renderer.domElement.style.cursor = 'grabbing';
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.lastMouseX;
    const deltaY = e.clientY - this.lastMouseY;

    // Convert screen delta to world delta
    const worldDeltaX = deltaX / this.zoom;
    const worldDeltaY = -deltaY / this.zoom; // Flip Y for screen coords

    this.panX -= worldDeltaX;
    this.panY -= worldDeltaY;

    this.clampPan();
    this.updateCamera();

    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
    this.renderer.domElement.style.cursor = 'default';
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.zoom * zoomFactor));

    // Zoom towards mouse position
    const rect = this.renderer.domElement.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Convert mouse position to world coordinates before zoom
    const worldX = this.panX + (mouseX - rect.width / 2) / this.zoom;
    const worldY = this.panY - (mouseY - rect.height / 2) / this.zoom;

    this.zoom = newZoom;

    // Adjust pan to keep mouse position fixed
    this.panX = worldX - (mouseX - rect.width / 2) / this.zoom;
    this.panY = worldY + (mouseY - rect.height / 2) / this.zoom;

    this.clampPan();
    this.updateCamera();
  };

  private lastTouchDistance = 0;

  private onTouchStart = (e: TouchEvent): void => {
    e.preventDefault();

    if (e.touches.length === 1) {
      this.isDragging = true;
      this.lastMouseX = e.touches[0].clientX;
      this.lastMouseY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      this.isDragging = false;
      this.lastTouchDistance = this.getTouchDistance(e.touches);
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    e.preventDefault();

    if (e.touches.length === 1 && this.isDragging) {
      const deltaX = e.touches[0].clientX - this.lastMouseX;
      const deltaY = e.touches[0].clientY - this.lastMouseY;

      const worldDeltaX = deltaX / this.zoom;
      const worldDeltaY = -deltaY / this.zoom;

      this.panX -= worldDeltaX;
      this.panY -= worldDeltaY;

      this.clampPan();
      this.updateCamera();

      this.lastMouseX = e.touches[0].clientX;
      this.lastMouseY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      // Pinch to zoom
      const distance = this.getTouchDistance(e.touches);
      const center = this.getTouchCenter(e.touches);

      const zoomFactor = distance / this.lastTouchDistance;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.zoom * zoomFactor));

      // Zoom towards pinch center
      const rect = this.renderer.domElement.getBoundingClientRect();
      const centerX = center.x - rect.left;
      const centerY = center.y - rect.top;

      const worldX = this.panX + (centerX - rect.width / 2) / this.zoom;
      const worldY = this.panY - (centerY - rect.height / 2) / this.zoom;

      this.zoom = newZoom;

      this.panX = worldX - (centerX - rect.width / 2) / this.zoom;
      this.panY = worldY + (centerY - rect.height / 2) / this.zoom;

      this.clampPan();
      this.updateCamera();

      this.lastTouchDistance = distance;
    }
  };

  private onTouchEnd = (): void => {
    this.isDragging = false;
  };

  private getTouchDistance(touches: TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private getTouchCenter(touches: TouchList): { x: number; y: number } {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  }

  private clampPan(): void {
    // Allow viewing outside the canvas with generous margin
    // Users can pan to see edges of canvas from outside
    const viewWidth = this.container.clientWidth / this.zoom;
    const viewHeight = this.container.clientHeight / this.zoom;

    // Allow panning up to half viewport outside canvas bounds
    const margin = Math.max(viewWidth, viewHeight) * 0.5;

    const minX = -margin;
    const maxX = CANVAS_WIDTH + margin;
    const minY = -margin;
    const maxY = CANVAS_HEIGHT + margin;

    this.panX = Math.max(minX, Math.min(maxX, this.panX));
    this.panY = Math.max(minY, Math.min(maxY, this.panY));
  }

  private updateCamera(): void {
    const aspect = this.container.clientWidth / this.container.clientHeight;
    const viewHeight = this.container.clientHeight / this.zoom;
    const viewWidth = viewHeight * aspect;

    this.camera.left = -viewWidth / 2;
    this.camera.right = viewWidth / 2;
    this.camera.top = viewHeight / 2;
    this.camera.bottom = -viewHeight / 2;
    this.camera.position.set(this.panX, this.panY, 100);
    this.camera.lookAt(this.panX, this.panY, 0);
    this.camera.updateProjectionMatrix();

    // Update grid based on zoom level
    this.grid.updateForZoom(this.zoom);
  }

  private onResize = (): void => {
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.updateCamera();
  };

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    this.renderer.render(this.scene, this.camera);
  };

  public getWorldPosition(screenX: number, screenY: number): { x: number; y: number } {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = this.panX + (screenX - rect.left - rect.width / 2) / this.zoom;
    const y = this.panY - (screenY - rect.top - rect.height / 2) / this.zoom;
    return { x, y };
  }

  public isWithinCanvas(x: number, y: number): boolean {
    return x >= 0 && x <= CANVAS_WIDTH && y >= 0 && y <= CANVAS_HEIGHT;
  }

  public getZoom(): number {
    return this.zoom;
  }

  public getPan(): { x: number; y: number } {
    return { x: this.panX, y: this.panY };
  }

  public dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }

    const canvas = this.renderer.domElement;
    canvas.removeEventListener('mousedown', this.onMouseDown);
    canvas.removeEventListener('mousemove', this.onMouseMove);
    canvas.removeEventListener('mouseup', this.onMouseUp);
    canvas.removeEventListener('mouseleave', this.onMouseUp);
    canvas.removeEventListener('wheel', this.onWheel);
    canvas.removeEventListener('touchstart', this.onTouchStart);
    canvas.removeEventListener('touchmove', this.onTouchMove);
    canvas.removeEventListener('touchend', this.onTouchEnd);
    window.removeEventListener('resize', this.onResize);

    this.grid.dispose();
    this.textRenderer.dispose();
    this.cursorRenderer.dispose();
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
