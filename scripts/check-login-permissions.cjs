// Exercise the real login form handler with anonymous and previous-role state.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function load(name, dependencies) {
  const module = { exports: {} };
  const compiled = ts.transpileModule(
    fs.readFileSync(path.join(root, name), 'utf8'),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.React,
        esModuleInterop: true,
      },
    },
  ).outputText;
  vm.runInNewContext(compiled, {
    module,
    exports: module.exports,
    require: (name) => {
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      if (name.endsWith('.less')) return {};
      throw new Error('Unexpected dependency: ' + name);
    },
  });
  return module.exports.default;
}
const access = load('src/access.ts', {});
const noop = () => null;
const Form = Object.assign(() => null, { Item: noop });
const Input = Object.assign(() => null, { Password: noop });
const react = {
  useState: (value) => [value, noop],
  createElement: (type, props, ...children) => ({ type, props, children }),
};
const findForm = (element) => {
  if (element?.type === Form) return element;
  for (const child of element?.children || []) {
    const result = findForm(child);
    if (result) return result;
  }
};
const user = (role) => ({ username: 'test', enabled: true, role });
(async () => {
  let checks = 0;
  for (const oldRole of [undefined, 'readonly', 'platform_admin']) {
    for (const role of ['platform_admin', 'namespace_operator', 'readonly']) {
      let state = {
        currentUser: oldRole ? user(oldRole) : undefined,
        avatar: 'old-avatar',
        user: { accessToken: 'old-token' },
      };
      const currentUser = user(role);
      const navigations = [];
      let saved;
      let pending;
      let publishing = false;
      const Login = load('src/pages/User/Login/index.tsx', {
        react,
        'react-dom': {
          flushSync: (publish) => {
            publishing = true;
            publish();
            publishing = false;
            if (pending) {
              pending();
              pending = undefined;
            }
          },
        },
        '@/components/Brand': noop,
        '@/services': {
          UserController: {
            login: async () => ({
              access_token: 'new-token',
              token_type: 'Bearer',
              expires_at: 'future',
            }),
          },
        },
        '@/services/IdentityController': {
          current_user: async () => currentUser,
        },
        '@/utils/auth': {
          saveToken: (token) => {
            saved = token;
            return { token };
          },
        },
        '@/utils/request': { getRequestErrorMessage: String },
        '@ant-design/icons': {},
        '@umijs/max': {
          Helmet: noop,
          history: {
            push: (destination) =>
              navigations.push({ destination, admin: access(state).admin }),
          },
          useModel: () => ({
            initialState: state,
            setInitialState: async (update) => {
              const commit = () => {
                state = typeof update === 'function' ? update(state) : update;
              };
              if (publishing) commit();
              else pending = commit;
            },
          }),
        },
        antd: { Form, Input, Button: () => null, Alert: () => null },
      });
      await findForm(Login()).props.onFinish({
        username: 'test',
        password: 'test-only',
      });
      assert.equal(state.currentUser, currentUser);
      assert.equal(state.user.accessToken, 'new-token');
      assert.equal(saved.accessToken, 'new-token');
      assert.equal(navigations.length, 1);
      assert.equal(navigations[0].admin, role === 'platform_admin');
      assert.equal(
        navigations[0].destination,
        role === 'platform_admin' ? '/home' : '/resources/pod',
      );
      checks++;
    }
  }
  console.log(`${checks} login role transition checks passed`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
