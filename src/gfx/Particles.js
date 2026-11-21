import Phaser from 'phaser';
import { DEPTH } from '../config/constants.js';

// Efeitos de partículas leves (sprites + tweens), no estilo dos arcades clássicos.
// Todos têm teto de quantidade para não pesar em celulares.
const MAX_LIVE = 140;
export const DEBRIS = { wood: 0x8c5a2b, metal: 0x8a9399, mud: 0x6b4a22, hg: 0x4cff4c, water: 0x9fd3e6 };

export default class Particles {
  constructor(scene) {
    this.scene = scene;
    this.live = 0;
  }

  spawn(key, x, y, depth = DEPTH.fx) {
    if (this.live >= MAX_LIVE) return null;
    this.live += 1;
    const s = this.scene.add.image(x, y, key).setDepth(depth);
    s.once('destroy', () => { this.live -= 1; });
    return s;
  }

  // baforada de fumaça que cresce e some (rastro do míssil, fumaça da draga)
  puff(x, y, tint = 0xdddddd, scale = 1, duration = 300) {
    const p = this.spawn('fx_smoke', x, y, DEPTH.shots - 1);
    if (!p) return;
    p.setTint(tint).setAlpha(0.75).setScale(scale * Phaser.Math.FloatBetween(0.7, 1.2));
    this.scene.tweens.add({ targets: p, scale: scale * 2, alpha: 0, y: y - 6, duration, onComplete: () => p.destroy() });
  }

  // poeira/lama sob as botas ao correr e ao aterrissar
  dust(x, y, n = 1, dir = 0) {
    for (let i = 0; i < n; i++) {
      const p = this.spawn('fx_smoke', x + Phaser.Math.Between(-6, 6), y - 2, DEPTH.player - 1);
      if (!p) return;
      p.setTint(0xb89a6a).setAlpha(0.7).setScale(0.5);
      const vx = n > 1 ? (i - (n - 1) / 2) * 14 : -dir * Phaser.Math.Between(6, 14);
      this.scene.tweens.add({ targets: p, x: p.x + vx, y: p.y - Phaser.Math.Between(4, 10), scale: 1.2, alpha: 0, duration: 320, onComplete: () => p.destroy() });
    }
  }

  // cápsula ejetada da arma, em arco para trás
  casing(x, y, facing) {
    const c = this.spawn('fx_shell', x, y, DEPTH.shots);
    if (!c) return;
    const dx = -facing * Phaser.Math.Between(10, 22);
    this.scene.tweens.add({ targets: c, x: x + dx, duration: 420, ease: 'Linear' });
    this.scene.tweens.add({ targets: c, y: y - 14, duration: 140, ease: 'Quad.easeOut', yoyo: true, onComplete: () => {
      this.scene.tweens.add({ targets: c, y: y + 22, alpha: 0, angle: 360, duration: 280, onComplete: () => c.destroy() });
    } });
  }

  // faíscas de impacto
  sparks(x, y, n = 4) {
    for (let i = 0; i < n; i++) {
      const s = this.spawn('fx_spark', x, y);
      if (!s) return;
      this.scene.tweens.add({ targets: s, x: x + Phaser.Math.Between(-18, 18), y: y + Phaser.Math.Between(-18, 8), alpha: 0, duration: Phaser.Math.Between(150, 260), onComplete: () => s.destroy() });
    }
  }

  // estilhaços (gaiola de madeira, balde de Hg, chapas da draga)
  debris(x, y, color = DEBRIS.wood, n = 8) {
    for (let i = 0; i < n; i++) {
      const d = this.spawn('fx_debris', x, y);
      if (!d) return;
      d.setTint(color).setScale(Phaser.Math.FloatBetween(0.7, 1.4));
      const tx = x + Phaser.Math.Between(-55, 55);
      this.scene.tweens.add({ targets: d, x: tx, duration: 520, ease: 'Linear' });
      this.scene.tweens.add({ targets: d, y: y - Phaser.Math.Between(20, 60), duration: 200, ease: 'Quad.easeOut', onComplete: () => {
        this.scene.tweens.add({ targets: d, y: y + Phaser.Math.Between(10, 40), alpha: 0, duration: 320, ease: 'Quad.easeIn', onComplete: () => d.destroy() });
      } });
      this.scene.tweens.add({ targets: d, angle: Phaser.Math.Between(-300, 300), duration: 520 });
    }
  }
}
