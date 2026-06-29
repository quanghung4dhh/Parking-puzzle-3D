import * as THREE from "three";
import type { LevelDefinition } from "./types";

export class CameraController {
  readonly camera: THREE.OrthographicCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private currentLevel: LevelDefinition | undefined;

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 120);
    this.camera.position.set(8, 10, 9);
    this.camera.lookAt(0, 0, 0);
  }

  setLevel(level: LevelDefinition): void {
    this.currentLevel = level;
    const boardSpan = Math.max(level.width, level.height);
    this.camera.position.set(boardSpan * 0.78, boardSpan * 0.94, boardSpan * 0.82);
    this.camera.lookAt(0, 0, 0);
    this.resize();
  }

  resize(): void {
    const level = this.currentLevel;
    const container = this.renderer.domElement.parentElement;
    const width = Math.max(1, container?.clientWidth ?? window.innerWidth);
    const height = Math.max(1, container?.clientHeight ?? window.innerHeight);
    const aspect = width / height;
    const boardWidth = level?.width ?? 8;
    const boardHeight = level?.height ?? 6;
    const viewSize = Math.max(boardHeight + 3.5, (boardWidth + 4.5) / Math.max(0.8, aspect));

    this.camera.left = (-viewSize * aspect) / 2;
    this.camera.right = (viewSize * aspect) / 2;
    this.camera.top = viewSize / 2;
    this.camera.bottom = -viewSize / 2;
    this.camera.updateProjectionMatrix();
  }
}
