import Phaser from 'phaser';
import { DEPTH, GROUND_Y } from '../config/constants.js';
import { ts } from '../config/assets.js';
import { DEBRIS } from '../gfx/Particles.js';

// Animal libertado. Os quadros vêm de animals_free (tools/build_motion.py: 6 por animal) e a
// trajetória é física (aceleração, gravidade nos saltos), em vez de deslizar uma imagem parada.
// 0 arara: bate asas, decola em curva e ganha altura · 1 onça: sacode, arranca e galopa
// 2 macaco: anda de quatro e pula obstáculos · 3 peixe-boi: nada no rio (ou se arrasta em terra até a água)
const KEYS = ['free-macaw', 'free-jaguar', 'free-monkey', 'free-manatee'];
const LIFE = [4200, 3600, 4200, 4400];

export default class FreedAnimal extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y, animal) {
    super(scene, x, y, 'animals_free', animal * 6);
    scene.add.existing(this); // Sprite com preUpdate entra na lista de atualização da cena
    this.animal = animal;
    this.base = ts('animals_free');
    this.t = 0;
    this.vx = 0; this.vy = 0;
    this.ground = y;
    this.nextDust = 0;
    this.dove = false;
    this.water = animal === 3 && scene.isWater ? scene.isWater(x + 90) : false;
    this.setOrigin(0.5, 1).setScale(this.base).setDepth(DEPTH.fx);
    this.play({ key: KEYS[animal], startFrame: Phaser.Math.Between(0, 5) });

    if (animal === 0) { this.vx = 60; this.vy = -180; }                       // pulo de decolagem
    if (animal === 1) { this.anims.pause(); this.shakeUntil = 450; }           // sacode antes de arrancar
    if (animal === 2) { this.vy = -260; this.vx = 70; this.anims.timeScale = 0.6; } // salto de alegria
    if (animal === 3) { this.anims.timeScale = this.water ? 1 : 0.5; this.vy = this.water ? -230 : 0; this.vx = this.water ? 110 : 0; }
  }

  dust(n = 1) { this.scene.fx?.dust(this.x - 14, this.ground, n, 1); }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    const dt = Math.min(delta, 50) / 1000;
    this.t += delta;
    const t = this.t;
    const s = this.base;

    if (this.animal === 0) {                         // arara: decolagem em curva, batendo mais rápido no início
      this.vx = Math.min(150, this.vx + 120 * dt);
      this.vy = Math.max(-95, this.vy - 40 * dt) + Math.sin(t * 0.011) * 4;
      this.x += this.vx * dt; this.y += this.vy * dt;
      this.anims.timeScale = Phaser.Math.Linear(1.6, 1, Math.min(1, t / 900));
      this.rotation = Math.atan2(this.vy, this.vx) * 0.35;
    } else if (this.animal === 1) {                  // onça: sacode o corpo, depois arranca acelerando
      if (t < this.shakeUntil) {
        this.rotation = Math.sin(t * 0.06) * 0.06;
        this.setScale(s * (1 + Math.sin(t * 0.06) * 0.03), s);
      } else {
        if (this.anims.isPaused) { this.anims.resume(); this.rotation = 0; this.setScale(s); this.dust(3); }
        this.vx = Math.min(210, this.vx + 260 * dt);
        this.anims.timeScale = 0.6 + this.vx / 210 * 0.6;
        this.x += this.vx * dt;
        if (time >= this.nextDust) { this.nextDust = time + 140; this.dust(1); }
      }
    } else if (this.animal === 2) {                  // macaco: salto inicial, depois anda/corre e salta de novo
      this.vy += 900 * dt;
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (this.y >= this.ground) {
        this.y = this.ground;
        if (this.vy > 120) this.dust(2);
        this.vy = 0;
        this.anims.timeScale = 1;
        this.vx = Math.min(130, this.vx + 150 * dt);
        if (t > 1400 && !this.hopped) { this.hopped = true; this.vy = -300; this.anims.timeScale = 0.5; }
      }
      this.rotation = this.y < this.ground - 2 ? Phaser.Math.Clamp(this.vy / 900, -0.3, 0.3) : 0;
    } else if (!this.water) {                        // peixe-boi em terra: se arrasta em impulsos
      const k = Math.max(0, Math.sin(t * 0.009));
      this.x += 90 * k * dt;
    } else {                                         // peixe-boi no rio: salta, mergulha e nada submerso
      if (!this.dove) {
        this.vy += 900 * dt;
        this.x += this.vx * dt; this.y += this.vy * dt;
        this.rotation = Phaser.Math.Clamp(this.vy / 600, -0.4, 0.6);
        if (this.y >= GROUND_Y + 6 && this.vy > 0) {
          this.dove = true;
          this.setDepth(DEPTH.water - 1);              // passa por trás da lâmina d'água
          this.scene.fx.debris(this.x, GROUND_Y - 6, DEBRIS.water, 12);
          this.scene.fx.puff(this.x, GROUND_Y - 10, 0xcfe8f0, 1.6, 400);
        }
      } else {
        this.x += 85 * dt;
        this.y = GROUND_Y + 20 + 4 * Math.sin(t * 0.006);
        this.rotation = 0.06 * Math.sin(t * 0.006);
        this.setAlpha(Math.max(0.4, this.alpha - dt * 0.2));
      }
    }

    // some ao fim da vida (fade) ou ao sair da tela
    const v = this.scene.cameras.main.worldView;
    const life = LIFE[this.animal];
    if (t > life - 400) this.setAlpha(Math.max(0, this.alpha - dt * 2.5));
    if (t > life || this.x > v.right + 80 || this.y < v.top - 80) this.destroy();
  }
}
