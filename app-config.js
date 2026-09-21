// 複製給其他人時，前端只需修改這個啟動網址；其他專屬設定由 GAS 讀取「設定檔」。
// 私人 Google Sheet 無法由靜態 GitHub 網頁直接讀取，故啟動網址不可省略。
(function (root) {
  'use strict';
  const BOOTSTRAP_API_URL = 'https://script.google.com/macros/s/AKfycbxe7e6g3TOC0mPoQZPIKabS10IHBCdkIIZUQ_ykjRluoQPHoLwPcwlHEmYYIreFD09fRQ/exec';
  const nativeFetch = root.fetch.bind(root);
  let cachedConfig = null;
  let expiresAt = 0;
  let pending = null;

  function get() {
    if (cachedConfig && Date.now() < expiresAt) return Promise.resolve(cachedConfig);
    if (pending) return pending;
    pending = (async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      try {
        const response = await nativeFetch(BOOTSTRAP_API_URL + '?action=getPublicConfig', {
          cache: 'no-store', signal: controller.signal
        });
        if (!response.ok) throw new Error('無法讀取系統設定');
        const result = await response.json();
        if (!result.success || !result.config) throw new Error(result.message || '系統設定尚未完成');
        const config = result.config;
        if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(config.apiUrl)) {
          throw new Error('GAS 正式部署網址設定不正確');
        }
        if (!config.oneSignalAppId) throw new Error('缺少推播 App ID');
        cachedConfig = Object.freeze(config);
        expiresAt = Date.now() + 60000;
        return cachedConfig;
      } finally {
        clearTimeout(timeout);
      }
    })().finally(() => { pending = null; });
    return pending;
  }

  async function configuredFetch(input, options) {
    const url = new URL(String(input), root.location.href);
    const bootstrap = new URL(BOOTSTRAP_API_URL);
    if (url.origin !== bootstrap.origin || url.pathname !== bootstrap.pathname) {
      throw new Error('此請求不是記帳系統 API');
    }
    const config = await get();
    const target = new URL(config.apiUrl);
    target.search = url.search;
    return nativeFetch(target.href, { ...options, cache: 'no-store' });
  }

  root.PAWConfig = Object.freeze({ bootstrapUrl: BOOTSTRAP_API_URL, get, fetch: configuredFetch });
})(window);
