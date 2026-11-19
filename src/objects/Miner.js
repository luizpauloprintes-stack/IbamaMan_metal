import Phaser from 'phaser';
import { DEPTH, GROUND_Y, GRAVITY_Y } from '../config/constants.js';
import { Sfx } from '../audio/Sfx.js';
import { ts, setBodyLogical } from '../config/assets.js';

// Garimpeiro com mangueira: avança até o jogador e lança jatos de lama/rejeito em parábola.
export default class Miner extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'enemy_miner_hose', 0);
    scene.add.existing(this);
    scene.enemies.add(this); // adiciona ao grupo ANTES de configurar o corpo (o grupo aplica defaults)
    this.setOrigin(0.5, 1).setDepth(DEPTH.enemies).setFlipX(true).setScale(ts('enemy_miner_hose'));
    // corpo centrado nos pés, vale para placeholder 64px e sheet real 128 lógicos
    setBodyLogical(this, 26, 52, (this.displayWidth - 26) / 2, this.displayHeight - 52);
    this.hp = 30;
    this.isTarget = true;
    this.state = 'walk';
    this.speed = Phaser.Math.Between(45, 75);
    this.range = Phaser.Math.Between(170, 280);
    this.nextShot = scene.time.now + Phaser.Math.Between(700, 1500);
    this.play('miner-walk');
  }

  update(time) {
    if (this.state === 'dead') return;
    const p = this.scene.player;
    const dx = p.x - this.x;
    this.setFlipX(dx < 0);
    const onGround = this.body.blocked.down || this.body.touching.down;

    if (Math.abs(dx) > this.range) {
      this.setVelocityX(onGround ? Math.sign(dx) * this.speed : this.body.velocity.x);
      if (this.state !== 'walk') { this.state = 'walk'; this.play('miner-walk', true); }
    } else {
      this.setVelocityX(0);
      if (this.state === 'walk') { this.state = 'aim'; this.anims.stop(); this.setFrame(0); }
      if (time >= this.nextShot && !p.dead) this.spray(time);
    }
  }

  spray(time) {
    this.nextShot = time + Phaser.Math.Between(1800, 2800);
    this.play('miner-spray', true);
    this.once('animationcomplete', () => { if (this.state !== 'dead') this.setFrame(0); });
    const dir = this.flipX ? -1 : 1;
    const sx = this.x + dir * 28;
    const sy = this.y - 34;
    const p = this.scene.player;
    const t = Phaser.Math.FloatBetween(0.8, 1.05);
    const tx = p.x + Phaser.Math.Between(-30, 30);
    const ty = Math.min(p.y - 20, GROUND_Y - 10);
    this.scene.spawnMud(sx, sy, (tx - sx) / t, (ty - sy - 0.5 * GRAVITY_Y * t * t) / t);
  }

  takeDamage(dmg) {
    if (this.state === 'dead') return;
    this.hp -= dmg;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => this.active && this.clearTint());
    Sfx.hit();
    if (this.hp <= 0) this.die();
  }

  die() {
    this.state = 'dead';
    this.isTarget = false;
    this.scene.addScore(100, this.x, this.y - 60);
    this.anims.stop();
    this.setFrame(3);
    this.setTint(0x9a8a7a);
    this.body.checkCollision.none = true;
    this.setVelocity(this.flipX ? 140 : -140, -260);
    this.scene.tweens.add({ targets: this, alpha: 0, angle: this.flipX ? 80 : -80, duration: 700, onComplete: () => this.destroy() });
  }
}
