// Sparkstone -- Phaser 3 port, entry point.
//
// Phaser is vendored as a static prebuilt ESM bundle at public/vendor/
// (phaser.esm.min.js, straight from the official phaserjs/phaser repo's
// dist/ folder, MIT-licensed -- see public/vendor/PHASER_LICENSE.md) and
// imported directly as a browser-native ES module. There is no npm install
// and no bundler/build step: this whole project runs by serving the
// directory root with any static file server and opening index.html.
//
// (Why: this sandbox has no live npm registry access, which made the
// originally-planned Vite dev/build pipeline non-viable here. Phaser ships
// ready-to-use browser bundles in its own repo, so vendoring one directly
// sidesteps the need for npm entirely. A real Vite pipeline can be added
// later in an environment with normal registry access -- nothing about the
// project structure below depends on this choice, since `import Phaser from
// '...'` is exactly what a bundled setup would also write.)
import Phaser from '../public/vendor/phaser.esm.min.js';
import WorldScene from './scenes/WorldScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game-root',
  width: 960,
  height: 600,
  backgroundColor: '#3a5a3a',
  pixelArt: true,
  input: {
    gamepad: true,
  },
  scene: [WorldScene],
};

// eslint-disable-next-line no-unused-vars
const game = new Phaser.Game(config);

window.__sparkstoneGame = game;
