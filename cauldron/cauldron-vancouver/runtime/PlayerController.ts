import type { LocalPoint } from '../engine/realityTypes.ts';
import { CollisionSystem } from './CollisionSystem.ts';

export class PlayerController {
  private readonly collisionSystem: CollisionSystem;
  position: LocalPoint;
  swimMode = false;

  constructor(
    collisionSystem: CollisionSystem,
    start: LocalPoint = { xMeters: 0, yMeters: 0 }
  ) {
    this.collisionSystem = collisionSystem;
    this.position = start;
  }

  move(delta: LocalPoint): boolean {
    const next = {
      xMeters: this.position.xMeters + delta.xMeters,
      yMeters: this.position.yMeters + delta.yMeters,
    };
    if (this.collisionSystem.canStandAt(next)) {
      this.position = next;
      this.swimMode = false;
      return true;
    }
    if (this.collisionSystem.canSwimAt(next)) {
      this.position = next;
      this.swimMode = true;
      return true;
    }
    return false;
  }
}
