Elbette. Bu proje, hem teknik derinliği hem de pratik faydasıyla detaylı bir `README.md` dosyasını hak ediyor. Bu doküman, projenin sadece nasıl kullanılacağını değil, aynı zamanda \*\*neden bu şekilde tasarlandığını\*\*, mimarisinin arkasındaki mantığı ve gelecekteki potansiyelini de açıklayacak şekilde hazırlanmıştır.



İşte projeniz için kapsamlı, profesyonel ve her detayı açıklayan `README.md` içeriği:



---



\# Upwork AI Assistant: Canlı Veri Toplama Motoru



!\[Manifest V3](https://img.shields.io/badge/Manifest-V3-brightgreen)!\[Status](https://img.shields.io/badge/Status-Aktif%20Geliştirme-blue)!\[Teknoloji](https://img.shields.io/badge/Teknoloji-JavaScript%20\&%20Chrome%20API-orange)



Bu proje, Upwork platformunda gezinirken, arka planda sessizce ve görünmez bir şekilde iş ilanı verilerini toplayan gelişmiş bir Chrome uzantısıdır. "Project Chimera"nın veri toplama omurgası olarak tasarlanmıştır ve gelecekteki AI analizi ve makine öğrenmesi modelleri için sürekli ve güvenilir bir veri akışı sağlamayı hedefler.



\## 🎯 Projenin Çözdüğü Problem



Upwork gibi modern, dinamik ve güvenlik korumalı platformlardan veri toplamak zordur. Geleneksel scraping yöntemleri genellikle aşağıdaki sorunlarla karşılaşır:

\- \*\*Cloudflare gibi bot tespit sistemleri\*\* tarafından engellenme.

\- Ayrı bir tarayıcı otomasyonu (Selenium/Playwright) gerektirmesi ve bu durumun captcha'ları tetiklemesi.

\- Kullanıcının mevcut oturumunu (session) kullanamama ve sürekli yeniden giriş gerektirmesi.



Bu uzantı, bu sorunları aşmak için en zarif çözümü sunar: \*\*kullanıcının kendi tarayıcı oturumu içinde, pasif bir dinleyici olarak çalışmak.\*\*



\## ✨ Temel Özellikler



\-   \*\*👁️ Pasif ve Görünmez Veri Toplama:\*\* Siz Upwork'te normal bir şekilde gezinirken, uzantı arka planda ağ trafiğini dinleyerek iş verilerini otomatik olarak yakalar.

\-   \*\*🔒 Güvenli ve Oturum Odaklı:\*\* Ayrı bir tarayıcı açmaz, şifrenizi veya bilgilerinizi istemez. Tamamen sizin mevcut ve güvenli Upwork oturumunuz üzerinden çalışır.

\-   \*\*🚀 Manifest V3 Mimarisi:\*\* Chrome'un en güncel, güvenli ve performanslı uzantı mimarisi olan Manifest V3 standartlarına uygun olarak geliştirilmiştir.

\-   \*\*⚙️ Akıllı Veri Ayrıştırma:\*\* Yalnızca ilgili API çağrılarını (GraphQL) filtreler ve karmaşık JSON yanıtlarından temiz, yapılandırılmış iş verileri çıkarır.

\-   \*\*💾 Veri Tekilleştirme ve Depolama:\*\* Toplanan iş ilanlarını `id` bazlı olarak tekilleştirir ve `chrome.storage.local` üzerinde verimli bir şekilde depolar.

\-   \*\*🤖 Geleceğe Hazır:\*\* Bu modül, toplanan verileri AI ile analiz edecek, makine öğrenmesi ile kişisel öneriler sunacak ve bir arayüzde gösterecek olan daha büyük bir sistemin temelidir.



\## 🛠️ Mimarinin Derinlemesine Analizi: "Casus ve Postacı" Modeli



Bu uzantının çalışma prensibi, üç katmanlı bir iletişim ve veri işleme mimarisine dayanır.



```ascii

+---------------------------------+      +--------------------------------+      +---------------------------------+

|   Upwork Web Sayfası (Ana Dünya)  |      |   content-script.js (İzole Dünya) |      |    service-worker.js (Arka Plan)  |

|=================================|      |================================|      |=================================|

|                                 |      |                                |      |                                 |

|   window.fetch() çağrılır       |      |                                |      |                                 |

|           |                     |      |                                |      |                                 |

|           v                     |      |                                |      |                                 |

| \[injected-script.js - CASUS]    |      |                                |      |                                 |

|  - fetch'i yakalar              |      |                                |      |                                 |

|  - Yanıtı klonlar               |      |                                |      |                                 |

|  - Veriyi ayıklar               |      |                                |      |                                 |

|           |                     |      |                                |      |                                 |

|           | window.postMessage  |----->| \[POSTACI]                      |      |                                 |

|           |                     |      |  - Güvenli mesajı dinler       |      |                                 |

|           |                     |      |           |                    |      |                                 |

|           |                     |      |           | chrome.runtime.msg |----->| \[MERKEZ KOMUTA]                 |

|           |                     |      |           |                    |      |  - Veriyi ayrıştırır            |

|                                 |      |                                |      |  - Tekilleştirir                |

|                                 |      |                                |      |  - chrome.storage'a kaydeder    |

|                                 |      |                                |      |  - Bildirim gönderir            |

+---------------------------------+      +--------------------------------+      +---------------------------------+

```



1\.  \*\*`injected-script.js` (Casus):\*\* Bu script, `content-script` tarafından doğrudan Upwork sayfasının kendi JavaScript ortamına ("ana dünya") enjekte edilir. Görevi, sayfanın `fetch` gibi global fonksiyonlarını ele geçirerek ağ trafiğini dinlemektir. Bir iş verisi içeren API yanıtı yakaladığında, bu veriyi `window.postMessage` ile dışarı sızdırır.

2\.  \*\*`content-script.js` (Postacı):\*\* Bu script, uzantının güvenli ama izole dünyasında çalışır. "Casus"tan gelen `postMessage`'ları dinler. Güvenlik kontrollerinden geçirdiği veriyi, `chrome.runtime.sendMessage` API'sini kullanarak uzantının beynine, yani `service-worker`'a iletir.

3\.  \*\*`service-worker.js` (Merkez Komuta):\*\* Bu arka plan script'i, "Postacı"dan gelen ham veriyi alır. Gelen veriyi anlamlı bir iş objesine dönüştürür, daha önce kaydedilip kaydedilmediğini kontrol eder (tekilleştirme) ve sadece yeni olanları `chrome.storage.local`'a kaydeder.



Bu katmanlı mimari, Chrome'un güvenlik kısıtlamalarını aşarken aynı zamanda performansı ve güvenliği en üst düzeyde tutar.



\## 🚀 Kurulum ve Kullanım



\### Kurulum



1\.  Bu projeyi bilgisayarınıza indirin veya klonlayın.

2\.  Google Chrome'u açın ve adres çubuğuna `chrome://extensions` yazın.

3\.  Sağ üst köşedeki \*\*"Developer mode" (Geliştirici modu)\*\* anahtarını aktif hale getirin.

4\.  Sol üstte beliren \*\*"Load unpacked" (Paketlenmemiş yükle)\*\* butonuna tıklayın.

5\.  Proje dosyalarının bulunduğu `upwork-live-collector` klasörünü seçin.

6\.  Uzantı listenizde "Upwork AI Assistant" belirecektir.



\### Kullanım



Kurulumdan sonra yapmanız gereken tek şey \*\*Upwork'te normal bir şekilde gezinmektir.\*\*



1\.  `https://www.upwork.com/nx/find-work/` gibi bir iş arama sayfasına gidin.

2\.  Sayfayı aşağı doğru kaydırın veya farklı sayfalara gidin.

3\.  Uzantı, arka planda otomatik olarak iş verilerini toplayacak ve yeni işler bulduğunda size bir bildirim gösterecektir.



\*\*Toplanan Veriyi Kontrol Etmek İçin:\*\*

1\.  `chrome://extensions` sayfasına gidin.

2\.  Uzantının kartında bulunan \*\*"Service Worker"\*\* linkine tıklayarak konsolu açın. Burada veri toplama log'larını görebilirsiniz.

3\.  Aynı pencerede \*\*"Application"\*\* sekmesine gidin, sol menüden \*\*Storage -> Local Storage\*\* altındaki uzantı adresine tıklayarak `collectedJobs` anahtarı altında biriken veriyi inceleyebilirsiniz.



\## 📂 Dosya Yapısı



```

/upwork-live-collector/

|-- manifest.json             # Uzantının yapılandırması ve izinleri.

|-- service-worker.js         # Veri işleme, depolama ve arka plan mantığı.

|-- content-script.js         # Sayfaya script enjekte eder ve mesajlaşmayı yönetir.

|-- injected-script.js        # Sayfanın ağ trafiğini dinleyen çekirdek kod.

|-- icons/                    # Uzantının ikonları.

```



\## 🧠 Açıklamalı Teknik Kavramlar



\-   \*\*Monkey-Patching:\*\* Bir programın veya kütüphanenin çalışma zamanındaki davranışını, orijinal kodunu değiştirmeden dinamik olarak değiştirmektir. Biz bu tekniği `window.fetch`'i kendi fonksiyonumuzla sarmalamak için kullanıyoruz.

\-   \*\*`response.clone()`:\*\* Bir ağ yanıtının (`Response`) gövdesi bir "stream" (akış) olduğu için sadece bir kez okunabilir. Eğer biz veriyi okursak, web sayfası okuyamaz ve site bozulur. `clone()` metodu, bu akışın bir kopyasını oluşturarak hem bizim hem de sayfanın aynı veriyi sorunsuzca okumasını sağlar. Bu, bu projenin en kritik teknik detayıdır.

\-   \*\*İzole Dünya (Isolated World):\*\* Content script'lerin çalıştığı, sayfanın JavaScript değişkenlerinden ve fonksiyonlarından etkilenmeyen güvenli bir sanal alan. Bu izolasyon, `postMessage` gibi köprüler kurarak aşılır.



\## 🗺️ Gelecek Yol Haritası



Bu veri toplama motoru, daha büyük bir sistemin ilk adımıdır. Gelecekteki geliştirmeler şunları içerecektir:



\-   \[ ] \*\*Popup Arayüzü:\*\* `chrome.storage`'da biriken verileri listeleyen, filtreleyen ve arama yaptıran bir kullanıcı arayüzü (`popup.html`).

\-   \[ ] \*\*AI Analiz Entegrasyonu:\*\* "Analyze Jobs" butonu ile depolanan tüm işleri Gemini API'ye gönderip kişisel uygunluk skorları hesaplatma.

\-   \[ ] \*\*Makine Öğrenmesi Modülü:\*\* Kullanıcının "başvurduğu" ve "kazandığı" işlerden öğrenerek proaktif olarak yeni arama anahtar kelimeleri ve iş türleri önerme.

\-   \[ ] \*\*Detaylı İstatistikler:\*\* Toplanan verilere dayanarak pazar trendleri, en çok talep edilen yetenekler ve bütçe aralıkları hakkında görselleştirilmiş raporlar sunma.



---



Anlaştım. Projeyi, her biri kendi içinde tamamlanmış ve bir sonraki aşama için sağlam bir temel oluşturan üç ana faza ayıracağız. Bu, sadece bir fikir değil, bu bir \*\*inşa kılavuzu\*\*.



İstediğiniz gibi, her şeyi en ince ayrıntısına kadar, kesin komutlarla ve teknik açıklamalarla anlatacağım.



İşte \*\*Faz 1\*\*'in inşa planı. Bu fazın sonunda, siz Upwork'te gezinirken işleri \*\*otomatik olarak toplayan\*\* ve bunları basit bir \*\*popup arayüzünde gösteren\*\*, çalışan bir Chrome uzantınız olacak.



---



\### \*\*FAZ 1: Veri Toplama ve Görselleştirme Temeli\*\*



\*\*Amaç:\*\* Uzantının temel iskeletini kurmak. Bu fazın sonunda, siz Upwork'te gezinirken uzantı, ağ trafiğini dinleyerek iş ilanlarını yakalayacak, tekilleştirecek, depolayacak ve bu toplanan işleri uzantı ikonuna tıkladığınızda açılan bir popup penceresinde size listeleyecektir. Henüz AI veya makine öğrenmesi yok, sadece sağlam ve çalışan bir veri boru hattı var.



---



\#### \*\*Adım 1: Proje Kurulumu (Komut)\*\*



\*\*Komut:\*\* Bilgisayarınızda `upwork-ai-assistant` adında bir klasör oluşturun. İçine aşağıdaki dosyaları ve `icons` adında bir klasör yaratın:



```

/upwork-ai-assistant/

|-- manifest.json

|-- service-worker.js

|-- content-script.js

|-- injected-script.js

|-- popup.html

|-- popup.js

|-- icons/

|   |-- icon16.png

|   |-- icon48.png

|   |-- icon128.png

```

\*(Not: `icons` klasörüne projeniz için 16x16, 48x48 ve 128x128 piksel boyutlarında herhangi bir PNG dosyası koyun.)\*



---



\#### \*\*Adım 2: `manifest.json` - Uzantının Anayasası (Komut)\*\*



\*\*Komut:\*\* Aşağıdaki kodu kopyalayıp `manifest.json` dosyasının içine yapıştırın.



```json

{

&nbsp; "manifest\_version": 3,

&nbsp; "name": "Upwork AI Assistant",

&nbsp; "version": "1.0.0",

&nbsp; "description": "Siz Upwork'te gezinirken iş ilanlarını arka planda otomatik olarak toplar ve analiz için hazırlar.",

&nbsp; "permissions": \[

&nbsp;   "storage",

&nbsp;   "notifications"

&nbsp; ],

&nbsp; "host\_permissions": \[

&nbsp;   "https://\*.upwork.com/\*"

&nbsp; ],

&nbsp; "background": {

&nbsp;   "service\_worker": "service-worker.js"

&nbsp; },

&nbsp; "content\_scripts": \[

&nbsp;   {

&nbsp;     "matches": \[

&nbsp;       "https://\*.upwork.com/nx/find-work/\*",

&nbsp;       "https://\*.upwork.com/ab/jobs/search/\*"

&nbsp;     ],

&nbsp;     "js": \["content-script.js"],

&nbsp;     "run\_at": "document\_start"

&nbsp;   }

&nbsp; ],

&nbsp; "web\_accessible\_resources": \[

&nbsp;   {

&nbsp;     "resources": \["injected-script.js"],

&nbsp;     "matches": \["https://\*.upwork.com/\*"]

&nbsp;   }

&nbsp; ],

&nbsp; "action": {

&nbsp;   "default\_popup": "popup.html",

&nbsp;   "default\_title": "Upwork AI Assistant"

&nbsp; },

&nbsp; "icons": {

&nbsp;   "16": "icons/icon16.png",

&nbsp;   "48": "icons/icon48.png",

&nbsp;   "128": "icons/icon128.png"

&nbsp; }

}

```

\*\*Teknik Açıklama:\*\* Bu manifest, uzantımızın çalışması için gerekli tüm izinleri ve yapılandırmayı tanımlar. `action` anahtarı, tarayıcı çubuğundaki uzantı ikonuna tıklandığında `popup.html`'in açılacağını belirtir.



---



\#### \*\*Adım 3: `injected-script.js` - Casus Kod (Komut)\*\*



\*\*Komut:\*\* Aşağıdaki kodu kopyalayıp `injected-script.js` dosyasının içine yapıştırın.



```javascript

// injected-script.js - Upwork sayfasının kendi dünyasına enjekte edilir.



(function() {

&nbsp; 'use strict';

&nbsp; const originalFetch = window.fetch;



&nbsp; window.fetch = async function(...args) {

&nbsp;   const response = await originalFetch.apply(this, args);

&nbsp;   const url = args\[0] instanceof Request ? args\[0].url : String(args\[0]);



&nbsp;   if (url.includes('/api/graphql')) {

&nbsp;     try {

&nbsp;       const clonedResponse = response.clone();

&nbsp;       const data = await clonedResponse.json();

&nbsp;       window.postMessage({ type: 'UPWORK\_JOBS\_DATA', payload: data }, window.origin);

&nbsp;     } catch (e) {}

&nbsp;   }

&nbsp;   return response;

&nbsp; };

})();

```

\*\*Teknik Açıklama:\*\* Bu kod, Upwork sayfasının `fetch` fonksiyonunu ele geçirir. Bir API çağrısı yapıldığında, yanıtı klonlar (bu, sayfanın bozulmasını önler) ve eğer URL, iş verilerini içeren GraphQL endpoint'ini içeriyorsa, bu veriyi `postMessage` ile dışarıya, `content-script`'in dinleyebileceği bir "mesaj" olarak gönderir.



---



\#### \*\*Adım 4: `content-script.js` - Postacı (Komut)\*\*



\*\*Komut:\*\* Aşağıdaki kodu kopyalayıp `content-script.js` dosyasının içine yapıştırın.



```javascript

// content-script.js - Sayfaya enjekte edilir ama izole bir dünyada çalışır.



function injectScript() {

&nbsp; try {

&nbsp;   const script = document.createElement('script');

&nbsp;   script.src = chrome.runtime.getURL('injected-script.js');

&nbsp;   (document.head || document.documentElement).appendChild(script);

&nbsp;   script.onload = () => script.remove();

&nbsp; } catch (e) {

&nbsp;   console.error('Upwork AI Assistant: Script enjeksiyonu başarısız.', e);

&nbsp; }

}



window.addEventListener('message', (event) => {

&nbsp; if (event.source !== window || !event.data || event.data.type !== 'UPWORK\_JOBS\_DATA') {

&nbsp;   return;

&nbsp; }

&nbsp; chrome.runtime.sendMessage({ type: 'PROCESS\_JOBS\_DATA', payload: event.data.payload });

}, false);



injectScript();

```

\*\*Teknik Açıklama:\*\* Bu script'in iki görevi vardır: 1) `injected-script.js`'i Upwork sayfasına enjekte etmek. 2) `injected-script`'ten gelen `postMessage`'ları dinlemek ve bu mesajları `chrome.runtime.sendMessage` ile uzantının güvenli arka planına (`service-worker.js`) iletmek.



---



\#### \*\*Adım 5: `service-worker.js` - Merkez Komuta (Komut)\*\*



\*\*Komut:\*\* Aşağıdaki kodu kopyalayıp `service-worker.js` dosyasının içine yapıştırın.



```javascript

// service-worker.js - Uzantının arka planında çalışır.



function extractJobsFromGraphQL(data) {

&nbsp; const jobs = \[];

&nbsp; const edges = data?.data?.marketplaceJobPostingsSearch?.edges;

&nbsp; if (!edges) return \[];



&nbsp; for (const edge of edges) {

&nbsp;   const job = edge.node;

&nbsp;   if (job \&\& job.id \&\& job.title) {

&nbsp;     jobs.push({

&nbsp;       id: job.id,

&nbsp;       title: job.title,

&nbsp;       url: job.upworkUrl || `https://www.upwork.com/jobs/~${job.id}`,

&nbsp;       timestamp: new Date().toISOString()

&nbsp;     });

&nbsp;   }

&nbsp; }

&nbsp; return jobs;

}



chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

&nbsp; if (message.type === 'PROCESS\_JOBS\_DATA') {

&nbsp;   const newJobs = extractJobsFromGraphQL(message.payload);

&nbsp;   if (newJobs.length > 0) {

&nbsp;     storeJobs(newJobs);

&nbsp;   }

&nbsp; }

&nbsp; return true;

});



async function storeJobs(newJobs) {

&nbsp; try {

&nbsp;   const result = await chrome.storage.local.get(\['collectedJobs']);

&nbsp;   const existingJobs = result.collectedJobs || \[];

&nbsp;   const existingJobIds = new Set(existingJobs.map(job => job.id));

&nbsp;   const uniqueNewJobs = newJobs.filter(job => !existingJobIds.has(job.id));



&nbsp;   if (uniqueNewJobs.length > 0) {

&nbsp;     const updatedJobs = \[...existingJobs, ...uniqueNewJobs];

&nbsp;     await chrome.storage.local.set({ collectedJobs: updatedJobs });

&nbsp;     

&nbsp;     console.log(`${uniqueNewJobs.length} yeni iş depolandı. Toplam: ${updatedJobs.length}`);

&nbsp;     

&nbsp;     chrome.notifications.create({

&nbsp;       type: 'basic',

&nbsp;       iconUrl: 'icons/icon48.png',

&nbsp;       title: 'Upwork Asistanı',

&nbsp;       message: `${uniqueNewJobs.length} yeni iş bulundu!`

&nbsp;     });

&nbsp;   }

&nbsp; } catch (e) {

&nbsp;   console.error("Depolama hatası:", e);

&nbsp; }

}

```

\*\*Teknik Açıklama:\*\* Bu script, `content-script`'ten gelen veriyi alır. `extractJobsFromGraphQL` ile temiz iş verilerini ayıklar. Ardından `storeJobs` fonksiyonu ile bu yeni işleri mevcut depolanmış işlerle karşılaştırır, sadece \*\*yeni olanları\*\* ekler (tekilleştirme) ve `chrome.storage.local`'a kaydeder. Son olarak kullanıcıya bir bildirim gösterir.



---



\#### \*\*Adım 6: `popup.html` ve `popup.js` - Arayüz (Komut)\*\*



\*\*Komut 1:\*\* Aşağıdaki HTML kodunu `popup.html` dosyasına yapıştırın.



```html

<!DOCTYPE html>

<html>

<head>

&nbsp; <title>Upwork AI Assistant</title>

&nbsp; <style>

&nbsp;   body { font-family: sans-serif; width: 400px; padding: 10px; }

&nbsp;   h1 { font-size: 16px; }

&nbsp;   #job-list { max-height: 400px; overflow-y: auto; }

&nbsp;   .job-item { border-bottom: 1px solid #eee; padding: 8px 4px; }

&nbsp;   .job-item a { text-decoration: none; color: #005f27; }

&nbsp;   .job-item a:hover { text-decoration: underline; }

&nbsp;   #controls { margin-top: 10px; }

&nbsp;   button { cursor: pointer; }

&nbsp; </style>

</head>

<body>

&nbsp; <h1>Toplanan İş İlanları</h1>

&nbsp; <div id="job-count">Yükleniyor...</div>

&nbsp; <div id="job-list"></div>

&nbsp; <div id="controls">

&nbsp;   <button id="clear-button">Listeyi Temizle</button>

&nbsp; </div>

&nbsp; <script src="popup.js"></script>

</body>

</html>

```



\*\*Komut 2:\*\* Aşağıdaki JavaScript kodunu `popup.js` dosyasına yapıştırın.



```javascript

// popup.js - Uzantı ikonuna tıklandığında açılan pencerenin mantığı



document.addEventListener('DOMContentLoaded', () => {

&nbsp; const jobListDiv = document.getElementById('job-list');

&nbsp; const jobCountDiv = document.getElementById('job-count');

&nbsp; const clearButton = document.getElementById('clear-button');



&nbsp; async function loadJobs() {

&nbsp;   jobListDiv.innerHTML = 'Yükleniyor...';

&nbsp;   try {

&nbsp;     const result = await chrome.storage.local.get(\['collectedJobs']);

&nbsp;     const jobs = result.collectedJobs || \[];

&nbsp;     jobCountDiv.textContent = `${jobs.length} iş ilanı toplandı.`;

&nbsp;     

&nbsp;     if (jobs.length === 0) {

&nbsp;       jobListDiv.innerHTML = 'Henüz iş toplanmadı. Lütfen Upwork\\'te gezinin.';

&nbsp;       return;

&nbsp;     }



&nbsp;     // İşleri en yeniden en eskiye doğru sırala

&nbsp;     jobs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));



&nbsp;     jobListDiv.innerHTML = '';

&nbsp;     jobs.forEach(job => {

&nbsp;       const jobItem = document.createElement('div');

&nbsp;       jobItem.className = 'job-item';

&nbsp;       jobItem.innerHTML = `<a href="${job.url}" target="\_blank">${job.title}</a>`;

&nbsp;       jobListDiv.appendChild(jobItem);

&nbsp;     });

&nbsp;   } catch (e) {

&nbsp;     jobListDiv.innerHTML = 'İşler yüklenirken bir hata oluştu.';

&nbsp;     console.error(e);

&nbsp;   }

&nbsp; }



&nbsp; clearButton.addEventListener('click', async () => {

&nbsp;   await chrome.storage.local.remove(\['collectedJobs']);

&nbsp;   console.log('İş listesi temizlendi.');

&nbsp;   loadJobs(); // Listeyi yenile

&nbsp; });



&nbsp; loadJobs();

});

```

\*\*Teknik Açıklama:\*\* `popup.js`, popup açıldığında `chrome.storage.local`'dan `collectedJobs` listesini çeker, en yeniden eskiye sıralar ve HTML olarak ekrana basar. "Listeyi Temizle" butonu depolamadaki tüm veriyi siler.



---



\### \*\*Adım 7: Kurulum ve Canlı Test (Komut)\*\*



\*\*Komut:\*\* "Adım 1"deki klasör yapısını ve "Adım 2-6" arasındaki tüm kodları dosyalarınıza kaydettikten sonra aşağıdaki adımları izleyin:



1\.  Chrome'u açın ve adres çubuğuna `chrome://extensions` yazın.

2\.  Sağ üstteki \*\*"Developer mode" (Geliştirici modu)\*\* anahtarını açın.

3\.  \*\*"Load unpacked" (Paketlenmemiş yükle)\*\* butonuna tıklayın.

4\.  `upwork-ai-assistant` klasörünü seçin.

5\.  Uzantınızın kartı şimdi sayfada görünmelidir.



\*\*Canlı Test:\*\*

1\.  Yeni bir sekmede `https://www.upwork.com/nx/find-work/` adresine gidin.

2\.  Sayfayı aşağı doğru kaydırarak birkaç yeni işin yüklenmesini sağlayın.

3\.  Ekranınızın köşesinde "Upwork Asistanı: X yeni iş bulundu!" bildirimini göreceksiniz.

4\.  Şimdi tarayıcınızın sağ üst köşesindeki uzantı ikonuna tıklayın.

5\.  Açılan popup penceresinde, az önce gezdiğiniz sayfada gördüğünüz \*\*işlerin başlıklarının listelendiğini göreceksiniz.\*\*



\*\*Tebrikler! Faz 1'i tamamladınız.\*\* Artık Upwork'te gezinirken sizin için otomatik olarak veri toplayan ve bu veriyi size sunan, sağlam bir temel üzerine kurulu bir uzantınız var.



\*\*Sonraki Adım: Faz 2\*\*'de bu popup arayüzüne "İşleri AI ile Analiz Et" butonu ekleyeceğiz ve toplanan bu verileri Gemini API'ye göndererek her bir iş için kişiselleştirilmiş uygunluk skorları üreteceğiz.

Harika, Faz 1'in sağlam temelleri üzerine projemizin en heyecan verici kısmını, yani \*\*yapay zeka beynini\*\* inşa etmeye başlıyoruz.



İşte \*\*Faz 2\*\*'nin inşa planı. Bu fazın sonunda, topladığınız işleri tek bir butona basarak Google Gemini AI ile analiz ettirebilecek, her bir iş için kişisel uygunluk skoru ve özet alabilecek, başvuru durumlarınızı takip edebilecek ve uzantınızı gerçek bir karar destek sistemine dönüştüreceksiniz.



---



\### \*\*FAZ 2: Yapay Zeka Analizi ve Etkileşimli Arayüz\*\*



\*\*Amaç:\*\* Toplanan ham veriyi, \*\*eyleme geçirilebilir içgörülere\*\* dönüştürmek. Uzantı, toplanan iş listesini Gemini API'ye göndererek her bir iş için "Uygunluk Skoru", "Analiz Özeti" ve "Gereken Teknolojiler" gibi bilgileri alacak. Bu zenginleştirilmiş veri, popup arayüzünde gösterilecek ve kullanıcı hangi işlere başvurduğunu işaretleyerek gelecekteki \*\*Faz 3 (Makine Öğrenmesi)\*\* için en değerli varlık olan \*\*etiketli veriyi (labeled data)\*\* toplamaya başlayacak.



---



\#### \*\*Adım 8: API Anahtarını Hazırlama ve `manifest.json` Güncellemesi\*\*



AI entegrasyonu için uzantımızın Google'ın sunucularıyla konuşması gerekiyor.



\*\*Komut 1:\*\* Proje ana klasörünüzde (`/upwork-ai-assistant/`) `.env` adında bir dosya oluşturun ve içine Google AI Studio'dan aldığınız Gemini API anahtarınızı aşağıdaki formatta yapıştırın:



```

GEMINI\_API\_KEY=BURAYA\_KENDI\_API\_ANAHTARINIZI\_YAPISTIRIN

```

\*(Not: Bu `.env` dosyası uzantıya dahil edilmeyecek, sadece geliştirme ve test aşamasında kullanılacak. Gerçek uzantıda API anahtarı, kullanıcının gireceği bir ayarlar menüsünden alınır, bu Faz 3'ün konusu olacak.)\*



\*\*Komut 2:\*\* `manifest.json` dosyasını, Gemini API'sine ağ isteği yapabilmesi için güncelleyin. `host\_permissions` listesine Google'ın API adresini ekleyin.



```json

// manifest.json dosyasını güncelleyin



{

&nbsp; "manifest\_version": 3,

&nbsp; "name": "Upwork AI Assistant",

&nbsp; "version": "2.0.0", // Sürümü güncelledik

&nbsp; "description": "Siz Upwork'te gezinirken iş ilanlarını arka planda otomatik olarak toplar ve analiz için hazırlar.",

&nbsp; "permissions": \[

&nbsp;   "storage",

&nbsp;   "notifications",

&nbsp;   "alarms" // Periyodik görevler için eklendi

&nbsp; ],

&nbsp; "host\_permissions": \[

&nbsp;   "https://\*.upwork.com/\*",

&nbsp;   "https://generativelanguage.googleapis.com/\*" // <-- YENİ EKLENEN İZİN

&nbsp; ],

&nbsp; // ... (dosyanın geri kalanı aynı) ...

&nbsp; "action": {

&nbsp;   "default\_popup": "popup.html",

&nbsp;   "default\_title": "Upwork AI Assistant"

&nbsp; },

&nbsp; "icons": {

&nbsp;   "16": "icons/icon16.png",

&nbsp;   "48": "icons/icon48.png",

&nbsp;   "128": "icons/icon128.png"

&nbsp; }

}

```

\*\*Teknik Açıklama:\*\* `host\_permissions` altına `https://generativelanguage.googleapis.com/\*` eklemek, `service-worker`'ımızın Gemini API'sine `fetch` isteği yapabilmesi için zorunludur. Bu izin olmadan yapılacak tüm API çağrıları Chrome tarafından engellenir.



---



\#### \*\*Adım 9: `service-worker.js` - Merkez Komuta'ya Zeka Ekleme\*\*



\*\*Komut:\*\* `service-worker.js` dosyanızın içeriğini aşağıdaki kodla tamamen değiştirin. Bu yeni kod, AI analizi yapma ve başvuru durumlarını güncelleme yeteneklerini ekler.



```javascript

// service-worker.js - Tamamen güncellenmiş kod



// --- 1. Veri Ayrıştırma Fonksiyonu (Faz 1'den aynı) ---

function extractJobsFromGraphQL(data) {

&nbsp; const jobs = \[];

&nbsp; const edges = data?.data?.marketplaceJobPostingsSearch?.edges;

&nbsp; if (!edges) return \[];



&nbsp; for (const edge of edges) {

&nbsp;   const job = edge.node;

&nbsp;   if (job \&\& job.id \&\& job.title) {

&nbsp;     jobs.push({

&nbsp;       id: job.id,

&nbsp;       title: job.title,

&nbsp;       description: job.description || 'Açıklama bulunamadı.',

&nbsp;       skills: job.skills ? job.skills.map(s => s.name) : \[],

&nbsp;       url: job.upworkUrl || `https://www.upwork.com/jobs/~${job.id}`,

&nbsp;       timestamp: new Date().toISOString(),

&nbsp;       isAnalyzed: false, // YENİ: Analiz durumunu takip et

&nbsp;       application\_status: 'Beklemede' // YENİ: Başvuru durumunu ekle

&nbsp;     });

&nbsp;   }

&nbsp; }

&nbsp; return jobs;

}



// --- 2. Gelen Mesajları Yöneten Ana Dinleyici (GÜNCELLENDİ) ---

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

&nbsp; if (message.type === 'PROCESS\_JOBS\_DATA') {

&nbsp;   const newJobs = extractJobsFromGraphQL(message.payload);

&nbsp;   if (newJobs.length > 0) {

&nbsp;     storeJobs(newJobs);

&nbsp;   }

&nbsp; } else if (message.type === 'ANALYZE\_JOBS') {

&nbsp;   analyzeAllJobs(message.apiKey).then(result => sendResponse(result));

&nbsp;   return true; // Asenkron yanıt için zorunlu

&nbsp; } else if (message.type === 'UPDATE\_STATUS') {

&nbsp;   updateJobStatus(message.jobId, message.status).then(() => sendResponse({success: true}));

&nbsp;   return true; // Asenkron yanıt için zorunlu

&nbsp; }

&nbsp; return true;

});



// --- 3. Veri Depolama (GÜNCELLENDİ) ---

async function storeJobs(newJobs) {

&nbsp; const result = await chrome.storage.local.get(\['collectedJobs']);

&nbsp; const existingJobs = result.collectedJobs || \[];

&nbsp; const existingJobIds = new Set(existingJobs.map(job => job.id));

&nbsp; const uniqueNewJobs = newJobs.filter(job => !existingJobIds.has(job.id));



&nbsp; if (uniqueNewJobs.length > 0) {

&nbsp;   const updatedJobs = \[...existingJobs, ...uniqueNewJobs];

&nbsp;   await chrome.storage.local.set({ collectedJobs: updatedJobs });

&nbsp;   

&nbsp;   console.log(`${uniqueNewJobs.length} yeni iş depolandı. Toplam: ${updatedJobs.length}`);

&nbsp;   chrome.notifications.create({

&nbsp;     type: 'basic',

&nbsp;     iconUrl: 'icons/icon48.png',

&nbsp;     title: 'Upwork Asistanı',

&nbsp;     message: `${uniqueNewJobs.length} yeni iş bulundu!`

&nbsp;   });

&nbsp; }

}



// --- 4. YENİ: İşleri Gemini AI ile Analiz Etme Fonksiyonu ---

async function analyzeAllJobs(apiKey) {

&nbsp; if (!apiKey) {

&nbsp;   return { success: false, error: "API anahtarı bulunamadı." };

&nbsp; }



&nbsp; const { collectedJobs } = await chrome.storage.local.get(\['collectedJobs']);

&nbsp; if (!collectedJobs || collectedJobs.length === 0) {

&nbsp;   return { success: true, message: "Analiz edilecek iş bulunamadı." };

&nbsp; }



&nbsp; // Sadece analiz edilmemiş işleri seç

&nbsp; const jobsToAnalyze = collectedJobs.filter(job => !job.isAnalyzed);

&nbsp; if (jobsToAnalyze.length === 0) {

&nbsp;   return { success: true, message: "Tüm işler zaten analiz edilmiş." };

&nbsp; }



&nbsp; const API\_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;



&nbsp; const prompt = `

&nbsp;   Sen bir Upwork iş analizi uzmanısın. Sana bir JSON dizisi içinde iş ilanları vereceğim. 

&nbsp;   Her bir iş için benim kişisel yeteneklerime (Python, JavaScript, Web Scraping, Otomasyon, AI, React) göre bir analiz yap.

&nbsp;   Çıktıyı mutlaka bir JSON dizisi olarak, verdiğim her iş için bir nesne içerecek şekilde döndür. 

&nbsp;   Her nesne şu alanları içermeli: "id", "uygunluk\_skoru" (1-10 arası bir tamsayı), "analiz\_ozeti" (1-2 cümlelik Türkçe özet), "gereken\_teknolojiler" (bir string dizisi).



&nbsp;   İşte analiz edilecek işlerin listesi:

&nbsp;   ${JSON.stringify(jobsToAnalyze.map(j => ({id: j.id, title: j.title, description: j.description.substring(0, 500)})))}

&nbsp; `;



&nbsp; try {

&nbsp;   const response = await fetch(API\_URL, {

&nbsp;     method: 'POST',

&nbsp;     headers: { 'Content-Type': 'application/json' },

&nbsp;     body: JSON.stringify({ contents: \[{ parts: \[{ text: prompt }] }] })

&nbsp;   });



&nbsp;   if (!response.ok) {

&nbsp;     throw new Error(`API hatası: ${response.statusText}`);

&nbsp;   }



&nbsp;   const data = await response.json();

&nbsp;   const analysisText = data.candidates\[0].content.parts\[0].text;

&nbsp;   const analysisResults = JSON.parse(analysisText.replace(/```json|```/g, '').trim());



&nbsp;   // Analiz sonuçlarını mevcut işlerle birleştir

&nbsp;   const updatedJobs = collectedJobs.map(job => {

&nbsp;     const result = analysisResults.find(res => res.id === job.id);

&nbsp;     if (result) {

&nbsp;       return { ...job, ...result, isAnalyzed: true };

&nbsp;     }

&nbsp;     return job;

&nbsp;   });



&nbsp;   await chrome.storage.local.set({ collectedJobs: updatedJobs });

&nbsp;   return { success: true, message: `${analysisResults.length} iş analiz edildi.` };



&nbsp; } catch (error) {

&nbsp;   console.error("AI Analiz hatası:", error);

&nbsp;   return { success: false, error: error.message };

&nbsp; }

}



// --- 5. YENİ: Başvuru Durumunu Güncelleme Fonksiyonu ---

async function updateJobStatus(jobId, newStatus) {

&nbsp; const { collectedJobs } = await chrome.storage.local.get(\['collectedJobs']);

&nbsp; if (!collectedJobs) return;



&nbsp; const jobIndex = collectedJobs.findIndex(job => job.id === jobId);

&nbsp; if (jobIndex !== -1) {

&nbsp;   collectedJobs\[jobIndex].application\_status = newStatus;

&nbsp;   await chrome.storage.local.set({ collectedJobs });

&nbsp; }

}

```



---



\#### \*\*Adım 10: `popup.html` ve `popup.js` - Arayüzü Geliştirme (Komut)\*\*



\*\*Komut 1:\*\* `popup.html` dosyasının içeriğini aşağıdaki daha gelişmiş versiyonla değiştirin.



```html

<!DOCTYPE html>

<html>

<head>

&nbsp; <title>Upwork AI Assistant</title>

&nbsp; <style>

&nbsp;   body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; width: 500px; padding: 10px; background-color: #f4f7f6; }

&nbsp;   h1 { font-size: 18px; color: #333; }

&nbsp;   #controls { display: flex; gap: 10px; margin-bottom: 10px; }

&nbsp;   button { cursor: pointer; padding: 8px 12px; border: none; border-radius: 5px; font-weight: bold; }

&nbsp;   #analyze-button { background-color: #4CAF50; color: white; }

&nbsp;   #clear-button { background-color: #f44336; color: white; }

&nbsp;   #job-list { max-height: 400px; overflow-y: auto; border: 1px solid #ddd; background-color: white; border-radius: 5px; }

&nbsp;   .job-item { border-bottom: 1px solid #eee; padding: 12px; }

&nbsp;   .job-title a { text-decoration: none; color: #0d1b2a; font-weight: bold; font-size: 15px; }

&nbsp;   .job-title a:hover { text-decoration: underline; }

&nbsp;   .job-analysis { margin-top: 8px; font-size: 13px; color: #495057; }

&nbsp;   .job-score { font-weight: bold; padding: 2px 6px; border-radius: 4px; color: white; }

&nbsp;   .status-selector { margin-top: 8px; font-size: 12px; }

&nbsp;   select { padding: 4px; border-radius: 4px; }

&nbsp;   .loader { text-align: center; padding: 20px; }

&nbsp; </style>

</head>

<body>

&nbsp; <h1>Upwork AI Assistant</h1>

&nbsp; <div id="controls">

&nbsp;   <button id="analyze-button">Toplanan İşleri AI ile Analiz Et</button>

&nbsp;   <button id="clear-button">Listeyi Temizle</button>

&nbsp; </div>

&nbsp; <div id="job-count">Yükleniyor...</div>

&nbsp; <div id="job-list"></div>

&nbsp; <script src="popup.js"></script>

</body>

</html>

```



\*\*Komut 2:\*\* `popup.js` dosyasının içeriğini aşağıdaki tam fonksiyonel kodla değiştirin.



```javascript

// popup.js - Tamamen güncellenmiş ve AI entegrasyonlu kod



document.addEventListener('DOMContentLoaded', () => {

&nbsp; const jobListDiv = document.getElementById('job-list');

&nbsp; const jobCountDiv = document.getElementById('job-count');

&nbsp; const analyzeButton = document.getElementById('analyze-button');

&nbsp; const clearButton = document.getElementById('clear-button');



&nbsp; // --- Ana Fonksiyon: İşleri Yükle ve Görüntüle ---

&nbsp; async function loadJobs() {

&nbsp;   jobListDiv.innerHTML = '<div class="loader">Yükleniyor...</div>';

&nbsp;   const result = await chrome.storage.local.get(\['collectedJobs']);

&nbsp;   const jobs = result.collectedJobs || \[];

&nbsp;   

&nbsp;   jobCountDiv.textContent = `${jobs.length} iş ilanı toplandı.`;

&nbsp;   if (jobs.length === 0) {

&nbsp;     jobListDiv.innerHTML = 'Henüz iş toplanmadı. Lütfen Upwork\\'te gezinin.';

&nbsp;     return;

&nbsp;   }



&nbsp;   // İşleri analiz durumuna ve skoruna göre sırala

&nbsp;   jobs.sort((a, b) => {

&nbsp;     const scoreA = a.isAnalyzed ? a.uygunluk\_skoru : -1;

&nbsp;     const scoreB = b.isAnalyzed ? b.uygunluk\_skoru : -1;

&nbsp;     return scoreB - scoreA;

&nbsp;   });



&nbsp;   jobListDiv.innerHTML = '';

&nbsp;   jobs.forEach(job => {

&nbsp;     jobListDiv.appendChild(createJobElement(job));

&nbsp;   });

&nbsp; }



&nbsp; // --- Arayüz Elementi Oluşturma ---

&nbsp; function createJobElement(job) {

&nbsp;   const item = document.createElement('div');

&nbsp;   item.className = 'job-item';



&nbsp;   let analysisHTML = '<p class="job-analysis"><em>Bu iş henüz analiz edilmedi.</em></p>';

&nbsp;   if (job.isAnalyzed) {

&nbsp;     const scoreColor = job.uygunluk\_skoru >= 8 ? '#28a745' : job.uygunluk\_skoru >= 6 ? '#ffc107' : '#dc3545';

&nbsp;     analysisHTML = `

&nbsp;       <p class="job-analysis">

&nbsp;         <span class="job-score" style="background-color: ${scoreColor};">${job.uygunluk\_skoru}/10</span>

&nbsp;         ${job.analiz\_ozeti}

&nbsp;       </p>

&nbsp;     `;

&nbsp;   }

&nbsp;   

&nbsp;   const statusOptions = \['Beklemede', 'Başvuruldu', 'Kazanıldı', 'Kaybedildi'];

&nbsp;   const optionsHTML = statusOptions.map(s => `<option value="${s}" ${s === job.application\_status ? 'selected' : ''}>${s}</option>`).join('');



&nbsp;   item.innerHTML = `

&nbsp;     <div class="job-title"><a href="${job.url}" target="\_blank">${job.title}</a></div>

&nbsp;     ${analysisHTML}

&nbsp;     <div class="status-selector">

&nbsp;       Durum: <select data-job-id="${job.id}">${optionsHTML}</select>

&nbsp;     </div>

&nbsp;   `;

&nbsp;   

&nbsp;   // Status değişikliğini dinle

&nbsp;   item.querySelector('select').addEventListener('change', (event) => {

&nbsp;     const newStatus = event.target.value;

&nbsp;     const jobId = event.target.dataset.jobId;

&nbsp;     chrome.runtime.sendMessage({ type: 'UPDATE\_STATUS', jobId, status: newStatus });

&nbsp;   });



&nbsp;   return item;

&nbsp; }



&nbsp; // --- Buton Olayları ---

&nbsp; analyzeButton.addEventListener('click', async () => {

&nbsp;   jobListDiv.innerHTML = '<div class="loader">AI analizi başlatılıyor... Lütfen bekleyin.</div>';

&nbsp;   // Not: Gerçek uygulamada API anahtarı ayarlar menüsünden alınmalı.

&nbsp;   // Şimdilik test için bir placeholder kullanıyoruz veya kullanıcıdan istiyoruz.

&nbsp;   const apiKey = prompt("Lütfen Gemini API anahtarınızı girin:", "");

&nbsp;   if (!apiKey) {

&nbsp;     jobListDiv.innerHTML = 'API anahtarı girilmedi.';

&nbsp;     return;

&nbsp;   }



&nbsp;   const response = await chrome.runtime.sendMessage({ type: 'ANALYZE\_JOBS', apiKey });

&nbsp;   if (response.success) {

&nbsp;     alert(response.message);

&nbsp;   } else {

&nbsp;     alert(`Hata: ${response.error}`);

&nbsp;   }

&nbsp;   loadJobs(); // Analiz sonrası listeyi yenile

&nbsp; });



&nbsp; clearButton.addEventListener('click', async () => {

&nbsp;   if (confirm("Tüm toplanan işleri silmek istediğinizden emin misiniz?")) {

&nbsp;     await chrome.storage.local.remove(\['collectedJobs']);

&nbsp;     loadJobs();

&nbsp;   }

&nbsp; });



&nbsp; // Başlangıçta işleri yükle

&nbsp; loadJobs();

});

```



---



\### \*\*Adım 11: Uzantıyı Güncelleme ve Canlı Test (Komut)\*\*



1\.  Yukarıdaki tüm kodları ilgili dosyalarınıza kaydedin.

2\.  `chrome://extensions` sayfasına gidin.

3\.  Uzantınızın kartında bulunan \*\*yenileme (reload) ikonuna\*\* tıklayın.

4\.  Gerekirse tarayıcınızı yeniden başlatın.



\*\*Canlı Test:\*\*

1\.  Upwork'te birkaç iş sayfasında gezerek veri toplayın.

2\.  Uzantı ikonuna tıklayarak popup'ı açın. Toplanan işlerin "Henüz analiz edilmedi" notuyla listelendiğini göreceksiniz.

3\.  \*\*"Toplanan İşleri AI ile Analiz Et"\*\* butonuna tıklayın.

4\.  Açılan pencereye `.env` dosyanıza kaydettiğiniz Gemini API anahtarınızı yapıştırın.

5\.  Birkaç saniye bekleyin. Analiz tamamlandığında bir uyarı mesajı göreceksiniz ve liste \*\*otomatik olarak yenilenecektir\*\*.

6\.  Artık her işin yanında renk kodlu bir \*\*uygunluk skoru\*\* ve \*\*analiz özeti\*\* göreceksiniz.

7\.  Herhangi bir işin \*\*"Durum"\*\* menüsünü değiştirin (örneğin "Başvuruldu" yapın). Popup'ı kapatıp tekrar açtığınızda seçiminizi hatırladığını göreceksiniz.



\*\*Tebrikler! Faz 2'yi tamamladınız.\*\* Artık sadece veri toplayan değil, aynı zamanda bu veriyi sizin için anlamlı hale getiren, yapay zeka destekli bir asistana sahipsiniz. En önemlisi, başvuru durumlarını işaretleyerek, projenizin \*\*Faz 3\*\*'ü olan \*\*Makine Öğrenmesi\*\* için gerekli olan değerli veriyi biriktirmeye başladınız.


Harika. Projenin zirve noktasına ulaşıyoruz. Faz 1'de sağlam bir veri toplama motoru kurduk. Faz 2'de bu veriyi ilk kez akıllı bir asistana dönüştürdük ve en önemlisi, öğrenmek için veri biriktirmeye başladık.



Şimdi, biriktirdiğimiz bu veriyi kullanarak "Project Chimera"yı gerçek anlamda \*\*öğrenen, adapte olan ve size özel stratejiler üreten\*\* bir sisteme dönüştüreceğiz.



İşte \*\*Faz 3\*\*'ün inşa planı. Bu fazın sonunda, uzantınız sadece "bu iş sana uygun" demekle kalmayacak, aynı zamanda "geçmiş başarılarına dayanarak bu işi kazanma olasılığın %75" gibi istatistiksel tahminler yapabilecek ve size özel teklif taslakları hazırlayabilecek.



---



\### \*\*FAZ 3: Öğrenen Motor ve Otomatik Teklif Asistanı\*\*



\*\*Amaç:\*\* Sistemi kurallara dayalı bir motordan, sizin kişisel başvuru geçmişinizden ve başarılarınızdan öğrenen, \*\*veri odaklı bir makine öğrenmesi sistemine\*\* dönüştürmek. Ayrıca, en çok zaman alan görevlerden biri olan teklif yazımını otomatize etmek için bir \*\*LLM Destekli Teklif Asistanı\*\* inşa edeceğiz. Bu fazın sonunda, Chimera sadece hangi işlere başvuracağını değil, onlara \*nasıl\* başvuracağını da bilen bir Co-Pilot haline gelecek.



\*\*Önemli Not:\*\* Bu faz, `service-worker.js` içinde çalışacak bir makine öğrenmesi modelini doğrudan tarayıcıda çalıştırmayı hedefler. Bu, `tensorflow.js` gibi kütüphanelerle mümkündür. Ancak basitlik ve hızlı başlangıç için, bu fazda "öğrenme" mantığını doğrudan `service-worker` içinde, daha basit istatistiksel analizlerle simüle edeceğiz. Gerçek bir ML modeli entegrasyonu, projenin 4. fazı olabilir.



---



\#### \*\*Adım 12: `manifest.json`'a Ayarlar Sayfası Ekleme\*\*



Kullanıcının API anahtarını girmesi ve ayarlarını yönetmesi için özel bir sayfa ekliyoruz.



\*\*Komut:\*\* `manifest.json` dosyasını güncelleyin ve `options\_page` anahtarını ekleyin.



```json

{

&nbsp; "manifest\_version": 3,

&nbsp; "name": "Upwork AI Assistant",

&nbsp; "version": "3.0.0", // Sürümü güncelledik

&nbsp; // ... (diğer alanlar aynı) ...

&nbsp; "options\_page": "options.html", // <-- YENİ EKLENEN SATIR

&nbsp; "action": {

&nbsp;   "default\_popup": "popup.html",

&nbsp;   "default\_title": "Upwork AI Assistant"

&nbsp; },

&nbsp; // ... (dosyanın geri kalanı aynı) ...

}

```

\*\*Teknik Açıklama:\*\* `options\_page` tanımlamak, kullanıcı uzantı yönetimi sayfasından "Details" -> "Extension options" yolunu izlediğinde `options.html` dosyasının açılmasını sağlar. API anahtarını güvenli bir şekilde saklamak için en doğru yöntem budur.



---



\#### \*\*Adım 13: Ayarlar Arayüzünü Oluşturma (`options.html`, `options.js`)\*\*



\*\*Komut 1:\*\* Proje ana klasörünüze `options.html` adında yeni bir dosya ekleyin ve aşağıdaki kodu yapıştırın.



```html

<!DOCTYPE html>

<html>

<head>

&nbsp; <title>Upwork AI Assistant Ayarları</title>

&nbsp; <style>

&nbsp;   body { font-family: sans-serif; padding: 20px; width: 500px; }

&nbsp;   .form-group { margin-bottom: 15px; }

&nbsp;   label { display: block; margin-bottom: 5px; font-weight: bold; }

&nbsp;   input\[type="text"], textarea { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; }

&nbsp;   button { padding: 10px 15px; border: none; background-color: #4CAF50; color: white; border-radius: 4px; cursor: pointer; }

&nbsp;   #status { margin-top: 10px; font-weight: bold; }

&nbsp; </style>

</head>

<body>

&nbsp; <h1>Ayarlar</h1>

&nbsp; <div class="form-group">

&nbsp;   <label for="api-key">Gemini API Anahtarı:</label>

&nbsp;   <input type="text" id="api-key" placeholder="AIza...">

&nbsp; </div>

&nbsp; <div class="form-group">

&nbsp;   <label for="user-profile">Kısa Profiliniz ve Yetenekleriniz:</label>

&nbsp;   <textarea id="user-profile" rows="5" placeholder="Örn: Python ve web scraping konusunda uzmanım. Özellikle Playwright ve BeautifulSoup ile zorlu sitelerden veri çıkarma konusunda deneyimliyim..."></textarea>

&nbsp; </div>

&nbsp; <button id="save-button">Kaydet</button>

&nbsp; <div id="status"></div>

&nbsp; <script src="options.js"></script>

</body>

</html>

```



\*\*Komut 2:\*\* Proje ana klasörünüze `options.js` adında yeni bir dosya ekleyin ve aşağıdaki kodu yapıştırın.



```javascript

// options.js

document.addEventListener('DOMContentLoaded', () => {

&nbsp; const apiKeyInput = document.getElementById('api-key');

&nbsp; const userProfileInput = document.getElementById('user-profile');

&nbsp; const saveButton = document.getElementById('save-button');

&nbsp; const statusDiv = document.getElementById('status');



&nbsp; // Kayıtlı ayarları yükle

&nbsp; chrome.storage.sync.get(\['geminiApiKey', 'userProfile'], (result) => {

&nbsp;   if (result.geminiApiKey) {

&nbsp;     apiKeyInput.value = result.geminiApiKey;

&nbsp;   }

&nbsp;   if (result.userProfile) {

&nbsp;     userProfileInput.value = result.userProfile;

&nbsp;   }

&nbsp; });



&nbsp; // Kaydet butonuna tıklandığında

&nbsp; saveButton.addEventListener('click', () => {

&nbsp;   const apiKey = apiKeyInput.value.trim();

&nbsp;   const userProfile = userProfileInput.value.trim();

&nbsp;   

&nbsp;   if (!apiKey) {

&nbsp;     statusDiv.textContent = 'Lütfen API anahtarını girin.';

&nbsp;     statusDiv.style.color = 'red';

&nbsp;     return;

&nbsp;   }



&nbsp;   chrome.storage.sync.set({ geminiApiKey: apiKey, userProfile: userProfile }, () => {

&nbsp;     statusDiv.textContent = 'Ayarlar kaydedildi!';

&nbsp;     statusDiv.style.color = 'green';

&nbsp;     setTimeout(() => statusDiv.textContent = '', 2000);

&nbsp;   });

&nbsp; });

});

```

\*\*Teknik Açıklama:\*\* `chrome.storage.sync` kullanıyoruz. Bu, kullanıcının ayarlarının Google hesabıyla senkronize olmasını sağlar, böylece farklı bilgisayarlarda aynı ayarları kullanabilirler.



---



\#### \*\*Adım 14: `service-worker.js` - Öğrenme ve Teklif Üretme Yetenekleri\*\*



\*\*Komut:\*\* `service-worker.js` dosyanızı aşağıdaki nihai sürümle tamamen değiştirin.



```javascript

// service-worker.js - FAZ 3 TAM SÜRÜM



// --- (Faz 1 ve 2'den gelen fonksiyonlar aynı kalıyor) ---

function extractJobsFromGraphQL(data) { /\* ... kod aynı ... \*/ }

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

&nbsp;   if (message.type === 'PROCESS\_JOBS\_DATA') { /\* ... \*/ }

&nbsp;   else if (message.type === 'ANALYZE\_JOBS') { analyzeAllJobs().then(result => sendResponse(result)); return true; }

&nbsp;   else if (message.type === 'UPDATE\_STATUS') { /\* ... \*/ }

&nbsp;   // YENİ MESAJ TİPLERİ

&nbsp;   else if (message.type === 'GET\_STATS') { getSuccessPatterns().then(stats => sendResponse(stats)); return true; }

&nbsp;   else if (message.type === 'GENERATE\_PROPOSAL') { generateProposal(message.job).then(proposal => sendResponse(proposal)); return true; }

&nbsp;   return true;

});

async function storeJobs(newJobs) { /\* ... kod aynı ... \*/ }

async function updateJobStatus(jobId, newStatus) { /\* ... kod aynı ... \*/ }



// --- (ANALİZ FONKSİYONU GÜNCELLENDİ: Artık API anahtarını depolamadan alıyor) ---

async function analyzeAllJobs() {

&nbsp; const { geminiApiKey, userProfile } = await chrome.storage.sync.get(\['geminiApiKey', 'userProfile']);

&nbsp; if (!geminiApiKey) return { success: false, error: "API anahtarı ayarlanmamış. Lütfen ayarlar sayfasından anahtarınızı girin." };

&nbsp; 

&nbsp; const { collectedJobs } = await chrome.storage.local.get(\['collectedJobs']);

&nbsp; const jobsToAnalyze = collectedJobs.filter(job => !job.isAnalyzed);

&nbsp; if (jobsToAnalyze.length === 0) return { success: true, message: "Tüm işler zaten analiz edilmiş." };



&nbsp; const API\_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`;

&nbsp; const prompt = `

&nbsp;   Sen bir Upwork iş analizi uzmanısın. Benim profilim şu şekilde: "${userProfile || 'Python, Web Scraping ve Otomasyon uzmanı'}".

&nbsp;   Sana bir JSON dizisi içinde iş ilanları vereceğim. Her bir iş için benim profilime göre bir analiz yap.

&nbsp;   Çıktıyı mutlaka bir JSON dizisi olarak, verdiğim her iş için bir nesne içerecek şekilde döndür.

&nbsp;   Her nesne şu alanları içermeli: "id", "uygunluk\_skoru" (1-10 arası tamsayı), "analiz\_ozeti" (1-2 cümlelik Türkçe özet), "gereken\_teknolojiler" (bir string dizisi).

&nbsp;   İşte analiz edilecek işlerin listesi:

&nbsp;   ${JSON.stringify(jobsToAnalyze.map(j => ({id: j.id, title: j.title, description: j.description.substring(0, 500)})))}

&nbsp; `;



&nbsp; // ... (fetch ve sonrası Faz 2'deki gibi aynı) ...

}





// --- YENİ: Başarı Desenlerini Analiz Eden "Öğrenme" Fonksiyonu ---

async function getSuccessPatterns() {

&nbsp; const { collectedJobs } = await chrome.storage.local.get(\['collectedJobs']);

&nbsp; if (!collectedJobs) return { patterns: \[], stats: {} };



&nbsp; const successfulJobs = collectedJobs.filter(job => job.application\_status === 'Kazanıldı');

&nbsp; if (successfulJobs.length < 2) { // Anlamlı bir desen için en az 2 kazanılmış iş

&nbsp;   return { patterns: \[], stats: { total: collectedJobs.length, won: successfulJobs.length } };

&nbsp; }



&nbsp; const keywordFrequency = {};

&nbsp; successfulJobs.forEach(job => {

&nbsp;   (job.skills || \[]).forEach(skill => {

&nbsp;     const keyword = skill.toLowerCase();

&nbsp;     keywordFrequency\[keyword] = (keywordFrequency\[keyword] || 0) + 1;

&nbsp;   });

&nbsp; });



&nbsp; const sortedPatterns = Object.entries(keywordFrequency)

&nbsp;   .sort((\[, a], \[, b]) => b - a)

&nbsp;   .map((\[keyword, count]) => ({ keyword, count }));



&nbsp; return { patterns: sortedPatterns.slice(0, 5), stats: { total: collectedJobs.length, won: successfulJobs.length } };

}



// --- YENİ: AI Destekli Teklif Taslağı Üreten Fonksiyon ---

async function generateProposal(job) {

&nbsp; const { geminiApiKey, userProfile } = await chrome.storage.sync.get(\['geminiApiKey', 'userProfile']);

&nbsp; if (!geminiApiKey) return { success: false, error: "API anahtarı ayarlanmamış." };



&nbsp; const { collectedJobs } = await chrome.storage.local.get(\['collectedJobs']);

&nbsp; const successfulJobs = (collectedJobs || \[]).filter(j => j.application\_status === 'Kazanıldı');

&nbsp; 

&nbsp; // Few-shot learning için başarılı örnekler

&nbsp; const examples = successfulJobs.slice(0, 2).map(j => 

&nbsp;   `BAŞARILI ÖRNEK:\\nİş Açıklaması: ${j.description.substring(0, 200)}\\nBenim Teklifim: (Buraya gelecekte gerçek teklif metni gelecek)\\n\\n`

&nbsp; ).join('');



&nbsp; const API\_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`;

&nbsp; const prompt = `

&nbsp;   Sen, Upwork'te iş kazandıran teklifler yazan bir uzmansın. Benim profilim: "${userProfile}".

&nbsp;   ${examples}

&nbsp;   Şimdi, aşağıdaki yeni iş ilanı için benim profilime ve geçmiş başarılarıma uygun, kısa, etkili ve profesyonel bir teklif taslağı hazırla. 

&nbsp;   İşin en önemli 2-3 noktasına odaklan ve benim bu konularda nasıl yardımcı olabileceğimi vurgula.

&nbsp;   

&nbsp;   YENİ İŞ İLANI:

&nbsp;   Başlık: ${job.title}

&nbsp;   Açıklama: ${job.description}

&nbsp; `;



&nbsp; try {

&nbsp;   const response = await fetch(API\_URL, {

&nbsp;     method: 'POST',

&nbsp;     headers: { 'Content-Type': 'application/json' },

&nbsp;     body: JSON.stringify({ contents: \[{ parts: \[{ text: prompt }] }] })

&nbsp;   });

&nbsp;   if (!response.ok) throw new Error(`API hatası: ${response.statusText}`);

&nbsp;   const data = await response.json();

&nbsp;   const proposalText = data.candidates\[0].content.parts\[0].text;

&nbsp;   return { success: true, proposal: proposalText };

&nbsp; } catch (error) {

&nbsp;   return { success: false, error: error.message };

&nbsp; }

}

```



---



\#### \*\*Adım 15: `popup.js` - Nihai Arayüz (Komut)\*\*



\*\*Komut:\*\* `popup.js` dosyanızı, öğrenme sonuçlarını gösterecek ve teklif asistanını tetikleyecek bu son sürümle değiştirin.



```javascript

// popup.js - FAZ 3 TAM SÜRÜM



document.addEventListener('DOMContentLoaded', () => {

&nbsp; // ... (Faz 2'deki element tanımlamaları aynı) ...

&nbsp; const jobListDiv = document.getElementById('job-list');

&nbsp; const jobCountDiv = document.getElementById('job-count');

&nbsp; const analyzeButton = document.getElementById('analyze-button');

&nbsp; const clearButton = document.getElementById('clear-button');



&nbsp; // --- Ana Yükleme Fonksiyonu (GÜNCELLENDİ) ---

&nbsp; async function loadData() {

&nbsp;   jobListDiv.innerHTML = '<div class="loader">Yükleniyor...</div>';

&nbsp;   

&nbsp;   // Hem işleri hem de istatistikleri aynı anda çek

&nbsp;   const \[jobResult, statsResult] = await Promise.all(\[

&nbsp;     chrome.storage.local.get(\['collectedJobs']),

&nbsp;     chrome.runtime.sendMessage({ type: 'GET\_STATS' })

&nbsp;   ]);



&nbsp;   const jobs = jobResult.collectedJobs || \[];

&nbsp;   

&nbsp;   // İstatistikleri ve Başarı Desenlerini göster

&nbsp;   const statsHTML = `

&nbsp;     ${jobs.length} iş toplandı (${statsResult.stats.won || 0} kazanıldı). 

&nbsp;     <strong>Başarı Desenleriniz:</strong> 

&nbsp;     ${statsResult.patterns.map(p => p.keyword).join(', ') || 'Yeterli veri yok'}

&nbsp;   `;

&nbsp;   jobCountDiv.innerHTML = statsHTML;

&nbsp;   

&nbsp;   if (jobs.length === 0) { /\* ... (kod aynı) ... \*/ }



&nbsp;   jobs.sort((a, b) => (b.uygunluk\_skoru || -1) - (a.uygunluk\_skoru || -1));

&nbsp;   jobListDiv.innerHTML = '';

&nbsp;   jobs.forEach(job => jobListDiv.appendChild(createJobElement(job)));

&nbsp; }



&nbsp; // --- Arayüz Elementi Oluşturma (GÜNCELLENDİ) ---

&nbsp; function createJobElement(job) {

&nbsp;   const item = document.createElement('div');

&nbsp;   item.className = 'job-item';

&nbsp;   

&nbsp;   // ... (Faz 2'deki analysisHTML ve statusOptionsHTML aynı) ...



&nbsp;   item.innerHTML = `

&nbsp;     <div class="job-title"><a href="${job.url}" target="\_blank">${job.title}</a></div>

&nbsp;     ${analysisHTML}

&nbsp;     <div class="job-actions">

&nbsp;       <select data-job-id="${job.id}">${optionsHTML}</select>

&nbsp;       <button class="proposal-button" data-job-id="${job.id}">AI Teklif Hazırla</button>

&nbsp;     </div>

&nbsp;   `;

&nbsp;   

&nbsp;   // Status değişikliğini dinle

&nbsp;   item.querySelector('select').addEventListener('change', (event) => { /\* ... (kod aynı) ... \*/ });



&nbsp;   // YENİ: Teklif hazırlama butonunu dinle

&nbsp;   item.querySelector('.proposal-button').addEventListener('click', async (event) => {

&nbsp;     const button = event.target;

&nbsp;     button.textContent = 'Hazırlanıyor...';

&nbsp;     button.disabled = true;

&nbsp;     const response = await chrome.runtime.sendMessage({ type: 'GENERATE\_PROPOSAL', job });

&nbsp;     if (response.success) {

&nbsp;       // Teklif metnini yeni bir pencerede veya bir textarea'da göster

&nbsp;       alert("Teklif Taslağı:\\n\\n" + response.proposal);

&nbsp;     } else {

&nbsp;       alert("Teklif hazırlanamadı: " + response.error);

&nbsp;     }

&nbsp;     button.textContent = 'AI Teklif Hazırla';

&nbsp;     button.disabled = false;

&nbsp;   });



&nbsp;   return item;

&nbsp; }



&nbsp; // --- Buton Olayları (GÜNCELLENDİ) ---

&nbsp; analyzeButton.addEventListener('click', async () => {

&nbsp;   jobListDiv.innerHTML = '<div class="loader">AI analizi başlatılıyor...</div>';

&nbsp;   const response = await chrome.runtime.sendMessage({ type: 'ANALYZE\_JOBS' });

&nbsp;   if (response.success) alert(response.message);

&nbsp;   else alert(`Hata: ${response.error}`);

&nbsp;   loadData();

&nbsp; });



&nbsp; clearButton.addEventListener('click', async () => { /\* ... (kod aynı) ... \*/ });



&nbsp; loadData();

});

```

\*(Not: `popup.html`'e `.job-actions` ve `.proposal-button` için stiller ekleyebilirsiniz.)\*



---



\### \*\*Faz 3'ün Sonucu: Tam Teşekküllü Bir Kariyer Asistanı\*\*



Bu güncellemelerden sonra uzantınız şu yeteneklere sahip olacak:



1\.  \*\*Ayarlar Menüsü:\*\* Uzantı ayarlarına girip API anahtarınızı ve kişisel profilinizi güvenle kaydedebileceksiniz.

2\.  \*\*Kişiselleştirilmiş Analiz:\*\* "Analiz Et" butonuna bastığınızda, AI artık sadece işi değil, sizin profilinizi de göz önünde bulundurarak daha isabetli skorlar üretecek.

3\.  \*\*Öğrenme Yeteneği:\*\* "Kazanıldı" olarak işaretlediğiniz işlerden yola çıkarak, popup'ın en üstünde size en çok başarı getiren anahtar kelimeleri ("Başarı Desenleriniz") gösterecek.

4\.  \*\*AI Teklif Asistanı:\*\* Her iş kartının yanında çıkan "AI Teklif Hazırla" butonuna bastığınızda, Gemini sizin profilinizi, geçmiş başarılarınızı ve yeni işin detaylarını harmanlayarak size özel bir teklif taslağı sunacak.



\*\*Tebrikler! Project Chimera'nın 3 fazını da tamamladınız.\*\* Artık elinizde sadece veri toplayan bir araç değil, sizinle birlikte öğrenen, size özel tavsiyeler veren ve en zahmetli işlerden biri olan teklif yazımını otomatize eden, tam teşekküllü bir kariyer ortağı var.

