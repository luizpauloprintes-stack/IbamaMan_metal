import Phaser from 'phaser';
import { DEPTH, GROUND_Y } from '../config/constants.js';
import { ts } from '../config/assets.js';
import { DEBRIS } from '../gfx/Particles.js';

// Animal libertado: a arte tem 1 quadro por animal, então o movimento é procedural (squash/stretch,
// balanço e trajetória), no estilo dos resgates de Metal Slug.
// 0 arara: bate as asas e sobe em ondas · 1 onça: galope · 2 macaco: pulos com cambalhota
// 3 peixe-boi: salto, mergulho com respingo e nado submerso.
const LIFE = [2600, 2000, 2400, 2800];

export default class FreedAnimal extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y, animal) {
    super(scene, x, y, 'wildlife_cages', animal * 2 + 1);
    scene.add.existing(this); // Sprite com preUpdate entra na lista de atualização da cena
    this.animal = animal;
    this.base = ts('wildlife_cages');
    this.x0 = x; this.y0 = y;
    this.t = 0;
    this.nextDust = 0;
    this.dove = false;
    this.water = animal === 3 && scene.isWater ? scene.isWater(x + 90) : false;
    this.setOrigin(0.5, 1).setScale(this.base).setDepth(DEPTH.fx);
    if (animal === 0) this.setOrigin(0.5, 0.5).setY(y - 30);
    // alegria ao sair: pequeno salto de "obrigado"
    scene.tweens.add({ targets: this, scaleY: this.base * 1.15, duration: 90, yoyo: true });
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    this.t += delta;
    const t = this.t; const s = this.base; const dt = delta / 1000;
    const fx = this.scene.fx;

    if (this.animal === 0) {            // arara
      this.x += 210 * dt;
      this.y = this.y0 - 30 - 150 * (t / 1000) + 12 * Math.sin(t * 0.012);
      const flap = Math.sin(t * 0.035);
      this.setScale(s * (1 - 0.06 * flap), s * (1 + 0.2 * flap));
      this.rotation = -0.18 + 0.08 * Math.sin(t * 0.012);
    } else if (this.animal === 1) {     // onça
      this.x += 330 * dt;
      const g = t * 0.02;
      this.y = this.y0 - Math.abs(Math.sin(g)) * 14;
      this.rotation = 0.12 * Math.sin(g);
      this.setScale(s * (1 + 0.1 * Math.sin(g * 2)), s * (1 - 0.08 * Math.sin(g * 2)));
      if (time >= this.nextDust && Math.abs(Math.sin(g)) < 0.25) { this.nextDust = time + 120; fx.dust(this.x - 20, this.y0, 1, 1); }
    } else if (this.animal === 2) {     // macaco
      const period = 430;
      const k = (t % period) / period;
      const hop = Math.floor(t / period);
      this.x += 190 * dt;
      this.y = this.y0 - Math.sin(k * Math.PI) * (hop % 2 ? 56 : 34);
      this.angle = hop % 2 ? -360 * k : 0;          // cambalhota a cada dois pulos
      const squash = k < 0.12 || k > 0.88;
      this.setScale(s * (squash ? 1.12 : 0.95), s * (squash ? 0.85 : 1.06));
      if (k > 0.9 && time >= this.nextDust) { this.nextDust = time + period * 0.5; fx.dust(this.x, this.y0, 2); }
    } else if (!this.water) {           // peixe-boi em terra: rasteja de barriga até sair da tela
      const k = Math.abs(Math.sin(t * 0.011));
      this.x += 110 * dt;
      this.y = this.y0 - k * 9;
      this.setScale(s * (1 + 0.08 * k), s * (1 - 0.08 * k));
      this.rotation = -0.05 * k;
    } else {                            // peixe-boi no rio
      if (t < 650) {
        const k = t / 650;
        this.x = this.x0 + 90 * k;
        this.y = this.y0 - Math.sin(k * Math.PI) * 60;
        this.rotation = -0.35 + 0.95 * k;
      } else {
        if (!this.dove) {
          this.dove = true;
          this.setDepth(DEPTH.water - 1); // passa por trás da lâmina d'água
          fx.debris(this.x, GROUND_Y - 6, DEBRIS.water, 10);
          fx.puff(this.x, GROUND_Y - 10, 0xcfe8f0, 1.6, 400);
        }
        this.x += 130 * dt;
        this.y = GROUND_Y + 14 + 4 * Math.sin(t * 0.008);
        this.rotation = 0.05 * Math.sin(t * 0.008);
        this.setAlpha(Math.max(0.35, this.alpha - dt * 0.15));
      }
    }

    // some ao fim da vida (fade) ou ao sair da tela
    const v = this.scene.cameras.main.worldView;
    if (t > LIFE[this.animal] - 400) this.setAlpha(Math.max(0, this.alpha - dt * 2.5));
    if (t > LIFE[this.animal] || this.x > v.right + 80 || this.y < v.top - 80) this.destroy();
  }
}
