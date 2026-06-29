import * as THREE from "three";
import type { CarDefinition, Direction, LevelDefinition } from "./types";

const CHASSIS_GEOMETRY = new THREE.BoxGeometry(1, 1, 1);
const CABIN_GEOMETRY = new THREE.BoxGeometry(1, 1, 1);
const WHEEL_GEOMETRY = new THREE.BoxGeometry(1, 1, 1);
const SHADOW_GEOMETRY = new THREE.PlaneGeometry(1, 1);
const ARROW_SHAFT_GEOMETRY = new THREE.BoxGeometry(1, 1, 1);
const ARROW_HEAD_GEOMETRY = new THREE.ConeGeometry(0.16, 0.28, 3);

type Animation =
  | {
      kind: "move";
      elapsed: number;
      duration: number;
      start: THREE.Vector3;
      target: THREE.Vector3;
      done: () => void;
    }
  | {
      kind: "bump";
      elapsed: number;
      duration: number;
      start: THREE.Vector3;
      direction: THREE.Vector3;
      done: () => void;
    };

export class Car {
  readonly id: string;
  readonly group = new THREE.Group();
  readonly pickables: THREE.Object3D[] = [];
  private readonly materials: THREE.Material[] = [];
  private readonly arrowGroup = new THREE.Group();
  private animation: Animation | undefined;
  private hinted = false;

  constructor(
    readonly definition: CarDefinition,
    private readonly level: LevelDefinition,
    color: string
  ) {
    this.id = definition.id;
    this.group.name = `car-${definition.id}`;
    this.group.position.copy(this.gridCenterToWorld(definition));
    this.group.userData.carId = definition.id;
    this.buildMesh(color);
  }

  update(deltaSeconds: number, elapsedSeconds: number): void {
    if (this.animation) {
      this.updateAnimation(deltaSeconds);
    }

    if (this.hinted) {
      const pulse = 1 + Math.sin(elapsedSeconds * 7.5) * 0.035;
      this.group.scale.setScalar(pulse);
      this.arrowGroup.visible = true;
      this.arrowGroup.position.y = 0.76 + Math.sin(elapsedSeconds * 8) * 0.05;
    } else {
      this.group.scale.lerp(new THREE.Vector3(1, 1, 1), Math.min(1, deltaSeconds * 8));
      this.arrowGroup.position.y = 0.72;
    }
  }

  setHinted(hinted: boolean): void {
    this.hinted = hinted;
  }

  moveOut(onDone: () => void): void {
    const start = this.group.position.clone();
    const target = start.clone().add(this.exitVector());
    const distance = start.distanceTo(target);
    this.animation = {
      kind: "move",
      elapsed: 0,
      duration: Math.max(0.42, distance * 0.095),
      start,
      target,
      done: onDone
    };
  }

  bump(onDone: () => void): void {
    this.animation = {
      kind: "bump",
      elapsed: 0,
      duration: 0.22,
      start: this.group.position.clone(),
      direction: this.worldDirection(this.definition.direction),
      done: onDone
    };
  }

  dispose(): void {
    this.materials.forEach((material) => material.dispose());
  }

  private updateAnimation(deltaSeconds: number): void {
    const animation = this.animation;
    if (!animation) return;
    animation.elapsed += deltaSeconds;
    const progress = Math.min(1, animation.elapsed / animation.duration);

    if (animation.kind === "move") {
      const eased = 1 - Math.pow(1 - progress, 3);
      this.group.position.lerpVectors(animation.start, animation.target, eased);
    } else {
      const offset = Math.sin(progress * Math.PI) * 0.18;
      this.group.position.copy(animation.start).addScaledVector(animation.direction, offset);
    }

    if (progress >= 1) {
      const done = animation.done;
      this.animation = undefined;
      done();
    }
  }

  private buildMesh(color: string): void {
    const horizontal = this.definition.direction === "left" || this.definition.direction === "right";
    const bodyLength = this.definition.length * 0.88;
    const bodyWidth = 0.72;
    const chassisMaterial = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.58,
      metalness: 0.08
    });
    const cabinMaterial = new THREE.MeshStandardMaterial({
      color: "#f8fafc",
      roughness: 0.28,
      metalness: 0.04
    });
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: "#15181f", roughness: 0.7 });
    const shadowMaterial = new THREE.MeshBasicMaterial({
      color: "#000000",
      transparent: true,
      opacity: 0.18,
      depthWrite: false
    });
    const arrowMaterial = new THREE.MeshBasicMaterial({ color: "#ffffff" });

    this.materials.push(chassisMaterial, cabinMaterial, wheelMaterial, shadowMaterial, arrowMaterial);

    const chassis = new THREE.Mesh(CHASSIS_GEOMETRY, chassisMaterial);
    chassis.scale.set(horizontal ? bodyLength : bodyWidth, 0.34, horizontal ? bodyWidth : bodyLength);
    chassis.position.y = 0.28;
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    chassis.userData.carId = this.definition.id;

    const cabin = new THREE.Mesh(CABIN_GEOMETRY, cabinMaterial);
    cabin.scale.set(horizontal ? bodyLength * 0.42 : bodyWidth * 0.72, 0.22, horizontal ? bodyWidth * 0.7 : bodyLength * 0.42);
    cabin.position.y = 0.58;
    cabin.position.x = horizontal ? bodyLength * 0.08 * (this.definition.direction === "left" ? -1 : 1) : 0;
    cabin.position.z = !horizontal ? bodyLength * 0.08 * (this.definition.direction === "up" ? -1 : 1) : 0;
    cabin.castShadow = true;
    cabin.userData.carId = this.definition.id;

    const shadow = new THREE.Mesh(SHADOW_GEOMETRY, shadowMaterial);
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.set(horizontal ? bodyLength * 1.05 : bodyWidth * 1.15, horizontal ? bodyWidth * 1.1 : bodyLength * 1.05, 1);
    shadow.position.y = 0.015;

    this.group.add(shadow, chassis, cabin);
    this.pickables.push(chassis, cabin);
    this.addWheels(horizontal, bodyLength, bodyWidth, wheelMaterial);
    this.addArrow(arrowMaterial);
  }

  private addWheels(horizontal: boolean, bodyLength: number, bodyWidth: number, material: THREE.Material): void {
    const longitudinal = bodyLength * 0.32;
    const lateral = bodyWidth * 0.58;
    const positions = horizontal
      ? [
          [-longitudinal, 0.13, -lateral],
          [-longitudinal, 0.13, lateral],
          [longitudinal, 0.13, -lateral],
          [longitudinal, 0.13, lateral]
        ]
      : [
          [-lateral, 0.13, -longitudinal],
          [lateral, 0.13, -longitudinal],
          [-lateral, 0.13, longitudinal],
          [lateral, 0.13, longitudinal]
        ];

    for (const [x, y, z] of positions) {
      const wheel = new THREE.Mesh(WHEEL_GEOMETRY, material);
      wheel.scale.set(horizontal ? 0.2 : 0.13, 0.16, horizontal ? 0.13 : 0.2);
      wheel.position.set(x, y, z);
      wheel.castShadow = true;
      this.group.add(wheel);
    }
  }

  private addArrow(material: THREE.Material): void {
    const shaft = new THREE.Mesh(ARROW_SHAFT_GEOMETRY, material);
    shaft.scale.set(0.36, 0.025, 0.08);
    shaft.position.x = -0.06;

    const head = new THREE.Mesh(ARROW_HEAD_GEOMETRY, material);
    head.rotation.z = -Math.PI / 2;
    head.position.x = 0.2;

    this.arrowGroup.add(shaft, head);
    this.arrowGroup.position.y = 0.72;
    this.arrowGroup.rotation.y = this.arrowRotation(this.definition.direction);
    this.group.add(this.arrowGroup);
  }

  private gridCenterToWorld(car: CarDefinition): THREE.Vector3 {
    const horizontal = car.direction === "left" || car.direction === "right";
    const x = -this.level.width / 2 + car.x + (horizontal ? car.length / 2 : 0.5);
    const z = -this.level.height / 2 + car.y + (horizontal ? 0.5 : car.length / 2);
    return new THREE.Vector3(x, 0, z);
  }

  private exitVector(): THREE.Vector3 {
    const direction = this.worldDirection(this.definition.direction);
    const distance =
      this.definition.direction === "left" || this.definition.direction === "right"
        ? this.level.width + this.definition.length + 2
        : this.level.height + this.definition.length + 2;
    return direction.multiplyScalar(distance);
  }

  private worldDirection(direction: Direction): THREE.Vector3 {
    if (direction === "up") return new THREE.Vector3(0, 0, -1);
    if (direction === "down") return new THREE.Vector3(0, 0, 1);
    if (direction === "left") return new THREE.Vector3(-1, 0, 0);
    return new THREE.Vector3(1, 0, 0);
  }

  private arrowRotation(direction: Direction): number {
    if (direction === "up") return -Math.PI / 2;
    if (direction === "down") return Math.PI / 2;
    if (direction === "left") return Math.PI;
    return 0;
  }
}
