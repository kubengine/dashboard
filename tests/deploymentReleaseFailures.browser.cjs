// 仅用于本机隔离 SDK 验收服务，使用 playwright-cli run-code 执行。
async function verifyDeploymentReleaseFailures(page) {
  const base = 'http://127.0.0.1:18080';
  const api = base + '/api/v1/k8s/deployments/apps/example';
  const target = base + '/resources/deployment/apps/example';
  const check = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const reset = async () => {
    await page.context().setOffline(false);
    await page.request.post(base + '/__test__/reset');
    await page.goto(base + '/api/v1/health');
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.setItem(
        'PRO_AUTH_STORE',
        JSON.stringify({
          authType: 'token',
          token: {
            accessToken:
              'namespace_operator.' +
              btoa(
                JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 7200 }),
              ) +
              '.isolated',
            tokenType: 'Bearer',
          },
        }),
      );
    });
    await page.goto(target);
    await page.waitForFunction(() =>
      [...document.querySelectorAll('button')].some(
        (button) => button.textContent === '更新镜像' && !button.disabled,
      ),
    );
  };
  const prepareImage = async (image = 'local/app:v2') => {
    await page.getByRole('button', { name: '更新镜像', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('checkbox', { name: '更新容器 app' }).check();
    await dialog.getByRole('textbox', { name: 'app 目标镜像' }).fill(image);
    await dialog.getByRole('button', { name: '执行预检' }).click();
    await page.waitForFunction(
      () =>
        !document.querySelector('.ant-modal-footer .ant-btn-primary')?.disabled,
    );
    return dialog;
  };
  const results = [];
  await page.setViewportSize({ width: 1280, height: 900 });
  await reset();
  let dialog = await prepareImage();
  await page.request.post(base + '/__test__/revoke');
  const rejected = page.waitForResponse(
    (response) =>
      response.url() === api + '/image' &&
      response.request().method() === 'POST',
  );
  await dialog.getByRole('button', { name: '确认发布' }).click();
  check((await rejected).status() === 403, '动态撤权后的写入未被后端拒绝');
  await dialog.waitFor({ state: 'hidden' });
  check(
    (await page
      .getByRole('button', { name: '更新镜像', exact: true })
      .count()) === 0,
    '撤权后仍可写',
  );
  results.push({ dynamicRevocation: 'passed' });

  await reset();
  await page
    .getByRole('button', { name: '预览回滚到 revision 1', exact: true })
    .click();
  dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: '执行预检' }).click();
  await page.waitForFunction(
    () =>
      !document.querySelector('.ant-modal-footer .ant-btn-primary')?.disabled,
  );
  await page.request.post(base + '/__test__/clear-history');
  await dialog.getByRole('button', { name: '确认发布' }).click();
  await dialog
    .getByText('来源历史已清理、变化或不属于当前 Deployment', { exact: true })
    .waitFor();
  check(
    await dialog.getByRole('button', { name: '确认发布' }).isDisabled(),
    '历史清理后旧预检仍有效',
  );
  await dialog.getByRole('button', { name: /取\s*消/ }).click();
  results.push({ historyDisappeared: 'passed' });

  await reset();
  dialog = await prepareImage('local/app:broken');
  await dialog.getByRole('button', { name: '确认发布' }).click();
  await dialog.waitFor({ state: 'hidden' });
  await page
    .getByText('ProgressDeadlineExceeded：发布超过集群进度期限', {
      exact: true,
    })
    .waitFor({ timeout: 15000 });
  await page
    .getByText('ImagePullBackOff：镜像拉取退避', { exact: true })
    .waitFor();
  check(
    !(await page.locator('.ke-deployment-operations').innerText()).includes(
      'SENSITIVE-VALUE',
    ),
    '失败诊断泄密',
  );
  await page.screenshot({
    path: '/tmp/deployment-release-image-failure.png',
    fullPage: true,
  });
  results.push({ imagePullFailure: 'passed', diagnostics: 'passed' });

  await reset();
  dialog = await prepareImage();
  await page.context().setOffline(true);
  await dialog.getByRole('button', { name: '确认发布' }).click();
  await page.waitForFunction(() =>
    Object.keys(sessionStorage).some((key) =>
      key.startsWith('deployment-request:'),
    ),
  );
  const pendingId = await page.evaluate(
    () =>
      JSON.parse(
        sessionStorage.getItem(
          Object.keys(sessionStorage).find((key) =>
            key.startsWith('deployment-request:'),
          ),
        ),
      ).body.request_id,
  );
  await dialog.getByRole('button', { name: /取\s*消/ }).click();
  await page.context().setOffline(false);
  await page.reload();
  await page.getByRole('button', { name: '核实原请求', exact: true }).click();
  await page
    .getByText('目标配置已被观察且所有副本均就绪可用', { exact: true })
    .waitFor({ timeout: 15000 });
  check(
    (await page.locator('.ke-deployment-operations').innerText()).includes(
      pendingId,
    ),
    '断网后未恢复原请求编号',
  );
  results.push({ offlineRecovery: 'passed', sameRequestId: pendingId });

  await reset();
  dialog = await prepareImage();
  await page.route(
    api + '/image',
    async (route) => {
      await route.fetch();
      await route.abort('failed');
    },
    { times: 1 },
  );
  await dialog.getByRole('button', { name: '确认发布' }).click();
  await page.waitForFunction(() =>
    Object.keys(sessionStorage).some((key) =>
      key.startsWith('deployment-request:'),
    ),
  );
  await page.reload();
  await page
    .getByText('目标配置已被观察且所有副本均就绪可用', { exact: true })
    .waitFor({ timeout: 15000 });
  check(
    (await page
      .locator('.ke-deployment-operations tbody')
      .last()
      .getByRole('button')
      .count()) === 1,
    '响应丢失后出现重复操作',
  );
  results.push({ lostHttpResponse: 'passed', refreshRecovery: 'passed' });

  await reset();
  await page.request.post(base + '/__test__/unauthenticated');
  await page.getByRole('button', { name: '刷新原生历史', exact: true }).click();
  await page.waitForURL('**/user/login', { timeout: 10000 });
  results.push({ unauthorized401: 'passed' });
  return results;
}
