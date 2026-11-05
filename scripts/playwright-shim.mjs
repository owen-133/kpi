// Re-exports the real Playwright module (ORBIT_PLAYWRIGHT_REAL) with a chromium.launch
// that honors CHROMIUM_PATH. Used through ORBIT_PLAYWRIGHT_PATH by scripts/env-for-tests.mjs.
const realEntry = process.env.ORBIT_PLAYWRIGHT_REAL;
if (!realEntry) throw new Error('ORBIT_PLAYWRIGHT_REAL is not set; run eval "$(node scripts/env-for-tests.mjs)"');

const real = await import(realEntry);
const realChromium = real.chromium ?? real.default?.chromium;
if (!realChromium) throw new Error(`no chromium export in ${realEntry}`);

const chromium = new Proxy(realChromium, {
  get(target, prop) {
    if (prop === 'launch') {
      return (options = {}) => {
        const launchOptions = {...options};
        if (process.env.CHROMIUM_PATH) launchOptions.executablePath = process.env.CHROMIUM_PATH;
        if (!options.args) launchOptions.args = ['--no-sandbox'];
        return target.launch(launchOptions);
      };
    }
    const value = Reflect.get(target, prop, target);
    return typeof value === 'function' ? value.bind(target) : value;
  },
});

export {chromium};
export const firefox = real.firefox ?? real.default?.firefox;
export const webkit = real.webkit ?? real.default?.webkit;
export const devices = real.devices ?? real.default?.devices;
export const errors = real.errors ?? real.default?.errors;
export const request = real.request ?? real.default?.request;
export const selectors = real.selectors ?? real.default?.selectors;
export default {...(real.default ?? real), chromium};
