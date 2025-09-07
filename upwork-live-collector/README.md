# 🚀 Upwork AI Assistant - Live Collector

Upwork'te gezinirken otomatik olarak iş ilanlarını toplayan ve analiz için hazırlayan Chrome uzantısı.

## ✨ Özellikler

- **🔍 Pasif Veri Toplama**: Upwork sayfalarında gezinirken arka planda otomatik iş verisi toplama
- **🛡️ CSP Uyumlu**: Content Security Policy kısıtlamalarını aşan güvenli mimari
- **⚡ Gerçek Zamanlı**: Sayfa yüklenirken API çağrılarını yakalayarak anında veri toplama
- **🎯 Akıllı Filtreleme**: Sadece iş ilanı içeren API yanıtlarını işler
- **💾 Verimli Depolama**: Tekrar eden verileri önleyerek Chrome storage'da saklar
- **🔔 Bildirimler**: Yeni işler bulunduğunda kullanıcıyı bilgilendirir

## 🛠️ Kurulum

### 1. Uzantıyı Yükle

1. Chrome'da `chrome://extensions/` sayfasına git
2. Sağ üst köşede **"Developer mode"** (Geliştirici modu) anahtarını aç
3. **"Load unpacked"** (Paketlenmemiş yükle) butonuna tıkla
4. Bu `upwork-live-collector` klasörünü seç
5. Uzantı yüklendi! ✅

### 2. Test Et

1. `test.html` dosyasını Chrome'da aç
2. "Check Extension Status" butonuna tıkla
3. "Simulate Upwork API Call" ile test verisi gönder
4. Sonuçları kontrol et

## 🎯 Kullanım

### Otomatik Toplama

1. [Upwork iş arama sayfasına](https://www.upwork.com/nx/find-work/) git
2. Sayfada normal şekilde gezin ve kaydır
3. Uzantı arka planda otomatik olarak veri toplayacak
4. Yeni işler bulunduğunda bildirim alacaksınız

### Toplanan Veriyi Görme

**Chrome DevTools ile:**
1. `F12` tuşuna bas
2. **Console** sekmesinde `[Upwork Live Collector]` loglarını kontrol et
3. **Application** > **Storage** > **Local Storage** altında `collectedJobs` anahtarına bak

**Service Worker Console ile:**
1. `chrome://extensions/` sayfasına git
2. Uzantıda **"Service Worker"** linkine tıkla
3. Konsol penceresinde logları ve `chrome.storage.local.get(['collectedJobs'])` komutunu çalıştır

## 🏗️ Mimari

### Dosya Yapısı
```
upwork-live-collector/
├── manifest.json          # Uzantı konfigürasyonu
├── service-worker.js      # Arka plan script (veri işleme)
├── content-script.js      # İzole dünya (iletişim köprüsü)
├── injected-script.js     # Ana dünya (ağ trafiği yakalama)
├── icons/                 # Uzantı ikonları
├── test.html             # Test sayfası
└── README.md             # Bu dosya
```

### Çalışma Prensibi

1. **`content-script.js`**: Sayfa yüklendiğinde `injected-script.js`'yi ana dünyaya enjekte eder
2. **`injected-script.js`**: `fetch` ve `XMLHttpRequest`'leri yakalar, API yanıtlarını analiz eder
3. **`service-worker.js`**: Gelen veriyi işler, tekilleştirir ve Chrome storage'a kaydeder

### Veri Akışı

```
Upwork API → injected-script.js → content-script.js → service-worker.js → Chrome Storage
```

## 🔍 Hangi Veriler Toplanır?

- **Başlık**: İş ilanı başlığı
- **Açıklama**: İş tanımı
- **Beceriler**: Gerekli yetenekler listesi
- **URL**: İş ilanı bağlantısı
- **ID**: Benzersiz tanımlayıcı
- **Zaman**: Toplandığı tarih

## 🛡️ Güvenlik

- ✅ Sadece Upwork domain'lerinde çalışır
- ✅ Kullanıcı verilerini dışarı göndermez
- ✅ Sadece public API yanıtlarını analiz eder
- ✅ Chrome'un güvenlik standartlarına uygun
- ✅ Content Security Policy (CSP) uyumlu

## 🐛 Sorun Giderme

### Uzantı Çalışmıyor

1. `chrome://extensions/` sayfasında uzantının aktif olduğunu kontrol et
2. Uzantıyı **"Reload"** et
3. Chrome'u yeniden başlat
4. `test.html` sayfasında test et

### Veri Toplanmıyor

1. Upwork'te oturum açık olduğunu kontrol et
2. `F12` → Console'da error mesajları var mı bak
3. Service Worker konsolu açıp logları kontrol et
4. Farklı Upwork sayfalarında dene

### Console Hataları

**"Cannot access chrome.runtime"**
→ Uzantı düzgün yüklenmemiş, tekrar yükle

**"Receiving end does not exist"** 
→ Service Worker çökebilir, uzantıyı reload et

**"CSP policy violation"**
→ Inline script kullanımı, kod `injected-script.js` dosyasında olmalı

## 🚀 Gelecek Özellikler

- [ ] **Popup UI**: Toplanan işleri gösteren arayüz
- [ ] **Filtreler**: Beceri, bütçe, tarih bazlı filtreleme
- [ ] **Export**: JSON/CSV formatında veri dışa aktarma
- [ ] **AI Analiz**: İş uygunluk skorlaması
- [ ] **İstatistikler**: Trend analizi ve raporlar

## 📝 Geliştirici Notları

### Debug Modu
```javascript
// Console'da çalıştır
chrome.storage.local.get(['collectedJobs'], (result) => {
    console.log('Stored jobs:', result.collectedJobs);
});
```

### Manuel Test
```javascript
// Test verisi gönder
chrome.runtime.sendMessage({
    type: 'PROCESS_UPWORK_DATA',
    payload: {
        data: {
            marketplaceJobPostingsSearch: {
                edges: [
                    { node: { id: 'test-1', title: 'Test Job', description: 'Test description' } }
                ]
            }
        }
    }
});
```

## 📄 Lisans

Bu proje öğrenme ve geliştirme amaçlı oluşturulmuştur. Upwork'ün hizmet şartlarına uygun şekilde kullanın.

---

**Not**: Bu uzantı Upwork'ün resmi bir ürünü değildir. Sadece public API yanıtlarını analiz eder ve herhangi bir veriyi dışarı göndermez.
