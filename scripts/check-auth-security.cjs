// Run directly with Node; exercises the actual TypeScript modules without a test framework.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createRequire } = require('node:module');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

function environment() {
  const store = new Map();
  const window = new EventTarget();
  window.location = { href: 'https://dashboard.test/apps/cluster' };
  const timers = new Map();
  let nextTimer = 0;
  const sockets = [];
  class WebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
    readyState = 0;
    constructor(url) {
      this.url = url;
      sockets.push(this);
    }
    open() {
      this.readyState = 1;
      this.onopen?.({});
    }
    close(code = 1000) {
      this.readyState = 3;
      this.onclose?.({ code });
    }
    send(data) {
      this.sent = data;
    }
  }
  const sandbox = {
    Event,
    window,
    URL,
    WebSocket,
    atob,
    console,
    localStorage: {
      getItem: (key) => store.get(key) || null,
      setItem: (key, value) => store.set(key, value),
      removeItem: (key) => store.delete(key),
    },
    setTimeout: (callback) => {
      const id = ++nextTimer;
      timers.set(id, callback);
      return id;
    },
    clearTimeout: (id) => timers.delete(id),
  };
  const requests = [];
  const notifications = [];
  const history = {
    location: { pathname: '/apps/cluster' },
    replace: (pathname) => {
      history.location.pathname = pathname;
    },
  };
  let requestResult = async () => ({ code: 200, data: {} });
  const max = {
    history,
    request: async (url, options) => {
      requests.push({ url, ...options });
      return requestResult(url, options);
    },
  };
  const cache = new Map();
  function load(name) {
    if (cache.has(name)) return cache.get(name);
    const source = fs.readFileSync(
      path.join(root, 'src', name + '.ts'),
      'utf8',
    );
    const compiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    const module = { exports: {} };
    vm.runInNewContext(
      compiled,
      {
        ...sandbox,
        module,
        exports: module.exports,
        require: (dependency) => {
          if (dependency === '@umijs/max') return max;
          if (dependency === 'antd')
            return {
              notification: {
                error: (value) => notifications.push(value),
                warning: (value) => notifications.push(value),
              },
            };
          if (dependency === 'react') return { createElement: () => null };
          return load(
            path.posix.normalize(
              path.posix.join(path.posix.dirname(name), dependency),
            ),
          );
        },
      },
      { filename: name + '.ts' },
    );
    cache.set(name, module.exports);
    return module.exports;
  }
  return {
    ...sandbox,
    store,
    sockets,
    timers,
    auth: load('utils/auth'),
    SessionSocket: load('utils/websocketClient').SessionSocket,
    app: () => load('app'),
    requests,
    notifications,
    history,
    requestResult: (handler) => {
      requestResult = handler;
    },
  };
}
const jwt = (id, seconds = 600) =>
  [
    Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url'),
    Buffer.from(
      JSON.stringify({
        sub: 'admin',
        exp: Math.floor(Date.now() / 1000) + seconds,
        jti: id,
      }),
    ).toString('base64url'),
    'mock-signature',
  ].join('.');
const login = (env, token = jwt('login')) =>
  env.auth.saveToken({
    accessToken: token,
    tokenType: 'Bearer',
    username: 'admin',
    expiresAt: 'invalid-old-date',
  });
const cases = [];
const check = (name, fn) => cases.push([name, fn]);

check('legacy AK/SK and corrupted storage are removed', () => {
  const env = environment();
  for (const raw of [
    '{invalid',
    JSON.stringify({ authType: 'aksk', aksk: { ak: 'old', sk: 'secret' } }),
  ]) {
    env.store.set(env.auth.AUTH_STORE_KEY, raw);
    assert.equal(env.auth.getBearerToken(), '');
    assert.equal(env.store.has(env.auth.AUTH_STORE_KEY), false);
  }
});
check(
  'JWT exp replaces stale/naive expiry and invalid JWTs cannot log in',
  () => {
    const env = environment();
    const token = jwt('valid');
    login(env, token);
    assert.equal(
      env.auth.getAuthStore().token.expiresAt,
      env.auth.getTokenExpiresAt(token),
    );
    assert.equal(env.auth.isTokenExpired(), false);
    for (const token of ['invalid', jwt('expired', -10)])
      assert.throws(() => login(env, token));
  },
);
check(
  'renewal updates expiry and ignores late responses from older tokens',
  () => {
    const env = environment();
    login(env, jwt('first', 60));
    const old = env.auth.getBearerToken();
    const renewed = jwt('renewed', 1200);
    assert.equal(env.auth.renewToken(old, renewed, 'Bearer'), true);
    assert.equal(
      env.auth.getAuthStore().token.expiresAt,
      env.auth.getTokenExpiresAt(renewed),
    );
    assert.equal(env.auth.renewToken(old, jwt('late'), 'Bearer'), false);
  },
);
check('logout revokes before clearing and blocks late renewal', async () => {
  const env = environment();
  login(env);
  const old = env.auth.getBearerToken();
  let finish;
  let sent;
  const pending = env.auth.endSession((bearer) => {
    sent = bearer;
    return new Promise((resolve) => {
      finish = resolve;
    });
  });
  await Promise.resolve();
  assert.equal(sent, old);
  assert.equal(env.auth.getBearerToken(), old);
  assert.equal(env.auth.renewToken(old, jwt('during-logout'), 'Bearer'), false);
  finish();
  await pending;
  assert.equal(env.auth.getBearerToken(), '');
  assert.equal(env.auth.renewToken(old, jwt('after-logout'), 'Bearer'), false);
});
check(
  'revocation failure clears local state and stays observable',
  async () => {
    const env = environment();
    login(env);
    await assert.rejects(
      env.auth.endSession(async () => {
        throw new Error('offline');
      }),
      /offline/,
    );
    assert.equal(env.auth.getBearerToken(), '');
  },
);
check('old logout cannot clear a different new login', async () => {
  const env = environment();
  login(env, jwt('old'));
  let finish;
  const pending = env.auth.endSession(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await Promise.resolve();
  const next = jwt('new');
  login(env, next);
  finish();
  await pending;
  assert.equal(env.auth.getAuthStore().token.accessToken, next);
});
function connection(env) {
  let invalid = 0;
  const messages = [];
  const client = new env.SessionSocket({
    status() {},
    message: (data) => messages.push(data),
    invalidSession: () => {
      invalid++;
      env.auth.clearAuthStore();
    },
  });
  const unsubscribe = env.auth.subscribeAuthChanges(
    client.refreshAuthentication,
  );
  client.connect();
  return { client, messages, unsubscribe, invalid: () => invalid };
}
check('network close clears socket reference and reconnects', () => {
  const env = environment();
  login(env);
  const { client } = connection(env);
  env.sockets[0].close(1006);
  assert.equal(env.timers.size, 1);
  const [id, callback] = [...env.timers][0];
  env.timers.delete(id);
  callback();
  assert.equal(env.sockets.length, 2);
  client.close();
  assert.equal(env.timers.size, 0);
});
check('manual close and disabled reconnect do not reconnect', () => {
  const env = environment();
  login(env);
  const { client } = connection(env);
  client.close();
  assert.equal(env.timers.size, 0);
  client.connect();
  client.setAutoReconnect(false);
  env.sockets[1].close(1006);
  assert.equal(env.timers.size, 0);
});
check('1008 invalidates session without retrying revoked credentials', () => {
  const env = environment();
  login(env);
  const current = connection(env);
  env.sockets[0].close(1008);
  assert.equal(current.invalid(), 1);
  assert.equal(env.auth.getBearerToken(), '');
  assert.equal(env.timers.size, 0);
});
check(
  'renewal replaces socket and old callbacks cannot affect new socket',
  () => {
    const env = environment();
    login(env);
    const current = connection(env);
    const oldSocket = env.sockets[0];
    const oldBearer = env.auth.getBearerToken();
    const renewed = jwt('renewed');
    env.auth.renewToken(oldBearer, renewed, 'Bearer');
    assert.equal(env.sockets.length, 2);
    const newSocket = env.sockets[1];
    assert.equal(new URL(newSocket.url).protocol, 'wss:');
    assert.equal(
      new URL(newSocket.url).searchParams.get('token'),
      `Bearer ${renewed}`,
    );
    oldSocket.onclose({ code: 1008 });
    oldSocket.onmessage({ data: '{"stale":true}' });
    assert.equal(current.invalid(), 0);
    assert.equal(current.messages.length, 0);
    newSocket.open();
    assert.equal(current.client.send({ ping: true }), true);
    current.client.close();
    current.unsubscribe();
  },
);
check(
  'logout/storage changes stop active websocket and pending reconnect',
  () => {
    const env = environment();
    login(env);
    const current = connection(env);
    env.sockets[0].close(1006);
    env.store.delete(env.auth.AUTH_STORE_KEY);
    const event = new Event('storage');
    Object.defineProperty(event, 'key', { value: env.auth.AUTH_STORE_KEY });
    env.window.dispatchEvent(event);
    assert.equal(env.timers.size, 0);
    assert.equal(current.client.send('stale'), false);
  },
);
check(
  'valid Token migration removes leftover SK fields from persistent storage',
  () => {
    const env = environment();
    login(env);
    const raw = JSON.parse(env.store.get(env.auth.AUTH_STORE_KEY));
    raw.aksk = { ak: 'legacy', sk: 'must-remove' };
    env.store.set(env.auth.AUTH_STORE_KEY, JSON.stringify(raw));
    env.auth.getAuthStore();
    assert.equal(
      env.store.get(env.auth.AUTH_STORE_KEY).includes('must-remove'),
      false,
    );
  },
);
check(
  'request interceptor sends Bearer only to protected API and preserves logout snapshot',
  () => {
    const env = environment();
    login(env);
    const intercept = env.app().request.requestInterceptors[0];
    const config = intercept({ url: '/api/v1/app/list', headers: {} });
    assert.equal(config.headers.Authorization, env.auth.getBearerToken());
    assert.equal(config.headers.sk, undefined);
    assert.equal(
      intercept({ url: '/api/v1/login', headers: {} }).headers.Authorization,
      undefined,
    );
    assert.equal(
      intercept({ url: 'https://external.test/', headers: {} }).headers
        .Authorization,
      undefined,
    );
    assert.equal(
      intercept({
        url: '/api/v1/logout',
        headers: { Authorization: 'Bearer snapshot' },
      }).headers.Authorization,
      'Bearer snapshot',
    );
  },
);
check(
  'request header access handles method defaults and callable getters',
  () => {
    const env = environment();
    login(env);
    const intercept = env.app().request.requestInterceptors[0];
    for (const headers of [
      undefined,
      {},
      { get: {} },
      { get: 'not-a-function' },
    ]) {
      const config = intercept({ url: '/api/v1/app/list', headers });
      assert.equal(config.headers.Authorization, env.auth.getBearerToken());
    }
    for (const key of ['Authorization', 'authorization']) {
      const headers = { get: {}, [key]: 'Bearer snapshot' };
      assert.equal(
        intercept({ url: '/api/v1/logout', headers }).headers,
        headers,
      );
    }
    const headers = {
      value: 'Bearer snapshot',
      get(name) {
        assert.equal(this, headers);
        assert.equal(name, 'Authorization');
        return this.value;
      },
    };
    assert.equal(
      intercept({ url: '/api/v1/logout', headers }).headers,
      headers,
    );
    headers.value = env.auth.getBearerToken();
    const renewed = jwt('getter-renewed');
    env.app().request.responseInterceptors[0]({
      status: 200,
      config: { headers },
      data: { new_access_token: renewed, token_type: 'Bearer' },
    });
    assert.equal(env.auth.getAuthStore().token.accessToken, renewed);
  },
);
check(
  'installed Umi Axios sends requests, preserves logout and renews tokens',
  async () => {
    // Resolve the same Axios dependency as Umi, rather than mock its header shape.
    const fromMax = createRequire(require.resolve('@umijs/max/package.json'));
    const fromPlugins = createRequire(
      fromMax.resolve('@umijs/plugins/package.json'),
    );
    const axios = fromPlugins('axios');
    const env = environment();
    login(env);
    const sent = [];
    let data = { code: 200 };
    const client = axios.create({
      adapter: async (config) => {
        sent.push(config);
        return { status: 200, statusText: 'OK', headers: {}, config, data };
      },
    });
    const app = env.app();
    for (const intercept of app.request.requestInterceptors)
      client.interceptors.request.use(intercept);
    for (const intercept of app.request.responseInterceptors)
      client.interceptors.response.use(intercept);
    for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
      await client.request({ method, url: '/api/v1/app/list' });
      assert.equal(
        sent.at(-1).headers.Authorization,
        env.auth.getBearerToken(),
      );
    }
    const snapshot = env.auth.getBearerToken();
    login(env, jwt('new-login'));
    await client.post('/api/v1/logout', undefined, {
      headers: { Authorization: snapshot },
    });
    assert.equal(sent.at(-1).headers.Authorization, snapshot);
    for (const url of ['/api/v1/login', 'https://external.test/']) {
      await client.get(url);
      assert.equal(sent.at(-1).headers.Authorization, undefined);
    }
    const beforeRenewal = env.auth.getBearerToken();
    const renewed = jwt('axios-renewed', 1200);
    data = { code: 200, new_access_token: renewed, token_type: 'Bearer' };
    await client.get('/api/v1/app/list');
    assert.equal(sent.at(-1).headers.Authorization, beforeRenewal);
    assert.equal(env.auth.getAuthStore().token.accessToken, renewed);
  },
);
check(
  'actual response and 401 interceptors keep renewed session safe from stale requests',
  () => {
    const env = environment();
    login(env);
    const previous = env.auth.getBearerToken();
    const app = env.app();
    const renewed = jwt('intercepted', 1200);
    app.request.responseInterceptors[0]({
      status: 200,
      config: { headers: { Authorization: previous } },
      data: { new_access_token: renewed, token_type: 'Bearer' },
    });
    const unauthorized = (bearer) => ({
      response: {
        status: 401,
        config: { url: '/api/v1/app/list', headers: { Authorization: bearer } },
      },
    });
    assert.throws(() =>
      app.request.errorConfig.errorHandler(unauthorized(previous), {}),
    );
    assert.equal(env.auth.getAuthStore().token.accessToken, renewed);
    assert.throws(() =>
      app.request.errorConfig.errorHandler(
        unauthorized(env.auth.getBearerToken()),
        {},
      ),
    );
    assert.equal(env.auth.getBearerToken(), '');
    assert.equal(env.history.location.pathname, '/user/login');
    assert.doesNotThrow(() =>
      app.request.errorConfig.errorThrower({ access_token: renewed }),
    );
  },
);
check('unauthenticated API 401 redirects to login', () => {
  const env = environment();
  const error = {
    response: { status: 401, config: { url: '/api/v1/app/list' } },
  };
  assert.throws(() => env.app().request.errorConfig.errorHandler(error, {}));
  assert.equal(env.history.location.pathname, '/user/login');
});
check(
  'layout logout calls backend and reports failed revocation truthfully',
  async () => {
    for (const failed of [false, true]) {
      const env = environment();
      login(env);
      const bearer = env.auth.getBearerToken();
      if (failed)
        env.requestResult(async () => {
          throw new Error('offline');
        });
      const layout = env.app().layout({
        initialState: await env.app().getInitialState(),
        setInitialState() {},
      });
      await layout.logout();
      assert.equal(env.requests[0].url, '/api/v1/logout');
      assert.equal(env.requests[0].method, 'POST');
      assert.equal(env.requests[0].headers.Authorization, bearer);
      assert.equal(env.auth.getBearerToken(), '');
      assert.equal(env.history.location.pathname, '/user/login');
      assert.equal(env.notifications.length, failed ? 1 : 0);
    }
  },
);
(async () => {
  for (const [name, fn] of cases) {
    await fn();
    console.log(`PASS ${name}`);
  }
  console.log(
    `${cases.length} authentication and WebSocket regression checks passed`,
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
