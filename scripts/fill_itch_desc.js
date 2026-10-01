const wsUrl = 'ws://127.0.0.1:9223/devtools/page/0E386F0ED7C19064473F84DA5D53AAC6';
const ws = new WebSocket(wsUrl);

const descHTML = `
<h2>🍉 Suika Merge Drop – The Ultimate Fruit Physics Puzzle Game (HTML5 & Android Ready)</h2>
<p>Looking to capitalize on the viral Suika / Watermelon game sensation? <strong>Suika Merge Drop</strong> is a top-tier, commercial-grade HTML5 and Android game template designed from the ground up for high player retention, viral social replayability, and effortless multi-channel monetization.</p>
<p>Crafted with clean, modern Vanilla JavaScript and accelerated by the industry-standard <strong>Matter.js 2D physics engine</strong>, this game delivers butter-smooth 60+ FPS physics interactions with zero external image or audio file bloat!</p>

<hr>
<h3>🌟 Why This Asset Is Your Best Investment</h3>
<h4>1. 🚀 Universal Multi-Platform Mediation SDK</h4>
<p>Deploy everywhere with a single codebase! The integrated <code>PlatformSDK</code> automatically detects runtime environments:</p>
<ul>
  <li><strong>CrazyGames SDK (v2 & v3)</strong>: Pre-configured <code>gameplayStart()</code>, <code>gameplayStop()</code>, <code>happytime()</code>, midgame interstitials, and rewarded ads.</li>
  <li><strong>Poki SDK (v2)</strong>: Automated <code>gameLoadingFinished()</code>, <code>commercialBreak()</code>, <code>rewardedBreak()</code>, and sound ducking.</li>
  <li><strong>YouTube Playables</strong>: Full compliance with YouTube <code>ytgame.gameReady()</code> and interstitial ad lifecycles.</li>
  <li><strong>Offline & Standalone Fallback</strong>: Works effortlessly on your own website, itch.io, or offline webview without errors.</li>
</ul>

<h4>2. 📱 Android App Ready + Automated GitHub Actions CI</h4>
<ul>
  <li>Includes full <strong>Capacitor 6</strong> configuration (<code>capacitor.config.json</code>) locked in portrait orientation.</li>
  <li>Pre-configured <strong>GitHub Actions CI workflow</strong> that automatically compiles a downloadable Android APK on every push!</li>
</ul>

<h4>3. 🎵 100% Procedural Web Audio API Synthesizer</h4>
<ul>
  <li>Zero <code>.mp3</code> or <code>.ogg</code> sound files to load!</li>
  <li>Sounds (fruit merge pops, harmonic chords, drop blips, danger alarms, and game over chimes) are synthesized mathematically in real time.</li>
  <li>Zero audio latency, zero network buffering, and zero copyright issues.</li>
</ul>

<h4>4. 🎨 100% Vector Canvas Graphics & 5-Minute Reskin Architecture</h4>
<ul>
  <li>Crisp, vibrant kawaii fruits rendered procedurally on HTML5 Canvas 2D. Looks razor-sharp on 4K monitors and mobile Retina displays.</li>
  <li>Want to use your own sprites? Our modular <code>src/fruits.js</code> system allows replacing any fruit with PNG, WebP, or SVG graphics in less than 5 minutes!</li>
</ul>

<hr>
<h3>📦 What’s Included in the Download Package?</h3>
<ol>
  <li><strong>Complete Source Code</strong>: Clean, modular JavaScript (<code>src/game.js</code>, <code>src/fruits.js</code>, <code>src/particles.js</code>, <code>src/audio.js</code>, <code>src/platform-sdk.js</code>).</li>
  <li><strong>Pre-Built Distribution Bundles</strong>:
    <ul>
      <li><code>dist/crazygames.zip</code>: Ready for CrazyGames Developer Portal.</li>
      <li><code>dist/poki.zip</code>: Ready for Poki for Developers.</li>
      <li><code>dist/android-web/</code>: Ready for Capacitor sync.</li>
    </ul>
  </li>
  <li><strong>Comprehensive Documentation</strong>:
    <ul>
      <li><code>DOCUMENTATION.md</code>: Full technical manual.</li>
      <li><code>RESKIN_GUIDE.md</code>: 5-minute visual & physics tuning guide.</li>
      <li><code>ANDROID_SETUP_GUIDE.md</code>: Local Android Studio & APK download instructions.</li>
      <li><code>SUBMISSION_GUIDE_CRAZYGAMES.md</code> & <code>SUBMISSION_GUIDE_POKI.md</code>.</li>
    </ul>
  </li>
  <li><strong>Automated Packaging Tooling</strong>: <code>scripts/package-all.js</code> to compile zip archives with one command.</li>
</ol>
`;

const fillDescCode = `(() => {
  const ta = document.querySelector('.game_description_input');
  const redactor = document.querySelector('.redactor_editor, .redactor-editor, div[contenteditable=true]');

  if (redactor) {
    redactor.innerHTML = \`${descHTML}\`;
  }
  if (ta) {
    ta.value = \`${descHTML}\`;
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.dispatchEvent(new Event('change', { bubbles: true }));
  }

  return {
    redactorLength: redactor?.innerHTML?.length,
    taLength: ta?.value?.length
  };
})()`;

ws.onopen = () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: { expression: fillDescCode, returnByValue: true }
  }));
};

ws.onmessage = (event) => {
  console.log('DESC RESULT:', JSON.parse(event.data).result.result.value);
  ws.close();
};
