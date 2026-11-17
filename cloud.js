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
async function initCloud() {
  const status = document.querySelector('#auth-status');
  try {
    const config = window.APP_CONFIG;
    if (!config?.supabaseUrl || !config?.supabaseKey) throw new Error('部署配置尚未完成，请等待管理员连接 Supabase。');
    cloud = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
    let currentUser;
    cloud.auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user.id || null;
      document.querySelector('#logout').hidden = !session;
      document.querySelector('#login-email').hidden = !!session;
      document.querySelector('#login-send').hidden = !!session;
      status.textContent = session ? '已登录：' + session.user.email : '登录链接将发送到你的邮箱。';
      if (nextUser !== currentUser) {
        currentUser = nextUser;
        state.records = {}; state.connected = false; state.dirty = false; state.demo = false;
        state.loading = true;
        renderCalendar(); renderRecent(); renderEditor();
        setTimeout(() => load(), 0);
      }
    });
    document.querySelector('#login-form').onsubmit = async event => {
      event.preventDefault();
      const button = document.querySelector('#login-send');
      button.disabled = true;
      try {
        const {error} = await cloud.auth.signInWithOtp({email: document.querySelector('#login-email').value.trim(), options: {emailRedirectTo: location.origin + location.pathname}});
        if (error) throw error;
        status.textContent = '登录链接已发送，请检查邮箱并点击链接。';
      } catch (error) {status.textContent = error.message;}
      finally {button.disabled = false;}
    };
    document.querySelector('#logout').onclick = async () => {
      if (state.busy || !confirmLeave()) return;
      const {error} = await cloud.auth.signOut();
      if (error) status.textContent = error.message;
    };
    await load();
  } catch (error) {
    status.textContent = error.message;
    state.loading = false;
    state.connected = false;
    notice(error.message, true);
    updateSave();
  }
}
