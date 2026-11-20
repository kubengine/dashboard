// 使用 playwright-cli run-code --filename=tests/deploymentReleases.browser.cjs。
// 仅访问 tests/deployment_release_browser_server.py 的本机隔离服务。
async function verifyDeploymentReleases(page) {
  const base = 'http://127.0.0.1:18080';
  const target = `${base}/resources/deployment/apps/example`;
  const api = `${base}/api/v1/k8s/deployments/apps/example`;
  const check = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const login = async (role) => {
    await page.goto(`${base}/api/v1/health`);
    await page.evaluate((role) => {
      sessionStorage.clear();
      localStorage.setItem(
        'PRO_AUTH_STORE',
        JSON.stringify({
          authType: 'token',
          token: {
            accessToken:
              role +
              '.' +
              btoa(
                JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 7200 }),
              ) +
              '.isolated',
            tokenType: 'Bearer',
            username: role,
          },
        }),
      );
    }, role);
    await page.goto(target);
    await page.getByText('Kubernetes 原生发布历史', { exact: true }).waitFor();
    await page
      .getByRole('button', { name: '刷新原生历史', exact: true })
      .waitFor();
  };
  const headers = async () => ({
    Authorization:
      'Bearer ' +
      (await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem('PRO_AUTH_STORE')).token.accessToken,
      )),
  });
  const results = [];
  for (const role of ['namespace_operator', 'platform_admin']) {
    await page.request.post(`${base}/__test__/reset`);
    await login(role);
    const open = page.getByRole('button', { name: '更新镜像', exact: true });
    await page.waitForFunction(() =>
      [...document.querySelectorAll('button')].some(
        (button) => button.textContent === '更新镜像' && !button.disabled,
      ),
    );
    await open.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('checkbox', { name: '更新容器 app' }).check();
    const input = dialog.getByRole('textbox', { name: 'app 目标镜像' });
    await input.fill('local/app:v2');
    await dialog.getByRole('button', { name: '执行预检' }).click();
    const confirm = dialog.getByRole('button', { name: '确认发布' });
    await page.waitForFunction(
      () =>
        !document.querySelector('.ant-modal-footer .ant-btn-primary')?.disabled,
    );
    check(
      (await dialog.innerText()).includes('local/app:v2'),
      '差异缺少目标镜像',
    );
    check(
      !(await dialog.innerText()).includes('SENSITIVE-VALUE'),
      '差异泄露敏感值',
    );
    await input.fill('local/app:v3');
    check(await confirm.isDisabled(), '修改输入后旧预检仍可提交');
    await dialog.getByRole('button', { name: '执行预检' }).click();
    await page.waitForFunction(
      () =>
        !document.querySelector('.ant-modal-footer .ant-btn-primary')?.disabled,
    );
    await page.evaluate(() => {
      const button = document.querySelector(
        '.ant-modal-footer .ant-btn-primary',
      );
      button.click();
      button.click();
    });
    await dialog.waitFor({ state: 'hidden' });
    await page.reload();
    await page
      .getByText('目标配置已被观察且所有副本均就绪可用', { exact: true })
      .waitFor({ timeout: 15000 });
    const records = (
      await (
        await page.request.get(api + '/operations', {
          headers: await headers(),
        })
      ).json()
    ).data;
    check(
      records.items.length === 1 && records.items[0].action === 'image',
      '重复点击创建了额外操作或动作错误',
    );
    await page
      .getByRole('button', { name: '刷新原生历史', exact: true })
      .click();
    await page
      .getByRole('button', { name: '预览回滚到 revision 1', exact: true })
      .click();
    await dialog.getByRole('button', { name: '执行预检' }).click();
    await page.waitForFunction(
      () =>
        !document.querySelector('.ant-modal-footer .ant-btn-primary')?.disabled,
    );
    check(
      (await dialog.innerText()).includes('仅恢复历史 Pod 模板'),
      '回滚边界说明缺失',
    );
    await dialog.getByRole('button', { name: '确认发布' }).click();
    await dialog.waitFor({ state: 'hidden' });
    await page.getByText('回滚来源原生 revision', { exact: true }).waitFor();
    await page
      .getByText('目标配置已被观察且所有副本均就绪可用', { exact: true })
      .waitFor({ timeout: 15000 });
    const rolled = (
      await (
        await page.request.get(api + '/operations', {
          headers: await headers(),
        })
      ).json()
    ).data;
    check(
      rolled.items[0].action === 'rollback' && rolled.current.replicas === 1,
      '回滚动作或副本数错误',
    );
    results.push({
      role,
      image: 'passed',
      rollback: 'passed',
      refresh: 'passed',
      keyboard: 'passed',
      duplicateClick: 'passed',
    });
  }
  await page.request.post(`${base}/__test__/reset`);
  await login('readonly');
  check(
    (await page
      .getByRole('button', { name: '更新镜像', exact: true })
      .count()) === 0,
    '只读用户可见发布入口',
  );
  check(
    (await page
      .getByRole('button', { name: '预览回滚到 revision 1' })
      .count()) === 0,
    '只读用户可见回滚入口',
  );
  const history = await page.request.get(api + '/history', {
    headers: await headers(),
  });
  check(history.status() === 200, '只读用户无法读取历史');
  const h = (await history.json()).data;
  for (const action of ['image', 'rollback']) {
    const body = {
      uid: h.uid,
      resource_version: h.resourceVersion,
      ...(action === 'image'
        ? { containers: [{ name: 'app', image: 'local/app:v2' }] }
        : { revision: '1', replica_set_uid: 'rs-old' }),
    };
    check(
      (
        await page.request.post(api + '/' + action + '/preview', {
          headers: await headers(),
          data: body,
        })
      ).status() === 403,
      '只读预检越权',
    );
    check(
      (
        await page.request.post(api + '/' + action, {
          headers: await headers(),
          data: { ...body, request_id: 'readonly', preview_token: 'invalid' },
        })
      ).status() === 403,
      '只读写入越权',
    );
  }
  check(
    (
      await page.request.get(api.replace('/apps/', '/other/') + '/history', {
        headers: await headers(),
      })
    ).status() === 403,
    '跨命名空间历史越权',
  );
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  check(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    '375px 页面出现横向溢出',
  );
  await page.screenshot({
    path: '/tmp/deployment-release-readonly-mobile.png',
    fullPage: true,
  });
  results.push({
    role: 'readonly',
    history: 'passed',
    directAccess: 'passed',
    namespaceBoundary: 'passed',
    mobile375: 'passed',
  });
  return results;
}
