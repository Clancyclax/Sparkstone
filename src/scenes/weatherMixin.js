// ============================================================================
// ROUND 357 -- WEATHER, the scene's half. The data (the ten kinds, each region's climate, the schedule and the
// effect numbers) is src/data/weather.js; this draws it and applies it.
//
//   _updateWeather(dt)      every frame, after the day/night: which weather this region has now, blowing in and out
//                           over WEATHER_FADE_S; the sky tint, the falling particles, the lightning, the eruption's rock,
//                           the sounds, and the HUD chip beside the clock.
//   _weatherEffectsNow()    the live multipliers (src/data/weather.js `weatherEffects`), with the player's Weather
//                           Magical Theory folded in as `attune`.
//   _weatherMoveMult()      read by the movement code.
//   _weatherElementMult(el) read by _damageMonster.
//   _weatherRangedMult()    read where the player's shots and bolts get their flight time.
//   _weatherSightMult()     read where a monster's sight (aggro) range is worked out.
//
// Indoors (any room but an astral realm), in the soul space or with the world map up the weather is not seen or felt;
// rain outside is still heard indoors (ROUND 369). An astral realm has its region's weather.
// ============================================================================
import { WEATHER, weatherFor, weatherSlot, weatherSlotAt, WEATHER_SLOT_VERSION, weatherEffects, weatherElementMult, WEATHER_FADE_S } from '../data/weather.js';
import { isoProject, TILE, isoDepth } from '../data/iso.js';
import { weatherBedFor } from '../data/audio.js';
import { REALM_LIST } from '../data/astral.js';   // ROUND 369 -- an astral realm's sky is its region's

const WX_MAX_PARTICLES = 420;
const WX_INDOOR_RAIN = 0.35;   // ROUND 369 -- how loud rain outside is from inside (of its outdoor volume)
// Fall speed (screen px/s at full strength) and the particle texture per kind of fall.
// ROUND 393 -- `art`: round 391's particle art (public/assets/weather/, loaded by windSwayMixin.js `_windArtPreload`),
// used when it is loaded; `tex`, the drawn one below, is the fallback. `size`: the art's scale range per particle.
// The leaves are a sheet (four leaves, a row each, four tumble frames across) and tumble through it as they blow.
const FALL = {
  rain:  { tex: 'wx_rain',  art: 'wxa_rain',  size: [0.9, 1.15], vy: 1300, vx: 640, spin: 0, alpha: 0.75 },
  snow:  { tex: 'wx_snow',  art: 'wxa_snow',  size: [0.7, 1.35], vy: 75,  vx: 260, spin: 0.6, alpha: 0.9 },
  ash:   { tex: 'wx_ash',   art: 'wxa_ash',   size: [0.7, 1.2], vy: 55,  vx: 220, spin: 1.5, alpha: 0.8 },
  ember: { tex: 'wx_ember', art: 'wxa_ember', size: [0.7, 1.2], vy: 140, vx: 160, spin: 0, alpha: 0.9 },
  leaf:  { tex: 'wx_leaf',  art: 'wxa_leaves', sheet: { rows: 4, cols: 4 }, size: [1.0, 1.6], vy: 70,  vx: 520, spin: 1.2, alpha: 0.9 },
  sand:  { tex: 'wx_sand2', vy: 110, vx: 1500, spin: 0, alpha: 0.8 },   // ROUND 360 -- streaks of blown sand
};

/** ROUND 404 -- the chip's sign and name: fair weather at night is "Clear skies" under a star. */
export function weatherLabelFor(def, night) {
  if (!def) return { icon: '', name: '' };
  if (night && def.id === 'sunny') return { icon: '\u2726', name: 'Clear skies' };
  return { icon: def.icon, name: def.name };
}

export const WeatherMixin = {
  /** The weather this region has now (before fading). ROUND 369 -- asked whether the player is under a roof or not:
   *  the sky over the building goes on raining while they are inside it, so stepping back out finds it raining at
   *  once instead of the storm blowing in again. An astral realm has its own sky: its region's. */
  _weatherTarget() {
    const room = this._insideRoom;
    let regionId = this.currentRegion && this.currentRegion.id;
    if (room && room.astral && room.realm) {
      const spec = REALM_LIST.find(r => r.id === room.realm);
      if (spec && spec.region) regionId = spec.region;
    }
    if (!regionId) return null;
    const slot = weatherSlotAt(this._clockT || 0);   // ROUND 369 -- spells of 10-20 real minutes
    let ov = this.player && this.player.weatherOverride && this.player.weatherOverride[regionId];
    if (ov && ov.v !== WEATHER_SLOT_VERSION) ov = null;   // called under the old six-hour slots: read as over
    return weatherFor(regionId, slot, ov ? { id: ov.id, untilSlot: ov.untilSlot } : null);
  },

  /** ROUND 369 -- "Weather is an outdoor, or astral space phenomenon. Not indoor." Is the weather here to see and feel?
   *  Outdoors and in an astral realm (`astral: true` rooms) yes; under any other roof, in the soul space, or with the
   *  world map up, no. (Before this round: this._insideRoom || this._soulSpace || this._overworldOpen meant no
   *  weather at all, astral realms included.) */
  _weatherShown() {
    if (this._soulSpace || this._overworldOpen) return false;
    return !(this._insideRoom && !this._insideRoom.astral);
  },

  /** ROUND 369 (3.1) -- "still hearing rain when going inside a building during a rainstorm outside": indoors, rain
   *  outside is heard, quieter, through the roof. Nothing else of the weather comes in. */
  _weatherHeardIndoors(def) {
    return !!(def && def.fall === 'rain' && this._insideRoom && !this._insideRoom.astral && !this._soulSpace);
  },

  /** 0..1: how attuned the player is to the weather (Weather Magical Theory and its rank). See ritualTheory.js. */
  _weatherAttune() {
    return this._theoryPerk ? (this._theoryPerk('weather', 'attune') || 0) : 0;
  },

  _weatherEffectsNow() {
    const w = this._wx;
    if (!w || !w.id || w.s <= 0 || w.shown === false) return null;   // ROUND 369 -- none of it indoors
    return weatherEffects(w.id, w.s, this._weatherAttune());
  },
  _weatherMoveMult() { const e = this._weatherEffectsNow(); return e ? e.move : 1; },
  _weatherRangedMult() { const e = this._weatherEffectsNow(); return e ? e.ranged : 1; },
  _weatherSightMult() { const e = this._weatherEffectsNow(); return e ? e.sight : 1; },
  _weatherElementMult(el) { return weatherElementMult(this._weatherEffectsNow(), el); },

  _ensureWeatherTextures() {
    if (!this.textures.exists('wx_sand2')) {
      // ROUND 360 -- the sandstorm's streaks, and its drifting dust (a tile of soft tan clouds)
      const mk2 = (key, w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); this.textures.addCanvas(key, c); };
      mk2('wx_sand2', 44, 4, (g, w, h) => {
        const gr = g.createLinearGradient(0, 0, w, 0);
        gr.addColorStop(0, 'rgba(214,176,112,0)'); gr.addColorStop(0.6, 'rgba(226,192,128,0.75)'); gr.addColorStop(1, 'rgba(240,214,160,1)');
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
      });
      mk2('wx_dust2', 512, 512, (g, W) => {
        let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        for (let i = 0; i < 26; i++) {
          const x = rnd() * W, y = rnd() * W, r = 40 + rnd() * 120;
          for (const ox of [-W, 0, W]) for (const oy of [-W, 0, W]) {
            const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
            gr.addColorStop(0, 'rgba(205,165,100,0.8)'); gr.addColorStop(1, 'rgba(205,165,100,0)');
            g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
          }
        }
      });
    }
    if (this.textures.exists('wx_rain')) return;
    const mk = (key, w, h, draw) => {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      draw(c.getContext('2d'), w, h); this.textures.addCanvas(key, c);
    };
    // Sized for the 1920px canvas (a first cut at half this read as nothing on screen).
    mk('wx_rain', 3, 34, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(200,215,235,0)'); gr.addColorStop(0.5, 'rgba(215,228,248,0.7)'); gr.addColorStop(1, 'rgba(235,242,255,1)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
    mk('wx_snow', 9, 9, (g) => { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(4.5, 4.5, 3.6, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(255,255,255,0.4)'; g.beginPath(); g.arc(4.5, 4.5, 4.4, 0, Math.PI * 2); g.fill(); });
    mk('wx_ash', 7, 5, (g) => { g.fillStyle = '#9a928c'; g.fillRect(0, 0, 7, 5); g.fillStyle = '#5c5552'; g.fillRect(2, 1, 3, 3); });
    mk('wx_ember', 6, 6, (g) => { g.fillStyle = '#ff9a2e'; g.fillRect(0, 0, 6, 6); g.fillStyle = '#fff1b0'; g.fillRect(2, 2, 2, 2); });
    mk('wx_leaf', 10, 5, (g) => { g.fillStyle = '#6f8f3a'; g.fillRect(0, 0, 10, 5); g.fillStyle = '#a07a3a'; g.fillRect(7, 0, 3, 5); });
  },

  _updateWeather(dt) {
    const target = this._weatherTarget();
    const w = (this._wx = this._wx || { id: null, s: 0 });
    // Blow out the old weather before the new one blows in.
    const step = dt / WEATHER_FADE_S;
    if (w.id !== target) {
      w.s = Math.max(0, w.s - step);
      if (w.s <= 0) { w.id = target; }
    } else if (w.id) {
      w.s = Math.min(1, w.s + step);
    }
    const def = w.id ? WEATHER[w.id] : null;
    const sky = def ? w.s : 0;
    // ROUND 369 -- what reaches the player: all of it outside or in an astral realm, none of it under a roof (at once:
    // nothing of the rain is left falling through the hall while it fades), except the sound of rain.
    w.shown = this._weatherShown();
    const s = w.shown ? sky : 0;
    const heard = w.shown ? sky : (this._weatherHeardIndoors(def) ? sky * WX_INDOOR_RAIN : 0);
    this._weatherCensus = { id: w.id, target, s: Math.round(s * 100) / 100, sky: Math.round(sky * 100) / 100, shown: w.shown, heard: Math.round(heard * 100) / 100 };
    this._tickWind(def, s, dt);   // ROUND 360 -- the wind field the trees and grass bend in
    this._drawWeatherSky(def, s);
    this._drawWeatherFall(def, s, dt);
    this._tickLightning(def, s, dt);
    this._tickEruption(def, s, dt);
    this._tickWeatherSound(def, heard, dt, w.shown);
    this._weatherChip(def, s);
  },

  _drawWeatherSky(def, s) {
    const cam = this.cameras.main;
    if (!this._wxSky) {
      if (!def || s <= 0) return;
      this._wxSky = this.add.rectangle(0, 0, cam.width, cam.height, 0xffffff, 1).setOrigin(0, 0).setScrollFactor(0).setDepth(899992);
    }
    const sky = this._wxSky;
    if (!def || s <= 0.003) { sky.setVisible(false); return; }
    sky.setSize(cam.width, cam.height);
    sky.setFillStyle(def.sky.color, 1);
    sky.setAlpha(def.sky.alpha * s);
    sky.setVisible(true);
    this._drawWeatherDust(def, s);
  },

  /** ROUND 360 (3.1) -- a sandstorm's dust: clouds of tan blowing across the view, faster than the camera moves. */
  _drawWeatherDust(def, s) {
    const cam = this.cameras.main;
    const want = def && def.dust && s > 0.01;
    if (!want) { if (this._wxDust) this._wxDust.setVisible(false); return; }
    this._ensureWeatherTextures();
    if (!this._wxDust) {
      this._wxDust = this.add.tileSprite(0, 0, cam.width, cam.height, 'wx_dust2').setOrigin(0, 0).setScrollFactor(0).setDepth(899992.5);
    }
    const d = this._wxDust;
    if (d.width !== cam.width || d.height !== cam.height) d.setSize(cam.width, cam.height);
    const t = (this.time.now || 0) / 1000;
    d.tilePositionX = cam.scrollX * 0.6 - t * 420;
    d.tilePositionY = cam.scrollY * 0.6 + Math.sin(t * 0.4) * 30;
    d.setAlpha(def.dust * s * (0.75 + 0.25 * Math.sin(t * 0.9)));
    d.setVisible(true);
  },

  // ---- ROUND 360 (1) -- WIND YOU CAN SEE: gusts rolling across the screen, bending the trees and the grass ----------
  /** The wind now: `k` 0..1 (the weather's wind times its strength; nothing indoors), eased so a gale rises and falls. */
  _tickWind(def, s, dt) {
    const W = this._wind || (this._wind = { t: 0, k: 0, swayed: false });
    W.t += dt || 0;
    const target = (s > 0 && def) ? Math.max(0.06, def.wind) * s : 0;   // ROUND 369 -- s is 0 under a roof
    // ROUND 393 -- and under a roof it is gone at once rather than over a few seconds: a den's trees (they are forest
    // trees too) do not go on blowing about behind the player who has just stepped in out of the gale.
    const shown = !this._wx || this._wx.shown !== false;
    W.k += (target - W.k) * Math.min(1, (dt || 0) * (shown ? 0.6 : 6));
    // ROUND 393 -- "Heavy wind needs to blow the trees flags, banners, not just the grass": every tree, bush, flag,
    // banner, pennant, laundry line and hanging sign near the camera bends and ripples (windSwayMixin.js). Round 360's
    // rigid rotation of the forest trees alone stays as the fallback.
    if (this._windSwayTick) this._windSwayTick(dt); else this._swayTrees();
  },

  /** A gust at an iso point: bands of wind travelling across the world (to the screen's right, the way the rain leans),
   *  each swelling and dying as it goes. 0..1. */
  _gustAt(ix, iy) {
    const W = this._wind;
    if (!W || W.k < 0.02) return 0;
    const ph = ((ix * 0.9 + iy * 0.35) / 560) * Math.PI * 2 - W.t * 1.3;
    const band = Math.max(0, Math.sin(ph));
    const mod = 0.55 + 0.45 * Math.sin(W.t * 0.31 + iy / 420 + ix / 900);
    return band * band * band * mod;
  },

  /** How far a thing of `give` (a tree ~1, a grass tuft ~4) leans at an iso point, in radians. */
  _windLean(ix, iy, give = 1, ph = 0) {
    const W = this._wind;
    if (!W || W.k < 0.02) return 0;
    const g = this._gustAt(ix, iy);
    return W.k * give * (0.012 + 0.055 * g + 0.008 * Math.sin(W.t * (1.4 + Math.min(give, 3) * 0.3) + ph));
  },

  _swayTrees() {
    const W = this._wind;
    const tiles = this._treeTiles;
    if (!tiles) return;
    if (!W || W.k < 0.02) {
      if (W && W.swayed) { for (const sp of tiles.values()) if (sp && sp.rotation) sp.setRotation(0); W.swayed = false; }
      return;
    }
    W.swayed = true;
    for (const [id, sp] of tiles) {
      if (!sp || !sp.visible) continue;
      sp.setRotation(this._windLean(sp.x, sp.y, 2.2, id * 0.73));   // a tree bends from the trunk: up to ~8 degrees in a gale's gust
    }
  },

  _drawWeatherFall(def, s, dt) {
    const cam = this.cameras.main;
    const pool = (this._wxParts = this._wxParts || []);
    const kind = def && def.fall && FALL[def.fall];
    const want = kind ? Math.min(WX_MAX_PARTICLES, Math.round(def.count * s)) : 0;
    if (want > 0) this._ensureWeatherTextures();
    const W = cam.width, H = cam.height;
    // The fall drifts with the camera a little, so it reads as in the world rather than painted on the glass.
    const sx = cam.scrollX, sy = cam.scrollY;
    const dsx = (this._wxLastScroll ? sx - this._wxLastScroll.x : 0) * cam.zoom * 0.8;
    const dsy = (this._wxLastScroll ? sy - this._wxLastScroll.y : 0) * cam.zoom * 0.8;
    this._wxLastScroll = { x: sx, y: sy };
    for (let i = 0; i < pool.length; i++) {
      const p = pool[i];
      if (i >= want || !kind) { if (p.img.visible) p.img.setVisible(false); continue; }
      // ROUND 393 -- the art when it is loaded (the drawn texture when it is not), a size per particle, and for the
      // leaves which leaf and where in its tumble.
      const artOn = !!(kind.art && this.textures.exists(kind.art));
      if (p.kind !== def.fall || p.art !== artOn) {
        p.kind = def.fall; p.art = artOn;
        p.row = kind.sheet ? Math.floor(Math.random() * kind.sheet.rows) : 0;
        p.tf = Math.random() * 4;
        p.img.setTexture(artOn ? kind.art : kind.tex, artOn && kind.sheet ? p.row * kind.sheet.cols : undefined);
        p.img.setScale(artOn && kind.size ? kind.size[0] + Math.random() * (kind.size[1] - kind.size[0]) : 1);
        p.img.setBlendMode(def.fall === 'ember' ? 'ADD' : 'NORMAL');   // a pooled ember turned leaf is not lit
        p.x = Math.random() * W; p.y = Math.random() * H;
        p.v = 0.7 + Math.random() * 0.6;
      }
      // ROUND 360 -- and harder inside a gust
      const gust = this._gustAt ? this._gustAt(p.x + sx, p.y + sy) : 0;   // ROUND 393 -- kept: the leaves ride it too
      const lean = def.wind * (1 + 0.8 * gust);
      const vx = kind.vx * lean * p.v + (def.fall === 'snow' || def.fall === 'ash' ? Math.sin((this._lightT || 0) * 1.3 + i) * 18 : 0);
      let vy = kind.vy * p.v;
      // ROUND 393 -- a leaf in a gust is lifted and thrown, not dropped: it bobs, rises on the gust, and tumbles
      // through the sheet's four frames faster the harder it is blown.
      if (def.fall === 'leaf') {
        vy = vy * (1 - 1.3 * gust) + Math.sin((this._wind ? this._wind.t : 0) * 2.3 + i * 1.7) * 60;
        if (p.art && kind.sheet) {
          p.tf += dt * (5 + 10 * lean) * p.v;
          p.img.setFrame(p.row * kind.sheet.cols + (Math.floor(p.tf) % kind.sheet.cols));
        }
      }
      p.x += vx * dt - dsx; p.y += vy * dt - dsy;
      if (p.y > H + 20) { p.y -= H + 40; p.x = Math.random() * (W + 200) - 100; }
      if (p.y < -20) p.y += H + 40;
      if (p.x > W + 40) p.x -= W + 80;
      if (p.x < -40) p.x += W + 80;
      const img = p.img;
      img.setVisible(true);
      img.setPosition(p.x, p.y);
      if (def.fall === 'rain') img.setRotation(-Math.atan2(vx, vy));
      else if (def.fall === 'sand') img.setRotation(Math.atan2(vy, vx));
      else if (kind.spin) img.setRotation((img.rotation || 0) + kind.spin * dt * p.v);
      img.setAlpha(kind.alpha * Math.min(1, s * 1.4));
    }
    while (pool.length < want) {
      const img = this.add.image(0, 0, kind.tex).setScrollFactor(0).setDepth(899991);
      if (def.fall === 'ember') img.setBlendMode('ADD');
      // ROUND 393 -- `kind: null`: dressed (art, size, leaf) by the loop above on the next frame, hidden until then
      img.setVisible(false);
      pool.push({ img, kind: null, x: Math.random() * W, y: Math.random() * H, v: 0.7 + Math.random() * 0.6 });
    }
  },

  /** A thunderstorm's own lightning: a flash, a bolt into the ground near the player, a crack of thunder, and a hit on
   *  anything standing where it lands. */
  _tickLightning(def, s, dt) {
    if (this._wxFlash) {
      this._wxFlash.a = Math.max(0, this._wxFlash.a - dt * 1.8);
      this._wxFlash.r.setAlpha(this._wxFlash.a);
      this._wxFlash.r.setVisible(this._wxFlash.a > 0.01);
    }
    if (this._wxBolt && (this._wxBolt.t -= dt) <= 0) { this._wxBolt.g.destroy(); this._wxBolt = null; }
    if (!def || !def.lightning || s < 0.5) return;
    if (Math.random() > (def.lightning / 60) * dt * s) return;
    this._lightningStrike();
  },

  _lightningStrike(at = null) {
    const cam = this.cameras.main;
    if (!this._wxFlash) {
      const r = this.add.rectangle(0, 0, cam.width, cam.height, 0xf4f7ff, 1).setOrigin(0, 0).setScrollFactor(0).setDepth(900050);
      this._wxFlash = { r, a: 0 };
    }
    this._wxFlash.r.setSize(cam.width, cam.height);
    this._wxFlash.a = 0.6;
    this._wxFlash.r.setAlpha(0.6).setVisible(true);
    const ang = Math.random() * Math.PI * 2, d = (2 + Math.random() * 9) * TILE;
    const wx = at ? at.x : this.world.x + Math.cos(ang) * d, wy = at ? at.y : this.world.y + Math.sin(ang) * d;
    if (this._isWaterAt && this._isWaterAt(wx, wy) && !at) return;
    // ROUND 388 -- "replace storm lightning": the fx3 `skystrike` sheet (a bolt from above that lands in a ground flash),
    // white or yellow, played once on the strike point at about the old bolt's height; the screen flash above stays.
    // The jagged drawn line below is the fallback when the sheet is not loaded.
    const art = this._sheetBurst && this._sheetBurst('skystrike', Math.random() < 0.6 ? 'white' : 'yellow', wx, wy,
      { scale: 2.6, add: true, depth: isoDepth(wx, wy) + 100000, last: 12, fade: 0.25 });
    if (art) {
      if (this._wxBolt) { this._wxBolt.g.destroy(); this._wxBolt = null; }
      this._wxStrikes = (this._wxStrikes || 0) + 1;
    } else {
      const p = isoProject(wx, wy);
      const g = this.add.graphics().setDepth(isoDepth(wx, wy) + 100000);
      g.lineStyle(3, 0xeaf2ff, 1);
      g.beginPath(); g.moveTo(p.x + (Math.random() - 0.5) * 40, p.y - 420);
      let x = p.x, y = p.y - 420;
      for (let i = 0; i < 9; i++) { x = p.x + (Math.random() - 0.5) * (40 - i * 4); y += 420 / 9; g.lineTo(x, y); }
      g.strokePath();
      g.lineStyle(9, 0x9fc4ff, 0.35); g.strokePath();
      if (this._wxBolt) this._wxBolt.g.destroy();
      this._wxBolt = { g, t: 0.22 };
      this._wxStrikes = (this._wxStrikes || 0) + 1;
    }
    // The hit: anything within a tile and a half. Monsters take a share of their health; the player rather less.
    for (const m of (this.monsters || [])) {
      if (!m || !(m.hp > 0)) continue;
      if (Math.hypot(m.wx - wx, m.wy - wy) > TILE * 1.5) continue;
      const dmg = Math.max(1, Math.round((m.maxHp || m.hp) * 0.15));
      if (this._damageMonster) this._damageMonster(m, dmg, false, false, 'lightning');
    }
    if (this.player && Math.hypot(this.world.x - wx, this.world.y - wy) < TILE * 1.2 && this._hurtPlayerRaw) {
      this._hurtPlayerRaw(Math.max(1, Math.round((this.player.maxHp || 100) * 0.08)), 'lightning');
    }
    const dist = Math.hypot(this.world.x - wx, this.world.y - wy) / TILE;
    this.time.delayedCall(Math.min(1500, dist * 60), () => {
      if (this._playSfxKey) this._playSfxKey('sfx_lightning_bolt', Math.max(0.25, 0.8 - dist * 0.04));
    });
  },

  /** A volcanic eruption's falling rock: a glowing mark on the ground, then the impact. */
  _tickEruption(def, s, dt) {
    const marks = (this._wxRocks = this._wxRocks || []);
    for (let i = marks.length - 1; i >= 0; i--) {
      const r = marks[i];
      r.t -= dt;
      const k = 1 - Math.max(0, r.t) / r.t0;
      r.g.clear();
      r.g.fillStyle(0xff6a1a, 0.18 + 0.32 * k);
      r.g.fillEllipse(r.p.x, r.p.y, ERUPT_R * 2 * (0.6 + 0.4 * k), ERUPT_R * (0.6 + 0.4 * k));
      r.g.lineStyle(2, 0xffc060, 0.5 + 0.5 * k);
      r.g.strokeEllipse(r.p.x, r.p.y, ERUPT_R * 2, ERUPT_R);
      if (r.t <= 0) {
        this._rockImpact(r);
        r.g.destroy();
        marks.splice(i, 1);
      }
    }
    if (!def || !def.debris || s < 0.4) return;
    if (Math.random() > (def.debris / 60) * dt * s) return;
    const ang = Math.random() * Math.PI * 2, d = Math.random() * 8 * TILE;
    const wx = this.world.x + Math.cos(ang) * d, wy = this.world.y + Math.sin(ang) * d;
    const p = isoProject(wx, wy);
    const g = this.add.graphics().setDepth(isoDepth(wx, wy) - 2);
    marks.push({ wx, wy, p, g, t: ERUPT_WARN_S, t0: ERUPT_WARN_S });
  },

  _rockImpact(r) {
    this._wxRockHits = (this._wxRockHits || 0) + 1;
    const burst = this.add.graphics().setDepth(isoDepth(r.wx, r.wy) + 100000);
    burst.fillStyle(0xffd27a, 0.9); burst.fillEllipse(r.p.x, r.p.y - 6, ERUPT_R * 1.6, ERUPT_R * 0.9);
    burst.fillStyle(0xff5a10, 0.7); burst.fillEllipse(r.p.x, r.p.y - 4, ERUPT_R * 2.2, ERUPT_R * 1.2);
    this.tweens.add({ targets: burst, alpha: 0, duration: 450, onComplete: () => burst.destroy() });
    for (const m of (this.monsters || [])) {
      if (!m || !(m.hp > 0)) continue;
      if (Math.hypot(m.wx - r.wx, m.wy - r.wy) > ERUPT_HIT) continue;
      const dmg = Math.max(1, Math.round((m.maxHp || m.hp) * 0.2));
      if (this._damageMonster) this._damageMonster(m, dmg, false, false, 'fire');
    }
    if (this.player && Math.hypot(this.world.x - r.wx, this.world.y - r.wy) < ERUPT_HIT && this._hurtPlayerRaw) {
      this._hurtPlayerRaw(Math.max(1, Math.round((this.player.maxHp || 100) * 0.12)), 'fire');
    }
    if (this._playSfxKey) this._playSfxKey('sfx_fire_burst', 0.6);
  },

  /** The weather's bed (the user's rain, heavy rain, thunderstorm and ashfall loops) under everything, faded with the
   *  weather's own strength; a hard wind gusts now and then. */
  _tickWeatherSound(def, s, dt, outside = true) {
    const bed = def && s > 0 ? weatherBedFor(def.id) : null;
    const key = bed ? bed.key : null;
    if (key && this._wxBedKey !== key) {
      if (!this.cache.audio.exists(key)) { if (this._requestAudio) this._requestAudio(key); }
      else {
        if (this._wxBed) { try { this._wxBed.stop(); this._wxBed.destroy(); } catch (e) { /* gone */ } }
        try { this._wxBed = this.sound.add(key, { loop: true, volume: 0 }); this._wxBed.play(); this._wxBedKey = key; } catch (e) { this._wxBed = null; }
      }
    }
    if (this._wxBed) {
      const bus = this._busVolume ? this._busVolume('ambiance') : 1;
      const want = (key === this._wxBedKey ? 0.55 * s : 0) * bus;
      this._wxBed.setVolume(want);
      if (key !== this._wxBedKey && s <= 0.01) {
        try { this._wxBed.stop(); this._wxBed.destroy(); } catch (e) { /* gone */ }
        this._wxBed = null; this._wxBedKey = null;
      }
    }
    if (outside && def && def.wind >= 0.5 && s > 0.5) {
      this._wxGustT = (this._wxGustT ?? (4 + Math.random() * 8)) - dt;
      if (this._wxGustT <= 0) {
        this._wxGustT = 6 + Math.random() * 10;
        if (this._playSfxKey) this._playSfxKey('sfx_fx_gust', 0.35 * s);
      }
    }
  },

  /** Weather's own damage to the player (a lightning strike, a falling rock): the element's resistance counts, it says
   *  so on screen, and the hurt voice plays -- the lava burn's pattern. */
  _hurtPlayerRaw(dmg, element) {
    if (!this.player || this.player.hp <= 0) return 0;
    const resist = Math.min(0.8, ((this.player.passiveMods || {}).resistBonus || {})[element] || 0);
    const d = Math.max(1, Math.round(dmg * (1 - resist)));
    this.player.hp = Math.max(0, this.player.hp - d);
    if (this._floatText) this._floatText(this.world.x, this.world.y - 30, (element === 'fire' ? 'Falling rock' : 'Lightning') + ` \u2014 ${d}`, element === 'fire' ? '#ff7043' : '#cfe3ff');
    if (this._playPlayerVoice) this._playPlayerVoice('hurt');
    return d;
  },

  /** The chip beside the clock: the weather's sign and name, its effects on hover. */
  _weatherChip(def, s) {
    const wrap = typeof document !== 'undefined' && document.getElementById('clockWrap');
    if (!wrap) return;
    let chip = document.getElementById('weatherChip');
    if (!chip) {
      chip = document.createElement('span');
      chip.id = 'weatherChip';
      chip.style.cssText = 'margin-left:10px;font-size:0.82em;opacity:0.92;white-space:nowrap;';
      wrap.appendChild(chip);
    }
    // ROUND 404 -- "Instead of sunny at night it should say 'clear skies'": at night (the clock's 22:00-05:00) the fair
    // weather is Clear skies, with a star, not a sun
    const h = this._gameHours ?? 8;
    const shown = weatherLabelFor(def, !(h >= 5 && h < 22));
    const label = def && s > 0.15 ? `${shown.icon} ${shown.name}` : '';   // ROUND 359 -- not shown indoors (ROUND 369: s is 0 there)
    if (chip.textContent !== label) {
      chip.textContent = label;
      chip.title = def ? def.blurb : '';
      chip.style.display = label ? '' : 'none';
    }
  },
};

const ERUPT_R = 44;          // the glowing mark's half-width, screen px
const ERUPT_HIT = TILE * 1.6;
const ERUPT_WARN_S = 1.7;    // seconds of warning before the rock lands
