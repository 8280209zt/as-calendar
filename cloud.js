// The private access key is supplied only in the URL fragment, never in source code.
let accessKey = '';
const keyStorageName = 'huanhuan-private-link-v1';
function readAccessKey(hash, storedKey) {
  const supplied = new URLSearchParams(hash.replace(/^#/, '')).get('key');
  const candidate = supplied === null ? (storedKey || '') : supplied;
  return /^[a-f0-9]{64}$/.test(candidate) ? candidate : '';
}
async function cloudApi(path, options = {}) {
  if (!accessKey) throw Object.assign(new Error('请使用你的完整专属链接打开，无需注册或登录。'), {status: 401});
  const config = window.APP_CONFIG;
  const payload = {access_key: accessKey, operation: 'list'};
  if (path !== '/api/entries') {
    payload.entry_date = path.split('/').pop();
    if (options.method === 'DELETE') payload.operation = 'delete';
    else if (options.method === 'PUT') {
      const {score, note} = JSON.parse(options.body);
      payload.operation = 'save'; payload.entry_score = score; payload.entry_note = note;
    } else throw new Error('不支持的操作');
  }
  let response;
  try {
    response = await fetch(config.supabaseUrl + '/rest/v1/rpc/calendar_with_link', {
      method: 'POST', headers: {'Content-Type':'application/json', apikey: config.supabaseKey},
      body: JSON.stringify(payload)
    });
  } catch {throw new Error('网络连接失败，内容尚未保存，请恢复网络后重试。');}
  const result = await response.json();
  if (!response.ok) {
    if (result.code === '28000') throw Object.assign(new Error('专属链接无效或已失效，请使用最新的完整链接。'), {status:401});
    throw new Error(result.message || '保存失败，请重试');
  }
  return result;
}
async function initCloud() {
  let stored = '';
  try {stored = localStorage.getItem(keyStorageName) || '';} catch {}
  accessKey = readAccessKey(location.hash, stored);
  if (accessKey) {
    try {localStorage.setItem(keyStorageName, accessKey);} catch {}
    // Keep the key in the fragment so copying the address works across devices.
    if (!new URLSearchParams(location.hash.slice(1)).has('key')) history.replaceState(null, '', location.pathname + '#key=' + accessKey);
  }
  document.querySelector('#account').hidden = !!accessKey;
  document.querySelector('#auth-status').textContent = accessKey ? '' : '请使用你的完整专属链接打开。';
  await load();
}
