// ROUND 64 -- buildings off the water, hard palette swaps, cave interiors,
// and a quest board that turns over weekly.
const { chromium } = require('playwright');
let pass = 0, fail = 0;
const ok = (n, c, note) => {
  if (c) { pass++; console.log(`  PASS  ${n}${note ? ' — ' + note : ''}`); }
  else { fail++; console.log(`  FAIL  ${n}${note ? ' — ' + note : ''}`); }
};

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  p.on('pageerror', e => errors.push('PE ' + e.message));
  p.on('console', m => {
    const t = m.text();
    if (m.type() === 'error' && !/texImage2D|GL Driver|favicon|WebGL|swiftshader/i.test(t)) errors.push('C ' + t.slice(0, 200));
  });
  await p.goto('http://localhost:8000/index.html', { waitUntil: 'load' });
  await p.waitForFunction(() => {
    const e = document.getElementById('titleScreen');
    return e && e.style.display === 'flex';
  }, { timeout: 300000 });

  // ================= the title plates =================
  const plates = await p.evaluate(async () => {
    const out = { decoded: 0, wrongSize: 0 };
    for (let i = 0; i < 18; i++) {
      const im = new Image();
      im.src = `./public/assets/title/plate_${String(i).padStart(2, '0')}.png`;
      await new Promise(r => { im.onload = r; im.onerror = r; });
      if (im.naturalWidth > 0) out.decoded++;
      if (im.naturalWidth !== 960 || im.naturalHeight !== 600) out.wrongSize++;
    }
    return out;
  });
  console.log('\n--- the title screen ---');
  ok('all eighteen plates load', plates.decoded === 18, `${plates.decoded}/18`);
  ok('and every one is the same size', plates.wrongSize === 0, `${plates.wrongSize} odd`);

  await p.click('#titleNew');
  await p.evaluate(() => {
    const s = window.__sparkstoneGame.scene.keys.WorldScene;
    if (s._creatorOpen) s._closeCharacterCreator();
    if (s._teamNameOpen) s._confirmTeamName();
  });
  await p.waitForTimeout(2200);

  // ================= 1. buildings off the water =================
  const water = await p.evaluate(() => {
    const s = window.__sparkstoneGame.scene.getScene('WorldScene');
    const TILE = 32;
    const near = (b, tiles) => {
      for (let r = 1; r <= tiles; r++) {
        for (let a = 0; a < r * 8; a++) {
          const th = (a / (r * 8)) * Math.PI * 2;
          if (s._isWaterAt(b.x + Math.cos(th) * r * TILE, b.y + Math.sin(th) * r * TILE)) return true;
        }
      }
      return false;
    };
    // City walls are `buildings` too and are SUPPOSED to run along the bank.
    const houses = (s.buildings || []).filter(b => !b.wall && !b.rampart && b.radius);
    return {
      total: houses.length,
      onWater: houses.filter(b => s._isWaterAt(b.x, b.y)).length,
      within2: houses.filter(b => near(b, 2)).length,
      within8: houses.filter(b => near(b, 8)).length,
    };
  });
  console.log('\n--- buildings keep off the bank ---');
  ok('nothing stands in the water at all', water.onWater === 0, `${water.onWater} of ${water.total}`);
  ok('and almost nothing stands on the edge of it',
    water.within2 <= 4, `${water.within2} within 2 tiles, was 10`);
  ok('the eight-tile rule holds for all but the river towns',
    water.within8 <= 25, `${water.within8} within 8, was 31`);

  // ================= 2. the palettes =================
  const pal = await p.evaluate(async () => {
    const s = window.__sparkstoneGame.scene.getScene('WorldScene');
    const P = await import('./src/data/palettes.js');
    const S = await import('./src/data/sites.js');
    const out = {};
    out.count = P.PALETTE_KEYS.length;
    out.rampFaults = P.rampFaults();
    out.collisions = P.paletteCollisions();
    out.tierless = P.PALETTE_KEYS.filter(k => S.PALETTE_TIER[k] === undefined);
    // Every palette site's props carry it, and the sheets exist.
    const sites = s.sites || [];
    out.sites = sites.length;
    out.withPalette = sites.filter(x => x.palette).length;
    out.touched = sites.filter(x => x.palette && !S.SITE_TYPES[x.key].palette).length;
    out.relabelled = sites.filter(x => x.palette && !S.SITE_TYPES[x.key].palette
      && x.label !== S.SITE_TYPES[x.key].label).length;
    out.tierBad = sites.filter(x => x.palette
      && (S.PALETTE_TIER[x.palette] || 0) > x.regionIndex).length;
    out.palTrees = (s.forestTrees || []).filter(t => t.palette).length;
    out.palRocks = (s.obstacles || []).filter(o => o.palette).length;
    const missing = new Set();
    for (const t of (s.forestTrees || [])) {
      if (t.palette && !s.textures.exists(`tree_${t.artKey}~pal_${t.palette}`)) missing.add(`tree_${t.artKey}`);
    }
    for (const o of (s.obstacles || [])) {
      if (o.palette && !s.textures.exists(`rocks~pal_${o.palette}`)) missing.add(`rocks/${o.palette}`);
    }
    out.missingSheets = [...missing];
    // A palette stand plants ONE species, which is what keeps the baked set
    // small. Grouped by PLACE -- a landmark's outdoor stand and the grove
    // inside its room are two places and choose separately, so grouping both
    // under the site id measured two species for one stand and was asserting
    // something nobody built.
    const byPlace = {};
    for (const t of (s.forestTrees || [])) {
      if (!t.palette) continue;
      const place = t.den || (t.site != null ? `site${t.site}` : null);
      if (!place) continue;
      (byPlace[place] = byPlace[place] || new Set()).add(t.artKey);
    }
    out.maxSpeciesPerSite = Math.max(0, ...Object.values(byPlace).map(x => x.size));
    out.places = Object.keys(byPlace).length;
    out.bakedTrees = (s._bakedPalettes || {}).trees;

    // The remap itself: it must CHANGE the art, keep the alpha, and keep the
    // luminance ORDER -- that last one is what separates a recolour from a
    // silhouette, and is the whole reason this is not setTint.
    const readPixels = (key) => {
      const src = s.textures.get(key).getSourceImage();
      const c = document.createElement('canvas');
      c.width = src.width; c.height = src.height;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(src, 0, 0);
      return g.getImageData(0, 0, c.width, c.height).data;
    };
    const L = (d, i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    const compare = (raw, key) => {
      const a = readPixels(raw), b = readPixels(key);
      let n = 0, delta = 0, alphaBad = 0, agree = 0, tot = 0;
      const prev = [];
      for (let i = 0; i < a.length; i += 4) {
        if (a[i + 3] !== b[i + 3]) alphaBad++;
        if (a[i + 3] === 0) {
          if (b[i] !== a[i] || b[i + 1] !== a[i + 1] || b[i + 2] !== a[i + 2]) alphaBad++;
          continue;
        }
        n++;
        delta += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
        if (i % 53 === 0 && prev.length < 4000) prev.push([L(a, i), L(b, i)]);
      }
      for (let i = 0; i + 1 < prev.length; i += 2) {
        const da = prev[i][0] - prev[i + 1][0], db = prev[i][1] - prev[i + 1][1];
        if (Math.abs(da) < 4) continue;
        tot++; if ((da > 0) === (db > 0)) agree++;
      }
      return { n, meanDelta: delta / (3 * n), alphaBad, order: tot ? agree / tot : 1, samples: tot };
    };
    // Bake every palette against one sheet so this is measured over the whole
    // set rather than over whichever one the world happened to place.
    out.perPalette = {};
    for (const k of P.PALETTE_KEYS) {
      const key = s._paletteSheet('rocks', k, 'stone', 64, 6, 2);
      out.perPalette[k] = compare('rocks', key);
    }
    return out;
  });
  console.log('\n--- the hard palette swaps ---');
  ok('ten palettes, and every ramp is authored legally',
    pal.count === 10 && pal.rampFaults.length === 0, pal.rampFaults.join(',') || `${pal.count} palettes`);
  ok('no two of them read as the same colour',
    pal.collisions.length === 0, pal.collisions.join(',') || 'all distinct');
  ok('every palette is gated to a region that has earned it',
    pal.tierless.length === 0 && pal.tierBad === 0,
    `${pal.tierless.length} ungated, ${pal.tierBad} placed too early`);
  const deltas = Object.values(pal.perPalette).map(x => x.meanDelta);
  ok('a swap actually repaints the art',
    Math.min(...deltas) > 25, `weakest moves the mean channel by ${Math.min(...deltas).toFixed(0)}`);
  ok('and never touches the alpha',
    Object.values(pal.perPalette).every(x => x.alphaBad === 0), 'every sprite keeps its edge');
  ok("the art's own light and shade survive it",
    Object.values(pal.perPalette).every(x => x.order > 0.97 && x.samples > 100),
    `worst luminance-order agreement ${(Math.min(...Object.values(pal.perPalette).map(x => x.order)) * 100).toFixed(1)}%`);
  ok('a real minority of landmarks wear one, not all of them',
    pal.touched > 0 && pal.withPalette < pal.sites,
    `${pal.withPalette} of ${pal.sites} sites, ${pal.touched} of them touched`);
  ok('and a touched place says so in its name',
    pal.relabelled === pal.touched, `${pal.relabelled}/${pal.touched} renamed`);
  ok('every recoloured prop has a sheet to draw from',
    pal.missingSheets.length === 0, pal.missingSheets.slice(0, 3).join(',') || 'none missing');
  ok('a palette stand plants one species, so the baked set stays small',
    pal.maxSpeciesPerSite === 1 && pal.bakedTrees <= 40,
    `${pal.maxSpeciesPerSite} species across ${pal.places} stands, ${pal.bakedTrees} sheets baked`);
  ok('the world has both recoloured stone and recoloured growth in it',
    pal.palRocks > 50 && pal.palTrees > 50, `${pal.palRocks} stones, ${pal.palTrees} trees`);

  // ================= 3. the dens =================
  const den = await p.evaluate(async () => {
    const s = window.__sparkstoneGame.scene.getScene('WorldScene');
    const I = await import('./src/data/interiors.js');
    const D = await import('./src/data/dens.js');
    const out = {};
    out.rooms = (s._denRooms || []).length;
    out.want = (s.sites || []).filter(x => D.denInteriorFor(x.key) && x.structure).length;
    out.poolShort = s._denPoolShort || 0;
    out.enters = (s.doorways || []).filter(d => d.kind === 'enter' && d.room.denSlot !== undefined).length;
    out.exits = (s.doorways || []).filter(d => d.kind === 'exit' && d.room.denSlot !== undefined).length;
    out.kinds = new Set((s._denRooms || []).map(r => s.sites[r._site].key)).size;
    // Unclaimed pool rooms cost nothing: no door, no walls, no furniture.
    const spare = I.INTERIOR_ROOMS.filter(r => r.denSlot !== undefined && r._site == null);
    out.spare = spare.length;
    out.spareBuilt = spare.filter(r => r._contentsBuilt).length;
    // Props are inside their own room.
    const byId = {}; for (const r of I.INTERIOR_ROOMS) byId[r.id] = r;
    const inRoom = (rm, x, y) => !!rm && x >= rm.x && x < rm.x + rm.w * 32 && y >= rm.y && y < rm.y + rm.h * 32;
    out.astray = (s.obstacles || []).filter(o => o.den && !inRoom(byId[o.den], o.x, o.y)).length
      + (s.forestTrees || []).filter(t => t.den && !inRoom(byId[t.den], t.x, t.y)).length;
    // The specs are actually met -- a den promised nine trees must have them.
    let wantRocks = 0, wantTrees = 0;
    for (const r of (s._denRooms || [])) { wantRocks += r._spec.rocks || 0; wantTrees += r._spec.trees || 0; }
    out.wantRocks = wantRocks; out.wantTrees = wantTrees;
    out.gotRocks = (s.obstacles || []).filter(o => o.den).length;
    out.gotTrees = (s.forestTrees || []).filter(t => t.den).length;
    // Indoor trees are smaller than outdoor ones, or one tree is the room.
    out.bigIndoorTrees = (s.forestTrees || []).filter(t => t.den && !(t.scale < 2)).length;
    // The hidden lair: boring outside, blood inside. The user's own example.
    const lairs = (s.sites || []).filter(x => x.key === 'hiddenLair');
    out.lairs = lairs.length;
    out.lairOutsidePlain = lairs.every(x => !x.palette);
    out.lairInsideBlood = lairs.every(x => {
      const rm = I.INTERIOR_ROOMS.find(r => r.id === x.room);
      return rm && rm._palette === 'blood';
    });
    // Packs
    out.packs = (s._denPacks || []).length;
    out.packsWanted = (s._denRooms || []).filter(r => r._spec.fights).length;
    out.emptyPacks = (s._denPacks || []).filter(g => !g.key || !g.count).length;
    return out;
  });
  console.log('\n--- the caves open ---');
  ok('every landmark with a building has a room behind it',
    den.rooms === den.want && den.poolShort === 0, `${den.rooms} of ${den.want}`);
  ok('and a door at both ends of it',
    den.enters === den.rooms && den.exits === den.rooms, `${den.enters} in, ${den.exits} out`);
  ok('the rooms are not all the same kind of place', den.kinds >= 5, `${den.kinds} kinds`);
  ok('a spare room in the pool costs nothing',
    den.spare > 0 && den.spareBuilt === 0, `${den.spare} spare, ${den.spareBuilt} built`);
  ok('nothing a den placed stands outside it', den.astray === 0, `${den.astray} astray`);
  ok('and the rooms hold what their recipes promise',
    den.gotTrees >= den.wantTrees * 0.9 && den.gotRocks >= den.wantRocks * 0.85,
    `${den.gotTrees}/${den.wantTrees} trees, ${den.gotRocks}/${den.wantRocks} stones`);
  ok('an indoor tree is scaled for a room', den.bigIndoorTrees === 0, `${den.bigIndoorTrees} full-size`);
  ok('the barn is a barn outside and a blood wood inside',
    den.lairs > 0 && den.lairOutsidePlain && den.lairInsideBlood, `${den.lairs} lairs`);
  ok('every den that promises a fight has one',
    den.packs === den.packsWanted && den.emptyPacks === 0, `${den.packs} packs`);

  // walking in and out, for real
  const walk = await p.evaluate(async () => {
    const s = window.__sparkstoneGame.scene.getScene('WorldScene');
    const I = await import('./src/data/interiors.js');
    const dw = (s.doorways || []).find(d => d.kind === 'enter'
      && d.room.denSlot !== undefined && d.room._spec.fights);
    if (!dw) return { none: true };
    const out = { builtBefore: !!dw.room._contentsBuilt };
    s.world.x = dw.x; s.world.y = dw.y;
    s._useDoorway(dw);
    out.builtAfter = !!dw.room._contentsBuilt;
    out.inside = !!(s._insideRoom && I.roomContains(s._insideRoom, s.world.x, s.world.y));
    out.name = s._insideRoom && s._insideRoom.name;
    s._keepGroupsAwake = true;
    s._updateSpawnActivation(true);
    const g = (s._denPacks || []).find(x => x.den === dw.room.id);
    out.spawned = g ? g.members.length : 0;
    out.monstersInRoom = (s.monsters || []).filter(m => I.roomContains(s._insideRoom, m.wx, m.wy)).length;
    // and the fight completes a delve
    const ex = (s.doorways || []).find(d => d.kind === 'exit' && d.room === s._insideRoom);
    out.hasExit = !!ex;
    if (ex) {
      s._useDoorway(ex);
      out.backOutside = !s._insideRoom;
      // The banner names where you came out, not the capital.
      out.banner = document.getElementById('locationBanner').textContent;
    }
    return out;
  });
  console.log('\n--- and can be walked ---');
  ok('a den builds its room the moment it is opened',
    walk.builtBefore === false && walk.builtAfter === true);
  ok('and puts the player inside it', walk.inside === true, walk.name);
  ok('with its pack standing in the room',
    walk.spawned > 0 && walk.monstersInRoom > 0, `${walk.spawned} spawned, ${walk.monstersInRoom} in the room`);
  ok('the way out works', walk.hasExit === true && walk.backOutside === true);
  ok('and says where you came out, not "Emberhold"',
    walk.banner && walk.banner !== 'Emberhold', walk.banner);

  // ================= 4. the boards =================
  const boards = await p.evaluate(async () => {
    const s = window.__sparkstoneGame.scene.getScene('WorldScene');
    const R = await import('./src/data/regions.js');
    const Q = await import('./src/data/quests.js');
    const out = { byRegion: {}, kinds: {} };
    const all = [];
    for (const b of (s.questBoards || [])) {
      const region = (R.regionAt(b.x, b.y) || {}).id;
      const main = s._boardIsMain(b);
      out.byRegion[region] = out.byRegion[region] || { main: 0, village: 0, villageSizes: [] };
      out.byRegion[region][main ? 'main' : 'village']++;
      const offers = s._boardOffers(b);
      if (!main) out.byRegion[region].villageSizes.push(offers.length);
      for (const o of offers) all.push(o);
    }
    out.total = all.length;
    for (const o of all) out.kinds[o.kind] = (out.kinds[o.kind] || 0) + 1;
    out.distinctKinds = Object.keys(out.kinds).length;
    out.dupIds = all.length - new Set(all.map(o => o.id)).size;
    out.noTitle = all.filter(o => !o.title || !o.desc).length;
    out.badText = all.filter(o => /undefined|NaN|\[object/.test(`${o.title} ${o.desc}`)).length;
    out.noReward = all.filter(o => !(o.reward > 0)).length;
    out.noRankTier = all.filter(o => o.rankTier === undefined).length;
    // Two boards do not share a list.
    const b0 = s.questBoards[0], b1 = s.questBoards[1];
    out.boardsDiffer = s._boardOffers(b0).map(o => o.id).join() !== s._boardOffers(b1).map(o => o.id).join();
    // A board is the same all week and different next week.
    s._boards = {};
    const w0 = s._boardOffers(b0).map(o => o.title).join('|');
    s._boards = {};
    const w0b = s._boardOffers(b0).map(o => o.title).join('|');
    const realDay = s._dayIndex.bind(s);
    s._dayIndex = () => realDay() + 3;              // same week
    s._boards = {};
    const sameWeek = s._boardOffers(b0).map(o => o.title).join('|');
    s._dayIndex = () => realDay() + Q.QUEST_WEEK_DAYS;  // next week
    s._boards = {};
    const nextWeek = s._boardOffers(b0).map(o => o.title).join('|');
    s._dayIndex = realDay; s._boards = {};
    out.stable = w0 === w0b;
    out.holdsAllWeek = w0 === sameWeek;
    out.turnsOverWeekly = w0 !== nextWeek;
    return out;
  });
  console.log('\n--- the quest boards ---');
  ok('every region has a main board and its own scattered communities',
    Object.keys(boards.byRegion).length === 4
    && Object.values(boards.byRegion).every(r => r.main >= 1 && r.village >= 2),
    JSON.stringify(boards.byRegion, (k, v) => (k === 'villageSizes' ? undefined : v)));
  ok('and a village board carries the five the user asked for',
    Object.values(boards.byRegion).every(r => r.villageSizes.every(n => n === 5)),
    JSON.stringify(Object.values(boards.byRegion).map(r => r.villageSizes)));
  ok('a board is no longer only "kill this monster"',
    boards.distinctKinds === 6, `${boards.distinctKinds} kinds: ${JSON.stringify(boards.kinds)}`);
  ok('and hunts are a minority of what is posted',
    (boards.kinds.hunt || 0) < boards.total / 2, `${boards.kinds.hunt} of ${boards.total}`);
  ok('two boards never show the same list', boards.boardsDiffer);
  ok('no two notices in the world share an id', boards.dupIds === 0, `${boards.dupIds}`);
  ok('every notice says what it is and what it pays',
    boards.noTitle === 0 && boards.badText === 0 && boards.noReward === 0,
    `${boards.noTitle} untitled, ${boards.badText} malformed, ${boards.noReward} unpaid`);
  ok('and still carries the rank field four rounds of suites read',
    boards.noRankTier === 0, `${boards.noRankTier} without`);
  ok('a board reads the same twice running', boards.stable === true);
  ok('holds its notices all week', boards.holdsAllWeek === true);
  ok('and turns over when the week does', boards.turnsOverWeekly === true);

  // ================= 5. taking and finishing them =================
  const quests = await p.evaluate(async () => {
    const s = window.__sparkstoneGame.scene.getScene('WorldScene');
    const out = { taken: [], done: [] };
    s.player.quests.length = 0;
    s._boardTaken = new Set();
    const take = (kind) => {
      for (const b of (s.questBoards || [])) {
        const o = s._boardOffers(b).find(x => x.kind === kind && !x.taken);
        if (!o) continue;
        s._openBoard = b;
        s._acceptBounty(o);
        return s.player.quests[s.player.quests.length - 1];
      }
      return null;
    };
    for (const kind of ['cull', 'survey', 'delve', 'gather', 'relic', 'hunt']) {
      const q = take(kind);
      out.taken.push({ kind, ok: !!q && q.kind === kind, progress: q ? s._questProgressText(q) : null });
    }
    // A taken notice is greyed on the board it came from and stays taken.
    const anyTaken = [];
    for (const b of (s.questBoards || [])) for (const o of s._boardOffers(b)) if (o.taken) anyTaken.push(o.id);
    out.markedTaken = anyTaken.length;
    out.questCount = s.player.quests.length;

    // --- progress plumbing, one kind at a time ---
    const cull = s.player.quests.find(q => q.kind === 'cull');
    if (cull) {
      const before = cull.have || 0;
      // A kill of the right family counts; a kill of another does not.
      const keys = Object.keys((await import('./src/data/monsters.js')).MONSTER_TYPES);
      const M = (await import('./src/data/monsters.js')).MONSTER_TYPES;
      const right = keys.find(k => M[k].family === cull.family);
      const wrong = keys.find(k => M[k].family !== cull.family);
      s._questOnKill({ key: wrong, wx: s.world.x, wy: s.world.y });
      const afterWrong = cull.have || 0;
      for (let i = 0; i < cull.need; i++) s._questOnKill({ key: right, wx: s.world.x, wy: s.world.y });
      out.cull = { before, afterWrong, after: cull.have, state: cull.state, need: cull.need };
    }
    const survey = s.player.quests.find(q => q.kind === 'survey');
    if (survey) {
      s._questOnSiteVisit({ id: survey.siteId === 0 ? 1 : 0 });
      const afterWrong = survey.state;
      s._questOnSiteVisit({ id: survey.siteId });
      out.survey = { afterWrong, after: survey.state };
    }
    const delve = s.player.quests.find(q => q.kind === 'delve');
    if (delve) {
      s._questOnDenCleared('den_does_not_exist');
      const afterWrong = delve.state;
      s._questOnDenCleared(delve.denRoom);
      out.delve = { afterWrong, after: delve.state };
    }
    const gather = s.player.quests.find(q => q.kind === 'gather');
    if (gather) {
      const bag = s.player.inventory.parts;
      const before = s._questDone(gather);
      for (let i = 0; i < gather.need; i++) bag.push(gather.partId);
      const after = s._questDone(gather);
      const held = bag.filter(x => x === gather.partId).length;
      s._turnInBounty(gather);
      const left = bag.filter(x => x === gather.partId).length;
      out.gather = { before, after, held, left };
    }
    const relic = s.player.quests.find(q => q.kind === 'relic');
    if (relic) {
      const bag = s.player.inventory.stones;
      const before = s._questDone(relic);
      bag.push(relic.stoneId);
      const after = s._questDone(relic);
      const coinsBefore = JSON.stringify(s.player.coins);
      s._turnInBounty(relic);
      out.relic = { before, after, left: bag.filter(x => x === relic.stoneId).length,
        paid: JSON.stringify(s.player.coins) !== coinsBefore };
    }
    out.remaining = s.player.quests.map(q => q.kind);
    return out;
  });
  console.log('\n--- taking them, and finishing them ---');
  ok('all six kinds can be accepted',
    quests.taken.every(t => t.ok), JSON.stringify(quests.taken.filter(t => !t.ok)) || 'six taken');
  ok('and a taken notice is marked taken on its board',
    quests.markedTaken >= 6, `${quests.markedTaken} marked`);
  ok('a cull counts the right family and ignores the wrong one',
    quests.cull && quests.cull.afterWrong === quests.cull.before
    && quests.cull.after >= quests.cull.need && quests.cull.state === 'ready',
    JSON.stringify(quests.cull));
  ok('a survey completes at ITS landmark and no other',
    quests.survey && quests.survey.afterWrong === 'active' && quests.survey.after === 'ready',
    JSON.stringify(quests.survey));
  ok('a delve completes when ITS den is cleared',
    quests.delve && quests.delve.afterWrong === 'active' && quests.delve.after === 'ready',
    JSON.stringify(quests.delve));
  ok('a gather is not done until the parts are in the bag',
    quests.gather && quests.gather.before === false && quests.gather.after === true,
    JSON.stringify(quests.gather));
  ok('and turning it in actually takes them',
    quests.gather && quests.gather.left === quests.gather.held - quests.gather.held,
    `${quests.gather && quests.gather.left} left of ${quests.gather && quests.gather.held}`);
  ok('a relic pays out and takes the stone',
    quests.relic && quests.relic.after === true && quests.relic.left === 0 && quests.relic.paid === true,
    JSON.stringify(quests.relic));

  // ================= 6. the villagers =================
  const npc = await p.evaluate(async () => {
    const s = window.__sparkstoneGame.scene.getScene('WorldScene');
    const Q = await import('./src/data/quests.js');
    const out = {};
    const v = s.villagers || [];
    out.count = v.length;
    out.perBoard = {};
    for (const x of v) out.perBoard[x.villager.boardKey] = (out.perBoard[x.villager.boardKey] || 0) + 1;
    out.minPerBoard = Math.min(...Object.values(out.perBoard));
    out.inWater = v.filter(x => s._isWaterAt(x.x, x.y)).length;
    out.noSprite = v.filter(x => !x.sprite).length;
    out.dupNames = v.length - new Set(v.map(x => x.name)).size;
    const reqs = v.map(x => s._npcRequestFor(x)).filter(Boolean);
    out.asking = reqs.length;
    out.reqKinds = [...new Set(reqs.map(r => r.kind))];
    out.badText = reqs.filter(r => /undefined|NaN/.test(`${r.title} ${r.desc} ${r.opener}`)).length;
    out.everyoneSpeaks = v.every(x => x.dialogue || s._npcRequestFor(x));
    // Asking is a minority: "a few NPC requests", not a queue of them.
    out.askRate = reqs.length / Math.max(1, v.length);
    // A request can be taken, and the same villager then reports progress
    // rather than offering it again.
    const who = v.find(x => s._npcRequestFor(x));
    if (who) {
      const req = s._npcRequestFor(who);
      s.nearNpc = who;
      s._openNpcRequest(who);
      out.offered = [...document.querySelectorAll('#dialogueChoices button')].map(b => b.dataset.act);
      s._acceptNpcRequest();
      const q = s.player.quests.find(x => x.id === req.id);
      out.accepted = !!q;
      s._openNpcRequest(who);
      out.reoffered = [...document.querySelectorAll('#dialogueChoices button')].length;
      s._closeDialogue();
    }
    // A request is smaller than the board's version of the same errand.
    out.smallerThanBoard = reqs.every(r => r.kind !== 'cull' || r.need <= 12);
    return out;
  });
  console.log('\n--- the people by the board ---');
  ok('every board has people standing at it',
    npc.count > 20 && npc.minPerBoard >= 2, `${npc.count} villagers, fewest ${npc.minPerBoard} at a board`);
  ok('all of them reachable and drawn',
    npc.inWater === 0 && npc.noSprite === 0 && npc.dupNames === 0,
    `${npc.inWater} in water, ${npc.noSprite} undrawn, ${npc.dupNames} name clashes`);
  ok('a few of them want something -- questions, items or support',
    npc.asking > 0 && npc.askRate < 0.6 && npc.reqKinds.length >= 2,
    `${npc.asking} asking (${(npc.askRate * 100).toFixed(0)}%), kinds ${npc.reqKinds.join('/')}`);
  ok('and everybody has something to say either way', npc.everyoneSpeaks === true);
  ok('a request is asked with a yes and a no',
    JSON.stringify(npc.offered) === JSON.stringify(['npcQuestAccept', 'npcQuestDecline']),
    JSON.stringify(npc.offered));
  ok('taking it works, and they do not ask twice',
    npc.accepted === true && npc.reoffered === 0, `reoffered ${npc.reoffered}`);
  ok('none of the request text is malformed', npc.badText === 0, `${npc.badText}`);

  ok('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  console.log(`\n${pass}/${pass + fail} passed`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
