import { chromium } from 'playwright';

const targets = [
    { label: 'classic', url: 'http://bunnyidx.test/l/audit-calc' },
    { label: 'video-landing', url: 'http://bunnyidx.test/l/audit-video' },
    { label: 'flow', url: 'http://bunnyidx.test/l/audit-calc/get-started?address=123+Test+St' },
];

const browser = await chromium.launch();

for (const t of targets) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

    await page.goto(t.url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1800);

    // Images: every <img> must have loaded (naturalWidth > 0).
    const imgs = await page.$$eval('img', (els) =>
        els.map((el) => ({ src: el.currentSrc || el.src, ok: el.complete && el.naturalWidth > 0 })),
    );
    const brokenImgs = imgs.filter((i) => !i.ok);

    // Background images that failed to load (heuristic: count CSS bg-image urls).
    const bgCount = await page.$$eval('*', (els) =>
        els.filter((el) => getComputedStyle(el).backgroundImage.includes('url(')).length,
    );

    // Forms present + their action.
    const forms = await page.$$eval('form', (els) => els.map((f) => f.getAttribute('action')));

    // .lp-btn / button contrast: any dark-on-accent buttons left?
    const darkButtons = await page.$$eval('.lp-btn', (els) =>
        els
            .map((el) => ({ t: el.textContent.trim().slice(0, 20), c: getComputedStyle(el).color }))
            .filter((b) => b.c === 'rgb(17, 19, 21)' || b.c === 'rgb(0, 0, 0)'),
    );

    console.log(`\n===== ${t.label} (${t.url}) =====`);
    console.log(`images: ${imgs.length} total, ${brokenImgs.length} broken`);
    if (brokenImgs.length) console.log('  BROKEN:', JSON.stringify(brokenImgs.slice(0, 5)));
    console.log(`elements with bg-image: ${bgCount}`);
    console.log(`forms: ${forms.length} -> ${JSON.stringify(forms)}`);
    console.log(`dark .lp-btn (bad contrast): ${darkButtons.length} ${darkButtons.length ? JSON.stringify(darkButtons) : ''}`);

    // Classic: try the hero capture modal.
    if (t.label === 'classic') {
        const addr = await page.$('.lp-addr-pill input');
        if (addr) {
            await addr.fill('123 Main St, Tampa, FL');
            await page.click('.lp-addr-pill .lp-btn');
            await page.waitForTimeout(600);
            const modalVisible = await page.$eval('.lp-modal', (el) => !el.hidden).catch(() => false);
            console.log(`hero modal opens on Get Started: ${modalVisible}`);
        }
    }

    console.log(`JS errors: ${errors.length ? '\n  ' + errors.join('\n  ') : 'none'}`);
    await page.close();
}

await browser.close();
