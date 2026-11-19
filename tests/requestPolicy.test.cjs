const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync('src/utils/requestPolicy.ts', 'utf8');
const exportsObject = {};
vm.runInNewContext(
  ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText,
  { exports: exportsObject, Blob, URL, Date },
);
const {
  createRequestPolicy,
  ApiError,
  normalizeError,
  getRequestErrorMessage,
  isSuccessCode,
} = exportsObject;
function setup() {
  const state = {
    bearer: 'Bearer current',
    path: '/resources',
    notices: [],
    redirects: 0,
    cleared: 0,
    renewals: [],
    now: 0,
    deferRedirect: false,
  };
  const policy = createRequestPolicy({
    origin: () => 'http://app.test',
    bearer: () => state.bearer,
    pathname: () => state.path,
    clearSession: () => {
      state.bearer = '';
      state.cleared++;
    },
    redirectToLogin: () => {
      if (!state.deferRedirect) state.path = '/user/login';
      state.redirects++;
    },
    renew: (...args) => state.renewals.push(args),
    requestId: () => 'test-request-id',
    notify: (value) => state.notices.push(value),
    now: () => state.now,
  });
  return { policy, state };
}
const options = (extra = {}) => ({
  url: '/api/v1/test',
  method: 'GET',
  headers: { Authorization: 'Bearer current' },
  ...extra,
});
const response = (status, data, config = options()) => ({
  status,
  data,
  config,
  headers: { 'x-request-id': 'server-request-id' },
});
async function rejection(promise) {
  try {
    await promise;
    assert.fail('expected rejection');
  } catch (error) {
    assert.ok(error instanceof ApiError);
    return error;
  }
}
test('injects auth and request IDs only for same-origin APIs, login has no implicit token', () => {
  const { policy } = setup();
  const normal = policy.prepare({ url: '/api/v1/test' });
  assert.equal(normal.headers.Authorization, 'Bearer current');
  assert.equal(normal.headers['X-Request-ID'], 'test-request-id');
  assert.equal(
    policy.prepare({ url: '/api/v1/login' }).headers.Authorization,
    undefined,
  );
  assert.equal(
    policy.prepare({ url: 'https://other.test/api/v1/test' }).headers,
    undefined,
  );
  assert.equal(
    policy.prepare(
      options({
        headers: {
          authorization: 'Bearer explicit',
          'X-Request-ID': 'existing',
        },
      }),
    ).headers['X-Request-ID'],
    'existing',
  );
});
for (const code of [200, 201, 202, 204, 206])
  test(`accepts success ${code}`, async () => {
    const { policy } = setup();
    const result = await policy.fulfilled(
      response(code === 204 ? 200 : code, { code, message: 'ok', data: null }),
    );
    assert.equal(result.data.code, code);
    assert.ok(isSuccessCode(code));
  });
test('HTTP 204 empty body becomes a valid success envelope', async () => {
  const { policy } = setup();
  const result = await policy.fulfilled(response(204, ''));
  assert.equal(result.data.code, 204);
  assert.equal(result.data.data, null);
});
test('legacy HTTP 200 envelope error preserves business status and response context', async () => {
  const { policy, state } = setup();
  const error = await rejection(
    policy.fulfilled(response(200, { code: 409, message: 'resource changed' })),
  );
  assert.equal(error.code, 409);
  assert.equal(error.httpStatus, 200);
  assert.equal(error.kind, 'conflict');
  assert.throws(() => policy.handle(error), ApiError);
  assert.equal(state.notices.length, 1);
});
test('local and legacy skipErrorHandler never show duplicate global feedback', async () => {
  const { policy, state } = setup();
  const error = await rejection(
    policy.rejected({
      response: response(403, { code: 403, message: 'no permission' }),
    }),
  );
  assert.throws(() => policy.handle(error, { errorMode: 'local' }), ApiError);
  assert.throws(
    () => policy.handle(error, { skipErrorHandler: true }),
    ApiError,
  );
  assert.equal(state.notices.length, 0);
  assert.equal(getRequestErrorMessage(error), 'no permission');
  policy.show(error);
  policy.show(error);
  assert.equal(state.notices.length, 1);
});
for (const mode of ['local', 'silent'])
  test(`401 clears current session even in ${mode} mode`, async () => {
    const { policy, state } = setup();
    const original = {
      response: response(401, {
        code: 401,
        message: 'expired',
        error_code: 'AUTH_REQUIRED',
      }),
    };
    const error = await rejection(policy.rejected(original));
    assert.throws(() => policy.handle(error, { errorMode: mode }), ApiError);
    await rejection(policy.rejected(original));
    assert.equal(state.cleared, 1);
    assert.equal(state.redirects, 1);
    assert.equal(state.notices.length, 1);
    assert.equal(getRequestErrorMessage(error), '');
  });
test('late 401 never clears newer login/renewed token', async () => {
  const { policy, state } = setup();
  state.bearer = 'Bearer newer';
  const error = await rejection(
    policy.rejected({ response: response(401, { code: 401 }) }),
  );
  assert.throws(() => policy.handle(error), ApiError);
  assert.equal(state.cleared, 0);
  assert.equal(state.redirects, 0);
  assert.equal(state.notices.length, 0);
  assert.equal(error.stale, true);
});
test('unauthenticated route guard and concurrent 401s share one login notice', async () => {
  const { policy, state } = setup();
  state.bearer = '';
  state.deferRedirect = true;
  policy.requireLogin();
  for (const url of [
    '/api/v1/k8s/resource/namespace',
    '/api/v1/k8s/resource/pod',
  ]) {
    const error = await rejection(
      policy.rejected({
        response: response(401, { code: 401 }, options({ url, headers: {} })),
      }),
    );
    assert.throws(() => policy.handle(error), ApiError);
    policy.show(error);
  }
  assert.equal(state.notices.length, 1);
  assert.equal(state.redirects, 1);
  assert.equal(state.notices[0].key, 'auth:required');
});
test('delayed 401s do not prompt again after the notification deduplication window', async () => {
  const { policy, state } = setup();
  state.deferRedirect = true;
  await rejection(policy.rejected({ response: response(401, { code: 401 }) }));
  state.now = 10000;
  policy.requireLogin();
  await rejection(policy.rejected({ response: response(401, { code: 401 }) }));
  assert.equal(state.notices.length, 1);
  assert.equal(state.redirects, 1);
  assert.equal(state.cleared, 1);
});
test('a new authenticated session can show its own subsequent login expiry', async () => {
  const { policy, state } = setup();
  policy.requireLogin();
  state.bearer = 'Bearer next-session';
  state.path = '/resources';
  const config = policy.prepare(
    options({ headers: { Authorization: state.bearer } }),
  );
  await rejection(
    policy.rejected({ response: response(401, { code: 401 }, config) }),
  );
  assert.equal(state.notices.length, 2);
  assert.equal(state.redirects, 2);
  assert.equal(state.cleared, 2);
});
test('opening the login page itself does not show a login-expired notice', () => {
  const { policy, state } = setup();
  state.bearer = '';
  state.path = '/user/login';
  policy.requireLogin();
  assert.equal(state.notices.length, 0);
  assert.equal(state.redirects, 0);
});
test('login failures stay inline and do not clear an existing session', async () => {
  const { policy, state } = setup();
  const error = await rejection(
    policy.rejected({
      response: response(
        401,
        { code: 401, message: '用户名或密码错误' },
        options({ url: '/api/v1/login', method: 'POST' }),
      ),
    }),
  );
  assert.throws(() => policy.handle(error, { errorMode: 'local' }), ApiError);
  assert.equal(getRequestErrorMessage(error), '用户名或密码错误');
  assert.equal(state.cleared, 0);
  assert.equal(state.notices.length, 0);
});
test('upstream authentication failure does not invalidate app login', async () => {
  const { policy, state } = setup();
  const error = await rejection(
    policy.rejected({
      response: response(502, {
        code: 502,
        message: '仓库认证失败',
        error_code: 'UPSTREAM_AUTH_ERROR',
      }),
    }),
  );
  assert.equal(error.kind, 'upstream');
  assert.equal(state.cleared, 0);
  assert.equal(state.redirects, 0);
});
test('cancelled requests are silent and are never described as network failure', async () => {
  const { policy, state } = setup();
  const error = await rejection(
    policy.rejected({ code: 'ERR_CANCELED', name: 'CanceledError' }),
  );
  assert.throws(() => policy.handle(error), ApiError);
  policy.show(error);
  assert.equal(error.kind, 'cancelled');
  assert.equal(state.notices.length, 0);
  assert.equal(getRequestErrorMessage(error), '');
});
test('timeouts and network mutations preserve uncertainty and never retry writes', async () => {
  const { policy, state } = setup();
  const error = await rejection(
    policy.rejected({
      code: 'ECONNABORTED',
      config: options({ method: 'POST' }),
    }),
  );
  assert.equal(error.kind, 'timeout');
  assert.equal(error.uncertain, true);
  assert.match(error.message, /先刷新核对/);
  assert.equal(state.renewals.length, 0);
});
test('validation fields are structured without echoing raw inputs', async () => {
  const { policy } = setup();
  const error = await rejection(
    policy.rejected({
      response: response(422, {
        code: 422,
        message: '输入错误',
        details: [
          {
            loc: ['body', 'name'],
            type: 'missing',
            msg: 'Field required',
            input: 'private-value',
          },
        ],
      }),
    }),
  );
  assert.equal(error.kind, 'validation');
  assert.match(getRequestErrorMessage(error), /name: 必填项不能为空/);
  assert.ok(!JSON.stringify(error).includes('private-value'));
});
test('binary download JSON errors are decoded; attachments remain bytes', async () => {
  const { policy } = setup();
  const res = response(
    413,
    new Blob([JSON.stringify({ code: 413, message: '文件太大' })]),
  );
  const error = await rejection(policy.rejected({ response: res }));
  assert.equal(error.message, '文件太大');
  const blob = new Blob([
    JSON.stringify({ code: 500, message: 'legitimate file' }),
  ]);
  const attachment = response(200, blob, options({ responseType: 'blob' }));
  attachment.headers = {
    'content-type': 'application/json',
    'content-disposition': 'attachment; filename=file.json',
  };
  assert.equal((await policy.fulfilled(attachment)).data, blob);
});
test('HTTP 200 Blob-wrapped JSON failures cannot be downloaded as success', async () => {
  const { policy } = setup();
  const res = response(
    200,
    new Blob([JSON.stringify({ code: 500, message: 'bad download' })]),
    options({ responseType: 'blob' }),
  );
  res.headers['content-type'] = 'application/json';
  assert.equal((await rejection(policy.fulfilled(res))).code, 500);
});
test('malformed API success is a protocol failure; raw login and health remain compatible', async () => {
  const { policy } = setup();
  assert.equal(
    (
      await rejection(
        policy.fulfilled(response(200, '<html>proxy page</html>')),
      )
    ).kind,
    'protocol',
  );
  assert.equal(
    (
      await policy.fulfilled(
        response(
          200,
          { access_token: 'token' },
          options({ url: '/api/v1/login' }),
        ),
      )
    ).data.access_token,
    'token',
  );
  assert.equal(
    (
      await policy.fulfilled(
        response(
          200,
          { status: 'healthy' },
          options({ url: '/api/v1/health' }),
        ),
      )
    ).data.status,
    'healthy',
  );
});
test('normalization does not retain request bodies, bearer headers, or URL query secrets', () => {
  const error = normalizeError({
    config: options({
      url: '/api/v1/test?token=secret-query',
      data: { password: 'secret-body' },
      headers: { Authorization: 'Bearer secret-header' },
    }),
    response: {
      status: 500,
      data: { code: 500 },
      config: options({
        url: '/api/v1/test?token=secret-query',
        data: { password: 'secret-body' },
        headers: { Authorization: 'Bearer secret-header' },
      }),
    },
  });
  assert.ok(!JSON.stringify(error).includes('secret-'));
});
test('deduplicates parallel errors, expires notices, and marks caught errors handled', async () => {
  const { policy, state } = setup();
  for (let index = 0; index < 3; index++) {
    const error = await rejection(
      policy.rejected({
        response: response(503, { code: 503, message: 'unavailable' }),
      }),
    );
    assert.throws(() => policy.handle(error), ApiError);
    policy.show(error);
  }
  assert.equal(state.notices.length, 1);
  state.now = 4000;
  const error = await rejection(
    policy.rejected({
      response: response(503, { code: 503, message: 'unavailable' }),
    }),
  );
  assert.throws(() => policy.handle(error), ApiError);
  assert.equal(state.notices.length, 2);
});
test('renewal receives the original request token and works on non-auth errors', async () => {
  const { policy, state } = setup();
  await policy.fulfilled(
    response(200, {
      code: 200,
      new_access_token: 'renewed',
      token_type: 'Bearer',
    }),
  );
  await rejection(
    policy.rejected({
      response: response(409, {
        code: 409,
        new_access_token: 'renewed-on-error',
        token_type: 'Bearer',
      }),
    }),
  );
  assert.equal(state.renewals.length, 2);
  assert.equal(state.renewals[0][0], 'Bearer current');
});
test('legacy business 401 is treated as upstream failure instead of login invalidation', async () => {
  const { policy, state } = setup();
  const error = await rejection(
    policy.fulfilled(
      response(200, { code: 401, message: 'upstream unauthorized' }),
    ),
  );
  assert.equal(error.kind, 'upstream');
  assert.equal(state.cleared, 0);
  assert.equal(state.redirects, 0);
});
test('legacy success:false fails even without a business code', async () => {
  const { policy } = setup();
  const error = await rejection(
    policy.fulfilled(
      response(200, { success: false, message: 'business failed' }),
    ),
  );
  assert.equal(error.code, 400);
  assert.equal(error.kind, 'business');
});
test('renewal from error headers is consumed without retaining token in error object', async () => {
  const { policy, state } = setup();
  const res = response(422, { code: 422, message: 'invalid' });
  res.headers['X-New-Access-Token'] = 'secret-new-token';
  res.headers['X-Token-Type'] = 'Bearer';
  const error = await rejection(policy.rejected({ response: res }));
  assert.equal(state.renewals[0][1], 'secret-new-token');
  assert.ok(!JSON.stringify(error).includes('secret-new-token'));
});
test('plain legacy GET header defaults and native Headers are both supported', () => {
  const { policy } = setup();
  assert.equal(
    policy.prepare(options({ headers: { get: {} } })).headers.Authorization,
    'Bearer current',
  );
  assert.equal(
    policy.prepare(
      options({ headers: new Headers({ Authorization: 'Bearer explicit' }) }),
    ).headers.authorization,
    'Bearer explicit',
  );
});
test('rate limits preserve Retry-After and silent failures remain rejected without notice', async () => {
  const { policy, state } = setup();
  const res = response(429, { code: 429, message: 'slow down' });
  res.headers['retry-after'] = '7';
  const error = await rejection(policy.rejected({ response: res }));
  assert.equal(error.retryAfter, '7');
  assert.throws(() => policy.handle(error, { errorMode: 'silent' }), ApiError);
  policy.show(error);
  assert.equal(state.notices.length, 0);
});
test('ordinary JavaScript errors are not mislabeled as a network failure', () => {
  const error = normalizeError({
    message: 'internal callback failure',
    config: options({ method: 'POST' }),
  });
  assert.equal(error.kind, 'business');
  assert.equal(error.uncertain, false);
  assert.ok(!error.message.includes('网络'));
});
test('custom business codes do not imply an uncertain server-side mutation', async () => {
  const { policy } = setup();
  const error = await rejection(
    policy.fulfilled(
      response(
        200,
        { code: 1001, message: '资源校验失败' },
        options({ method: 'POST' }),
      ),
    ),
  );
  assert.equal(error.kind, 'business');
  assert.equal(error.uncertain, false);
});
