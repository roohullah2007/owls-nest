import { chromium } from 'playwright';

const BASE = 'http://bunnyidx.test';
const EMAIL = 'test@example.com';
const PASS = 'audit-pass-123';
const PAGES = {
    fresh: process.env.FRESH_UUID,
    pending: process.env.PENDING_UUID,
    connected: process.env.CONNECTED_UUID,
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

// Log in.
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
await page.fill('input[type=email]', EMAIL);
await page.fill('input[type=password]', PASS);
await page.click('button[type=submit]');
await page.waitForTimeout(2500);
console.log('after login url:', page.url());

async function openDomain(uuid) {
    await page.goto(`${BASE}/crm/landing-pages/${uuid}/edit`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    // Click the "Domain" toolbar button.
    const btn = page.getByRole('button', { name: 'Domain', exact: true });
    await btn.click();
    await page.waitForTimeout(1200);
}

for (const [label, uuid] of Object.entries(PAGES)) {
    if (!uuid) { console.log(`skip ${label} (no uuid)`); continue; }
    try {
        // Desktop
        await page.setViewportSize({ width: 1280, height: 900 });
        await openDomain(uuid);
        await page.screenshot({ path: `docs/domain-${label}-desktop.png` });
        // Mobile
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForTimeout(500);
        await page.screenshot({ path: `docs/domain-${label}-mobile.png` });
        // Report key text present in the modal
        const txt = await page.locator('body').innerText();
        const has = (s) => txt.includes(s);
        console.log(`\n[${label}]`,
            'Connect domain:', has('Connect domain') || has('Update domain'),
            '| Verify domain:', has('Verify domain'),
            '| Domain connected:', has('Domain connected'),
            '| Visit your page:', has('Visit your page'),
            '| jargon(DNS/CNAME):', /\bDNS\b|\bCNAME\b/.test(txt) ? 'present' : 'hidden',
        );
    } catch (e) {
        console.log(`[${label}] ERROR:`, e.message.split('\n')[0]);
    }
}

console.log('\nJS errors:', errors.length ? errors.join('\n') : 'none');
await browser.close();
