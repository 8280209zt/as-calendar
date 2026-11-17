let cloud;
async function cloudApi(path, options = {}) {
  if (!cloud) throw new Error('云端配置尚未完成');
  const {data: {session}, error: authError} = await cloud.auth.getSession();
  if (authError) throw authError;
  if (!session) throw Object.assign(new Error('请先使用邮箱登录'), {status: 401});
  const table = () => cloud.from('as_entries');
  const fields = 'date,score,note,updated_at';
  if (path === '/api/entries') {
    const entries = [];
    for (let start = 0; ; start += 500) {
      const {data, error} = await table().select(fields).eq('user_id', session.user.id).order('date').range(start, start + 499);
      if (error) throw error;
      entries.push(...data);
      if (data.length < 500) break;
    }
    return {entries};
  }
  const date = path.split('/').pop();
  if (options.method === 'DELETE') {
    const {error} = await table().delete().eq('user_id', session.user.id).eq('date', date);
    if (error) throw error;
    return {ok: true};
  }
  if (options.method !== 'PUT') throw new Error('不支持的操作');
  const {score, note} = JSON.parse(options.body);
  const {data, error} = await table().upsert({user_id: session.user.id, date, score, note}, {onConflict: 'user_id,date'}).select(fields).single();
  if (error) throw error;
  return {entry: data};
}
function parseLoginProof(value, email, projectUrl) {
  const proof = value.trim();
  if (/^\d{6,10}$/.test(proof)) return {email, token: proof, type: 'email'};
  let url;
  try {url = new URL(proof);} catch {throw new Error('请复制邮件里登录按钮的链接地址，再粘贴到这里。');}
  if (url.origin !== new URL(projectUrl).origin || url.pathname !== '/auth/v1/verify') throw new Error('这不是本网站的登录链接，请复制最新邮件里的登录按钮链接。');
  const type = url.searchParams.get('type');
  const token_hash = url.searchParams.get('token') || url.searchParams.get('token_hash');
  if (!['signup', 'magiclink', 'email'].includes(type) || !token_hash) throw new Error('登录链接不完整，请重新复制。');
  return {token_hash, type};
}
function loginError(error) {
  if (error?.status === 429) return '发送过于频繁，请稍后再试。默认邮件服务每小时发送量有限。';
  if (/expired|invalid|otp_expired/i.test(error?.message || '')) return '登录链接已使用或已过期。请发送一封新邮件，直接复制链接到这里，不要先点击。';
  return error?.message || '登录未成功，请重试。';
}
async function initCloud() {
  const status = document.querySelector('#auth-status');
  try {
    const config = window.APP_CONFIG;
    if (!config?.supabaseUrl || !config?.supabaseKey) throw new Error('部署配置尚未完成，请等待管理员连接 Supabase。');
    cloud = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
    let currentUser;
    function showSession(session) {
      const nextUser = session?.user.id || null;
      document.querySelector('#logout').hidden = !session;
      document.querySelector('#login-email').hidden = !!session;
      document.querySelector('#login-send').hidden = !!session;
      document.querySelector('#login-help').hidden = !!session;
      status.textContent = session ? '已登录：' + session.user.email : '请通过邮件登录。在其他浏览器打开邮件链接，不会登录当前窗口。';
      if (nextUser !== currentUser) {
        currentUser = nextUser;
        state.records = {}; state.connected = false; state.dirty = false; state.demo = false;
        state.loading = true;
        renderCalendar(); renderRecent(); renderEditor();
        setTimeout(() => load(), 0);
      }
    }
    cloud.auth.onAuthStateChange((event, session) => showSession(session));
    document.querySelector('#login-form').onsubmit = async event => {
      event.preventDefault();
      const button = document.querySelector('#login-send');
      button.disabled = true;
      try {
        const {error} = await cloud.auth.signInWithOtp({email: document.querySelector('#login-email').value.trim(), options: {emailRedirectTo: location.origin + location.pathname}});
        if (error) throw error;
        status.textContent = '邮件已发送。请在邮件打开的网页继续使用；若要登录当前窗口，请展开下方入口粘贴链接。';
      } catch (error) {status.textContent = loginError(error);}
      finally {button.disabled = false;}
    };
    document.querySelector('#logout').onclick = async () => {
      if (state.busy || !confirmLeave()) return;
      const {error} = await cloud.auth.signOut();
      if (error) status.textContent = loginError(error);
    };
    document.querySelector('#verify-form').onsubmit = async event => {
      event.preventDefault();
      const button = document.querySelector('#verify-login'), input = document.querySelector('#login-proof');
      button.disabled = true;
      try {
        const proof = parseLoginProof(input.value, document.querySelector('#login-email').value.trim(), config.supabaseUrl);
        input.value = '';
        const {data, error} = await cloud.auth.verifyOtp(proof);
        if (error) throw error;
        showSession(data.session);
        await load();
      } catch (error) {status.textContent = loginError(error);}
      finally {input.value = ''; button.disabled = false;}
    };
    const {data: {session}, error} = await cloud.auth.getSession();
    if (error) status.textContent = loginError(error);
    else showSession(session);
    const callbackError = new URLSearchParams(location.hash.slice(1)).get('error_description');
    if (callbackError) {status.textContent = loginError({message: callbackError}); history.replaceState(null, '', location.pathname);}
    window.addEventListener('focus', async () => {
      const {data: {session}} = await cloud.auth.getSession();
      if (session?.user.id && currentUser !== session.user.id) showSession(session);
    });
    await load();
  } catch (error) {
    status.textContent = loginError(error);
    state.loading = false;
    state.connected = false;
    notice(error.message, true);
    updateSave();
  }
}
