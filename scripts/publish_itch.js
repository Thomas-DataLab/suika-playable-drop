const wsUrl = 'ws://127.0.0.1:9223/devtools/page/F80D55A59AA13A73865CA026923D8CE8';
const ws = new WebSocket(wsUrl);

const script = `(() => {
  const radios = Array.from(document.querySelectorAll('input[name="game[published]"]'));
  const currentChecked = radios.find(r => r.checked)?.value;
  const pubRadio = radios.find(r => r.value === 'published');

  let willPublish = false;
  if (pubRadio && !pubRadio.checked) {
    pubRadio.click();
    willPublish = true;
  }

  // Click save
  const saveBtn = Array.from(document.querySelectorAll('button, input[type=submit]')).find(b => (b.innerText || b.value || '').includes('Save'));
  if (saveBtn) {
    saveBtn.click();
  }

  return {
    previousVisibility: currentChecked,
    newVisibility: pubRadio?.checked ? 'published' : currentChecked,
    willPublish,
    savedClicked: !!saveBtn
  };
})()`;

ws.onopen = () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: { expression: script, returnByValue: true }
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('PUBLISH SCRIPT RESULT:', JSON.stringify(data.result?.result?.value, null, 2));
  ws.close();
  process.exit(0);
};

ws.onerror = (err) => {
  console.error('Error:', err);
  process.exit(1);
};
