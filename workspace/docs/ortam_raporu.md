# Ortam Raporu

> Bu dosya `studio_engine.py` tarafından **ölçülerek** üretilir; model çıktısı değildir.
> Her araç gerçekten çalıştırılmıştır — PATH'te görünmek kullanılabilir olmak demek değildir.

- Tarih: 2026-09-06 16:36
- İşletim sistemi: Darwin 25.6.0 (arm64)
- Python: 3.14.5

## Araç Zinciri

| Araç | Durum | Sürüm / Not |
|---|---|---|
| `node` | **VAR** | v22.21.0 |
| `npm` | **VAR** | 10.9.4 |
| `pnpm` | **YOK** | — |
| `python3` | **VAR** | Python 3.14.5 |
| `go` | **VAR** | go version go1.26.0 darwin/arm64 |
| `rustc` | **VAR** | rustc 1.96.0 (ac68faa20 2026-05-25) |
| `cargo` | **VAR** | cargo 1.96.0 (30a34c682 2026-05-25) |
| `java` | **VAR** | openjdk version "17.0.17" 2025-10-21 |
| `dotnet` | **YOK** | — |
| `ruby` | **VAR** | ruby 2.6.10p210 (2022-04-12 revision 67958) [universal.arm64e-darwin25] |
| `php` | **YOK** | — |
| `flutter` | **BOZUK** | [Errno 8] Exec format error: 'flutter' |
| `dart` | **BOZUK** | [Errno 8] Exec format error: 'dart' |
| `fvm` | **YOK** | — |
| `swift` | **VAR** | Apple Swift version 6.3.1 (swiftlang-6.3.1.1.2 clang-2100.0.123.102) |
| `xcodebuild` | **VAR** | Xcode 26.4.1 |
| `adb` | **YOK** | — |
| `docker` | **VAR** | Docker version 29.8.0, build 88096ef005 |
| `git` | **VAR** | git version 2.45.2 |
| `cmake` | **VAR** | cmake version 4.3.3 |
| `make` | **VAR** | GNU Make 3.81 |

## Kısıt

Seçilecek teknoloji stack'i **bu makinede derlenebilir ve test edilebilir** olmalıdır.
Kullanılabilir araçlar: `node`, `npm`, `python3`, `go`, `rustc`, `cargo`, `java`, `ruby`, `swift`, `xcodebuild`, `docker`, `git`, `cmake`, `make`

**Kurulu görünen ama çalışmayan araçlar** (bunlara güvenilmemeli):

- `flutter` → /usr/local/bin/flutter — [Errno 8] Exec format error: 'flutter'
- `dart` → /usr/local/bin/dart — [Errno 8] Exec format error: 'dart'

Gerekli bir araç eksikse, stack kararı ya onsuz kurulmalı ya da `devops_engineer` rolü kurulum adımlarını açıkça yazmalıdır.
