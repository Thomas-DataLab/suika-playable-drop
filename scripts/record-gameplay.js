const fs = require('fs');

async function recordGameplay() {
  const wsUrl = 'ws://127.0.0.1:9223/devtools/page/C9ACB47658A1C50E8962543D4C02F3FB';
  const ws = new WebSocket(wsUrl);

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  console.log('Connected to game tab for recording.');

  // Script to run inside page
  const pageScript = `(() => {
    return new Promise((resolve) => {
      const canvas = document.getElementById('game-canvas');
      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8',
        videoBitsPerSecond: 2500000
      });
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const b64 = reader.result.split(',')[1];
          resolve({ success: true, base64: b64, size: blob.size });
        };
        reader.readAsDataURL(blob);
      };

      recorder.start();
      console.log('MediaRecorder started...');

      // Gameplay simulation helper
      function dropAt(x) {
        const rect = canvas.getBoundingClientRect();
        const clientX = rect.left + (x / 480) * rect.width;
        const clientY = rect.top + (70 / 800) * rect.height;

        canvas.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX, clientY }));
        setTimeout(() => {
          canvas.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX, clientY }));
          setTimeout(() => {
            canvas.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX, clientY }));
          }, 50);
        }, 100);
      }

      // Schedule automated drops to create merges & particles
      setTimeout(() => dropAt(240), 500);
      setTimeout(() => dropAt(240), 1600);
      setTimeout(() => dropAt(200), 2700);
      setTimeout(() => dropAt(200), 3800);
      setTimeout(() => dropAt(280), 4900);
      setTimeout(() => dropAt(280), 6000);
      setTimeout(() => dropAt(240), 7100);

      // Stop recording after 8.5 seconds
      setTimeout(() => {
        recorder.stop();
      }, 8500);
    });
  })()`;

  let msgId = 1;
  const result = await new Promise((resolve, reject) => {
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id === 1) {
        resolve(data.result);
      }
    };
    ws.send(JSON.stringify({
      id: msgId++,
      method: 'Runtime.evaluate',
      params: {
        expression: pageScript,
        awaitPromise: true,
        returnByValue: true
      }
    }));
  });

  ws.close();

  if (result && result.result && result.result.value && result.result.value.base64) {
    const b64 = result.result.value.base64;
    const buf = Buffer.from(b64, 'base64');
    const outPath = 'C:/Projects/suika-game-playable/dist/assets/raw_gameplay.webm';
    fs.writeFileSync(outPath, buf);
    console.log('Saved raw gameplay webm (' + buf.length + ' bytes) to:', outPath);
    return true;
  } else {
    console.error('Recording failed:', result);
    return false;
  }
}

recordGameplay().catch(console.error);
