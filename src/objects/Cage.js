import Phaser from 'phaser';
import { DEPTH } from '../config/constants.js';
import { Sfx } from '../audio/Sfx.js';
import { ts, setBodyLogical } from '../config/assets.js';

export const ANIMAL_NAMES = ['ARARA', 'ONÇA', 'MACACO', 'PEIXE-BOI'];
const DROPS = [0, 1, 2, 3, 4, 5]; // frames de powerups_hrf: H, R, F, medkit, açaí, abacaxi

// Gaiola com animal silvestre: ao ser destruída por tiros/bombas, liberta o animal e dropa um bônus.
export default class Cage extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, animal) {
    super(scene, x, y, 'wildlife_cages', animal * 2);
    scene.add.existing(this);
    scene.cages.add(this);
    this.setOrigin(0.5, 1).setDepth(DEPTH.world + 1).setScale(ts('wildlife_cages'));
    this.body.setAllowGravity(false).setImmovable(true);
    setBodyLogical(this, 56, 52, 4, 10);
    this.animal = animal;
    this.hp = 30;
    this.isTarget = true;
  }

  takeDamage(dmg) {
    if (!this.isTarget) return;
    this.hp -= dmg;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => this.active && this.clearTint());
    if (this.hp <= 0) this.breakOpen();
  }

  breakOpen() {
    this.isTarget = false;
    const scene = this.scene;
    Sfx.rescue();
    scene.addScore(500, this.x, this.y - 70, `${ANIMAL_NAMES[this.animal]} RESGATADA! +500`);
    scene.spawnExplosion(this.x, this.y - 30, 0.6, false);
    scene.fx.debris(this.x, this.y - 30, 0x8c5a2b, 12);

    const freed = scene.add.sprite(this.x, this.y, 'wildlife_cages', this.animal * 2 + 1).setOrigin(0.5, 1).setDepth(DEPTH.fx).setScale(ts('wildlife_cages'));
    if (this.animal === 0) {
      scene.tweens.add({ targets: freed, x: freed.x + 260, y: freed.y - 320, duration: 1600, onComplete: () => freed.destroy() });
    } else if (this.animal === 3) {
      scene.tweens.add({ targets: freed, y: freed.y - 50, duration: 350, yoyo: true, onComplete: () => scene.tweens.add({ targets: freed, y: freed.y + 60, alpha: 0, duration: 500, onComplete: () => freed.destroy() }) });
    } else {
      freed.setFlipX(true);
      scene.tweens.add({ targets: freed, x: freed.x - 360, duration: 1400, onComplete: () => freed.destroy() });
      scene.tweens.add({ targets: freed, y: freed.y - 10, duration: 120, yoyo: true, repeat: 5 });
    }
    scene.spawnPickup(this.x, this.y - 40, Phaser.Utils.Array.GetRandom(DROPS));
    this.destroy();
  }
}
