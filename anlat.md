# Upwork AI Assistant Pro — Proje Özeti, Pipeline ve Sorun Giderme (anlat.md)

Bu doküman, Upwork AI Assistant Pro uzantısının tam mimarisini, veri toplama pipeline’ını, karşılaştığımız hataları ve çözümlerini, dosya/dizin yapısını ve ileriye dönük yol haritasını ayrıntılı olarak açıklar. Amaç: hem teknik referans hem de operasyon kılavuzu olarak tek bir kaynaktan süreci şeffafça yönetmek.

---

## 1) Kısa Özet (Nedir, Ne Yapar?)

- Upwork sayfalarında çalışan, teklif (proposal) üretimi, iş analizi ve iş sıralama (ranking) yapan bir Chrome MV3 uzantısıdır.
- Google Gemini (varsayılan: gemini-1.5-flash) ile entegredir. API anahtarını uzantı ayarlarına girdiğinizde AI özellikler aktif olur.
- Veri Toplama 3 yöntemle desteklenir:
  1. Canlı (in-page) toplayıcı: Upwork sayfasındaki fetch/XHR yanıtlarını keserek anlık iş verisi toplar (HAR gerekmez).
  2. Native Host (Python): İsteğe bağlı olarak yerel Playwright toplayıcıyı çalıştırır (Native Messaging).
  3. HAR içe aktarma: Network’te kaydettiğiniz HAR dosyasından işleri çıkarır ve sıralar.
- “Analyze” sekmesinden toplanan işleri AI ile sıralayabilir, “Download Collected JSON” ile dışa aktarabilirsiniz.

---

## 2) Mimari Genel Bakış

Bileşenler:

- Chrome Extension (Manifest v3)
  - Background Service Worker: İş mantığı, depolama, AI çağrıları, native messaging köprüsü
  - Content Script + UI: Yüzen buton, panel sekmeleri (Generate / Analyze / Templates), canlı toplayıcı enjeksiyonu
  - Dist bundle’ları ve web_accessible_resources

- AI Servisi: Google Gemini modelleri (varsayılan: gemini-1.5-flash). Model seçimi/ayarlar uzantı depolamasında.

- Veri Toplama:
  - In-Page Collector (fetch/XMLHttpRequest interception): Upwork GraphQL / search endpoint’lerinden dönen JSON’u ayrıştırır.
  - Native Host (Python): Playwright tabanlı toplayıcıyı çalıştırır; uzantı ile Native Messaging üzerinden konuşur.
  - HAR Import: HAR’daki JSON response’lardan iş benzeri yapıları heuristik olarak çıkarır.

- Depolama:
  - chrome.storage.local
    - settings (ayarlar, istatistikler)
    - collectedJobs (canlı toplanan işlerin birikimli listesi)

- UI / İşlevler:
  - Floating FAB → Panel (Generate, Analyze, Templates)
  - Analyze: “Use Live Collected & Rank”, “Download Collected JSON”, “Import HAR & Rank”, “Run Collector (Python)”

---

## 3) Veri Toplama Pipeline’ı (Akışlar)

### 3.1) In-Page Live Collector Flow (HAR gerektirmez)

1. Content script, sayfaya küçük bir script enjekte eder.
2. Bu script window.fetch ve XMLHttpRequest çağrılarını wrap eder.
3. URL Upwork GraphQL / arama endpoint’lerine uyuyorsa response.clone() ile text alınır, XSSI temizlenir, JSON parse edilir.
4. Heuristik bir yürüyücü ile (title/description/url/skills/budget gibi) iş benzeri objeler çıkarılır.
5. Jobs batch window.postMessage ile content script’e geri gönderilir.
6. Content script bu batch’i “collector:jobsBatch” mesajıyla arka plana yollar.
7. Background bu işleri dedupe ederek chrome.storage.local.collectedJobs’a biriktirir, isteğe bağlı bildirim gösterir.
8. Analyze sekmesindeki “Use Live Collected & Rank” bu listeyi AI ile sıralar ve gösterir.

Avantaj: HAR’a veya terminal ağ erişimine gerek yoktur; Upwork sayfasındaki gerçek oturum verileri kullanılır.

### 3.2) Native Collector Flow (İsteğe Bağlı)

1. Analyze sekmesindeki “Run Collector (Python)” butonuna basılır.
2. Background, “com.upwork.ai.collector” native host’a mesaj yollar (mode/list_scroll/details vb. seçeneklerle).
3. Native host (Python) Playwright ile liste sayfasına bağlanıp işler toplar, JSON döndürür.
4. Background sonuçları alır, UI sıralar ve gösterir.

Not: Native host için bir defalık kurulum (manifest + registry) gerekir. Bu yöntem, sayfa yapısı/korumaları değiştiğinde yine de çalışacak şekilde tasarlanabilir.

### 3.3) HAR Import Flow (Opsiyonel)

1. Analyze sekmesinde .har dosyası seçilir ve içe aktarılır.
2. HAR içindeki response'ların content.text alanlarından JSON parse edilir (XSSI ihtimali göz önünde). 
3. Heuristik yürüyücü ile iş benzeri objeler çıkarılır, dedupe edilir.
4. AI ile sıralanır ve gösterilir.

Uyarı: Eğer HAR yalnızca reklam/analytics/gösterge uç noktalarını içeriyorsa, “No jobs parsed” görülebilir.

---

## 4) Dosya / Dizin Haritası

Aşağıdaki liste, proje içindeki önemli dosya ve klasörleri ve rollerini özetler.

Kök (C:\\Users\\TT\\upwork2):
- manifest.json (Kaynak manifest, build sonrası dist/manifest.json üretilir)
- src/
  - background/
    - service-worker.js
      - AI çağrıları, depolama, istatistik güncellemeleri, context menu, mesaj router
      - Yeni eklenen mesajlar:
        - collector:jobsBatch → canlı toplanan işleri birleştirir/dedupe eder ve collectedJobs’a kaydeder
        - getCollectedJobs → UI’a canlı toplanan işleri döndürür
        - runCollectorNative → Python native host ile konuşur
        - rankJobsAI → Gemini ile sıralama (anahtar yoksa heuristik fallback)
  - content/
    - content-script.js
      - Yüzen buton ve panel UI (Generate / Analyze / Templates)
      - injectInPageCollector(): fetch/XHR interception script’ini sayfaya enjekte eder
      - Canlı batch’leri background’a iletir; UI butonları (“Use Live Collected & Rank”, “Download Collected JSON”, “Import HAR & Rank”, “Run Collector (Python)”) yönetir
- dist/
  - content-script.bundle.js, service-worker.bundle.js, manifest.json, assets/* (build çıktıları)
- native/
  - install_native_host.ps1 → Native Messaging host manifest ve registry kurulumu
  - collector_runner.bat → Yerel toplayıcı çalıştırma yardımcısı (gerekirse)
  - (Python native host ve log dosyalarınızın bulunduğu yer — isimler ortamınıza göre değişebilir)

Not: service-worker.js içinde servisler şöyle import ediliyor: ../services/openai-service.js, storage-service.js, notification-service.js, job-analyzer.js. Bu modüller build pipeline’ına göre farklı konumlarda olabilir (ders: kaynaklarla dist bundle’ları karıştırmayın). Build eden sistem bu bağımlılıkları bundle’a gömer.

---

## 5) Önemli İçerikler (Özetler)

### 5.1) src/background/service-worker.js
- Migrate + Initialize Settings:
  - Güvenli varsayılanlar ve model listesi
  - autoCollectOnUpwork (true), persistToDisk (false) alanları eklendi (gelecekte dosyaya otomatik yazım için kullanılacak)
  - İstatistik alanları (jobsAnalyzed/proposalsSent) her zaman güvenli varsayılanlarla başlatılır
- Mesaj router (onMessage): generateProposal, analyzeJob, rankJobsAI, runCollectorNative, collector:jobsBatch, getCollectedJobs vb.
- collector:jobsBatch handler: gelen işleri (url|title) ile de-dupe ederek collectedJobs’a ekler
- getCollectedJobs handler: UI’a toplanan işleri döndürür
- runCollectorNative handler: com.upwork.ai.collector ile konuşur ve ok=true bekler

### 5.2) src/content/content-script.js
- injectInPageCollector(): Sayfaya script enjekte eder; Upwork API çağrılarının response’larından işleri çıkarır
- Canlı batch’leri 750 ms’de bir gruplar ve background’a (collector:jobsBatch) yollar
- UI Butonları:
  - Use Live Collected & Rank → background’dan getCollectedJobs çağırır, AI ile sıralayıp gösterir
  - Download Collected JSON → collectedJobs’u JSON dosyası olarak indirir
  - Import HAR & Rank → HAR içe aktarır ve sıralar
  - Run Collector (Python) → native host’a istek atar

### 5.3) native/install_native_host.ps1
- Çalıştırınca sizden ExtensionId ister (biz kurulumda hihidhbccnfmkcelbjffncchbaccmcpk kullandık)
- com.upwork.ai.collector manifest’i oluşturur ve registry’e ekler
- Chrome yeniden başlatıldığında Native Messaging host erişilebilir olur

---

## 6) Hata Güncesi ve Çözümler

### 6.1) “Native host error: No jobs parsed”
Semptom:
- “Run Collector (Python)” sonrası: “No jobs parsed. Capture a HAR … ensure GraphQL/search endpoints are present … Please run install script.”

Neden:
- Native host’un (veya HAR içe aktarımının) gördüğü kayıtlar reklam/analitik gibi uç noktalardan ibaretse iş verileri bulunmaz.
- HAR yanlış sayfadan ve/veya XHR/Fetch filtrelemesi yapılmadan yakalanmış olabilir. Upwork job search / GraphQL yanıtları yoksa parser boş döner.

Çözüm (3 alternatif):
1) HAR ile devam edecekseniz doğru HAR yakalama:
   - Upwork’e giriş yapın → https://www.upwork.com/nx/search/jobs/ veya best-matches sayfası
   - DevTools → Network → “Preserve log” + “Disable cache” → XHR/Fetch filtre
   - Listeyi kaydırın, kartlara tıklayın → GraphQL/search yanıtları oluşsun
   - Sağ tık → “Save all as HAR with content”
   - Analyze → “Import HAR & Rank”
2) Canlı Toplayıcı (önerilen):
   - Build + Reload sonrası Upwork iş listesine gidin, biraz gezin
   - Analyze → “Use Live Collected & Rank”
   - HAR gerekmez, error kaybolur.
3) Native Host (Python):
   - install_native_host.ps1 çalıştırıldı (başarılı). Chrome’u yeniden başlatın.
   - Analyze → “Run Collector (Python)” yeniden deneyin.

### 6.2) “Native host not found”
- Manifest kurulmamış veya ExtensionId uyumsuz olduğunda görülür.
- Çözüm: C:\\Users\\TT\\upwork2\\native\\install_native_host.ps1 çalıştırın; doğru ExtensionId girin; Chrome’u yeniden başlatın.

### 6.3) “Model not found / Quota”
- gemini-pro vb. modellerde kota/erişim sorunları. Varsayılanı güvenli modelle güncelledik: gemini-1.5-flash.
- Ayarlar → model değiştirilebilir. Anahtar yoksa rankJobsAI heuristik fallback kullanır.

### 6.4) “Cannot read properties of undefined (jobsAnalyzed)”
- İstatistik alanlarının boş gelmesi durumuna karşı migration ve güvenli varsayılanlar eklendi.

### 6.5) “Floating button görünmüyor”
- Z-index/çakışma/çerçeve (frame) problemleri yaşanabiliyor. Manifest’te all_frames etkin ve UI buton stili içeride ayarlı. Gerekirse z-index arttırılabilir; Content Security/Upwork overlay katmanlarıyla çakışma durumunda paneli göster/gizle tetikleyerek doğrulayın.

---

## 7) Kurulum & Build & Test

1) Native Host Kurulumu (opsiyonel ama önerilir)
   - PowerShell (pwsh):
     - C:\\Users\\TT\\upwork2\\native\\install_native_host.ps1
     - ExtensionId: hihidhbccnfmkcelbjffncchbaccmcpk (sizinki değiştiyse kendi uzantı ID’nizi girin)
     - Çıktı: Manifest yazıldı, registry eklendi → Chrome’u yeniden başlatın.

2) Build
   - Proje kökünde (C:\\Users\\TT\\upwork2):
     - npm run build
   - dist/ altına bundle’lar ve manifest kopyalanır.

3) Chrome’a Yükleme
   - chrome://extensions → Developer Mode → Load unpacked → dist klasörünü seçin
   - Reload ile güncellemeleri alın

4) Ayarlar
   - Popup/Panel → Settings → Gemini API key girin (AI ranking/proposal için)

5) Kullanım
   - Upwork iş listesine gidin, biraz gezinin
   - Floating FAB → Analyze → “Use Live Collected & Rank”
   - İsterseniz “Download Collected JSON” ile dışa aktarın
   - “Run Collector (Python)” (Native host yüklüyse) ile yerel toplayıcıyı tetikleyin
   - “Import HAR & Rank” ile doğru yakalanmış HAR’dan analiz yapın

---

## 8) Yapılandırma (settings)

- settings anahtar alanları:
  - apiKey: Gemini anahtarı
  - model: varsayılan gemini-1.5-flash
  - temperature, maxTokens
  - autoSave, notifications
  - autoCollectOnUpwork (true): Canlı toplayıcıyı aktif tutma niyeti
  - persistToDisk (false): İleri aşamada yerel diske otomatik yazım için kullanılacak bayrak
  - statistics: proposalsSent, jobsAnalyzed, vs. (güvenli varsayılanlarla)
- collectedJobs: Canlı toplayıcının dedupe edilmiş birikimli çıktı listesi

---

## 9) Mesaj/İşlev Referansı

- Content → Background:
  - collector:jobsBatch { jobs: [...] } → collectedJobs’a eklenir (de-dupe)
  - getCollectedJobs → { jobs }
  - rankJobsAI { jobs, top } → { recommendations, ai }
  - runCollectorNative { options } → native host’a iletir (ok true bekler)

- Background → Content:
  - openPanelAndSelectGenerate → Yeni açılan iş sayfasında paneli otomatik açıp “Generate” sekmesine geçer

---

## 10) Neden Çalışmadı? (Hata Kök Nedenleri)

- “No jobs parsed” (HAR/Native): HAR yakalama, filtreleme ve endpoint kapsamı uygun değildi; ağ kaydında Upwork job/GraphQL yanıtı yoksa parser doğal olarak boş döner.
- Terminal DNS kısıtları: Terminal’den Upwork’e erişim kısıtlıydı; bu yüzden tarayıcı oturumuna bağlanan canlı toplayıcıyı ekledik (uzantı içinde) — bu engeli by-pass eder.
- Model erişimi/kotası: Bazı Gemini modelleri (1.5-pro vb.) plan/kota kısıtına takıldı; güvenli, denenmiş model (1.5-flash) varsayılan yapıldı.
- İstatistik null hataları: settings.statistics alanları için harden/migration eklendi.

---

## 11) Çözümün Bugünkü Durumu

- Native Host: install_native_host.ps1 başarıyla çalıştırıldı. Chrome’u yeniden başlatın ve “Run Collector (Python)” deneyin.
- Canlı Toplayıcı: build+reload sonrası anında çalışır; Upwork sayfasında gezinin → Analyze → “Use Live Collected & Rank”. HAR’a ihtiyaç kalmaz.
- Export: “Download Collected JSON” ile tek tıkla dışa aktarım.

---

## 12) Project Chimera (Public Build) ile Uyum

- Canlı toplayıcı + sıralama, haftalık içerik planınızın “ham veri → analiz → yayın” akışını besler.
- Kaggle Dataset: collectedJobs → anonimleştirme (ID hash, bütçe aralıkları vb.) ile “Export for Kaggle” işlevine çevrilebilir.
- Capstone: “A Predictive Analysis of Freelance Success Factors on Upwork” başlıklı not defterleri/raporlar için veri hazırlar.
- İçerik Motoru: Her hafta “Setup / Breakthrough / Insight” postları için otomatik grafik/özet üretilebilir.

---

## 13) Yol Haritası (Öneriler)

- Settings UI’ye “Persist to Disk” toggle’ı ekleyin; açıkken collectedJobs batch’lerini native host üzerinden C:\\Users\\TT\\upwork2\\data\\jobs-YYYYMMDD.json şeklinde append edin.
- “Export for Kaggle” butonu: Anonimleştirme + şema standardizasyonu + zip.
- Ranking iyileştirmeleri: Özelleştirilmiş ağırlıklar, domain-specific anahtar kelimeler, “Stat Score”.
- Hata/Bildirim UX: Native host yoksa/boş dönüyorsa daha açıklayıcı banner.
- FAB görünürlüğü: Gerekirse z-index’i 2147483647 seviyesine taşıyan küçük bir stil düzeltmesi.

---

## 14) Sık Karşılaşılan Sorunlar (Quick Fix)

- “No jobs parsed” (HAR/Native): HAR’ı doğru yakala veya canlı toplayıcıyı kullan.
- “Native host not found”: install_native_host.ps1 çalıştır; ExtensionId doğrula; Chrome’u yeniden başlat.
- “AI key yok”: Settings’e Gemini anahtarını gir; yoksa rankJobsAI heuristik modda çalışır.
- “FAB yok”: Uzantıyı reload et; sayfada overlay/iframe var mı kontrol et; gerekirse z-index yükselt.

---

## 15) Komutlar / İşletim

- Native host kurulumu: C:\\Users\\TT\\upwork2\\native\\install_native_host.ps1
- Build: npm run build
- Chrome yükleme: chrome://extensions → Load unpacked → dist/

---

Herhangi bir adımda takılırsanız, hata mesajını ve (varsa) ilgili log dosyasının yolunu paylaşın. Bundan sonra isterseniz “Persist to Disk” otomasyonunu ve “Export for Kaggle” düğmesini de ekleyebilirim.

