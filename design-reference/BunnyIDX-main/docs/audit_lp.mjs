import { chromium } from 'playwright';

const URL = process.env.LP_URL || 'http://bunnyidx.test/l/audit-calc';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1500);

// Report computed colors for every .lp-btn (anchor/button) on the page.
const btns = await page.$$eval('.lp-btn', (els) =>
    els.map((el) => {
        const cs = getComputedStyle(el);
        return {
            text: (el.textContent || '').trim().slice(0, 24),
            color: cs.color,
            background: cs.backgroundColor,
            backgroundImage: cs.backgroundImage.slice(0, 40),
        };
    }),
);

// Also report the calculator CTA specifically.
const calcBtn = await page.$('.lp-calc-card .lp-btn');
let calc = null;
if (calcBtn) {
    calc = await calcBtn.evaluate((el) => {
        const cs = getComputedStyle(el);
        return { text: el.textContent.trim(), color: cs.color, bg: cs.backgroundColor };
    });
}

console.log('=== .lp-btn computed styles ===');
console.log(JSON.stringify(btns, null, 2));
console.log('=== calculator CTA ===');
console.log(JSON.stringify(calc, null, 2));
console.log('=== JS errors ===');
console.log(errors.length ? errors.join('\n') : 'none');

await page.screenshot({ path: 'docs/audit-calc.png', fullPage: true });
console.log('screenshot: docs/audit-calc.png');
await browser.close();
