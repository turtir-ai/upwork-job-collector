# Upwork AI Assistant — Live Collect & Rank Tanılama Rehberi (anlatim2)

Bu dosya; uzantının “Live Collect & Rank” (canlı toplama) hattının nasıl çalıştığını, neden veri gelmiyor olabileceğini ve benden hızlıca düzeltme yapabilmem için sizden hangi bilgileri/logları istediğimi özetler.

---

## 1) Hızlı Kontrol Listesi (3 adım)

- A. dist’ten yüklü mü?
  - chrome://extensions > Upwork AI Assistant Pro > Details içinde “Loaded from” yolunun C:\\Users\\TT\\upwork2\\dist olduğunu doğrulayın.
- B. Content script yüklendi mi?
  - Upwork’ta bir sayfayı açın ve F12 > Console’da şu iki çıktıyı kontrol edin:
    - “Upwork AI Assistant - Content script loaded” (content-script başladı)
    - window.__UpAIFetchWrapped => true (in‑page collector sarıcıları aktif)
- C. Ağda eşleşen istek var mı?
  - DevTools > Network > XHR/Fetch filtreli iken sayfayı biraz gezin.
  - Aşağıdaki kalıplardan biri görülmeli: /api/graphql/ veya /nx/search/jobs veya /jobs/search (ya da JSON dönen bir uç nokta).
  - Hiçbiri yoksa, regex’i genişletmem gerek — örnek URL’leri bana gönderin.

---

## 2) Mimari ve Veri Akışı (Pipeline)

- 1) content-script.bundle.js yüklendiğinde sayfaya bir “in‑page collector” enjekte edilir (collector-fix.js ile güçlendirilmiş).
- 2) Bu collector, fetch ve XMLHttpRequest’i sarar, Upwork API yanıtlarındaki JSON’lardan iş benzeri objeleri çıkartır.
- 3) Çıkartılan işler window.postMessage ile { source: 'UpAI-InPage', type: 'UPWORK_JOBS_DATA' } olarak sayfadan content script’e iletilir.
- 4) Content script, gelen işleri 750ms aralıklarla batch’leyip background service worker’a chrome.runtime.sendMessage({ action: 'collector:jobsBatch', jobs }) ile gönderir.
- 5) Service worker, chrome.storage.local('collectedJobs') içinde işleri biriktirir ve deduplikasyon yapar.
- 6) “Use Live Collected & Rank” butonu, önce getCollectedJobs çağırır, sonra rankJobsAI ile sıralar ve panelde gösterir.

Özet: Sayfada sarıcı yoksa veya ağda eşleşen istek yoksa hiçbir iş toplanmaz; panel “No live jobs collected yet” der.

---

## 3) Neden Çalışmıyor Olabilir?

- 1) Collector enjekte olmadı
  - window.__UpAIFetchWrapped === false ise: içerik güvenlik/izole bağlam engeli veya injeksiyon sıraya girmedi.
- 2) Regex artık istekleri yakalamıyor
  - Upwork uç noktaları değişti (ör. farklı graphql path, /gds/… vb.). Yeni gerçek URL örneklerine göre desenleri genişletmeliyim.
- 3) Yanıt JSON değil
  - Bazı uç noktalar application/octet-stream veya text/plain+json döndürebilir; mevcut filtre JSON mime tipine bakıyor. Örnek yanıt başlıklarını gönderin, algılamayı gevşeteyim.
- 4) Veri iframe içinde
  - all_frames: true açık; yine de farklı origin/iframe olabilir. Hangi frame’de çalıştığını konsol çıktıları ile doğrularız.
- 5) Başka uzantı müdahalesi
  - Ağ/hook’ları etkileyen bir eklenti (reklam engelleyici vb.) sarmalayıcıyı bozabilir.
- 6) Yanlış klasörden yükleme
  - Root’tan yüklenmiş eski build’ler ile karışıklık olabilir. dist’ten yüklendiğinden emin olun.

---

## 4) Benden Ne Lazım? (Gerekli Bilgi ve Loglar)

Lütfen aşağıdakileri sağlayın; ben regex/algılama ve akışı buna göre düzelteyim.

- 1) Sistem/Çevre
  - Chrome sürümü (chrome://version)
  - OS (Windows 10/11, build)
  - Uzantı ID’si ve “Loaded from” yolunun ekran görüntüsü

- 2) Upwork Sayfası Bilgisi
  - Üzerinde gezindiğiniz tam URL’ler (ör. /nx/find-work/, /o/jobs/browse/, vs.).
  - Bu sayfalarda job kartları görünüyor mu?

- 3) Sayfa Konsol Çıktıları (F12 > Console)
  - window.__UpAIFetchWrapped değerinin çıktısı
  - Aşağıdaki dinleyiciyi çalıştırın, 10–20 saniye gezin ve konsolda oluşan satırları kopyalayın:

```js path=null start=null
window.addEventListener('message', (e) => {
  if (e?.data?.source === 'UpAI-InPage' && e?.data?.type === 'UPWORK_JOBS_DATA') {
    const p = e.data.payload || {}; 
    console.log('[UpAI] page->content', p.count, p.url || '(no url)');
  }
});
```

  - Eğer hiçbir satır loglanmıyorsa, collector hiç çalışmıyor veya regex eşleşmiyor demektir.

- 4) Network Sekmesi Örnekleri
  - XHR/Fetch’te görünen ilgili isteğin tam URL’si (örn. https://www.upwork.com/api/graphql?opName=JobSearch …)
  - Bu isteğin Response Headers içindeki Content-Type
  - Response’tan küçük bir JSON parçası (başlık alanları; title/description tarzı alanlar var mı?)

- 5) Service Worker Konsolu
  - chrome://extensions > Upwork AI Assistant Pro > “Service worker” Inspect
  - Konsolda “Message received: …” satırları ve özellikle collector:jobsBatch çağrısı görünüyor mu?
  - Şu komutu çalıştırıp çıktı ekran görüntüsünü paylaşın:

```js path=null start=null
chrome.storage.local.get('collectedJobs', x => console.log('collectedJobs size =', (x.collectedJobs||[]).length));
```

- 6) HAR (opsiyonel hızlı çözüm)
  - DevTools > Network > Preserve log + Disable cache açık.
  - Job araması yapıp birkaç kart açın, sağ tık “Save all as HAR with content”.
  - Dosyayı Import HAR & Rank ile deneyin; eğer burada sonuç çıkıyorsa, canlı sarıcı regex’i güncellemem yeterli olacaktır.

---

## 5) Geçici Kullanılabilirlik İpuçları

- “Analyze Current Job” tek sayfa analizini API anahtarıyla her zaman yapar (canlı toplama gerekmez).
- HAR import ile AI sıralama çalışıyorsa, canlı toplama regex’i güncellenecektir; bu arada HAR ile çalışmaya devam edebilirsiniz.

---

## 6) Benim Yapacağım Düzeltmeler (Veriler Geldikten Sonra)

- Upwork uç noktalarınıza göre isUpworkApi() desenlerini genişleteceğim (gerekirse domain/path whitelisti ekleyeceğim):
  - Örn: /gds/… , /search/jobs/api … , farklı graphql opName değerleri, vb.
- JSON algılamayı Content-Type’a bağımlı olmadan güvenli metin->JSON parse denemesi ile gevşeteceğim.
- Toplama başına telemetry (sayfa->content->background) loglarını devreye alıp sorun olduğunda konsola kısa özet yazdıracağım (isteğe bağlı kapatılabilir “DEBUG” modu).

---

## 7) Sık Karşılaşılan Sorunlar ve Çözüm

- window.__UpAIFetchWrapped = false
  - Çözüm: Sayfayı tamamen yenileyin; başka uzantıları devre dışı bırakın; gerekirse uzantıyı “Reload” edin.
- Network’te JSON yanıt yok
  - Çözüm: Farklı liste sayfalarını deneyin; örnek URL’leri gönderin, deseni güncelleyelim.
- Service worker “collector:jobsBatch” almıyor
  - Çözüm: Sayfa konsolunda dinleyici hiç log basmıyorsa sorun sayfa tarafında; basıyorsa ama background görmüyorsa, content->background mesaj kanalı veya izinlerde sorun var — birlikte bakarız.

---

## 8) Sonuç

Bu maddeleri ve istenen çıktı/logları paylaştığınızda, sorunu hızla izole eder ve gerekli yamayı (regex genişletmesi/algılayıcı düzeltmesi) uygularım. Özellikle gerçek istek URL’leri ve Content-Type bilgisi tanı için kritiktir.

