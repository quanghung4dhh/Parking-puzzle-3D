import * as THREE from "three";
import { Car } from "./Car";

export class InputManager {
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private enabled = true;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly camera: THREE.Camera,
    private readonly getCars: () => Iterable<Car>,
    private readonly onCarSelected: (carId: string) => void,
    private readonly onPointerGesture: () => void
  ) {
    this.canvas.style.touchAction = "none";
    this.canvas.addEventListener("pointerdown", this.handlePointerDown, { passive: true });
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  dispose(): void {
    this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    this.onPointerGesture();
    if (!this.enabled) return;

    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const pickables = [...this.getCars()].flatMap((car) => car.pickables);
    const hits = this.raycaster.intersectObjects(pickables, false);
    const hit = hits.find((candidate) => typeof candidate.object.userData.carId === "string");
    if (hit) {
      this.onCarSelected(hit.object.userData.carId as string);
    }
  };
}
