
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// TALEP-062: Sunucuda PostgreSQL senkronizasyonu (seed_postgres.py) doğrulama testleri.
// 1) seed_postgres.py betiğinin varlığı ve Python 3.6+ sözdizim uyumluluğu.
// 2) PEP 604 union (|) veya PEP 585 generics (list[str]) gibi eski Python'ları kıran tiplerin bulunmaması.
// 3) subprocess.run içinde Python 3.6'yı kıran capture_output/text parametreleri yerine stdout/stderr/universal_newlines kullanımı.
// 4) PGPASSWORD ve DATABASE_URL ayrıştırma mantığı ile autocommit/commit çakışmasının giderilmesi.

describe('TALEP-062: Sunucuda PostgreSQL senkronizasyonu (seed_postgres.py) doğrulaması', () => {
  const scriptPath = resolve(__dirname, '../../../server-scripts/seed_postgres.py');
  const infraScriptPath = resolve(__dirname, '../../infra/server-scripts/seed_postgres.py');

  it('TC-T62-01: seed_postgres.py dosyası server-scripts dizininde mevcut olmalıdır', () => {
    expect(existsSync(scriptPath)).toBe(true);
  });

  it('TC-T62-02: seed_postgres.py Python 3.6 uyumsuz tip sözdizimi (str | None, list[str]) içermemelidir', () => {
    const content = readFileSync(scriptPath, 'utf-8');
    // PEP 604 (| None veya | str vb.) kontrolü
    expect(content).not.toMatch(/def\s+\w+\(.*?\)\s*->\s*[^:\n]+\|/);
    // PEP 585 (list[str], dict[str, ...]) kontrolü
    expect(content).not.toMatch(/->\s*list\[/);
    expect(content).not.toMatch(/->\s*dict\[/);
  });

  it('TC-T62-03: subprocess.run çağrılarında Python 3.6 ile uyumsuz capture_output kullanılmamalıdır', () => {
    const content = readFileSync(scriptPath, 'utf-8');
    expect(content).not.toMatch(/capture_output\s*=\s*True/);
    expect(content).toContain('universal_newlines=True');
  });

  it('TC-T62-04: psql bağlantısında PGPASSWORD ve -d parametresi bulunmalıdır', () => {
    const content = readFileSync(scriptPath, 'utf-8');
    expect(content).toContain('PGPASSWORD');
    expect(content).toContain('"-d"');
  });

  it('TC-T62-05: autocommit açıkken conn.commit() hatasını önleyen koruma bulunmalıdır', () => {
    const content = readFileSync(scriptPath, 'utf-8');
    expect(content).toContain('getattr(conn, "autocommit", False)');
  });

  it('TC-T62-06: Node.js (postgres.js) fallback mekanizması bulunmalıdır', () => {
    const content = readFileSync(scriptPath, 'utf-8');
    expect(content).toContain('_apply_sql_with_node');
    expect(content).toContain('postgres');
  });

  it('TC-T62-07: infra/server-scripts senkronizasyonu korunmalıdır', () => {
    if (existsSync(infraScriptPath)) {
      const infraContent = readFileSync(infraScriptPath, 'utf-8');
      expect(infraContent).toContain('_find_psql');
      expect(infraContent).not.toMatch(/capture_output\s*=\s*True/);
    }
  });
});
