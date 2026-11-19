import Phaser from 'phaser';
import { DEPTH, GROUND_Y, GRAVITY_Y } from '../config/constants.js';
import { Sfx } from '../audio/Sfx.js';

const PHASE2_TINT = 0xff8866;

// Chefão Mega Draga.
// Estado 1 (HP > 500): jatos de rejeito em parábola + baldes de Hg rolantes.
// Estado 2 (HP <= 500): visual avariado/avermelhado, cadência maior, fumaça e explosões contínuas.
export default class MegaDraga extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'boss_mega_draga', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1).setDepth(DEPTH.enemies - 1);
    this.body.setAllowGravity(false).setImmovable(true);
    // corpo proporcional ao quadro (placeholder 320x220 ou sheet real 340x150)
    this.body.setSize(this.width * 0.8, this.height * 0.68).setOffset(this.width * 0.15, this.height * 0.32);

    this.maxHP = 1000;
    this.hp = this.maxHP;
    this.phase = 1;
    this.active_ = false;   // atacando
    this.defeated = false;
    this.isTarget = false;  // só recebe dano depois da entrada
    this.attackCount = 0;
    this.attackTimer = null;
    this.smokeTimer = null;
  }

  get hoseMouth() { return { x: this.x - this.width * 0.44, y: this.y - this.height * 0.55 }; }

  enter(onReady) {
    const targetX = this.x;
    this.x += 360;
    this.baseY = this.y;
    this.scene.tweens.add({
      targets: this, x: targetX, duration: 2200, ease: 'Sine.easeOut',
      onComplete: () => {
        this.isTarget = true;
        this.active_ = true;
        this.bob = this.scene.tweens.add({ targets: this, y: this.baseY + 4, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.scheduleAttacks();
        if (onReady) onReady();
      }
    });
  }

  scheduleAttacks() {
    if (this.attackTimer) this.attackTimer.remove(false);
    this.attackTimer = this.scene.time.addEvent({
      delay: this.phase === 1 ? 2200 : 1250,
      loop: true,
      callback: () => this.attack()
    });
  }

  attack() {
    if (!this.active_ || this.defeated) return;
    this.attackCount += 1;
    const doJets = this.phase === 2 || this.attackCount % 2 === 1;
    const doBucket = this.phase === 2 ? this.attackCount % 2 === 0 : this.attackCount % 2 === 0;
    if (doJets) this.mudJets(this.phase === 1 ? 3 : 5);
    if (doBucket) this.rollBucket();
  }

  mudJets(n) {
    const m = this.hoseMouth;
    const p = this.scene.player;
    for (let i = 0; i < n; i++) {
      this.scene.time.delayedCall(i * 140, () => {
        if (this.defeated) return;
        const t = Phaser.Math.FloatBetween(0.9, 1.4);
        const tx = p.x + Phaser.Math.Between(-90, 90);
        const ty = GROUND_Y - 8;
        this.scene.spawnMud(m.x, m.y, (tx - m.x) / t, (ty - m.y - 0.5 * GRAVITY_Y * t * t) / t, 1.5);
      });
    }
    this.scene.spawnSplash(m.x, m.y);
  }

  rollBucket() {
    const speed = this.phase === 1 ? 150 : 230;
    this.scene.spawnBucket(this.x - this.width * 0.42, GROUND_Y - 40, -speed);
    if (this.phase === 2) this.scene.time.delayedCall(400, () => !this.defeated && this.scene.spawnBucket(this.x - this.width * 0.42, GROUND_Y - 40, -speed * 0.75));
  }

  takeDamage(dmg) {
    if (!this.isTarget || this.defeated) return;
    this.hp = Math.max(0, this.hp - dmg);
    Sfx.bossHit();
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(80, () => this.restoreTint());
    if (this.phase === 1 && this.hp <= this.maxHP / 2) this.enterPhase2();
    if (this.hp <= 0) this.defeat();
  }

  restoreTint() {
    if (!this.active) return;
    if (this.phase === 2) this.setTint(PHASE2_TINT); else this.clearTint();
  }

  enterPhase2() {
    this.phase = 2;
    this.setFrame(1);
    this.restoreTint();
    this.scene.cameras.main.shake(300, 0.01);
    Sfx.explosion(true);
    this.scheduleAttacks();
    this.smokeTimer = this.scene.time.addEvent({
      delay: 260, loop: true,
      callback: () => {
        if (this.defeated) return;
        const pt = this.randomPoint();
        this.scene.spawnExplosion(pt.x, pt.y, Phaser.Math.FloatBetween(0.4, 0.8), false, true);
      }
    });
  }

  randomPoint() {
    const b = this.getBounds();
    return { x: Phaser.Math.Between(b.left + 30, b.right - 30), y: Phaser.Math.Between(b.top + 30, b.bottom - 30) };
  }

  defeat() {
    this.defeated = true;
    this.isTarget = false;
    this.active_ = false;
    if (this.attackTimer) this.attackTimer.remove(false);
    if (this.smokeTimer) this.smokeTimer.remove(false);
    if (this.bob) this.bob.stop();
    this.scene.onBossDefeated(this);
  }
}
