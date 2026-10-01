const wsUrl = 'ws://127.0.0.1:9223/devtools/page/0E386F0ED7C19064473F84DA5D53AAC6';
const ws = new WebSocket(wsUrl);

const fillCode = `(() => {
  // Title
  const title = document.querySelector('input[name="game[title]"]');
  if (title) {
    title.value = 'Suika Merge Drop - Complete HTML5 Game Source Code & Template';
    title.dispatchEvent(new Event('input', { bubbles: true }));
    title.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Tagline
  const shortText = document.querySelector('input[name="game[short_text]"]');
  if (shortText) {
    shortText.value = 'Lightweight, responsive HTML5 physics fruit merge game. 100% self-contained, Web Audio API, CrazyGames, Poki, and YouTube Playables SDK ready.';
    shortText.dispatchEvent(new Event('input', { bubbles: true }));
    shortText.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Suggested Price
  const price = document.querySelector('input[name="game[suggested_price]"]');
  if (price) {
    price.value = '$19.00';
    price.dispatchEvent(new Event('input', { bubbles: true }));
    price.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Tags
  const tags = document.querySelector('input[name="game[tags]"]');
  if (tags) {
    tags.value = 'html5, source-code, template, physics, suika, puzzle, casual, 2d, matterjs';
    tags.dispatchEvent(new Event('input', { bubbles: true }));
    tags.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // AI Disclosure (No)
  const aiNo = Array.from(document.querySelectorAll('input[name="ai_disclosure[ai_generated]"]')).find(r => r.value === 'no');
  if (aiNo) aiNo.click();

  // Instructions
  const inst = document.querySelector('textarea[name="game[instructions]"]');
  if (inst) {
    inst.value = '1. Extract suika-merge-drop-commercial-v1.0.zip.\\n2. Open index.html in any modern browser to play or develop.\\n3. Read DOCUMENTATION.md and RESKIN_GUIDE.md for complete architecture and visual customization details.';
    inst.dispatchEvent(new Event('input', { bubbles: true }));
    inst.dispatchEvent(new Event('change', { bubbles: true }));
  }

  return {
    title: title?.value,
    shortText: shortText?.value,
    price: price?.value,
    tags: tags?.value,
    inst: inst?.value?.slice(0, 50)
  };
})()`;

ws.onopen = () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: { expression: fillCode, returnByValue: true }
  }));
};

ws.onmessage = (event) => {
  console.log('ITCH FORM RESULT:', JSON.parse(event.data).result.result.value);
  ws.close();
};

ws.onerror = (err) => console.error(err);
