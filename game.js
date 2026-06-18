'use strict';

const $ = (selector) => document.querySelector(selector);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, t) => a + (b - a) * t;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const random = (min, max) => min + Math.random() * (max - min);
const STORAGE_KEY = 'echoValeSave.v2';
const SETTINGS_KEY = 'echoValeSettings.v2';

const WORLD = { width: 5100, height: 3700 };

const DATA = {
  regions: [
    { id: 'silberhain', name: 'Silberhain', x: 0, y: 0, w: 1700, h: 1250, color: '#24493a', accent: '#8dffd0' },
    { id: 'bruchwald', name: 'Bruchwald', x: 1700, y: 0, w: 1700, h: 1250, color: '#172820', accent: '#70c49c' },
    { id: 'kaldorf', name: 'Kaldorf', x: 3400, y: 0, w: 1700, h: 1250, color: '#40372f', accent: '#ffd48a' },
    { id: 'sumpf', name: 'Echo-Sümpfe', x: 0, y: 1250, w: 1700, h: 1250, color: '#1c3b34', accent: '#91ffcb' },
    { id: 'relay', name: 'Relay-Türme', x: 1700, y: 1250, w: 1700, h: 1250, color: '#273949', accent: '#7df7ff' },
    { id: 'schwarzgrat', name: 'Schwarzgrat-Pass', x: 3400, y: 1250, w: 1700, h: 1250, color: '#34313a', accent: '#c9b7ff' },
    { id: 'zitadelle', name: 'Kernzitadelle', x: 1700, y: 2500, w: 1700, h: 1200, color: '#211b34', accent: '#c589ff' }
  ],
  mainQuests: [
    'Erwache im Silberhain',
    'Sprich mit Mara am Lichtbruch',
    'Sammle ein Echo-Fragment',
    'Stabilisiere den Echo-Core',
    'Öffne die blockierte Brücke',
    'Weiche dem Schatten aus',
    'Beruhige den Schattenläufer',
    'Aktiviere den ersten Signalstein',
    'Öffne die Karte',
    'Öffne das Questlog',
    'Triff deine erste Entscheidung',
    'Verlasse den Silberhain Richtung Kaldorf',
    'Finde Elias’ erste Erinnerung',
    'Untersuche den Relay-Turm',
    'Entscheide über Korrins Energiequelle',
    'Stelle dich dem Archivwächter',
    'Entscheide über das letzte Signal'
  ],
  sideQuests: [
    'Der stumme Schmied', 'Die verlorene Laterne', 'Stimmen im Brunnen', 'Die Maschine mit Herz',
    'Maras Geheimnis', 'Der letzte Brief von Elias', 'Kinder des Nebels', 'Der vergessene Checkpoint'
  ],
  endings: {
    heal: ['Heilungs-Ende', 'Du heilst Echo Vale, rettest Mara und löst Vale aus dem Signal.'],
    control: ['Kontroll-Ende', 'Du übernimmst das Echo-Netz. Das Tal lebt, aber jede Erinnerung gehört dir.'],
    sacrifice: ['Opfer-Ende', 'Du versiegelst das letzte Signal in dir. Alle erinnern sich. Nur du verschwindest.'],
    dark: ['Dunkles Ende', 'Das Signal wächst an deinen Entscheidungen. Echo Vale vergisst die Welt.']
  }
};

const TUTORIAL_STEPS = [
  { key: 'intro', text: 'Das Tal atmete nicht mehr. Nur unter der Erde sang etwas weiter.', target: { x: 520, y: 520 }, auto: 2.8 },
  { key: 'move', text: 'Bewege dich mit WASD oder den Pfeiltasten.', target: { x: 620, y: 520 } },
  { key: 'mara', text: 'Gehe zu Mara am Lichtbruch.', target: { x: 670, y: 520 } },
  { key: 'talk', text: 'Sprich mit Mara: E oder Linksklick in der Nähe.', target: { x: 670, y: 520 } },
  { key: 'fragment', text: 'Sammle das Echo-Fragment am markierten Lichtpunkt.', target: { x: 820, y: 610 } },
  { key: 'echo', text: 'Nutze den Echo-Core mit Q oder Rechtsklick.', target: { x: 850, y: 640 } },
  { key: 'bridge', text: 'Stabilisiere die blockierte Brücke mit dem Schalter.', target: { x: 980, y: 610 } },
  { key: 'dodge', text: 'Drücke Leertaste für eine kurze Ausweichrolle.', target: { x: 1110, y: 660 } },
  { key: 'combat', text: 'Nutze F oder Linksklick für einen nahen Echo-Impuls.', target: { x: 1180, y: 685 } },
  { key: 'checkpoint', text: 'Aktiviere den ersten Signalstein mit E.', target: { x: 760, y: 565 } },
  { key: 'map', text: 'Öffne die Weltkarte mit M.', target: { x: 760, y: 565 } },
  { key: 'questlog', text: 'Öffne das Questlog mit J.', target: { x: 760, y: 565 } },
  { key: 'choice', text: 'Sprich noch einmal mit Mara und triff eine Entscheidung.', target: { x: 670, y: 520 } },
  { key: 'done', text: 'Kapitel 1 beginnt: Folge dem Pfad aus dem Silberhain.', target: { x: 1530, y: 600 } }
];

class AudioSystem {
  constructor(game) {
    this.game = game;
    this.context = null;
  }

  init() {
    if (!this.context) this.context = new (window.AudioContext || window.webkitAudioContext)();
  }

  play(type = 'ui') {
    const settings = this.game.settings;
    if (type === 'ui' && !settings.uiSounds) return;
    this.init();

    const frequencies = { ui: 520, hover: 680, quest: 760, complete: 940, checkpoint: 880, echo: 260, dodge: 420, hit: 140, error: 96, intro: 180, decision: 620, dialog: 480, end: 170 };
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type === 'hit' || type === 'error' ? 'sawtooth' : 'sine';
    oscillator.frequency.setValueAtTime(frequencies[type] || 440, this.context.currentTime);
    if (type === 'checkpoint' || type === 'complete') oscillator.frequency.exponentialRampToValueAtTime((frequencies[type] || 440) * 1.7, this.context.currentTime + 0.22);
    gain.gain.value = (settings.master / 100) * (settings.effects / 100) * 0.075;
    gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.34);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start();
    oscillator.stop(this.context.currentTime + 0.36);
  }
}

class Input {
  constructor(game) {
    this.game = game;
    this.keys = new Set();
    this.mouse = { x: 0, y: 0 };
    window.addEventListener('keydown', (event) => this.onKey(event, true));
    window.addEventListener('keyup', (event) => this.onKey(event, false));
    window.addEventListener('mousemove', (event) => { this.mouse.x = event.clientX; this.mouse.y = event.clientY; });
    window.addEventListener('mousedown', (event) => this.onMouse(event));
    window.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  onKey(event, down) {
    const key = event.key.toLowerCase();
    if (down) this.keys.add(key); else this.keys.delete(key);
    if ([' ', 'tab', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) event.preventDefault();
    if (!down) return;

    const game = this.game;
    if (game.dialogue.node) {
      if (key >= '1' && key <= '3') game.dialogue.choose(Number(key) - 1);
      if (key === 'enter') game.dialogue.choose(0);
      if (key === 'escape') game.dialogue.close();
      return;
    }

    if (key === 'escape' || key === 'tab') game.togglePause();
    if (key === 'm') game.togglePanel('map');
    if (key === 'j') game.togglePanel('quests');
    if (key === 'i') game.togglePanel('inventory');
    if (game.state !== 'play') return;
    if (key === 'e') game.interact();
    if (key === 'q') game.useEcho();
    if (key === 'f') game.attack();
    if (key === ' ') game.player.dodge();
  }

  onMouse(event) {
    if (this.game.state !== 'play') return;
    if (event.button === 2) this.game.useEcho();
    if (event.button === 0) {
      if (this.game.nearestInteractive(88)) this.game.interact();
      else this.game.attack();
    }
  }

  axis() {
    return {
      x: Number(this.keys.has('d') || this.keys.has('arrowright')) - Number(this.keys.has('a') || this.keys.has('arrowleft')),
      y: Number(this.keys.has('s') || this.keys.has('arrowdown')) - Number(this.keys.has('w') || this.keys.has('arrowup')),
      sprint: this.keys.has('shift')
    };
  }
}

class ParticleSystem {
  constructor(game) {
    this.game = game;
    this.items = [];
  }

  emit(x, y, color, count = 8, options = {}) {
    const max = { Niedrig: 90, Mittel: 180, Hoch: 340 }[this.game.settings.particles] || 180;
    for (let i = 0; i < count; i += 1) {
      this.items.push({
        x,
        y,
        vx: random(options.vxMin ?? -70, options.vxMax ?? 70),
        vy: random(options.vyMin ?? -70, options.vyMax ?? 70),
        radius: random(options.rMin ?? 1.8, options.rMax ?? 4.8),
        life: random(options.lifeMin ?? 0.35, options.lifeMax ?? 1.1),
        maxLife: 1,
        color,
        glow: options.glow ?? true
      });
    }
    if (this.items.length > max) this.items.splice(0, this.items.length - max);
  }

  update(dt) {
    this.items = this.items.filter((particle) => {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 0.985;
      particle.vy *= 0.985;
      return particle.life > 0;
    });
  }
}

class SeasonSystem {
  constructor() {
    this.time = 0;
    this.seasons = ['Frühling', 'Sommer', 'Herbst', 'Winter'];
  }
  update(dt) { this.time += dt * 0.02; }
  get name() { return this.seasons[Math.floor(this.time) % this.seasons.length]; }
  get dayPhase() { return ['Morgen', 'Mittag', 'Abend', 'Nacht'][Math.floor(this.time * 4) % 4]; }
}

class WeatherSystem {
  constructor(game) {
    this.game = game;
    this.time = 0;
    this.types = ['Klar', 'Nebel', 'Regen', 'Schnee'];
  }
  update(dt) { this.time += dt * 0.035; }
  get type() { return this.game.quest.chapter >= 5 ? 'Echo-Sturm' : this.types[Math.floor(this.time) % this.types.length]; }
}

class Player {
  constructor(game) {
    this.game = game;
    this.x = 520;
    this.y = 520;
    this.vx = 0;
    this.vy = 0;
    this.facing = { x: 1, y: 0 };
    this.radius = 18;
    this.hp = 100;
    this.stamina = 100;
    this.echo = 80;
    this.fragments = 0;
    this.kaldorf = 0;
    this.inventory = [];
    this.stats = { compassion: 0, truth: 0, control: 0, trust: 0, risk: 0 };
    this.dodgeTime = 0;
    this.attackTime = 0;
    this.movedDistance = 0;
  }

  update(dt) {
    const input = this.game.input.axis();
    const length = Math.hypot(input.x, input.y) || 1;
    const moving = input.x !== 0 || input.y !== 0;
    const sprinting = moving && input.sprint && this.stamina > 4;
    const targetSpeed = sprinting ? 255 : 155;
    const ax = moving ? (input.x / length) * targetSpeed : 0;
    const ay = moving ? (input.y / length) * targetSpeed : 0;

    this.vx = lerp(this.vx, ax, 1 - Math.pow(0.0008, dt));
    this.vy = lerp(this.vy, ay, 1 - Math.pow(0.0008, dt));
    if (moving) this.facing = { x: input.x / length, y: input.y / length };

    if (sprinting) this.stamina = clamp(this.stamina - 30 * dt, 0, 100);
    else this.stamina = clamp(this.stamina + 22 * dt, 0, 100);
    this.echo = clamp(this.echo + 8 * dt, 0, 100);

    const nx = this.x + this.vx * dt;
    const ny = this.y + this.vy * dt;
    if (!this.game.world.collides(nx, this.y, this.radius)) this.x = nx; else this.vx *= -0.16;
    if (!this.game.world.collides(this.x, ny, this.radius)) this.y = ny; else this.vy *= -0.16;

    const speed = Math.hypot(this.vx, this.vy);
    this.movedDistance += speed * dt;
    if (moving && Math.random() < dt * (sprinting ? 18 : 7)) {
      this.game.particles.emit(this.x - this.facing.x * 12, this.y + 16, sprinting ? '#ffe0a5' : '#b9e5ca', 1, { rMin: 1, rMax: 3, lifeMin: 0.25, lifeMax: 0.65, vyMin: -18, vyMax: 8 });
    }

    this.dodgeTime = Math.max(0, this.dodgeTime - dt);
    this.attackTime = Math.max(0, this.attackTime - dt);
  }

  dodge() {
    if (this.stamina < 22 || this.dodgeTime > 0) return this.game.feedbackBlocked();
    const axis = this.game.input.axis();
    const length = Math.hypot(axis.x, axis.y) || 1;
    const dx = axis.x ? axis.x / length : this.facing.x;
    const dy = axis.y ? axis.y / length : this.facing.y;
    this.x += dx * 86;
    this.y += dy * 86;
    this.vx = dx * 260;
    this.vy = dy * 260;
    this.stamina -= 22;
    this.dodgeTime = 0.42;
    this.game.shake(2.5);
    this.game.audio.play('dodge');
    this.game.particles.emit(this.x, this.y, '#e9fbff', 24, { rMin: 2, rMax: 5, lifeMin: 0.25, lifeMax: 0.75 });
    this.game.tutorial.complete('dodge');
  }
}

class World {
  constructor(game) {
    this.game = game;
    this.objects = [];
    this.water = [];
    this.ruins = [];
    this.npcs = [];
    this.enemies = [];
    this.checkpoints = [];
    this.collectibles = [];
    this.notes = [];
    this.relics = [];
    this.switches = [];
    this.critters = [];
    this.discovery = new Set(['silberhain']);
    this.build();
  }

  build() {
    DATA.regions.forEach((region) => {
      for (let i = 0; i < 34; i += 1) this.objects.push(this.createObject(region, i));
      for (let i = 0; i < 13; i += 1) this.critters.push({ x: random(region.x + 80, region.x + region.w - 80), y: random(region.y + 80, region.y + region.h - 80), phase: random(0, 9), region: region.id });
    });

    this.water.push({ x: 210, y: 720, w: 820, h: 210 }, { x: 300, y: 1700, w: 900, h: 420 }, { x: 1870, y: 1880, w: 980, h: 180 });
    this.ruins.push({ x: 930, y: 590, w: 170, h: 90, type: 'bridge' }, { x: 2320, y: 1550, w: 520, h: 320, type: 'relay' }, { x: 3790, y: 550, w: 460, h: 360, type: 'village' }, { x: 2370, y: 2860, w: 420, h: 340, type: 'citadel' });

    [
      [760, 565, 'Silberhain'], [2250, 620, 'Bruchwald'], [3920, 630, 'Kaldorf'], [820, 1850, 'Echo-Sümpfe'],
      [2500, 1830, 'Relay-Türme'], [4100, 1880, 'Schwarzgrat-Pass'], [2550, 3020, 'Kernzitadelle']
    ].forEach(([x, y, name], index) => this.checkpoints.push({ id: `cp${index}`, x, y, name, active: index === 0, radius: 34 }));

    [
      ['Mara', 670, 520, 'mara'], ['Korrin', 3900, 720, 'korrin'], ['Elias-Echo', 2440, 1710, 'elias'], ['Archivwächter', 2550, 2940, 'archiv'],
      ['Stummer Schmied', 3730, 850, 'smith'], ['Nebelkind', 970, 1900, 'child'], ['Herzmaschine', 2630, 1880, 'machine'], ['Laternenhüterin', 2220, 650, 'lantern']
    ].forEach(([name, x, y, id]) => this.npcs.push({ id, name, x, y, baseX: x, baseY: y, radius: 24, phase: random(0, 10) }));

    this.enemies.push({ type: 'Tutorial-Schatten', x: 1180, y: 685, radius: 16, hp: 20, maxHp: 20, stun: 0, tutorial: true });
    ['Schattenläufer', 'Rostwächter', 'Echo-Wolf', 'Relay-Drohne', 'Verderbter Hüter'].forEach((type, typeIndex) => {
      for (let i = 0; i < 4; i += 1) {
        this.enemies.push({ type, x: 1800 + typeIndex * 650 + random(0, 360), y: 520 + (i % 2) * 1050 + random(0, 260), radius: 20 + typeIndex * 3, hp: 36 + typeIndex * 24, maxHp: 36 + typeIndex * 24, stun: 0, hitFlash: 0 });
      }
    });

    this.collectibles.push({ id: 'tutorial-fragment', kind: 'fragment', x: 820, y: 610, radius: 16, taken: false, tutorial: true });
    for (let i = 0; i < 12; i += 1) this.collectibles.push({ id: `frag${i}`, kind: 'fragment', x: 540 + (i % 4) * 920 + random(0, 260), y: 560 + Math.floor(i / 4) * 930 + random(0, 260), radius: 15, taken: false });
    for (let i = 0; i < 10; i += 1) this.notes.push({ id: `note${i}`, kind: 'note', x: 900 + (i % 5) * 780, y: 350 + Math.floor(i / 5) * 1600 + random(0, 420), radius: 14, taken: false, text: `Elias Notiz ${i + 1}: Das Signal ist kein Feind. Es ist ein Hunger nach Bedeutung.` });
    for (let i = 0; i < 5; i += 1) this.relics.push({ id: `relic${i}`, kind: 'relic', x: 1250 + i * 760, y: 1020 + (i % 2) * 1420, radius: 16, taken: false });
    [[980, 610, 0], [2160, 1510, 1], [2580, 1510, 2], [2850, 1510, 3]].forEach(([x, y, order]) => this.switches.push({ x, y, order, on: false, radius: 24 }));
  }

  createObject(region, index) {
    const type = index % 6 === 0 ? 'rock' : index % 11 === 0 ? 'machine' : 'tree';
    return { type, x: random(region.x + 90, region.x + region.w - 90), y: random(region.y + 90, region.y + region.h - 90), radius: random(type === 'tree' ? 25 : 18, type === 'tree' ? 55 : 38), region: region.id, phase: random(0, 6.28) };
  }

  regionAt(x, y) {
    return DATA.regions.find((region) => x >= region.x && y >= region.y && x < region.x + region.w && y < region.y + region.h) || DATA.regions[0];
  }

  collides(x, y, radius) {
    if (x < 24 || y < 24 || x > WORLD.width - 24 || y > WORLD.height - 24) return true;
    if (this.water.some((water) => x > water.x && y > water.y && x < water.x + water.w && y < water.y + water.h)) return true;
    return this.objects.some((object) => distance({ x, y }, object) < object.radius * 0.64 + radius);
  }

  update(dt) {
    const player = this.game.player;
    this.discovery.add(this.regionAt(player.x, player.y).id);
    this.npcs.forEach((npc) => {
      npc.phase += dt;
      npc.x = npc.baseX + Math.cos(npc.phase * 0.7) * 8;
      npc.y = npc.baseY + Math.sin(npc.phase * 0.9) * 5;
    });
    this.critters.forEach((critter) => {
      critter.phase += dt * random(0.6, 1.2);
      critter.x += Math.cos(critter.phase) * 8 * dt;
      critter.y += Math.sin(critter.phase * 0.8) * 8 * dt;
    });
    this.enemies.forEach((enemy) => this.updateEnemy(enemy, dt));
  }

  updateEnemy(enemy, dt) {
    if (enemy.hp <= 0) return;
    enemy.stun = Math.max(0, enemy.stun - dt);
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
    const player = this.game.player;
    const d = distance(enemy, player);
    if (d < 320 && enemy.stun <= 0) {
      const speed = enemy.type === 'Echo-Wolf' ? 98 : enemy.type === 'Rostwächter' ? 42 : enemy.tutorial ? 36 : 66;
      enemy.x += ((player.x - enemy.x) / d) * speed * dt;
      enemy.y += ((player.y - enemy.y) / d) * speed * dt;
      if (d < enemy.radius + player.radius + 5 && player.dodgeTime <= 0) {
        player.hp = clamp(player.hp - (enemy.tutorial ? 8 : 18) * dt, 0, 100);
        if (player.hp <= 0) this.game.respawn();
      }
    }
  }

  visibleObjects(camera) {
    const pad = 180;
    const inView = (item) => item.x > camera.x - pad && item.y > camera.y - pad && item.x < camera.x + innerWidth + pad && item.y < camera.y + innerHeight + pad;
    return {
      objects: this.objects.filter(inView),
      npcs: this.npcs.filter(inView),
      enemies: this.enemies.filter((enemy) => enemy.hp > 0 && inView(enemy)),
      checkpoints: this.checkpoints.filter(inView),
      switches: this.switches.filter(inView),
      critters: this.critters.filter(inView),
      collectibles: [...this.collectibles, ...this.notes, ...this.relics].filter((item) => !item.taken && inView(item)),
      water: this.water.filter((w) => w.x + w.w > camera.x - pad && w.y + w.h > camera.y - pad && w.x < camera.x + innerWidth + pad && w.y < camera.y + innerHeight + pad),
      ruins: this.ruins.filter((r) => r.x + r.w > camera.x - pad && r.y + r.h > camera.y - pad && r.x < camera.x + innerWidth + pad && r.y < camera.y + innerHeight + pad)
    };
  }
}

class QuestSystem {
  constructor(game) {
    this.game = game;
    this.main = 0;
    this.chapter = 1;
    this.side = DATA.sideQuests.map((name, index) => ({ name, status: index < 3 ? 'aktiv' : 'unentdeckt', reward: ['Fragment', 'Relikt', 'Ruf'][index % 3] }));
  }

  advanceTo(index) {
    if (index <= this.main || index >= DATA.mainQuests.length) return;
    this.main = index;
    this.chapter = clamp(Math.floor(index / 4) + 1, 1, 5);
    this.game.toast(`Quest aktualisiert: ${DATA.mainQuests[this.main]}`);
    this.game.audio.play('quest');
    this.game.save.auto();
  }

  advance() { this.advanceTo(this.main + 1); }
}

class TutorialSystem {
  constructor(game) {
    this.game = game;
    this.index = 0;
    this.active = true;
    this.timer = 0;
  }

  get step() { return TUTORIAL_STEPS[this.index] || TUTORIAL_STEPS[TUTORIAL_STEPS.length - 1]; }
  get completeRatio() { return (this.index + 1) / TUTORIAL_STEPS.length; }

  reset() {
    this.index = 0;
    this.active = true;
    this.timer = 0;
  }

  skip() {
    this.index = TUTORIAL_STEPS.length - 1;
    this.active = false;
    this.game.tutorialDone = true;
    this.game.quest.advanceTo(11);
    this.game.save.auto();
    this.game.toast('Tutorial übersprungen');
  }

  update(dt) {
    if (!this.active || this.game.tutorialDone || !this.game.settings.tutorialHints) return;
    const step = this.step;
    if (step.auto) {
      this.timer += dt;
      if (this.timer >= step.auto) this.next();
    }
    if (step.key === 'move' && this.game.player.movedDistance > 90) this.next();
    if (step.key === 'mara' && distance(this.game.player, step.target) < 70) this.next();
    if (step.key === 'done' && distance(this.game.player, step.target) < 120) this.finish();
  }

  complete(key) {
    if (!this.active || this.step.key !== key) return;
    this.next();
  }

  next() {
    this.index = clamp(this.index + 1, 0, TUTORIAL_STEPS.length - 1);
    this.timer = 0;
    this.game.quest.advanceTo(Math.min(this.index, 11));
    this.game.ui.render();
  }

  finish() {
    this.active = false;
    this.game.tutorialDone = true;
    this.game.toast('Tutorial abgeschlossen — Kapitel 1 beginnt');
    this.game.audio.play('complete');
    this.game.save.auto();
  }
}

class DialogueSystem {
  constructor(game) {
    this.game = game;
    this.node = null;
  }

  open(npc) {
    const lines = {
      mara: ['Mara', 'Du hörst es auch. Unter dem Moos singt etwas, das uns vergessen will. Was wirst du tun?'],
      korrin: ['Korrin', 'Wenn ein Dorf seine Namen verliert, greift man nach jeder Maschine. Auch nach einer gefährlichen.'],
      elias: ['Elias', 'Ich habe das Signal nicht erschaffen. Ich habe es eingesperrt, weil es uns zu gut verstand.'],
      archiv: ['Archivwächter', 'Vor dir liegen vier Türen: Heilung, Kontrolle, Opfer — und Hunger. Wähle, wer du geworden bist.'],
      smith: ['Stummer Schmied', 'Er legt eine kalte Laterne in deine Hand. Darin klopft etwas wie ein Herz.'],
      child: ['Nebelkind', 'Wir haben im Brunnen Stimmen versteckt. Bitte gib sie nicht Korrin.'],
      machine: ['Herzmaschine', 'TAKT FEHLT. MITGEFÜHL ERKANNT. BEFEHL?'],
      lantern: ['Laternenhüterin', 'Eine Laterne findet nicht den Weg. Sie entscheidet, welche Dunkelheit wahr sein darf.']
    };
    const [name, text] = lines[npc.id] || [npc.name, 'Das Echo antwortet nicht.'];
    this.node = { npc, name, text, choices: this.choices(npc.id) };
    this.game.state = 'dialog';
    this.game.audio.play('dialog');
    this.game.ui.render();
  }

  choices(id) {
    if (id === 'archiv') return [
      ['Vale heilen', () => this.game.end('heal')],
      ['Echo-Netz kontrollieren', () => this.game.end('control')],
      ['Mich selbst opfern', () => this.game.end('sacrifice')]
    ];
    return [
      ['Ich helfe, auch wenn es mich kostet.', () => this.apply({ compassion: 1, trust: 1 })],
      ['Ich will die ganze Wahrheit.', () => this.apply({ truth: 1, risk: 1 })],
      ['Dieses Signal darf niemand außer mir führen.', () => this.apply({ control: 1, risk: 1 })]
    ];
  }

  apply(delta) {
    Object.entries(delta).forEach(([key, value]) => { this.game.player.stats[key] += value; });
    this.game.audio.play('decision');
    if (this.node?.npc.id === 'mara') this.game.tutorial.complete(this.game.tutorial.step.key === 'talk' ? 'talk' : 'choice');
    this.close();
  }

  choose(index) {
    const choice = this.node?.choices[index];
    if (choice) choice[1]();
  }

  close() {
    this.node = null;
    this.game.state = 'play';
    this.game.ui.render();
  }
}

class SaveSystem {
  constructor(game) { this.game = game; }

  data() {
    const game = this.game;
    const player = game.player;
    return {
      player: { x: player.x, y: player.y, hp: player.hp, fragments: player.fragments, kaldorf: player.kaldorf, inventory: player.inventory, stats: player.stats },
      quest: { main: game.quest.main, chapter: game.quest.chapter, side: game.quest.side },
      checkpoints: game.world.checkpoints.map((checkpoint) => [checkpoint.id, checkpoint.active]),
      switches: game.world.switches.map((sw) => sw.on),
      collected: [...game.world.collectibles, ...game.world.notes, ...game.world.relics].filter((item) => item.taken).map((item) => item.id),
      discovery: [...game.world.discovery],
      endings: game.endings,
      tutorialDone: game.tutorialDone,
      tutorialIndex: game.tutorial.index,
      settings: game.settings
    };
  }

  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data()));
    this.game.toast('Spiel gespeichert');
  }

  auto() { if (this.game.settings.autoSave) this.save(); }

  load() {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!data) return false;
    Object.assign(this.game.player, data.player);
    Object.assign(this.game.quest, data.quest);
    this.game.quest.side = data.quest.side;
    this.game.world.checkpoints.forEach((checkpoint) => {
      const saved = data.checkpoints?.find(([id]) => id === checkpoint.id);
      if (saved) checkpoint.active = saved[1];
    });
    this.game.world.switches.forEach((sw, index) => { sw.on = Boolean(data.switches?.[index]); });
    [...this.game.world.collectibles, ...this.game.world.notes, ...this.game.world.relics].forEach((item) => { item.taken = data.collected?.includes(item.id) || false; });
    this.game.world.discovery = new Set(data.discovery || ['silberhain']);
    this.game.endings = data.endings || [];
    this.game.tutorialDone = Boolean(data.tutorialDone);
    this.game.tutorial.index = data.tutorialIndex || 0;
    this.game.tutorial.active = !this.game.tutorialDone;
    return true;
  }

  reset() {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }
}

class UI {
  constructor(game) {
    this.game = game;
    this.app = $('#app');
    this.panel = null;
    this.tab = 'Grafik';
  }

  render() {
    document.documentElement.style.setProperty('--scale', this.game.settings.uiScale / 100);
    if (this.game.state === 'menu') return this.renderMenu();

    let html = this.hudHtml();
    if (this.panel) html += this.panelHtml();
    if (this.game.dialogue.node) html += this.dialogHtml();
    if (this.game.introText) html += `<div class="intro-lines cinema"><p>${this.game.introText}</p></div>`;
    this.app.innerHTML = html;
    this.bind();
    this.drawMiniMap();
    if (this.panel === 'map') requestAnimationFrame(() => this.drawBigMap());
  }

  renderMenu() {
    const hasSave = Boolean(localStorage.getItem(STORAGE_KEY));
    this.app.innerHTML = `<div class="screen">
      <div class="menu glass">
        <div class="kicker">Open World Story RPG</div>
        <h1 class="title">ECHO VALE<br>THE LAST SIGNAL</h1>
        <p class="subtitle">Ein atmosphärisches 2.5D-Mystery-Abenteuer über Erinnerung, alte Technologie und die letzte Stimme unter dem Tal.</p>
        <div class="stack">
          <button class="btn primary" data-action="new">Neues Spiel</button>
          <button class="btn" data-action="continue" ${hasSave ? '' : 'disabled'}>Fortsetzen</button>
          <button class="btn" data-panel="settings">Einstellungen</button>
          <button class="btn" data-panel="controls">Steuerung</button>
          <button class="btn" data-panel="credits">Credits</button>
        </div>
      </div>
    </div>`;
    this.bind();
  }

  hudHtml() {
    const game = this.game;
    const step = game.tutorial.active && !game.tutorialDone && game.settings.tutorialHints ? game.tutorial.step : null;
    const interaction = game.nearestInteractive(90);
    return `<div class="hud">
      <div class="bars glass">
        <b>Echo-Core</b>
        <div class="bar"><i class="hp" style="width:${game.player.hp}%"></i></div>
        <div class="bar"><i class="sta" style="width:${game.player.stamina}%"></i></div>
        <div class="bar"><i class="echo" style="width:${game.player.echo}%"></i></div>
        <small>${game.season.name} · ${game.season.dayPhase} · ${game.weather.type}</small>
      </div>
      <div class="quest-card glass"><b>Kapitel ${game.quest.chapter}: ${DATA.mainQuests[game.quest.main]}</b><br><small>${interaction ? `E: ${interaction.name || 'Interagieren'}` : game.hint}</small></div>
      <div class="minimap-wrap glass"><canvas id="mini" width="176" height="176"></canvas></div>
      ${step ? `<div class="tutorial-card glass"><b>Tutorial ${game.tutorial.index + 1}/${TUTORIAL_STEPS.length}</b><br>${step.text}<div class="tutorial-progress"><i style="width:${game.tutorial.completeRatio * 100}%"></i></div></div>` : ''}
    </div>`;
  }

  panelHtml() {
    if (this.panel === 'map') return this.mapPanel();
    if (this.panel === 'quests') return this.questPanel();
    if (this.panel === 'inventory') return this.inventoryPanel();
    if (this.panel === 'controls') return this.controlsPanel();
    if (this.panel === 'credits') return this.creditsPanel();
    return this.settingsPanel();
  }

  mapPanel() {
    return `<div class="overlay-panel map-panel glass">
      <div class="panel-head"><div><h2>Echo Vale Karte</h2><small>Entdeckte Regionen, Signalsteine, Questmarker und Pfade</small></div><button class="btn ghost" data-close>Schließen</button></div>
      <div class="map-shell"><canvas id="bigmap"></canvas></div>
      <div class="map-legend"><span><i class="legend-dot"></i>Spieler</span><span><i class="legend-dot" style="background:#ffd48a"></i>Questziel</span><span><i class="legend-dot" style="background:#8dffc2"></i>Checkpoint</span><span>M schließt die Karte</span></div>
    </div>`;
  }

  questPanel() {
    const game = this.game;
    return `<div class="overlay-panel glass">
      <div class="panel-head"><div><h2>Questlog</h2><small>Hauptpfad und Nebenaufträge</small></div><button class="btn ghost" data-close>Schließen</button></div>
      <div class="grid2 panel-body">
        <div><h3>Hauptquest</h3><div class="cards">${DATA.mainQuests.map((quest, index) => `<div class="item ${index < game.quest.main ? 'done' : index === game.quest.main ? 'active' : ''}">${index < game.quest.main ? '✓' : index === game.quest.main ? '◆' : '○'} ${quest}</div>`).join('')}</div></div>
        <div><h3>Nebenquests</h3><div class="cards">${game.quest.side.map((quest) => `<div class="item ${quest.status === 'aktiv' ? 'active' : ''}"><b>${quest.name}</b><br>${quest.status} · Belohnung: ${quest.reward}</div>`).join('')}</div></div>
      </div>
    </div>`;
  }

  inventoryPanel() {
    const player = this.game.player;
    return `<div class="overlay-panel glass"><div class="panel-head"><div><h2>Inventar & Charakter</h2><small>Echo-Fragmente, Notizen, Relikte und Entscheidungen</small></div><button class="btn ghost" data-close>Schließen</button></div>
      <div class="grid2"><div class="item active">Echo-Fragmente: ${player.fragments}/13<br>Notizen/Relikte: ${player.inventory.length}<br>Ruf in Kaldorf: ${player.kaldorf}</div><div class="item active">${Object.entries(player.stats).map(([key, value]) => `${key}: ${value}`).join('<br>')}</div></div></div>`;
  }

  controlsPanel() {
    return `<div class="overlay-panel glass"><div class="panel-head"><div><h2>Steuerung</h2><small>Vollständige Maus- und Tastatursteuerung</small></div><button class="btn ghost" data-close>Schließen</button></div>
      <div class="item active">WASD/Pfeile bewegen · Shift sprinten · Leertaste ausweichen · E/Linksklick interagieren · F/Linksklick Echo-Impuls · Q/Rechtsklick Echo-Core · M Karte · J Questlog · I Inventar · ESC/Tab Pause · 1/2/3 Dialogwahl.</div></div>`;
  }

  creditsPanel() {
    return `<div class="overlay-panel glass"><div class="panel-head"><div><h2>Credits</h2><small>Lokal generiert, keine externen Assets</small></div><button class="btn ghost" data-close>Schließen</button></div>
      <p class="subtitle">Design, Code, Story, prozedurale Canvas-Grafik und WebAudio-Sounds laufen vollständig lokal im Browser.</p></div>`;
  }

  settingsPanel() {
    const settings = this.game.settings;
    const tabs = ['Grafik', 'Audio', 'Gameplay', 'Steuerung', 'Speicher'];
    const row = (label, control) => `<div class="setting"><span>${label}</span>${control}</div>`;
    let body = '';
    if (this.tab === 'Grafik') {
      body = row('Grafikqualität', this.select('quality', ['Niedrig', 'Mittel', 'Hoch'])) + row('Partikelqualität', this.select('particles', ['Niedrig', 'Mittel', 'Hoch'])) + row('Wettereffekte', this.checkbox('weatherFx')) + row('Jahreszeiten', this.checkbox('seasonFx')) + row('Screen Shake', this.checkbox('shake')) + row('Kameraweichheit', `<input data-setting="cameraSmooth" type="range" min="6" max="20" value="${settings.cameraSmooth}">`) + row('UI-Skalierung', `<input data-setting="uiScale" type="range" min="84" max="126" value="${settings.uiScale}">`);
    }
    if (this.tab === 'Audio') body = ['master', 'music', 'effects', 'ambience'].map((key) => row(key, `<input data-setting="${key}" type="range" min="0" max="100" value="${settings[key]}">`)).join('') + row('UI-Sounds', this.checkbox('uiSounds'));
    if (this.tab === 'Gameplay') body = row('Schwierigkeit', this.select('difficulty', ['Story', 'Normal', 'Hard'])) + row('Auto-Save', this.checkbox('autoSave')) + row('Tutorial-Hinweise', this.checkbox('tutorialHints')) + row('Interaktionshilfe', this.checkbox('interactionHelp')) + `<button class="btn" data-action="skipTutorial">Tutorial überspringen</button>`;
    if (this.tab === 'Steuerung') body = '<div class="item active">Alle Eingaben sind aktiv: WASD/Pfeile, Maus, Q, F, E, Leertaste, Shift, M, J, I, ESC/Tab, 1/2/3 und Enter.</div>';
    if (this.tab === 'Speicher') body = '<div class="row"><button class="btn" data-action="save">Speichern</button><button class="btn" data-action="load">Laden</button><button class="btn" data-action="checkpoint">Checkpoint laden</button><button class="btn danger" data-action="reset">Save zurücksetzen</button></div>';
    return `<div class="overlay-panel glass"><div class="panel-head"><div><h2>Einstellungen</h2><small>Saubere Tabs ohne Scrollbar-Bug</small></div><button class="btn ghost" data-close>Schließen</button></div><div class="tabs">${tabs.map((tab) => `<button class="btn ${tab === this.tab ? 'primary' : ''}" data-tab="${tab}">${tab}</button>`).join('')}</div>${body}</div>`;
  }

  select(key, values) { return `<select data-setting="${key}">${values.map((value) => `<option ${this.game.settings[key] === value ? 'selected' : ''}>${value}</option>`).join('')}</select>`; }
  checkbox(key) { return `<input data-setting="${key}" type="checkbox" ${this.game.settings[key] ? 'checked' : ''}>`; }

  dialogHtml() {
    const node = this.game.dialogue.node;
    return `<div class="dialog glass"><div class="name">${node.name}</div><p>${node.text}</p>${node.choices.map((choice, index) => `<button class="btn choice" data-choice="${index}">${index + 1}. ${choice[0]}</button>`).join('')}</div>`;
  }

  bind() {
    this.app.querySelectorAll('[data-action]').forEach((button) => { button.onclick = () => this.action(button.dataset.action); });
    this.app.querySelectorAll('[data-panel]').forEach((button) => { button.onclick = () => this.game.openPanel(button.dataset.panel); });
    this.app.querySelectorAll('[data-close]').forEach((button) => { button.onclick = () => this.game.closePanel(); });
    this.app.querySelectorAll('[data-tab]').forEach((button) => { button.onclick = () => { this.tab = button.dataset.tab; this.render(); }; });
    this.app.querySelectorAll('[data-choice]').forEach((button) => { button.onclick = () => this.game.dialogue.choose(Number(button.dataset.choice)); });
    this.app.querySelectorAll('[data-setting]').forEach((input) => {
      input.oninput = () => {
        const value = input.type === 'checkbox' ? input.checked : input.type === 'range' ? Number(input.value) : input.value;
        this.game.settings[input.dataset.setting] = value;
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.game.settings));
        this.render();
      };
    });
  }

  action(action) {
    if (action === 'new') this.game.newGame();
    if (action === 'continue' || action === 'load') this.game.continueGame();
    if (action === 'save') this.game.save.save();
    if (action === 'reset') this.game.save.reset();
    if (action === 'checkpoint') this.game.loadCheckpoint();
    if (action === 'skipTutorial') this.game.tutorial.skip();
  }

  drawMiniMap() {
    const canvas = $('#mini');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const player = this.game.player;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(2,8,14,.62)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    DATA.regions.forEach((region) => {
      ctx.fillStyle = this.game.world.discovery.has(region.id) ? region.color : '#101923';
      ctx.fillRect(region.x / 29, region.y / 22, region.w / 29, region.h / 22);
    });
    this.drawMapPaths(ctx, 1 / 29, 1 / 22, 10);
    ctx.fillStyle = '#7df7ff';
    ctx.shadowColor = '#7df7ff';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(player.x / 29, player.y / 22, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  drawBigMap() {
    const canvas = $('#bigmap');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
    const scale = Math.min((rect.width - 44) / WORLD.width, (rect.height - 44) / WORLD.height);
    const ox = (rect.width - WORLD.width * scale) / 2;
    const oy = (rect.height - WORLD.height * scale) / 2;

    ctx.fillStyle = 'rgba(1,7,13,.7)';
    ctx.fillRect(0, 0, rect.width, rect.height);
    DATA.regions.forEach((region) => {
      const discovered = this.game.world.discovery.has(region.id);
      ctx.fillStyle = discovered ? region.color : '#0d151d';
      ctx.globalAlpha = discovered ? 0.95 : 0.5;
      ctx.fillRect(ox + region.x * scale, oy + region.y * scale, region.w * scale, region.h * scale);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(255,255,255,.16)';
      ctx.strokeRect(ox + region.x * scale, oy + region.y * scale, region.w * scale, region.h * scale);
      ctx.fillStyle = discovered ? '#edf8ff' : '#56616b';
      ctx.font = '700 15px system-ui';
      ctx.fillText(region.name, ox + region.x * scale + 14, oy + region.y * scale + 26);
    });
    this.drawMapPaths(ctx, scale, scale, ox, oy);
    this.game.world.checkpoints.forEach((checkpoint) => this.mapDot(ctx, ox + checkpoint.x * scale, oy + checkpoint.y * scale, checkpoint.active ? '#8dffc2' : '#596673', 5, checkpoint.name));
    const target = this.game.currentTarget();
    if (target) this.mapDot(ctx, ox + target.x * scale, oy + target.y * scale, '#ffd48a', 7, 'Questziel');
    this.mapDot(ctx, ox + this.game.player.x * scale, oy + this.game.player.y * scale, '#7df7ff', 7, 'Du');
  }

  drawMapPaths(ctx, sx, sy, ox = 0, oy = 0) {
    ctx.save();
    ctx.strokeStyle = 'rgba(230, 222, 190, .45)';
    ctx.lineWidth = Math.max(2, 36 * sx);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ox + 530 * sx, oy + 560 * sy);
    ctx.bezierCurveTo(ox + 1450 * sx, oy + 520 * sy, ox + 2450 * sx, oy + 790 * sy, ox + 3890 * sx, oy + 700 * sy);
    ctx.moveTo(ox + 760 * sx, oy + 590 * sy);
    ctx.bezierCurveTo(ox + 1050 * sx, oy + 1450 * sy, ox + 1900 * sx, oy + 1830 * sy, ox + 2550 * sx, oy + 1820 * sy);
    ctx.moveTo(ox + 2550 * sx, oy + 1820 * sy);
    ctx.bezierCurveTo(ox + 3500 * sx, oy + 1750 * sy, ox + 4080 * sx, oy + 1960 * sy, ox + 2550 * sx, oy + 3020 * sy);
    ctx.stroke();
    ctx.restore();
  }

  mapDot(ctx, x, y, color, radius, label) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    if (label) {
      ctx.fillStyle = '#edf8ff';
      ctx.font = '12px system-ui';
      ctx.fillText(label, x + radius + 6, y + 4);
    }
    ctx.restore();
  }
}

class Game {
  constructor() {
    this.canvas = $('#game');
    this.ctx = this.canvas.getContext('2d');
    this.settings = Object.assign({ quality: 'Hoch', particles: 'Hoch', weatherFx: true, seasonFx: true, shake: true, cameraSmooth: 12, uiScale: 100, master: 80, music: 45, effects: 78, ambience: 55, uiSounds: true, difficulty: 'Normal', autoSave: true, tutorialHints: true, interactionHelp: true }, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'));
    this.audio = new AudioSystem(this);
    this.input = new Input(this);
    this.player = new Player(this);
    this.world = new World(this);
    this.particles = new ParticleSystem(this);
    this.season = new SeasonSystem();
    this.weather = new WeatherSystem(this);
    this.quest = new QuestSystem(this);
    this.tutorial = new TutorialSystem(this);
    this.dialogue = new DialogueSystem(this);
    this.save = new SaveSystem(this);
    this.ui = new UI(this);
    this.camera = { x: 0, y: 0, shake: 0 };
    this.state = 'menu';
    this.previousState = 'play';
    this.previousTime = 0;
    this.hint = 'Beginne eine neue Reise.';
    this.endings = [];
    this.tutorialDone = false;
    this.introText = '';
    window.addEventListener('resize', () => this.resize());
    this.resize();
    this.ui.render();
    requestAnimationFrame((time) => this.loop(time));
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(innerWidth * dpr);
    this.canvas.height = Math.floor(innerHeight * dpr);
    this.canvas.style.width = `${innerWidth}px`;
    this.canvas.style.height = `${innerHeight}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  newGame() {
    this.player = new Player(this);
    this.world = new World(this);
    this.quest = new QuestSystem(this);
    this.tutorial = new TutorialSystem(this);
    this.dialogue.close();
    this.tutorialDone = false;
    this.state = 'play';
    this.hint = 'Folge dem Licht. Mara wartet im Silberhain.';
    this.tutorial.active = false;
    this.audio.play('intro');
    this.showIntro();
    this.ui.render();
  }

  showIntro() {
    const lines = ['Das Tal atmete nicht mehr.<br>Nur unter der Erde sang etwas weiter.', 'Ein Kern aus Licht schlägt in deiner Hand.', 'Mara wartet am Bruch des ersten Morgens.'];
    let index = 0;
    this.introText = lines[index];
    this.ui.render();
    const timer = setInterval(() => {
      index += 1;
      if (index >= lines.length) {
        clearInterval(timer);
        this.introText = '';
        this.tutorial.active = true;
        this.tutorial.next();
      } else {
        this.introText = lines[index];
      }
      this.ui.render();
    }, 1900);
  }

  continueGame() {
    if (!this.save.load()) return this.newGame();
    this.state = 'play';
    this.ui.panel = null;
    this.toast('Savegame geladen');
    this.ui.render();
  }

  loop(time) {
    const dt = Math.min(0.033, (time - this.previousTime) / 1000 || 0.016);
    this.previousTime = time;
    if (this.state === 'play') this.update(dt);
    this.draw(time / 1000);
    requestAnimationFrame((next) => this.loop(next));
  }

  update(dt) {
    this.player.update(dt);
    this.world.update(dt);
    this.particles.update(dt);
    this.season.update(dt);
    this.weather.update(dt);
    this.tutorial.update(dt);
    const smooth = this.settings.cameraSmooth;
    this.camera.x += (this.player.x - innerWidth / 2 - this.camera.x) * dt * smooth;
    this.camera.y += (this.player.y - innerHeight / 2 - this.camera.y) * dt * smooth;
    this.camera.x = clamp(this.camera.x, 0, WORLD.width - innerWidth);
    this.camera.y = clamp(this.camera.y, 0, WORLD.height - innerHeight);
    this.camera.shake = Math.max(0, this.camera.shake - dt * 12);
    this.collect();
    this.spawnAmbient(dt);
    if (this.player.x > 1500 && this.player.y < 900 && this.tutorial.step.key === 'done') this.tutorial.finish();
  }

  spawnAmbient(dt) {
    const rate = { Niedrig: 1.5, Mittel: 3, Hoch: 5 }[this.settings.particles] || 3;
    if (Math.random() < dt * rate) {
      const seasonColor = { Frühling: '#ffd5f0', Sommer: '#ffe0a0', Herbst: '#ff9e65', Winter: '#e8f6ff' }[this.season.name];
      this.particles.emit(this.player.x + random(-460, 460), this.player.y + random(-330, 330), this.weather.type === 'Echo-Sturm' ? '#b482ff' : seasonColor, 1, { rMin: 1.2, rMax: 3.4, lifeMin: 1, lifeMax: 2.4, vyMin: -12, vyMax: 26 });
    }
  }

  draw(time) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    this.drawParallax(ctx, time);
    ctx.save();
    const shakeX = this.settings.shake ? random(-this.camera.shake, this.camera.shake) : 0;
    const shakeY = this.settings.shake ? random(-this.camera.shake, this.camera.shake) : 0;
    ctx.translate(-this.camera.x + shakeX, -this.camera.y + shakeY);
    this.drawWorld(ctx, time);
    ctx.restore();
    this.drawAtmosphere(ctx, time);
    if (this.state !== 'menu' && Math.floor(time * 5) % 3 === 0) this.ui.render();
  }

  drawParallax(ctx, time) {
    const gradient = ctx.createLinearGradient(0, 0, 0, innerHeight);
    gradient.addColorStop(0, '#081520');
    gradient.addColorStop(1, '#04080d');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, innerWidth, innerHeight);
    ctx.fillStyle = 'rgba(125,247,255,.035)';
    for (let i = 0; i < 10; i += 1) {
      ctx.beginPath();
      ctx.ellipse((i * 240 - this.camera.x * 0.05 + Math.sin(time + i) * 30) % (innerWidth + 240), 80 + i * 63, 180, 24, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawWorld(ctx, time) {
    DATA.regions.forEach((region) => this.drawGround(ctx, region, time));
    const visible = this.world.visibleObjects(this.camera);
    this.drawOrganicPaths(ctx);
    visible.water.forEach((water) => this.drawWater(ctx, water, time));
    visible.ruins.forEach((ruin) => this.drawRuin(ctx, ruin, time));
    visible.collectibles.forEach((item) => this.drawCollectible(ctx, item, time));
    visible.switches.forEach((sw) => this.drawSwitch(ctx, sw, time));
    visible.checkpoints.forEach((checkpoint) => this.drawCheckpoint(ctx, checkpoint, time));
    [...visible.objects, ...visible.npcs, ...visible.enemies, this.player, ...visible.critters].sort((a, b) => a.y - b.y).forEach((entity) => this.drawEntity(ctx, entity, time));
    this.drawTargetMarker(ctx, time);
    this.particles.items.forEach((particle) => this.drawParticle(ctx, particle));
  }

  drawGround(ctx, region, time) {
    const season = this.settings.seasonFx ? this.season.name : 'Frühling';
    const tint = { Frühling: '#2d5c44', Sommer: '#3b5235', Herbst: '#5a3e2d', Winter: '#526475' }[season];
    const gradient = ctx.createLinearGradient(region.x, region.y, region.x + region.w, region.y + region.h);
    gradient.addColorStop(0, region.color);
    gradient.addColorStop(1, tint);
    ctx.fillStyle = gradient;
    ctx.fillRect(region.x, region.y, region.w, region.h);
    const density = this.settings.quality === 'Niedrig' ? 55 : this.settings.quality === 'Mittel' ? 90 : 135;
    for (let i = 0; i < density; i += 1) {
      const x = region.x + ((i * 137 + region.x * 0.13) % region.w);
      const y = region.y + ((i * 251 + region.y * 0.17) % region.h);
      ctx.globalAlpha = 0.08;
      ctx.strokeStyle = i % 3 === 0 ? region.accent : '#0b1711';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.sin(time + i) * 7, y + 10);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  drawOrganicPaths(ctx) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(33, 25, 18, .34)';
    ctx.lineWidth = 76;
    this.pathShape(ctx);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(223, 210, 174, .18)';
    ctx.lineWidth = 48;
    this.pathShape(ctx);
    ctx.stroke();
    ctx.restore();
  }

  pathShape(ctx) {
    ctx.beginPath();
    ctx.moveTo(530, 560);
    ctx.bezierCurveTo(1450, 500, 2450, 790, 3890, 700);
    ctx.moveTo(760, 590);
    ctx.bezierCurveTo(1050, 1450, 1900, 1830, 2550, 1820);
    ctx.moveTo(2550, 1820);
    ctx.bezierCurveTo(3500, 1750, 4080, 1960, 2550, 3020);
  }

  drawWater(ctx, water, time) {
    const gradient = ctx.createLinearGradient(water.x, water.y, water.x, water.y + water.h);
    gradient.addColorStop(0, 'rgba(69, 169, 185, .5)');
    gradient.addColorStop(1, 'rgba(17, 76, 84, .72)');
    ctx.fillStyle = gradient;
    this.roundRect(ctx, water.x, water.y, water.w, water.h, 42);
    ctx.fill();
    ctx.strokeStyle = 'rgba(180, 250, 255, .32)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i += 1) {
      ctx.beginPath();
      const y = water.y + 28 + i * 28;
      ctx.moveTo(water.x + 24, y);
      for (let x = water.x + 24; x < water.x + water.w - 24; x += 42) ctx.lineTo(x, y + Math.sin(time * 2 + x * 0.015 + i) * 8);
      ctx.stroke();
    }
  }

  drawRuin(ctx, ruin, time) {
    ctx.save();
    ctx.translate(ruin.x, ruin.y);
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    this.roundRect(ctx, 12, ruin.h - 18, ruin.w - 24, 28, 18);
    ctx.fill();
    ctx.fillStyle = ruin.type === 'relay' ? '#2b3e4b' : '#4a4b4c';
    this.roundRect(ctx, 0, 0, ruin.w, ruin.h, 18);
    ctx.fill();
    ctx.strokeStyle = ruin.type === 'relay' || ruin.type === 'citadel' ? 'rgba(125,247,255,.68)' : 'rgba(255,255,255,.18)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.moveTo(28, 28 + i * 58);
      ctx.lineTo(ruin.w - 28, 42 + i * 46 + Math.sin(time + i) * 4);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawEntity(ctx, entity, time) {
    if (entity === this.player) return this.drawPlayer(ctx, time);
    if (entity.name) return this.drawNpc(ctx, entity, time);
    if (entity.type && entity.hp !== undefined) return this.drawEnemy(ctx, entity, time);
    if (entity.type) return this.drawObject(ctx, entity, time);
    return this.drawCritter(ctx, entity, time);
  }

  drawObject(ctx, object, time) {
    this.shadow(ctx, object.x, object.y + object.radius * 0.35, object.radius * 0.9, object.radius * 0.26);
    if (object.type === 'tree') {
      const season = this.settings.seasonFx ? this.season.name : 'Frühling';
      const foliage = { Frühling: '#2f6b4a', Sommer: '#365f38', Herbst: '#8a5133', Winter: '#dbe8ef' }[season];
      ctx.fillStyle = '#2a2019';
      this.roundRect(ctx, object.x - 6, object.y - 5, 12, 42, 6);
      ctx.fill();
      for (let i = 0; i < 4; i += 1) {
        ctx.fillStyle = i === 0 ? foliage : 'rgba(20,50,35,.78)';
        ctx.beginPath();
        ctx.ellipse(object.x + Math.sin(time + object.phase + i) * 5 + (i - 1.5) * 9, object.y - 24 - i * 7, object.radius * (0.72 - i * 0.06), object.radius * (0.9 - i * 0.07), i * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (object.type === 'machine') {
      ctx.fillStyle = '#2c3d43';
      this.roundRect(ctx, object.x - object.radius, object.y - object.radius * 0.7, object.radius * 2, object.radius * 1.35, 12);
      ctx.fill();
      this.glow(ctx, object.x, object.y, '#7df7ff', object.radius * 0.62, 0.5 + Math.sin(time * 3 + object.phase) * 0.2);
    } else {
      const gradient = ctx.createLinearGradient(object.x - object.radius, object.y - object.radius, object.x + object.radius, object.y + object.radius);
      gradient.addColorStop(0, '#87909a');
      gradient.addColorStop(1, '#3d4148');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(object.x, object.y, object.radius * 0.95, object.radius * 0.62, object.phase, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.16)';
      ctx.stroke();
    }
  }

  drawNpc(ctx, npc, time) {
    this.shadow(ctx, npc.x, npc.y + 18, 24, 8);
    const bob = Math.sin(time * 2 + npc.phase) * 2;
    ctx.fillStyle = npc.id === 'mara' ? '#d9ccff' : npc.id === 'korrin' ? '#ffbd8a' : '#b9e7ff';
    ctx.beginPath();
    ctx.ellipse(npc.x, npc.y + bob, 16, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f6fbff';
    ctx.font = '12px system-ui';
    ctx.fillText(npc.name, npc.x - 28, npc.y - 32);
  }

  drawEnemy(ctx, enemy, time) {
    this.shadow(ctx, enemy.x, enemy.y + 17, enemy.radius, 9);
    ctx.fillStyle = enemy.hitFlash > 0 ? '#ffd8df' : enemy.type === 'Rostwächter' ? '#9d7053' : enemy.type === 'Relay-Drohne' ? '#75a7b8' : '#2a2232';
    ctx.beginPath();
    ctx.ellipse(enemy.x, enemy.y + Math.sin(time * 5) * 2, enemy.radius, enemy.radius * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
    this.glow(ctx, enemy.x, enemy.y, '#ff6d86', enemy.radius * 0.4, 0.16);
    ctx.fillStyle = 'rgba(0,0,0,.5)';
    ctx.fillRect(enemy.x - 20, enemy.y - enemy.radius - 15, 40, 4);
    ctx.fillStyle = '#ff6d86';
    ctx.fillRect(enemy.x - 20, enemy.y - enemy.radius - 15, 40 * (enemy.hp / enemy.maxHp), 4);
  }

  drawPlayer(ctx, time) {
    const player = this.player;
    this.shadow(ctx, player.x, player.y + 18, 24, 8);
    if (player.dodgeTime > 0) {
      ctx.strokeStyle = 'rgba(125,247,255,.45)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(player.x - player.facing.x * 60, player.y - player.facing.y * 60);
      ctx.lineTo(player.x, player.y);
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(player.x, player.y + Math.sin(time * 7) * 1.2);
    ctx.fillStyle = '#eaf8ff';
    ctx.shadowColor = '#7df7ff';
    ctx.shadowBlur = player.dodgeTime > 0 ? 34 : 14;
    ctx.beginPath();
    ctx.ellipse(0, 0, 17, 21, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#63f7ff';
    ctx.beginPath();
    ctx.arc(7, -4, 6 + Math.sin(time * 5) * 1.4, 0, Math.PI * 2);
    ctx.fill();
    if (player.attackTime > 0) {
      ctx.strokeStyle = 'rgba(125,247,255,.72)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(player.facing.x * 26, player.facing.y * 26, 32 * (1 - player.attackTime), -0.7, 0.7);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawCritter(ctx, critter, time) {
    this.glow(ctx, critter.x, critter.y + Math.sin(time * 2 + critter.phase) * 6, '#c8fff7', 4, 0.6);
  }

  drawCollectible(ctx, item, time) {
    const color = item.kind === 'fragment' ? '#7df7ff' : item.kind === 'note' ? '#ffd48a' : '#c69bff';
    this.glow(ctx, item.x, item.y, color, item.radius * (1.1 + Math.sin(time * 3) * 0.12), 0.72);
  }

  drawSwitch(ctx, sw, time) { this.glow(ctx, sw.x, sw.y, sw.on ? '#8dffc2' : '#65717a', sw.radius, sw.on ? 0.7 : 0.36 + Math.sin(time * 4) * 0.1); }
  drawCheckpoint(ctx, checkpoint, time) {
    this.glow(ctx, checkpoint.x, checkpoint.y, checkpoint.active ? '#7df7ff' : '#66717b', checkpoint.radius * 1.2, checkpoint.active ? 0.88 : 0.32);
    ctx.fillStyle = '#e8fbff';
    this.roundRect(ctx, checkpoint.x - 7, checkpoint.y - 42, 14, 62, 7);
    ctx.fill();
  }

  drawTargetMarker(ctx, time) {
    const target = this.currentTarget();
    if (!target) return;
    ctx.save();
    ctx.strokeStyle = '#ffd48a';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#ffd48a';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(target.x, target.y, 34 + Math.sin(time * 4) * 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawParticle(ctx, particle) {
    ctx.save();
    ctx.globalAlpha = clamp(particle.life, 0, 1);
    if (particle.glow) {
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 12;
    }
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawAtmosphere(ctx, time) {
    const season = this.settings.seasonFx ? this.season.name : 'Frühling';
    const day = this.season.dayPhase;
    ctx.fillStyle = { Frühling: 'rgba(130,255,210,.035)', Sommer: 'rgba(255,205,110,.075)', Herbst: 'rgba(255,128,60,.09)', Winter: 'rgba(190,225,255,.13)' }[season];
    ctx.fillRect(0, 0, innerWidth, innerHeight);
    if (day === 'Nacht') {
      ctx.fillStyle = 'rgba(0,8,20,.42)';
      ctx.fillRect(0, 0, innerWidth, innerHeight);
    }
    if (!this.settings.weatherFx) return;
    if (this.weather.type === 'Nebel' || this.weather.type === 'Echo-Sturm') {
      ctx.fillStyle = this.weather.type === 'Echo-Sturm' ? 'rgba(133,80,255,.16)' : 'rgba(225,245,245,.13)';
      for (let i = 0; i < 7; i += 1) ctx.fillRect(Math.sin(time * 0.24 + i) * 140 - 100, i * innerHeight / 7, innerWidth + 220, 74);
    }
    if (['Regen', 'Schnee'].includes(this.weather.type)) {
      const amount = this.settings.particles === 'Hoch' ? 120 : this.settings.particles === 'Mittel' ? 80 : 42;
      ctx.strokeStyle = this.weather.type === 'Schnee' ? 'rgba(255,255,255,.72)' : 'rgba(155,210,255,.45)';
      for (let i = 0; i < amount; i += 1) {
        const x = (i * 83 + time * 170) % innerWidth;
        const y = (i * 47 + time * 310) % innerHeight;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (this.weather.type === 'Schnee' ? 3 : 12), y + (this.weather.type === 'Schnee' ? 5 : 20));
        ctx.stroke();
      }
    }
  }

  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
  }

  shadow(ctx, x, y, rx, ry) {
    ctx.fillStyle = 'rgba(0,0,0,.31)';
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  glow(ctx, x, y, color, radius, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 2.3);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius * 2.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  currentTarget() {
    if (this.tutorial.active && !this.tutorialDone && this.settings.tutorialHints) return this.tutorial.step.target;
    const targets = [
      { x: 670, y: 520 }, { x: 820, y: 610 }, { x: 980, y: 610 }, { x: 760, y: 565 }, { x: 1530, y: 600 },
      { x: 2440, y: 1710 }, { x: 2500, y: 1830 }, { x: 3900, y: 720 }, { x: 2550, y: 2940 }
    ];
    return targets[Math.min(this.quest.main, targets.length - 1)];
  }

  nearestInteractive(range = 90) {
    const candidates = [...this.world.npcs, ...this.world.checkpoints, ...this.world.switches];
    return candidates.filter((item) => distance(item, this.player) < range).sort((a, b) => distance(a, this.player) - distance(b, this.player))[0];
  }

  interact() {
    const item = this.nearestInteractive(92);
    if (!item) return this.feedbackBlocked();
    if (item.name && item.id) return this.dialogue.open(item);
    if (item.id?.startsWith('cp')) {
      item.active = true;
      this.player.hp = 100;
      this.particles.emit(item.x, item.y, '#7df7ff', 56, { rMin: 2, rMax: 7, lifeMin: 0.45, lifeMax: 1.4 });
      this.audio.play('checkpoint');
      this.toast(`Signalstein aktiviert: ${item.name}`);
      this.tutorial.complete('checkpoint');
      this.save.save();
      return;
    }
    if ('order' in item) {
      item.on = true;
      this.audio.play('echo');
      this.particles.emit(item.x, item.y, '#8dffc2', 34);
      this.toast(`Energiepfad ${item.order + 1} stabilisiert`);
      this.tutorial.complete('bridge');
    }
  }

  collect() {
    [...this.world.collectibles, ...this.world.notes, ...this.world.relics].forEach((item) => {
      if (item.taken || distance(item, this.player) > 42) return;
      item.taken = true;
      if (item.kind === 'fragment') this.player.fragments += 1;
      else this.player.inventory.push(item.text || item.id);
      this.audio.play('complete');
      this.particles.emit(item.x, item.y, '#7df7ff', 32);
      this.toast(item.kind === 'fragment' ? 'Echo-Fragment gesammelt' : 'Lore gefunden');
      if (item.tutorial) this.tutorial.complete('fragment');
      this.save.auto();
    });
  }

  useEcho() {
    if (this.state !== 'play') return;
    if (this.player.echo < 18) return this.feedbackBlocked();
    this.player.echo -= 18;
    this.audio.play('echo');
    this.shake(2);
    this.particles.emit(this.player.x, this.player.y, '#bda0ff', 62, { rMin: 2, rMax: 7, lifeMin: 0.35, lifeMax: 1.1 });
    this.tutorial.complete('echo');
    this.world.enemies.forEach((enemy) => {
      if (enemy.hp > 0 && distance(enemy, this.player) < 126) {
        enemy.stun = 2.2;
        enemy.hitFlash = 0.22;
      }
    });
  }

  attack() {
    if (this.state !== 'play' || this.player.attackTime > 0) return;
    this.player.attackTime = 0.32;
    this.audio.play('hit');
    let hit = false;
    this.world.enemies.forEach((enemy) => {
      if (enemy.hp <= 0 || distance(enemy, this.player) > 78) return;
      enemy.hp -= 30;
      enemy.stun = 0.5;
      enemy.hitFlash = 0.18;
      hit = true;
      this.particles.emit(enemy.x, enemy.y, '#ff6d86', 18);
      if (enemy.hp <= 0) {
        this.player.echo = clamp(this.player.echo + 16, 0, 100);
        if (enemy.tutorial) this.tutorial.complete('combat');
      }
    });
    if (hit) this.shake(3.5);
  }

  openPanel(panel) {
    if (this.state === 'menu') {
      this.previousState = 'menu';
      this.ui.panel = panel;
      this.state = 'pause';
    } else {
      this.previousState = this.state === 'pause' ? 'play' : this.state;
      this.state = 'pause';
      this.ui.panel = panel;
    }
    this.audio.play('ui');
    this.ui.render();
  }

  closePanel() {
    this.ui.panel = null;
    this.state = this.previousState === 'menu' ? 'menu' : 'play';
    this.previousState = 'play';
    this.ui.render();
  }

  togglePanel(panel) {
    if (this.ui.panel === panel) this.closePanel();
    else this.openPanel(panel);
    if (panel === 'map') this.tutorial.complete('map');
    if (panel === 'quests') this.tutorial.complete('questlog');
  }

  togglePause() {
    if (this.state === 'menu') return;
    if (this.ui.panel) return this.closePanel();
    this.openPanel('settings');
  }

  loadCheckpoint() {
    const checkpoint = [...this.world.checkpoints].reverse().find((cp) => cp.active) || this.world.checkpoints[0];
    this.player.x = checkpoint.x;
    this.player.y = checkpoint.y;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.hp = 100;
    this.state = 'play';
    this.ui.panel = null;
    this.toast('Checkpoint geladen');
    this.ui.render();
  }

  respawn() {
    this.toast('Du zerfällst in Echo — und kehrst zurück.');
    this.loadCheckpoint();
  }

  feedbackBlocked() {
    this.audio.play('error');
    this.toast('Nicht möglich');
  }

  shake(amount) { this.camera.shake = this.settings.shake ? Math.max(this.camera.shake, amount) : 0; }

  end(kind) {
    const stats = this.player.stats;
    if (kind === 'heal' && stats.compassion + stats.trust < 2) kind = 'dark';
    if (kind === 'control' && stats.control < 1) kind = 'sacrifice';
    this.endings = [...new Set([...this.endings, kind])];
    this.save.save();
    const ending = DATA.endings[kind];
    this.state = 'pause';
    this.ui.panel = null;
    this.ui.app.innerHTML = `<div class="screen cinema"><div class="menu glass"><div class="kicker">Finale freigeschaltet</div><h1>${ending[0]}</h1><p class="subtitle">${ending[1]}</p><button class="btn primary" data-action="continue">Weiter erkunden</button><button class="btn" data-action="new">Neues Spiel</button></div></div>`;
    this.ui.bind();
    this.audio.play('end');
  }

  toast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }
}

window.addEventListener('DOMContentLoaded', () => new Game());
