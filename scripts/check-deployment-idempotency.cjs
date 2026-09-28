const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');
const { createRequire } = require('module');
const path = require('path');
const root = path.resolve(__dirname, '..');
const load = createRequire(path.join(root, 'package.json'));
const ts = load('typescript');
const CryptoJS = load('crypto-js');
const entries = new Map();
let sessionId = 'session-one';
const storage = {
  getItem: (key) => entries.get(key) || null,
  setItem: (key, value) => entries.set(key, value),
  removeItem: (key) => entries.delete(key),
};
function moduleFor(storageApi = storage) {
  const source = fs.readFileSync(
    path.join(root, 'src/utils/deploymentSubmission.ts'),
    'utf8',
  );
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const context = {
    exports: {},
    sessionStorage: storageApi,
    crypto: require('crypto').webcrypto,
    require: (name) =>
      name === 'crypto-js' ? CryptoJS : { getAuthStore: () => ({ sessionId }) },
  };
  vm.runInNewContext(code, context);
  return context.exports.deploymentSubmission;
}
const submit = moduleFor();
const data = {
  name: 'example',
  config: { password: 'private-test-password', count: 2 },
};
const first = submit(data);
assert.equal(
  submit({
    config: { count: 2, password: 'private-test-password' },
    name: 'example',
  }).key,
  first.key,
);
assert.equal(moduleFor()(data).key, first.key); // reload after a lost response
assert.notEqual(submit({ ...data, name: 'second' }).key, first.key);
assert.ok(!JSON.stringify([...entries]).includes('private-test-password'));
assert.ok(/^[a-f0-9]{32}$/.test(first.key));
first.complete();
assert.notEqual(submit(data).key, first.key);
const previousSessionKey = submit(data).key;
sessionId = 'session-two';
assert.notEqual(submit(data).key, previousSessionKey);
const unavailable = moduleFor({
  getItem() {
    throw Error();
  },
  setItem() {
    throw Error();
  },
  removeItem() {
    throw Error();
  },
});
const cached = unavailable(data);
assert.equal(unavailable(data).key, cached.key);
cached.complete();
assert.notEqual(unavailable(data).key, cached.key);
console.log('9 deployment idempotency checks passed');
