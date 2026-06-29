import * as THREE from "three";
import { CrazyGamesService } from "../crazygames/CrazyGamesService";
import { getSkin, SKINS } from "../data/skins";
import { AdManager } from "../monetization/AdManager";
import { UIManager } from "../ui/UIManager";
import { AudioManager } from "./AudioManager";
import { CameraController } from "./CameraController";
import { Car } from "./Car";
import { Grid } from "./Grid";
import { InputManager } from "./InputManager";
import { LevelManager } from "./LevelManager";
import { SaveManager } from "./SaveManager";
import type { AnalyticsEvent, CarDefinition, GameState, LanguageCode, LevelDefinition, ProgressData } from "./types";

type CompletionState = {
  coinsEarned: number;
  displayedCoinsEarned: number;
  doubled: boolean;
  stars: number;
};

type ConfettiParticle = {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
};

export class Game {
  private readonly scene = new THREE.Scene();
  private readonly renderer: THREE.WebGLRenderer;
  private readonly cameraController: CameraController;
  private readonly inputManager: InputManager;
  private readonly levelManager = new LevelManager();
  private readonly crazyGames = new CrazyGamesService();
  private readonly saveManager = new SaveManager(this.crazyGames);
  private readonly audio = new AudioManager();
  private readonly clock = new THREE.Clock();
  private readonly raycastCars = new Map<string, Car>();
  private readonly confettiGeometry = new THREE.BoxGeometry(0.08, 0.025, 0.14);
  private readonly confettiMaterials = ["#ff595e", "#ffca3a", "#8ac926", "#1982c4", "#6a4c93"].map(
    (color) => new THREE.MeshBasicMaterial({ color })
  );
  private readonly particles: ConfettiParticle[] = [];
  private adManager: AdManager | undefined;
  private ui: UIManager | undefined;
  private progress: ProgressData | undefined;
  private currentLevel: LevelDefinition | undefined;
  private grid: Grid | undefined;
  private activeCars: CarDefinition[] = [];
  private boardGroup: THREE.Group | undefined;
  private state: GameState = "loading";
  private stateBeforeAd: GameState = "loading";
  private menuWasPlaying = false;
  private frameHandle = 0;
  private levelAttempts = 0;
  private hintCarId: string | undefined;
  private hintTimer = 0;
  private completion: CompletionState | undefined;

  constructor(
    private readonly gameRoot: HTMLElement,
    private readonly uiRoot: HTMLElement
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.gameRoot.append(this.renderer.domElement);

    this.cameraController = new CameraController(this.renderer);
    this.inputManager = new InputManager(
      this.renderer.domElement,
      this.cameraController.camera,
      () => this.raycastCars.values(),
      (carId) => this.handleCarSelected(carId),
      () => this.audio.unlock()
    );

    this.setupScene();
    this.resize();
    window.addEventListener("resize", this.resize);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    window.addEventListener("pointerdown", this.handleGlobalGesture, { passive: true });
    window.addEventListener("keydown", this.handleGlobalGesture);
  }

  async start(): Promise<void> {
    await this.crazyGames.initCrazyGamesSdk();
    this.progress = await this.saveManager.loadProgress(this.crazyGames.getLocale());
    this.progress.currentLevel = this.levelManager.clampLevel(this.progress.currentLevel);
    document.documentElement.lang = this.progress.language;

    this.audio.applySettings(this.progress.soundEnabled, this.progress.musicEnabled);
    this.adManager = new AdManager(this.crazyGames, this.audio, {
      setPausedForAd: (paused) => this.setPausedForAd(paused),
      track: (event, data) => this.track(event, data)
    });
    this.ui = new UIManager(this.uiRoot, this.progress.language, {
      onRestart: () => this.restartLevel(),
      onHint: () => this.useHint(),
      onOpenShop: () => this.openShop(),
      onOpenSettings: () => this.openSettings(),
      onNextLevel: () => void this.nextLevel(),
      onDoubleCoins: () => void this.doubleCoins(),
      onClosePanel: () => this.closePanel(),
      onUnlockSkin: (skinId) => this.unlockSkin(skinId),
      onSelectSkin: (skinId) => this.selectSkin(skinId),
      onRewardBonusCoins: () => void this.rewardBonusCoins(),
      onSoundChanged: (enabled) => this.changeSound(enabled),
      onMusicChanged: (enabled) => this.changeMusic(enabled),
      onLanguageChanged: (language) => this.changeLanguage(language)
    });

    this.loadLevel(this.progress.currentLevel);
    this.clock.start();
    this.frameHandle = window.requestAnimationFrame(this.loop);
  }

  private setupScene(): void {
    this.scene.background = new THREE.Color("#9ed7ef");
    this.scene.fog = new THREE.Fog("#9ed7ef", 14, 42);

    const ambient = new THREE.HemisphereLight("#ffffff", "#6b7280", 2.3);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight("#fff7d6", 3.2);
    sun.position.set(7, 12, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 40;
    sun.shadow.camera.left = -12;
    sun.shadow.camera.right = 12;
    sun.shadow.camera.top = 12;
    sun.shadow.camera.bottom = -12;
    this.scene.add(sun);
  }

  private loadLevel(levelId: number): void {
    if (!this.progress || !this.ui || !this.adManager) return;

    this.clearLevel();
    this.currentLevel = this.levelManager.getLevel(levelId);
    this.grid = new Grid(this.currentLevel);
    this.activeCars = this.currentLevel.cars.map((car) => ({ ...car }));
    this.grid.rebuild(this.activeCars);
    this.levelAttempts = 0;
    this.completion = undefined;
    this.state = "playing";
    this.progress.currentLevel = this.currentLevel.id;
    this.saveManager.saveProgress(this.progress);

    this.buildBoard(this.currentLevel);
    this.buildCars(this.currentLevel);
    this.cameraController.setLevel(this.currentLevel);
    this.ui.hideComplete();
    this.ui.closePanels();
    this.setHint(this.currentLevel.id === 1 ? this.recommendedCarId() : undefined, Number.POSITIVE_INFINITY);
    this.updateHud();
    this.inputManager.setEnabled(true);
    this.adManager.gameplayStart();
    this.track("level_started", { level: this.currentLevel.id, cars: this.activeCars.length });
  }

  private buildBoard(level: LevelDefinition): void {
    const group = new THREE.Group();
    group.name = `board-${level.id}`;

    const groundMaterial = new THREE.MeshStandardMaterial({ color: "#47515b", roughness: 0.88, metalness: 0.02 });
    const lineMaterial = new THREE.MeshBasicMaterial({ color: "#f8fafc" });
    const curbMaterial = new THREE.MeshStandardMaterial({ color: "#d1d5db", roughness: 0.75 });
    const exitMaterial = new THREE.MeshBasicMaterial({ color: "#a3e635", transparent: true, opacity: 0.78 });

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(level.width + 1.35, level.height + 1.35), groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    group.add(ground);

    for (let x = 1; x < level.width; x += 1) {
      group.add(this.box(-level.width / 2 + x, 0.024, 0, 0.025, 0.025, level.height, lineMaterial));
    }
    for (let y = 1; y < level.height; y += 1) {
      group.add(this.box(0, 0.026, -level.height / 2 + y, level.width, 0.025, 0.025, lineMaterial));
    }

    group.add(this.box(0, 0.04, -level.height / 2 - 0.18, level.width, 0.04, 0.18, exitMaterial));
    group.add(this.box(0, 0.04, level.height / 2 + 0.18, level.width, 0.04, 0.18, exitMaterial));
    group.add(this.box(-level.width / 2 - 0.18, 0.04, 0, 0.18, 0.04, level.height, exitMaterial));
    group.add(this.box(level.width / 2 + 0.18, 0.04, 0, 0.18, 0.04, level.height, exitMaterial));

    group.add(this.box(0, 0.11, -level.height / 2 - 0.62, level.width + 1.2, 0.22, 0.18, curbMaterial));
    group.add(this.box(0, 0.11, level.height / 2 + 0.62, level.width + 1.2, 0.22, 0.18, curbMaterial));
    group.add(this.box(-level.width / 2 - 0.62, 0.11, 0, 0.18, 0.22, level.height + 1.2, curbMaterial));
    group.add(this.box(level.width / 2 + 0.62, 0.11, 0, 0.18, 0.22, level.height + 1.2, curbMaterial));

    this.boardGroup = group;
    this.scene.add(group);
  }

  private buildCars(level: LevelDefinition): void {
    if (!this.progress) return;
    const skin = getSkin(this.progress.selectedSkin);
    this.activeCars.forEach((definition, index) => {
      const color = skin.colors[index % skin.colors.length] ?? definition.color ?? "#3b82f6";
      const car = new Car(definition, level, color);
      this.raycastCars.set(definition.id, car);
      this.scene.add(car.group);
    });
  }

  private box(x: number, y: number, z: number, width: number, height: number, depth: number, material: THREE.Material): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    return mesh;
  }

  private handleCarSelected(carId: string): void {
    if (this.state !== "playing" || !this.grid || !this.currentLevel) return;
    const carDefinition = this.activeCars.find((car) => car.id === carId);
    const car = this.raycastCars.get(carId);
    if (!carDefinition || !car) return;

    this.levelAttempts += 1;
    this.audio.playClick();
    const path = this.grid.canCarExit(carDefinition, this.activeCars);
    this.state = "carMoving";
    this.inputManager.setEnabled(false);
    this.updateHud();

    if (path.canExit) {
      car.setHinted(false);
      car.moveOut(() => this.finishCarExit(carId));
    } else {
      this.audio.playBump();
      car.bump(() => {
        if (this.state === "carMoving") {
          this.state = "playing";
          this.inputManager.setEnabled(true);
          this.updateHud();
        }
      });
    }
  }

  private finishCarExit(carId: string): void {
    if (!this.grid || !this.currentLevel) return;
    const car = this.raycastCars.get(carId);
    if (car) {
      this.scene.remove(car.group);
      car.dispose();
      this.raycastCars.delete(carId);
    }

    this.activeCars = this.activeCars.filter((definition) => definition.id !== carId);
    this.grid.rebuild(this.activeCars);
    this.audio.playExit();

    if (this.activeCars.length === 0) {
      this.completeLevel();
      return;
    }

    if (this.hintCarId === carId) {
      this.setHint(undefined, 0);
    }
    this.state = "playing";
    this.inputManager.setEnabled(true);
    this.updateHud();
  }

  private completeLevel(): void {
    if (!this.progress || !this.currentLevel || !this.ui || !this.adManager) return;

    const targetAttempts = this.currentLevel.cars.length + Math.ceil(this.currentLevel.id / 15);
    const stars = this.levelAttempts <= targetAttempts ? 3 : this.levelAttempts <= targetAttempts + 3 ? 2 : 1;
    const coinsEarned = 10 + stars * 5 + Math.min(20, Math.floor(this.currentLevel.id / 2));
    this.progress.coins += coinsEarned;
    if (!this.progress.completedLevels.includes(this.currentLevel.id)) {
      this.progress.completedLevels.push(this.currentLevel.id);
    }
    if (this.currentLevel.id % 5 === 0) {
      this.progress.hints += 1;
    }
    this.saveManager.saveProgress(this.progress);

    this.completion = {
      coinsEarned,
      displayedCoinsEarned: coinsEarned,
      doubled: false,
      stars
    };
    this.state = "levelComplete";
    this.inputManager.setEnabled(false);
    this.adManager.gameplayStop();
    this.audio.playComplete();
    this.spawnConfetti();
    this.track("level_completed", {
      level: this.currentLevel.id,
      attempts: this.levelAttempts,
      stars,
      coinsEarned
    });
    this.ui.showComplete({
      level: this.currentLevel.id,
      totalLevels: this.levelManager.totalLevels,
      coinsEarned,
      totalCoins: this.progress.coins,
      stars,
      canDouble: this.adManager.canRewardedAds()
    });
    this.updateHud();
  }

  private restartLevel(): void {
    if (!this.currentLevel || this.state === "adPaused") return;
    this.audio.playClick();
    this.track("level_restarted", { level: this.currentLevel.id });
    this.loadLevel(this.currentLevel.id);
  }

  private useHint(): void {
    if (!this.progress || this.state !== "playing") return;
    if (this.progress.hints <= 0) return;
    const carId = this.recommendedCarId();
    if (!carId) return;
    this.progress.hints -= 1;
    this.saveManager.saveProgress(this.progress);
    this.setHint(carId, 4.25);
    this.audio.playClick();
    this.track("hint_used", { level: this.currentLevel?.id, carId });
    this.updateHud();
  }

  private async nextLevel(): Promise<void> {
    if (!this.currentLevel || !this.adManager) return;
    const completedLevel = this.currentLevel.id;
    await this.adManager.requestMidgameAd("level_complete", completedLevel);
    const nextLevel = this.levelManager.nextLevelId(completedLevel);
    this.loadLevel(nextLevel);
  }

  private async doubleCoins(): Promise<void> {
    if (!this.progress || !this.ui || !this.adManager || !this.completion || this.completion.doubled) return;
    const rewarded = await this.adManager.requestRewardedAd("double_coins");
    if (!rewarded) return;
    this.progress.coins += this.completion.coinsEarned;
    this.completion.displayedCoinsEarned += this.completion.coinsEarned;
    this.completion.doubled = true;
    this.saveManager.saveProgress(this.progress);
    this.ui.updateCompleteCoins(this.completion.displayedCoinsEarned, this.progress.coins, false);
    this.updateHud();
  }

  private openShop(): void {
    if (!this.progress || !this.ui || !this.adManager || this.state === "carMoving" || this.state === "adPaused") return;
    this.audio.playClick();
    this.menuWasPlaying = this.state === "playing";
    if (this.menuWasPlaying) {
      this.state = "menuPaused";
      this.adManager.gameplayStop();
      this.inputManager.setEnabled(false);
    }
    this.ui.showShop(this.progress, this.adManager.canRewardedAds());
    this.updateHud();
  }

  private openSettings(): void {
    if (!this.progress || !this.ui || !this.adManager || this.state === "carMoving" || this.state === "adPaused") return;
    this.audio.playClick();
    this.menuWasPlaying = this.state === "playing";
    if (this.menuWasPlaying) {
      this.state = "menuPaused";
      this.adManager.gameplayStop();
      this.inputManager.setEnabled(false);
    }
    this.ui.showSettings(this.progress);
    this.updateHud();
  }

  private closePanel(): void {
    if (!this.ui || !this.adManager) return;
    this.ui.closePanels();
    if (this.state === "menuPaused" && this.menuWasPlaying) {
      this.state = "playing";
      this.adManager.gameplayStart();
      this.inputManager.setEnabled(true);
    }
    this.menuWasPlaying = false;
    this.updateHud();
  }

  private unlockSkin(skinId: string): void {
    if (!this.progress || !this.ui || !this.adManager) return;
    const skin = SKINS.find((candidate) => candidate.id === skinId);
    if (!skin || this.progress.unlockedSkins.includes(skin.id) || this.progress.coins < skin.cost) return;
    this.progress.coins -= skin.cost;
    this.progress.unlockedSkins.push(skin.id);
    this.progress.selectedSkin = skin.id;
    this.saveManager.saveProgress(this.progress);
    this.ui.showShop(this.progress, this.adManager.canRewardedAds());
    this.updateHud();
  }

  private selectSkin(skinId: string): void {
    if (!this.progress || !this.ui || !this.adManager || !this.progress.unlockedSkins.includes(skinId)) return;
    this.progress.selectedSkin = skinId;
    this.saveManager.saveProgress(this.progress);
    this.ui.showShop(this.progress, this.adManager.canRewardedAds());
  }

  private async rewardBonusCoins(): Promise<void> {
    if (!this.progress || !this.ui || !this.adManager) return;
    const rewarded = await this.adManager.requestRewardedAd("bonus_coins");
    if (!rewarded) return;
    this.progress.coins += 75;
    this.saveManager.saveProgress(this.progress);
    this.ui.showShop(this.progress, this.adManager.canRewardedAds());
    this.updateHud();
  }

  private changeSound(enabled: boolean): void {
    if (!this.progress) return;
    this.progress.soundEnabled = enabled;
    this.audio.applySettings(this.progress.soundEnabled, this.progress.musicEnabled);
    this.saveManager.saveProgress(this.progress);
  }

  private changeMusic(enabled: boolean): void {
    if (!this.progress) return;
    this.progress.musicEnabled = enabled;
    this.audio.applySettings(this.progress.soundEnabled, this.progress.musicEnabled);
    this.saveManager.saveProgress(this.progress);
  }

  private changeLanguage(language: LanguageCode): void {
    if (!this.progress || !this.ui) return;
    this.progress.language = language;
    document.documentElement.lang = language;
    this.ui.setLanguage(language);
    this.ui.showSettings(this.progress);
    this.saveManager.saveProgress(this.progress);
    this.updateHud();
  }

  private recommendedCarId(): string | undefined {
    if (!this.currentLevel || !this.grid) return undefined;
    for (const carId of this.currentLevel.hintOrder ?? []) {
      const car = this.activeCars.find((candidate) => candidate.id === carId);
      if (car && this.grid.canCarExit(car, this.activeCars).canExit) {
        return carId;
      }
    }
    return this.grid.findNextMovable(this.activeCars);
  }

  private setHint(carId: string | undefined, seconds: number): void {
    this.hintCarId = carId;
    this.hintTimer = seconds;
    this.raycastCars.forEach((car) => car.setHinted(car.id === carId));
  }

  private updateHud(): void {
    if (!this.ui || !this.progress || !this.currentLevel) return;
    this.ui.updateHud({
      level: this.currentLevel.id,
      totalLevels: this.levelManager.totalLevels,
      coins: this.progress.coins,
      hints: this.progress.hints,
      showInstruction: this.currentLevel.id <= 3 && this.state === "playing",
      busy: this.state !== "playing"
    });
  }

  private setPausedForAd(paused: boolean): void {
    if (!this.ui) return;
    if (paused) {
      this.stateBeforeAd = this.state;
      this.state = "adPaused";
      this.inputManager.setEnabled(false);
      this.ui.setAdBusy(true);
    } else {
      this.state = this.stateBeforeAd;
      this.ui.setAdBusy(false);
      this.inputManager.setEnabled(this.state === "playing");
      if (this.state === "playing") {
        this.adManager?.gameplayStart();
      }
    }
    this.updateHud();
  }

  private spawnConfetti(): void {
    for (let i = 0; i < 42; i += 1) {
      const material = this.confettiMaterials[i % this.confettiMaterials.length];
      const mesh = new THREE.Mesh(this.confettiGeometry, material);
      mesh.position.set((Math.random() - 0.5) * 2, 1.2 + Math.random() * 0.8, (Math.random() - 0.5) * 2);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity: new THREE.Vector3((Math.random() - 0.5) * 2.8, 1.4 + Math.random() * 1.8, (Math.random() - 0.5) * 2.8),
        life: 1.25 + Math.random() * 0.75
      });
    }
  }

  private updateParticles(deltaSeconds: number): void {
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const particle = this.particles[i];
      particle.life -= deltaSeconds;
      particle.velocity.y -= 2.4 * deltaSeconds;
      particle.mesh.position.addScaledVector(particle.velocity, deltaSeconds);
      particle.mesh.rotation.x += deltaSeconds * 5;
      particle.mesh.rotation.y += deltaSeconds * 6;
      if (particle.life <= 0 || particle.mesh.position.y < -0.1) {
        this.scene.remove(particle.mesh);
        this.particles.splice(i, 1);
      }
    }
  }

  private clearLevel(): void {
    if (this.boardGroup) {
      this.scene.remove(this.boardGroup);
      this.disposeObject(this.boardGroup);
      this.boardGroup = undefined;
    }
    this.raycastCars.forEach((car) => {
      this.scene.remove(car.group);
      car.dispose();
    });
    this.raycastCars.clear();
    this.particles.splice(0).forEach((particle) => this.scene.remove(particle.mesh));
  }

  private disposeObject(object: THREE.Object3D): void {
    object.traverse((child: THREE.Object3D) => {
      const mesh = child as THREE.Mesh;
      mesh.geometry?.dispose();
      const material = mesh.material;
      if (Array.isArray(material)) {
        material.forEach((entry) => entry.dispose());
      } else {
        material?.dispose();
      }
    });
  }

  private resize = (): void => {
    const width = Math.max(1, this.gameRoot.clientWidth || window.innerWidth);
    const height = Math.max(1, this.gameRoot.clientHeight || window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    this.renderer.setSize(width, height, false);
    this.cameraController.resize();
  };

  private readonly loop = (): void => {
    const deltaSeconds = Math.min(0.033, this.clock.getDelta());
    const elapsedSeconds = this.clock.elapsedTime;
    if (!document.hidden) {
      this.raycastCars.forEach((car) => car.update(deltaSeconds, elapsedSeconds));
      if (Number.isFinite(this.hintTimer) && this.hintTimer > 0) {
        this.hintTimer -= deltaSeconds;
        if (this.hintTimer <= 0) {
          this.setHint(undefined, 0);
        }
      }
      this.updateParticles(deltaSeconds);
      this.renderer.render(this.scene, this.cameraController.camera);
    }
    this.frameHandle = window.requestAnimationFrame(this.loop);
  };

  private readonly handleVisibilityChange = (): void => {
    const visible = !document.hidden;
    this.audio.handleVisibility(visible);
    if (!this.adManager) return;
    if (!visible) {
      this.adManager.gameplayStop();
    } else if (this.state === "playing") {
      this.adManager.gameplayStart();
    }
  };

  private readonly handleGlobalGesture = (): void => {
    this.audio.unlock();
  };

  private track(event: AnalyticsEvent, data: Record<string, unknown> = {}): void {
    console.info(`[Analytics] ${event}`, data);
  }
}
