#!/usr/bin/env node
/**
 * EPDK Şarj İstasyonu Özet Verisi Toplayıcı (Puppeteer)
 * =====================================================
 * https://lisans.epdk.gov.tr/epvys-web/faces/pages/lisans/
 * elektrikSarjAgiIsletmeci/sarjIstasyonuOzetSorgula.xhtml sayfasındaki lisanslı
 * şarj istasyonu tablosunu otomatik toplar.
 *
 * Sayfa JSF/PrimeFaces + reCAPTCHA v2 korumalı; bu yüzden gerçek Chrome
 * (puppeteer-extra + stealth) headless kipte, Firefox user-agent ile çalışır.
 *
 * Akış:
 *   1. Penceresiz Chrome açılır, sayfa yüklenir.
 *   2. reCAPTCHA kutusu tıklanır; token üretilene kadar beklenir.
 *      (Headless'ta görsel challenge çıkarsa: --visible ya da EPDK_2CAPTCHA_KEY)
 *   3. "Sorgula"ya basılır, paginator üzerinden tüm sayfalar gezilir.
 *   4. Çıktılar epdk_output/ altına yazılır (Excel + CSV + JSON).
 *
 * Kullanım:
 *   node scrape.mjs                    # headless, filtresiz
 *   node scrape.mjs --il ANKARA        # il filtresi
 *   node scrape.mjs --visible          # pencere aç (manuel captcha çözümü için)
 *   EPDK_2CAPTCHA_KEY=<key> node scrape.mjs   # 2captcha ile tam insansız
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

puppeteer.use(StealthPlugin());

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const URL_EPDK =
  'https://lisans.epdk.gov.tr/epvys-web/faces/pages/lisans/elektrikSarjAgiIsletmeci/sarjIstasyonuOzetSorgula.xhtml';

const FIREFOX_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:131.0) Gecko/20100101 Firefox/131.0';

const FORM = 'sarjIstasyonuOzetForm';
const TABLE = 'sarjIstasyonuOzetSorguSonucu:sarjIstasyonuList';
const SEARCH_BTN = `${FORM}:j_idt56`; // "Sorgula"
const REPORT_BTN = `${FORM}:j_idt58`; // "Raporla" (Excel indir)

const KOLONLAR = [
  'istasyon_no', 'istasyon_adi', 'hizmet_sekli', 'marka',
  'sarj_agi_isletmecisi', 'sarj_istasyonu_isletmecisi', 'adres', 'soket_bilgileri',
];

// ---------- argümanlar ----------
const BOOL_FLAGS = new Set(['visible', 'no-excel']);
const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (!a.startsWith('--')) continue;
  const k = a.slice(2);
  if (BOOL_FLAGS.has(k)) args[k] = true;
  else if (process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) args[k] = process.argv[++i];
  else args[k] = true;
}
const CAPTCHA_TIMEOUT_S = parseInt(args['captcha-timeout'] || '150', 10);
const OUT_DIR = path.resolve(args.out || path.join(ROOT, 'epdk_output'));
// Sayfa geçişleri arasında nazik bekleme (ms): varsayılan 15-30 sn rastgele.
const PAGE_DELAY_MIN = parseInt(args['delay-min'] || '15000', 10);
const PAGE_DELAY_MAX = parseInt(args['delay-max'] || '30000', 10);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => s.replace(/([!"#$%&'()*+,\-./:;<=>?@[\\\]^`{|}~])/g, '\\$1');

// ---------- 2captcha (opsiyonel) ----------
async function solve2captcha(apiKey, sitekey, pageurl, timeoutS = 180) {
  const body = new URLSearchParams({
    key: apiKey, method: 'userrecaptcha', googlekey: sitekey, pageurl, json: '1',
  });
  const r1 = await fetch('https://2captcha.com/in.php', { method: 'POST', body }).then((r) => r.json());
  if (r1.status !== 1) throw new Error(`2captcha kabul etmedi: ${JSON.stringify(r1)}`);
  const id = r1.request;
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutS * 1000) {
    await sleep(5000);
    const r = await fetch(
      `https://2captcha.com/res.php?key=${apiKey}&action=get&id=${id}&json=1`
    ).then((r) => r.json());
    if (r.status === 1) return r.request;
    if (r.request !== 'CAPCHA_NOT_READY') throw new Error(`2captcha hatası: ${JSON.stringify(r)}`);
  }
  throw new Error('2captcha zaman aşımı.');
}

// ---------- sayfa yardımcıları ----------
async function sitekey(page) {
  // Widget render sonrası HTML'de sitekey kalmıyor; reCAPTCHA anchor iframe
  // URL'sindeki k= parametresinden okunur (daha sağlam).
  for (const frame of page.frames()) {
    const m = frame.url().match(/[?&]k=([^&]+)/);
    if (frame.url().includes('recaptcha') && m) return m[1];
  }
  const html = await page.content();
  const m = html.match(/sitekey:"([^"]+)"/) || html.match(/data-sitekey="([^"]+)"/);
  if (m) return m[1];
  throw new Error('reCAPTCHA sitekey bulunamadı (sayfa yapısı değişmiş olabilir).');
}

async function clickCaptchaBox(page) {
  for (const frame of page.frames()) {
    const u = frame.url();
    if (u.includes('recaptcha') && u.includes('anchor')) {
      try {
        const box = await frame.$('#recaptcha-anchor');
        if (box) { await box.click(); return true; }
      } catch { /* frame değişmiş olabilir */ }
    }
  }
  return false;
}

async function waitToken(page, timeoutS) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutS * 1000) {
    const token = await page.evaluate(() => {
      const t = document.getElementById('g-recaptcha-response');
      return t ? t.value : '';
    });
    if (token) return token;
    await sleep(1000);
  }
  return null;
}

// PrimeFaces selectOneMenu: option value'ları label değil kod olabilir
// (ör. il → plaka kodu). Label'dan value çözülür, sonra change tetiklenir.
const setSelectByLabel = (page, selectName, label) =>
  page.evaluate((n, lbl) => {
    const sel = document.getElementsByName(n)[0];
    if (!sel) return { ok: false, err: 'select yok' };
    const norm = (s) => (s || '').trim().toLocaleUpperCase('tr');
    const opt = [...sel.options].find((o) => norm(o.text) === norm(lbl));
    if (!opt) return { ok: false, err: 'secenek yok', mevcut: [...sel.options].slice(0, 8).map((o) => o.text) };
    sel.value = opt.value;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return { ok: true, value: opt.value };
  }, selectName, label);

const setText = (page, id, value) =>
  page.evaluate((i, v) => {
    const el = document.getElementById(i);
    if (!el) return false;
    el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }, id, value);

const readRows = (page) =>
  page.evaluate((tid) => {
    const tbody = document.getElementById(`${tid}_data`);
    if (!tbody) return [];
    return [...tbody.querySelectorAll('tr[data-ri]')].map((tr) =>
      [...tr.querySelectorAll('td')].map((td) => td.innerText.replace(/\s+/g, ' ').trim())
    );
  }, TABLE);

const totalRecords = (page) =>
  page.evaluate(() => {
    const e = document.querySelector('.ui-paginator-current');
    const m = e && e.innerText.match(/Toplam Kayıt Sayısı:\s*([\d.]+)/);
    return m ? parseInt(m[1].replace(/\./g, ''), 10) : -1;
  });

const setRowsPerPage = (page, target) =>
  page.evaluate((t) => {
    const sel = document.querySelector('select.ui-paginator-rpp-options, .ui-paginator-rpp-options select');
    if (!sel) return false;
    let best = 0;
    for (const o of sel.options) {
      const v = parseInt(o.value, 10);
      if (!isNaN(v) && v > best) best = v <= t ? v : best;
    }
    if (!best) return false;
    sel.value = String(best);
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, target);

const clickNext = (page) =>
  page.evaluate(() => {
    const btn = document.querySelector('.ui-paginator-next');
    if (!btn || btn.classList.contains('ui-state-disabled')) return false;
    btn.click();
    return true;
  });

const tableSig = (page) =>
  page.evaluate((tid) => {
    const tbody = document.getElementById(`${tid}_data`);
    return tbody ? tbody.innerText.slice(0, 200) : '';
  }, TABLE);

const clickReport = (page) =>
  page.evaluate((id) => {
    const b = document.getElementById(id);
    if (!b) return false;
    b.click();
    return true;
  }, REPORT_BTN);

// İndirme dizinini izle: yeni .xlsx bitene kadar bekle, sonra sayfa adına taşı.
function waitNewExcel(dlDir, before, timeoutS = 60) {
  const t0 = Date.now();
  return new Promise((resolve) => {
    const tick = () => {
      const files = fs.readdirSync(dlDir).filter((f) => !before.has(f));
      const done = files.find((f) => !f.endsWith('.crdownload'));
      if (done) return resolve(done);
      if (Date.now() - t0 > timeoutS * 1000) return resolve(null);
      setTimeout(tick, 500);
    };
    tick();
  });
}

// Önceki koşunun çıktılarını tarih+saat damgalı arşiv klasörüne taşır.
// Günde birden çok koşu güvenli: klasör adı saniyeye kadar benzersiz.
function archivePrevious(outDir) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const arsiv = path.join(outDir, 'arsiv', stamp);
  let tasindi = 0;
  const tasi = (src, dstName) => {
    fs.mkdirSync(path.dirname(path.join(arsiv, dstName)), { recursive: true });
    fs.renameSync(src, path.join(arsiv, dstName));
    tasindi++;
  };
  for (const f of fs.readdirSync(outDir)) {
    const p = path.join(outDir, f);
    if (fs.statSync(p).isFile() && /\.(csv|json)$/i.test(f)) tasi(p, f);
  }
  const excelDir = path.join(outDir, 'excel');
  if (fs.existsSync(excelDir)) {
    for (const f of fs.readdirSync(excelDir)) {
      const p = path.join(excelDir, f);
      if (fs.statSync(p).isFile()) tasi(p, path.join('excel', f));
    }
  }
  if (tasindi) console.log(`[i] Önceki koşu arşivlendi → ${path.relative(ROOT, arsiv)} (${tasindi} dosya)`);
}

// İndirilen tüm .xlsx dosyalarını okuyup birleşik kayıt listesi üretir.
function mergeExcelFiles(excelDir) {
  const records = [];
  const files = fs.readdirSync(excelDir).filter((f) => f.endsWith('.xlsx')).sort();
  for (const f of files) {
    const wb = XLSX.readFile(path.join(excelDir, f));
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
    for (const r of rows) {
      if (!r.length) continue;
      const first = String(r[0] ?? '').trim();
      if (!first || /istasyon\s*no/i.test(first)) continue; // başlık satırı
      const rec = Object.fromEntries(KOLONLAR.map((k, i) => [k, String(r[i] ?? '').trim()]));
      records.push({ ...rec, _kaynak_dosya: f });
    }
  }
  return records;
}

async function waitTableChange(page, oldSig, timeoutS = 30) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutS * 1000) {
    if ((await tableSig(page)) !== oldSig) return true;
    await sleep(400);
  }
  return false;
}

// ---------- ana akış ----------
async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  archivePrevious(OUT_DIR);   // önceki koşunun çıktılarını tarihli klasöre kaldır

  // Tarayıcı adayları: önce kurulu Google Chrome, sonra EPDK_CHROME_PATH ve
  // sunucudaki yaygın Chrome/Chromium yolları (cPanel/alt-linux ortamları).
  const LAUNCH_ARGS = ['--window-size=1400,1000', '--no-sandbox', '--disable-setuid-sandbox'];
  const launchers = [
    { channel: 'chrome' },
    ...[
      process.env.EPDK_CHROME_PATH,
      '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium', '/usr/bin/chromium-browser',
      '/opt/google/chrome/chrome',
    ].filter((p) => p && fs.existsSync(p)).map((p) => ({ executablePath: p })),
  ];
  let browser = null, lastErr = null;
  for (const opt of launchers) {
    try {
      browser = await puppeteer.launch({ headless: !args.visible, args: LAUNCH_ARGS, ...opt });
      break;
    } catch (e) { lastErr = e; }
  }
  if (!browser) {
    throw new Error(`Chrome başlatılamadı (${lastErr && lastErr.message}). ` +
      'Sunucuda Chrome/Chromium kurulu değilse EPDK_CHROME_PATH ile yol gösterin.');
  }
  const page = await browser.newPage();
  await page.setUserAgent(FIREFOX_UA);
  page.setDefaultTimeout(60000);

  // Excel indirmeleri (headless'ta CDP ile yönlendirilir)
  const dlDir = path.join(OUT_DIR, 'excel');
  fs.mkdirSync(dlDir, { recursive: true });
  const cdp = await page.createCDPSession();
  await cdp.send('Browser.setDownloadBehavior', {
    behavior: 'allow', downloadPath: dlDir, eventsEnabled: true,
  });

  const allRows = [];
  try {
    console.log('[i] Sayfa yükleniyor (headless Chrome, Firefox UA)...');
    await page.goto(URL_EPDK, { waitUntil: 'domcontentloaded' });
    await sleep(3000);

    const key = await sitekey(page);
    console.log(`[i] reCAPTCHA sitekey: ${key.slice(0, 20)}...`);

    let token = null;
    const apiKey = process.env.EPDK_2CAPTCHA_KEY;
    if (apiKey) {
      console.log('[i] 2captcha ile token üretiliyor (insansız mod)...');
      token = await solve2captcha(apiKey, key, URL_EPDK);
      await page.evaluate((t) => {
        const el = document.getElementById('g-recaptcha-response');
        el.value = t; el.innerHTML = t;
      }, token);
    } else {
      console.log('[i] Captcha kutusu tıklanıyor...');
      const ok = await clickCaptchaBox(page);
      if (!ok) console.log('[!] Captcha kutusu bulunamadı — token yine de bekleniyor.');
      token = await waitToken(page, CAPTCHA_TIMEOUT_S);
    }

    if (!token) {
      console.error('[x] Captcha çözülemedi (zaman aşımı).');
      console.error('    Headless modda görsel challenge çözülemez. Seçenekler:');
      console.error('      --visible            → pencere açıp kutuyu elle çöz');
      console.error('      EPDK_2CAPTCHA_KEY  → 2captcha servisi ile tam otomatik');
      process.exit(2);
    }
    console.log('[+] Captcha token alındı.');

    // Filtreler (PrimeFaces selectOneMenu — label'dan option value çözülür)
    if (args.il) {
      const r = await setSelectByLabel(page, `${FORM}:il_INPUT_input`, args.il);
      console.log(`    il filtresi: ${args.il} → ${r.ok ? 'value=' + r.value : 'BULUNAMADI ' + JSON.stringify(r)}`);
    }
    if (args.ilce) {
      // İlçe listesi il seçiminden sonra AJAX ile dolar — opsiyon gelene kadar bekle.
      await page.waitForFunction((n) => {
        const s = document.getElementsByName(n)[0];
        return s && s.options.length > 1;
      }, { timeout: 15000 }, `${FORM}:ilce_INPUT_input`).catch(() => {});
      const r = await setSelectByLabel(page, `${FORM}:ilce_INPUT_input`, args.ilce);
      console.log(`    ilçe filtresi: ${args.ilce} → ${r.ok ? 'value=' + r.value : 'BULUNAMADI ' + JSON.stringify(r)}`);
    }
    if (args.isletmeci) {
      const r = await setSelectByLabel(page, `${FORM}:j_idt31_input`, args.isletmeci);
      console.log(`    işletmeci filtresi: ${r.ok ? 'value=' + r.value : 'BULUNAMADI ' + JSON.stringify(r)}`);
    }
    if (args['istasyon-adi']) await setText(page, `${FORM}:j_idt19`, args['istasyon-adi']);

    console.log('[i] Sorgula butonuna basılıyor...');
    await page.evaluate((id) => document.getElementById(id).click(), SEARCH_BTN);
    await sleep(3000);

    const total = await totalRecords(page);
    console.log(`[i] Toplam kayıt: ${total >= 0 ? total : '?'}`);

    await setRowsPerPage(page, parseInt(args.rows || '500', 10));
    await sleep(2000);

    let pageNo = 0;
    const excel = !args['no-excel'];
    for (;;) {
      pageNo++;
      const rows = await readRows(page);
      allRows.push(...rows);
      console.log(`    sayfa ${pageNo}: +${rows.length} satır (toplam ${allRows.length})`);

      if (excel) {
        const before = new Set(fs.readdirSync(dlDir));
        await clickReport(page);
        const f = await waitNewExcel(dlDir, before);
        if (f) {
          const hedef = path.join(dlDir, `epdk_sayfa_${String(pageNo).padStart(3, '0')}.xlsx`);
          fs.renameSync(path.join(dlDir, f), hedef);
          console.log(`      ↳ Excel: ${path.basename(hedef)}`);
        } else {
          console.log('      ↳ Excel indirilemedi (zaman aşımı)');
        }
      }

      if (!rows.length) break;
      const sig = await tableSig(page);
      if (!(await clickNext(page))) break;
      const bekle = PAGE_DELAY_MIN + Math.random() * (PAGE_DELAY_MAX - PAGE_DELAY_MIN);
      console.log(`    ~${(bekle / 1000).toFixed(0)}sn bekleniyor...`);
      await waitTableChange(page, sig, 60);
      await sleep(bekle);
    }

    const ts = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
    const csvPath = path.join(OUT_DIR, `sarj_istasyonlari_${ts}.csv`);
    const jsonPath = path.join(OUT_DIR, `sarj_istasyonlari_${ts}.json`);

    const records = allRows.map((r) => Object.fromEntries(KOLONLAR.map((k, i) => [k, r[i] ?? ''])));
    fs.writeFileSync(jsonPath, JSON.stringify(records, null, 2), 'utf-8');
    const csvLine = (r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',');
    fs.writeFileSync(csvPath, '﻿' + KOLONLAR.join(',') + '\n' + allRows.map(csvLine).join('\n'), 'utf-8');

    // İndirilen Excel'leri okuyup birleşik JSON üret (yetkili kaynak = EPDK export'u)
    const excelDir = path.join(OUT_DIR, 'excel');
    if (fs.existsSync(excelDir) && fs.readdirSync(excelDir).some((f) => f.endsWith('.xlsx'))) {
      const excelRecords = mergeExcelFiles(excelDir);
      const excelJsonPath = path.join(OUT_DIR, `sarj_istasyonlari_excel_${ts}.json`);
      fs.writeFileSync(excelJsonPath, JSON.stringify(excelRecords, null, 2), 'utf-8');
      console.log(`    Excel JSON: ${excelJsonPath} (${excelRecords.length} kayıt)`);
    }

    console.log(`\n[+] Bitti: ${allRows.length} kayıt`);
    console.log(`    CSV : ${csvPath}`);
    console.log(`    JSON: ${jsonPath}`);
  } finally {
    await browser.close();
  }
}

main().catch((e) => { console.error('[x]', e.message); process.exit(1); });
