import Phaser from 'phaser';
import { WEAPONS, BOMB } from '../config/weapons.js';
import { PLAYER_LIVES, PLAYER_BOMBS, DEPTH } from '../config/constants.js';
import { Sfx } from '../audio/Sfx.js';
import { ts, setBodyLogical } from '../config/assets.js';

const RUN_SPEED = 170;
const CRAWL_SPEED = 60;
const JUMP_VY = -520;

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player_pose', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1).setDepth(DEPTH.player).setScale(ts('player_pose'));
    this.standBody();
    this.body.setMaxVelocityY(900);

    this.facing = 1;
    this.lives = PLAYER_LIVES;
    this.bombs = PLAYER_BOMBS;
    this.weapon = 'PISTOL';
    this.ammo = -1;
    this.nextFire = 0;
    this.invulnUntil = 0;
    this.throwingUntil = 0;
    this.crouching = false;
    this.dead = false;
    this.locked = false; // vitória / cutscene
    this.wasOnGround = true;
    this.nextDust = 0;

    this.muzzle = scene.add.image(0, 0, 'fx_muzzle').setDepth(DEPTH.shots).setVisible(false).setScale(ts('fx_muzzle'));
  }

  // unidades lógicas (quadro de 64x64)
  // corpo centrado nos pés; vale para placeholder 64x64 e sheet real 96x64 (unidades lógicas)
  standBody() { setBodyLogical(this, 24, 56, (this.displayWidth - 24) / 2, this.displayHeight - 56); }
  crouchBody() { setBodyLogical(this, 24, 40, (this.displayWidth - 24) / 2, this.displayHeight - 40); }

  get onGround() { return this.body.blocked.down || this.body.touching.down; }
  get invulnerable() { return this.scene.time.now < this.invulnUntil || this.locked; }

  setWeapon(id) {
    this.weapon = id;
    this.ammo = WEAPONS[id].ammo;
  }

  update(time, c) {
    if (this.dead) return;
    if (this.locked) { this.setVelocityX(0); return; }

    const wantCrouch = c.crouch && this.onGround;
    if (wantCrouch !== this.crouching) {
      this.crouching = wantCrouch;
      if (wantCrouch) this.crouchBody(); else this.standBody();
    }

    let dir = 0;
    if (c.left) dir -= 1;
    if (c.right) dir += 1;
    if (dir !== 0) this.facing = dir;
    this.setFlipX(this.facing < 0);
    this.setVelocityX(dir * (this.crouching ? CRAWL_SPEED : RUN_SPEED));

    if (c.jumpQueued) {
      c.jumpQueued = false;
      if (this.onGround) { this.setVelocityY(JUMP_VY); Sfx.jump(); }
    }

    // tiro automático: vira para o alvo mais próximo (se não estiver andando) e atira quando ele está à frente
    let firing = c.fire;
    if (!firing && c.autoFire && !this.crouching) {
      const t = this.scene.autoTarget?.(this);
      if (t) {
        if (dir === 0) { this.facing = Math.sign(t.x - this.x) || this.facing; this.setFlipX(this.facing < 0); }
        firing = Math.sign(t.x - this.x) === this.facing;
      }
    }
    this.autoFiring = firing && !c.fire;
    if (firing && time >= this.nextFire) this.fire(time);
    if (c.bombQueued) { c.bombQueued = false; this.throwBomb(time); }

    // poeira nas botas: ao correr no chão e ao aterrissar
    const grounded = this.onGround;
    if (grounded && !this.wasOnGround) this.scene.fx.dust(this.x, this.y, 4);
    else if (grounded && Math.abs(this.body.velocity.x) > 150 && time >= this.nextDust) { this.nextDust = time + 140; this.scene.fx.dust(this.x - this.facing * 8, this.y, 1, this.facing); }
    this.wasOnGround = grounded;

    this.updateAnim(time, dir, firing);
    if (this.muzzle.visible && time > this.muzzleUntil) this.muzzle.setVisible(false);
  }

  updateAnim(time, dir, firing) {
    if (time < this.throwingUntil) return;
    if (!this.onGround) { this.anims.stop(); this.setTexture('player_pose', 2); return; }
    if (this.crouching) { this.anims.stop(); this.setTexture('player_pose', 1); return; }
    if (dir !== 0) { this.anims.play('player-run', true); return; }
    // parado atirando: quadros com clarão e cápsulas desenhados na arte
    if (firing) { this.anims.play('player-shoot', true); return; }
    this.anims.stop();
    this.setTexture('player_pose', 0);
  }

  gunPoint() {
    return { x: this.x + this.facing * 30, y: this.y - (this.crouching ? 26 : 34) };
  }

  fire(time) {
    const w = WEAPONS[this.weapon];
    this.nextFire = time + w.cooldown;
    const p = this.gunPoint();
    const shot = this.scene.playerShots.create(p.x, p.y, w.texture);
    shot.setDepth(DEPTH.shots);
    shot.isShot = true;
    shot.kind = w.kind;
    shot.damage = w.damage;
    shot.weapon = w.id;
    shot.hitSet = new Set();
    const spread = w.spread ? Phaser.Math.FloatBetween(-w.spread, w.spread) : 0;
    const ang = Phaser.Math.DegToRad(spread) + (this.facing < 0 ? Math.PI : 0);
    shot.setRotation(ang);
    shot.body.setVelocity(Math.cos(ang) * w.speed, Math.sin(ang) * w.speed);
    if (w.kind === 'flame') {
      shot.body.velocity.x += this.body.velocity.x * 0.5;
      shot.setScale(0.8);
      shot.dieAt = time + w.lifespan;
      this.scene.tweens.add({ targets: shot, scale: 1.9, alpha: 0.5, duration: w.lifespan });
    }
    if (w.kind === 'rocket') shot.radius = w.radius;

    // parado no chão a arte de tiro já traz clarão e cápsulas; nos outros casos usa os efeitos procedurais
    const standingShot = this.onGround && !this.crouching && Math.abs(this.body.velocity.x) < 1;
    if (!standingShot) {
      this.muzzle.setPosition(p.x + this.facing * 8, p.y).setFlipX(this.facing < 0).setVisible(true);
      this.muzzleUntil = time + 50;
      if (w.kind === 'bullet') this.scene.fx.casing(this.x + this.facing * 6, p.y + 2, this.facing);
    }
    Sfx.shoot(w.id);

    if (this.ammo > 0) {
      this.ammo -= 1;
      if (this.ammo <= 0) this.setWeapon('PISTOL');
    }
  }

  throwBomb(time) {
    if (this.bombs <= 0) return;
    this.bombs -= 1;
    const b = this.scene.bombs.create(this.x + this.facing * 14, this.y - 44, BOMB.texture);
    b.setDepth(DEPTH.shots).setScale(ts(BOMB.texture));
    b.isShot = true;
    b.kind = 'bomb';
    b.damage = BOMB.damage;
    b.radius = BOMB.radius;
    b.body.setVelocity(this.facing * BOMB.vx + this.body.velocity.x * 0.3, BOMB.vy);
    b.body.setAngularVelocity(this.facing * 540);
    this.throwingUntil = time + 250;
    this.play('player-throw', true);
    Sfx.throwBomb();
  }

  hurt() {
    if (this.invulnerable || this.dead) return false;
    Sfx.hurt();
    this.lives -= 1;
    this.setWeapon('PISTOL');
    if (this.lives < 0) {
      this.lives = 0;
      this.dead = true;
      this.anims.stop();
      this.setTexture('player_pose', 3);
      this.setVelocity(-this.facing * 120, -300);
      this.body.checkCollision.none = true;
      this.scene.tweens.add({ targets: this, angle: -90 * this.facing, alpha: 0.4, duration: 600 });
      return true;
    }
    this.bombs = Math.max(this.bombs, 5);
    this.invulnUntil = this.scene.time.now + 2000;
    this.setVelocityY(-250);
    this.scene.tweens.add({ targets: this, alpha: 0.25, duration: 100, yoyo: true, repeat: 9, onComplete: () => this.setAlpha(1) });
    return true;
  }

  celebrate() {
    this.locked = true;
    this.crouching = false;
    this.standBody();
    this.setVelocityX(0);
    this.play('player-win', true);
  }
}
