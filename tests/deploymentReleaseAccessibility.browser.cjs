// 仅访问本机隔离 SDK 服务；键盘与移动端弹窗检查。
async function verifyDeploymentReleaseAccessibility(page) {
  const base = 'http://127.0.0.1:18080';
  const check = (condition, message) => {
    if (!condition) throw new Error(message);
  };
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
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(base + '/resources/deployment/apps/example');
  await page.getByRole('button', { name: '更新镜像', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('checkbox', { name: '更新容器 app' }).check();
  await dialog
    .getByRole('textbox', { name: 'app 目标镜像' })
    .fill('registry.local:5000/team/app@sha256:' + 'a'.repeat(64));
  await dialog.getByRole('button', { name: '执行预检' }).click();
  await page.waitForFunction(
    () =>
      !document.querySelector('.ant-modal-footer .ant-btn-primary')?.disabled,
  );
  check(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    '375px 弹窗导致页面溢出',
  );
  await page.screenshot({
    path: '/tmp/deployment-release-preview-mobile.png',
    fullPage: true,
  });
  await dialog.getByRole('checkbox', { name: '更新容器 app' }).focus();
  for (let i = 0; i < 16; i++) {
    await page.keyboard.press('Tab');
    check(
      await dialog.evaluate((element) =>
        element.contains(document.activeElement),
      ),
      '焦点逃离弹窗',
    );
  }
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden' });
  check(
    await page
      .getByRole('button', { name: '更新镜像', exact: true })
      .evaluate((element) => element === document.activeElement),
    '关闭弹窗后焦点未返回入口',
  );
  await page.setViewportSize({ width: 812, height: 375 });
  await page.getByRole('button', { name: '更新镜像', exact: true }).click();
  check(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    '横屏弹窗导致页面溢出',
  );
  await page.keyboard.press('Escape');
  return {
    mobile375: 'passed',
    landscape812: 'passed',
    reducedMotion: 'passed',
    focusTrap: 'passed',
    escapeAndFocusReturn: 'passed',
  };
}
