import Phaser from 'phaser';
import { DEPTH, GROUND_Y, GRAVITY_Y } from '../config/constants.js';
import { MINER, ORGANIC } from '../config/enemies.js';
import { Sfx } from '../audio/Sfx.js';
import { ts, setBodyLogical } from '../config/assets.js';
import Organic from '../gfx/Organic.js';

// Garimpeiro com mangueira: avança com passada animada, às vezes hesita, para a uma distância
// própria e lança jatos de lama/rejeito em parábola (com recuo antes do jato).
// Quadros de enemy_miner_hose: 0 parado, 1–2 jato, 3 fuga. Passada: enemy_miner_walk (6 quadros).
export default class Miner extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'enemy_miner_hose', 0);
    scene.add.existing(this);
    scene.enemies.add(this); // adiciona ao grupo ANTES de configurar o corpo (o grupo aplica defaults)
    this.base = ts('enemy_miner_hose');
    this.setOrigin(0.5, 1).setDepth(DEPTH.enemies).setFlipX(true).setScale(this.base);
    setBodyLogical(this, 26, 52, (this.displayWidth - 26) / 2, this.displayHeight - 52);
    this.hp = MINER.hp;
    this.isTarget = true;
    this.state = 'walk';
    this.speed = Phaser.Math.Between(45, 75);
    this.range = Phaser.Math.Between(170, 280);
    this.nextShot = scene.time.now + Phaser.Math.Between(700, 1500);
    this.nextThink = scene.time.now + Phaser.Math.Between(900, 2200);
    this.pauseUntil = 0;
    this.staggerUntil = 0;
    this.org = new Organic(this, this.base);
    this.walk();
  }

  pose(frame) { if (!this.active) return; this.anims.stop(); this.setTexture('enemy_miner_hose', frame); }

  walk() {
    this.play({ key: 'miner-walk', startFrame: Phaser.Math.Between(0, 7) }, true);
    this.anims.timeScale = (this.speed / 60) * Phaser.Math.FloatBetween(0.9, 1.1);
  }

  update(time, delta) {
    if (this.state === 'dead') return;
    const p = this.scene.player;
    const dx = p.x - this.x;
    const onGround = this.body.blocked.down || this.body.touching.down;
    let moving = false;

    if (time < this.staggerUntil) {            // tranco do tiro
      this.org.update(time, delta, false);
      return;
    }
    if (this.state !== 'spray') this.setFlipX(dx < 0);

    if (this.state === 'spray') {
      this.setVelocityX(0);
    } else if (Math.abs(dx) > this.range) {
      // hesitação ocasional: para, olha e retoma
      if (time >= this.nextThink) {
        this.nextThink = time + Phaser.Math.Between(1800, 3600);
        if (Math.random() < 0.35) this.pauseUntil = time + Phaser.Math.Between(300, 650);
      }
      if (time < this.pauseUntil) {
        this.setVelocityX(0);
        if (this.state !== 'pause') { this.state = 'pause'; this.pose(0); }
      } else {
        this.setVelocityX(onGround ? Math.sign(dx) * this.speed : this.body.velocity.x);
        if (this.state !== 'walk') { this.state = 'walk'; this.walk(); }
        moving = true;
      }
    } else {
      this.setVelocityX(0);
      if (this.state === 'walk' || this.state === 'pause') { this.state = 'aim'; this.pose(0); }
      if (time >= this.nextShot && !p.dead) this.spray(time);
    }
    this.org.update(time, delta, moving);
  }

  spray(time) {
    this.state = 'spray';
    this.nextShot = time + Phaser.Math.Between(1800, 2800);
    const dir = this.flipX ? -1 : 1;
    // anticipation: recua o corpo e "carrega" a mangueira
    this.org.tilt(-dir * 0.1);
    this.org.kick(-0.06);
    this.scene.time.delayedCall(180, () => {
      if (!this.active || this.state !== 'spray') return;
      this.play('miner-spray', true);
      this.org.tilt(dir * 0.06); // tranco para frente com a pressão do jato
      const sx = this.x + dir * 28;
      const sy = this.y - 34;
      const p = this.scene.player;
      const t = Phaser.Math.FloatBetween(0.8, 1.05);
      const tx = p.x + Phaser.Math.Between(-30, 30);
      const ty = Math.min(p.y - 20, GROUND_Y - 10);
      this.scene.spawnMud(sx, sy, (tx - sx) / t, (ty - sy - 0.5 * GRAVITY_Y * t * t) / t);
      this.once('animationcomplete', () => { if (this.active && this.state === 'spray') { this.state = 'aim'; this.pose(0); } });
    });
  }

  takeDamage(dmg) {
    if (this.state === 'dead') return;
    this.hp -= dmg;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => this.active && this.clearTint());
    Sfx.hit();
    if (this.hp <= 0) { this.die(); return; }
    // tranco: empurrado para trás, corpo dobra
    const away = this.x < this.scene.player.x ? -1 : 1;
    this.staggerUntil = this.scene.time.now + ORGANIC.stagger;
    this.setVelocityX(away * 70);
    this.org.tilt(away * 0.16);
    this.org.kick(0.1);
    if (this.state !== 'spray') this.pose(0);
  }

  die() {
    this.state = 'dead';
    this.isTarget = false;
    this.scene.onEnemyKilled?.(this);
    this.scene.addScore(MINER.score, this.x, this.y - 60);
    this.pose(3);
    this.setScale(this.base).setTint(0x9a8a7a);
    this.body.checkCollision.none = true;
    this.setVelocity(this.flipX ? 140 : -140, -260);
    this.scene.tweens.add({ targets: this, alpha: 0, angle: this.flipX ? 80 : -80, duration: 700, onComplete: () => this.destroy() });
  }
}
