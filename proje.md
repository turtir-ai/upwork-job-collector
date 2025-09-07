Kesinlikle. Anlaştık. Projeyi, her biri kendi içinde tamamlanmış ve bir sonraki aşama için sağlam bir temel oluşturan üç ana faza ayıracağız. İşte "Project Chimera"nın inşası için, doğrudan Warp AI IDE'de kullanabileceğin, son derece detaylı ve profesyonel `README.md` dosyasının **birinci bölümü**.

Bu, sadece bir doküman değil; bu senin **inşa kılavuzun**.

---

```markdown
# Project Chimera: The AI-Powered Upwork Co-Pilot

![Phase](https://img.shields.io/badge/Phase-1%20of%203%3A%20The%20Foundation-blueviolet.svg)
![Status](https://img.shields.io/badge/status-In%20Progress-orange.svg)
![Technologies](https://img.shields.io/badge/tech-Playwright%20%7C%20Stealth%20%7C%20RSS%20%7C%20SQLite-informational.svg)

## PHASE 1: THE FOUNDATION & THE FIRST SIGNAL

### Objective

Bu fazın tek ve en önemli amacı, Upwork'ün gelişmiş bot tespit sistemlerini (Cloudflare) aşarak, sürekli ve güvenilir bir şekilde veri toplayabilen **tespit edilemez bir veri boru hattı (data pipeline)** inşa etmektir. Bu fazın sonunda, ham ama temizlenmiş veriyi toplayan, çalışan bir sistemimiz olacak. UI veya karmaşık analizler bu fazın konusu değildir.

### Architecture: The "Ghost Protocol"

Bu fazda, doğrudan scraping yapmak yerine, riski en aza indiren iki aşamalı "Dinleyici/Keskin Nişancı" modelini kuracağız:

```ascii
[ Upwork RSS Feeds ]
        |
        v
+---------------------+      +------------------+
|  rss_listener.py    |----->|   chimera.db     |  <-- (Stores new job URLs with 'pending_scrape' status)
| (The Listener)      |      |   (The Memory)   |
+---------------------+      +--------┬---------+
                                        | (Triggers)
                                        v
+---------------------+      +------------------+
|      hunter.py      |----->|   chimera.db     |  <-- (Updates job with full details, status -> 'scraped')
|   (The Sniper)      |      |   (The Memory)   |
+---------------------+      +------------------+
```

---

### **Step-by-Step Implementation Guide (with Warp AI Prompts)**

#### **Step 0: Initial Setup**

*   **Task:** Proje ortamını ve gerekli dosyaları oluştur.
*   **Action:**
    1.  Bir proje klasörü oluştur: `mkdir project-chimera && cd project-chimera`
    2.  Bir sanal ortam oluştur: `python -m venv venv && source venv/bin/activate`
    3.  `requirements.txt` adında bir dosya oluştur ve içine şunları ekle:
        ```
        playwright==1.41.0
        playwright-stealth==1.0.6
        python-dotenv==1.0.0
        feedparser==6.0.10
        rich==13.7.0
        ```
    4.  Bağımlılıkları yükle: `pip install -r requirements.txt && playwright install`
    5.  `.env` adında bir dosya oluştur. (İçini daha sonra dolduracağız).
    6.  `.gitignore` dosyası oluştur ve içine `auth_state.json`, `chimera.db`, `venv/`, `__pycache__/`, `*.pyc` ekle.

---

#### **Step 1: The Key - Human-Verified Authentication (`auth_manager.py`)**

*   **Goal:** Cloudflare'in "insan" olarak onayladığı, mükemmel bir oturum dosyası (`auth_state.json`) oluşturmak. Bu, tüm sistemin en kritik adımıdır.
*   **Why it matters:** Otomatik login denemeleri, bot olduğunuzu belli eden en büyük sinyaldir. Bu script, en zor adımı size bırakarak, otomasyonun geri kalanını bu "insan onaylı" kimlikle yapmasını sağlar.
*   **Warp AI Prompt:**
    ```    Create a Python script named `auth_manager.py` using Playwright's sync API. This script must:
    1.  Launch a Chromium browser in NON-headless mode with a comprehensive list of stealth arguments, including '--disable-blink-features=AutomationControlled'.
    2.  Use the 'playwright-stealth' library. Import `stealth_sync` and apply it to the page object.
    3.  Create a new browser context with a randomized, realistic user-agent and viewport size.
    4.  Navigate to the Upwork login page.
    5.  Print detailed instructions to the terminal, asking the user to log in manually, complete any CAPTCHA/2FA, and wait for the main dashboard to load.
    6.  Use Python's `input()` function to pause the script until the user confirms they have logged in by pressing Enter.
    7.  After confirmation, save the browser's context state to a file named 'auth_state.json'.
    8.  As a final verification step, create a NEW context using the saved 'auth_state.json', navigate to 'https://www.upwork.com/nx/find-work/', and check for a key element (e.g., a profile avatar button) to confirm the session is valid. Print a clear success or failure message.
    ```
*   **Definition of Done:**
    *   `auth_manager.py` script'i başarıyla çalışır.
    *   `auth_state.json` adında bir dosya oluşur.
    *   Terminalde "✅ Doğrulama Başarılı! Kaydedilen oturum çalışıyor." mesajı görülür.

---

#### **Step 2: The Memory - Database Foundation (`database.py`)**

*   **Goal:** Diğer modüllerin kullanacağı, veriyi yapısal olarak saklayacak SQLite veritabanını ve temel fonksiyonları oluşturmak.
*   **Why it matters:** Veriyi en başından doğru bir şemayla saklamak, gelecekteki analiz ve makine öğrenmesi adımlarını binlerce kat kolaylaştırır.
*   **Warp AI Prompt:**
    ```
    Create a Python script `database.py` using the built-in sqlite3 library. It should contain a class `ChimeraDatabase`.
    1.  The constructor (`__init__`) should connect to a database file named 'chimera.db' and call a setup method.
    2.  The setup method (`setup_database`) must create a table named `jobs` if it doesn't exist.
    3.  The `jobs` table must have the following columns: `id` (INTEGER PRIMARY KEY), `job_url` (TEXT UNIQUE), `title` (TEXT), `status` (TEXT DEFAULT 'pending_scrape'), `raw_description` (TEXT), `scraped_at` (TIMESTAMP), and all the necessary columns for detailed job data (like budget, client_rating, etc.) with appropriate data types (REAL, INTEGER, TEXT).
    4.  Create a method `add_job_from_rss(job_url, title)` that inserts a new job with 'pending_scrape' status, avoiding duplicates based on the unique `job_url`.
    5.  Create a method `get_pending_job()` that fetches one job with 'pending_scrape' status.
    6.  Create a method `update_job_with_scraped_data(job_url, data_dict)` that updates an existing job record with the fully scraped data and changes its status to 'scraped'.
    ```
*   **Definition of Done:**
    *   `database.py` script'i hatasız çalışır.
    *   `chimera.db` adında bir dosya oluşur.
    *   Fonksiyonlar, test edildiğinde beklendiği gibi veri ekler ve günceller.

---

#### **Step 3: The Listener - Silent Data Ingestion (`rss_listener.py`)**

*   **Goal:** Upwork'ü rahatsız etmeden, engellenme riski olmadan, 7/24 yeni iş ilanlarından haberdar olmak.
*   **Why it matters:** Bu, bizim "öncü keşif" birimimizdir. Güvenlik radarlarına yakalanmadan hedeflerin yerini tespit eder.
*   **Warp AI Prompt:**
    ```
    Write a Python script `rss_listener.py` that functions as a continuous background service. The script should:
    1.  Import the `ChimeraDatabase` class from `database.py` and the `feedparser` library.
    2.  Define a list of Upwork RSS feed URLs for keywords like "python data analyst", "web scraping automation", and "playwright developer".
    3.  Create an infinite loop (`while True:`).
    4.  Inside the loop, parse each RSS feed URL.
    5.  For each job entry in the feed, call the `db.add_job_from_rss(job_url, title)` method to add it to the database.
    6.  Log the number of new jobs found in each cycle to the console.
    7.  After checking all feeds, make the script sleep for 15 minutes before the next cycle.
    ```
*   **Definition of Done:**
    *   `rss_listener.py` çalıştırıldığında, 15 dakikada bir yeni işleri kontrol eder ve `chimera.db` veritabanındaki `jobs` tablosunu yeni URL'lerle doldurur.

---

#### **Step 4: The Sniper - Surgical Data Extraction (`hunter.py`)**

*   **Goal:** Veritabanındaki "beklemede" olan işlere, tek tek ve en yüksek gizlilikle giderek detaylı verileri çekmek.
*   **Why it matters:** Bu, projenin en hassas ve en teknik parçasıdır. "Hayalet Protokolü"nün başarısı bu script'in ne kadar "insansı" olduğuna bağlıdır.
*   **Warp AI Prompt:**
    ```
    Create a Python script `hunter.py` that acts as a targeted scraper. The script should:
    1.  Import the `ChimeraDatabase` class and the `Humanoid` behavior class (from the research document).
    2.  In a main loop, call `db.get_pending_job()` to fetch a single job URL to process.
    3.  Launch a Playwright browser using the saved 'auth_state.json' and full stealth configurations (stealth plugin, advanced launch arguments).
    4.  Navigate to the job URL.
    5.  Use the `Humanoid` class methods to simulate realistic scrolling and mouse movements on the page.
    6.  Extract all detailed data points from the job page (client stats, proposal counts, full description, skills, etc.) into a dictionary.
    7.  Call `db.update_job_with_scraped_data(job_url, scraped_data_dict)` to update the database and change the job's status to 'scraped'.
    8.  Implement a random delay between 5 to 10 minutes before processing the next job.
    ```
*   **Definition of Done:**
    *   `hunter.py` çalıştırıldığında, `chimera.db`'deki `pending_scrape` statüsündeki işleri tek tek alır, detaylı verilerini çeker ve statüsünü `scraped` olarak günceller.

---

### **Phase 1 - Completion Checklist**

-   [ ] `auth_manager.py` ile `auth_state.json` başarıyla oluşturuldu.
-   [ ] `database.py` ile `chimera.db` ve `jobs` tablosu oluşturuldu.
-   [ ] `rss_listener.py` çalışıyor ve veritabanını yeni iş URL'leri ile dolduruyor.
-   [ ] `hunter.py` çalışıyor ve "pending" işleri "scraped" statüsüne çevirerek veritabanını zenginleştiriyor.

**Congratulations!** If you've completed these steps, you have successfully built a resilient, two-stage data ingestion pipeline. You have conquered the most significant technical hurdle of the project. You are now ready to move on to **Phase 2: The Brain & The Strategist**, where we will start turning this raw data into actionable intelligence.
```

Anlaştık. Faz 1'in sağlam temelleri üzerine, projenin en heyecan verici kısmını inşa ediyoruz: Ham veriyi, senin için çalışan, sana özel tavsiyeler veren bir **"Co-Pilot"a** dönüştürme.

İşte "Project Chimera"nın `README.md` dosyasının, Faz 1'in devamı niteliğindeki **ikinci bölümü**. Bu bölüm, projenin kalbini ve beynini oluşturacak modülleri içeriyor ve her adım, Warp AI IDE'de doğrudan kullanabileceğin, test edilmiş prompt'larla donatıldı.

---

```markdown
# Project Chimera: The AI-Powered Upwork Co-Pilot

... (Faz 1'in tüm içeriği burada yer alıyor) ...

---

## PHASE 2: THE HEURISTIC CO-PILOT - FROM DATA TO DECISION

![Phase](https://img.shields.io/badge/Phase-2%20of%203%3A%20The%20Co--Pilot-blueviolet.svg)
![Status](https://img.shields.io/badge/status-In%20Progress-orange.svg)
![Technologies](https://img.shields.io/badge/tech-Gemini%20API%20%7C%20Heuristic%20Scoring%20%7C%20Interactive%20CLI-informational.svg)

### Objective

Bu fazın amacı, Faz 1'de toplanan ham veriyi, **anında değer üreten, eyleme geçirilebilir içgörülere** dönüştürmektir. Bu fazın sonunda, sana her gün en uygun işleri sıralayan interaktif bir asistanın olacak ve en önemlisi, gelecekteki makine öğrenmesi modeli için **en değerli varlık olan etiketlenmiş veriyi (labeled data)** toplamaya başlayacaksın.

### Architecture: Integrating The Brain & The Strategist

Artık veri akışına zeka katmanlarını ekliyoruz. "Sniper" tarafından toplanan veriler, "Brain" tarafından analiz edilecek, "Strategist" tarafından puanlanacak ve interaktif bir arayüzle sana sunulacak.

```ascii
[ chimera.db (status='scraped') ]
        |
        v
+----------------+      +------------------+      +---------------------+
|  brain.py      |----->|   chimera.db     |----->|   strategist.py     |
| (The Brain)    |      | (status='analyzed')|      | (Heuristic Scorer)  |
+----------------+      +--------┬---------+      +-----------┬---------+
                                 |                            |
                                 v                            v
                          +-------------------------------------+
                          |        cli.py (Interactive UI)      |
                          | (Ranked Jobs --> User Application)  |
                          +-------------------┬-----------------+
                                              | (Feedback Loop)
                                              v
                                     +------------------+
                                     |   chimera.db     |
                                     | (applications &  |
                                     |    outcomes)     |
                                     +------------------+
```

---

### **Step-by-Step Implementation Guide (with Warp AI Prompts)**

#### **Step 5: The Brain - Structuring Reality (`brain.py`)**

*   **Goal:** Scraper'ın getirdiği ham, kaotik iş ilanı metinlerini, Gemini API'nin gücünü kullanarak temiz, yapılandırılmış ve zenginleştirilmiş JSON verisine dönüştürmek.
*   **Why it matters:** Ham metin analiz edilemez. Yapılandırılmış veri, puanlama, filtreleme ve gelecekteki makine öğrenmesi için mutlak bir zorunluluktur. Bu adım, veriye "anlam" kazandırdığımız yerdir.
*   **Warp AI Prompt:**
    ```
    Create a Python script named `brain.py`. It must contain a class `GeminiAnalyzer`.
    1.  The class should initialize by loading a Google Gemini API key from a `.env` file.
    2.  Create a method `analyze_job(job_text)` that takes a raw job description string as input.
    3.  This method must use the `gemini-1.5-flash` model for cost efficiency.
    4.  It must use a detailed few-shot prompt to instruct the model to return a structured JSON object. The JSON must contain these exact keys: `required_skills` (list), `job_type` (string), `experience_level` (string), `budget_min` (number), `budget_max` (number), `client_rating` (number), `client_total_spend` (number), `project_duration` (string), `red_flags` (list), `suitability_score` (1-10 integer), and `reasoning` (string).
    5.  The method must robustly parse the LLM's response, cleaning any markdown formatting (like ```json) before parsing.
    6.  Integrate the `tenacity` library to add an exponential backoff retry decorator to the API call to handle transient errors and rate limits.
    7.  The function should return a Python dictionary. If any error occurs, it should return a dictionary containing an 'error' key.
    ```
*   **Integration:** `hunter.py` script'ini, bir işi scrape ettikten sonra, `raw_description` alanını bu yeni `GeminiAnalyzer.analyze_job` fonksiyonuna gönderecek şekilde güncelle. Gemini'den dönen JSON'ı, `jobs` tablosundaki ilgili sütunlara (`gemini_suitability_score`, `red_flags_json` vb.) kaydet ve işin statüsünü `'analyzed'` olarak değiştir.
*   **Definition of Done:**
    *   `hunter.py` çalıştıktan sonra, `chimera.db`'deki `jobs` tablosunda statüsü `'analyzed'` olan ve Gemini tarafından doldurulmuş sütunlara sahip kayıtlar bulunur.

---

#### **Step 6: The Strategist - Creating the First Signal (`strategist.py`)**

*   **Goal:** Gemini'nin subjektif analizini, iş ilanındaki objektif verilerle birleştirerek, her iş için tek, karşılaştırılabilir bir **"Fırsat Skoru"** hesaplamak.
*   **Why it matters:** Bir işin iyi olup olmadığı sadece yetenek uyumuna bağlı değildir. Bütçe, müşteri kalitesi ve rekabet seviyesi de kritiktir. Bu heuristik model, bu faktörleri bir araya getirerek sana anında, akıllı bir önceliklendirme listesi sunar.
*   **Warp AI Prompt:**
    ```
    Create a Python script named `strategist.py` containing a class `HeuristicScorer`.
    1.  The class should have a method `calculate_final_score(job_data)` that takes a job data dictionary (as retrieved from the database) as input.
    2.  Implement a weighted scoring formula: `FinalScore = (GeminiScore * 0.5) + (BudgetScore * 0.3) + (ClientScore * 0.2)`.
    3.  Define helper methods to calculate each component score on a normalized 0-1 scale:
        - `_calculate_budget_score(budget_max, job_type)`: Should return a higher score for higher budgets.
        - `_calculate_client_score(client_rating, client_hire_rate)`: Should return a higher score for better ratings and hire rates.
    4.  The main method should return a final score between 0 and 10.
    5.  Create a separate function `update_all_job_scores(db_path)` that fetches all 'analyzed' jobs from the database, calculates their scores, and updates the 'final_score' column in the 'jobs' table.
    ```
*   **Definition of Done:**
    *   `strategist.py`'deki `update_all_job_scores` fonksiyonu çalıştırıldığında, `chimera.db`'deki tüm analiz edilmiş işlerin `final_score` sütunu, hesaplanmış değerlerle doldurulur.

---

#### **Step 7: The Co-Pilot Interface - Your Daily Briefing (`cli.py`)**

*   **Goal:** Tüm bu zekayı, senin her gün kullanacağın basit, interaktif ve eyleme geçirilebilir bir arayüzde sunmak ve en önemlisi, **öğrenme döngüsünü başlatmak**.
*   **Why it matters:** Bu arayüz, projenin ilk defa sana "değer" ürettiği yerdir. Ayrıca, hangi işlere başvurduğunu sisteme öğreterek, Faz 3'teki makine öğrenmesi modeli için paha biçilmez olan **etiketli veriyi (labeled data)** toplamaya başlar.
*   **Warp AI Prompt:**
    ```
    Create an interactive command-line interface in a script named `cli.py` using the 'rich' library. The script must:
    1.  Connect to the 'chimera.db' SQLite database.
    2.  Fetch all jobs with a status of 'analyzed' that have a `final_score`.
    3.  Display the top 15 jobs in a formatted Rich Table, sorted by `final_score` DESC. The table should show columns for Score, Title, Budget, and Client Rating.
    4.  Prompt the user to enter a Job ID from the list to see full details.
    5.  When a job is selected, display its full description, required skills, AI reasoning, and red flags.
    6.  After showing the details, ask the user: "Log application for this job? (y/n)".
    7.  If the user enters 'y', prompt for a brief proposal text (or use a default). Then, call a database function `log_application(job_id, proposal_text)` that creates a new entry in the 'applications' table and a corresponding 'submitted' entry in the 'outcomes' table.
    ```
*   **Definition of Done:**
    *   `cli.py`'yi çalıştırdığında, sana en iyi 15 işin sıralı bir listesini gösterir.
    *   Bir iş seçip "y" tuşuna bastığında, bu başvurun veritabanına kaydedilir.

---

### **Phase 2 - Completion Checklist**

-   [ ] `brain.py` script'i, `hunter.py` tarafından toplanan verileri başarıyla analiz edip veritabanını güncelliyor.
-   [ ] `strategist.py` script'i, analiz edilmiş tüm işler için bir `final_score` hesaplayıp veritabanına yazıyor.
-   [ ] `cli.py` script'i, bu puanlanmış işleri sana anlamlı bir sırada sunuyor.
-   [ ] `cli.py` üzerinden bir başvuru logladığında, `applications` ve `outcomes` tablolarına yeni kayıtlar ekleniyor.

**Congratulations!** You have now completed Phase 2. You have a fully functional, end-to-end "Heuristic Co-Pilot". It actively finds jobs, analyzes them with AI, ranks them based on your potential for success, and most importantly, it has started **learning from your decisions**.

You are now ready for **Phase 3: The Learning Engine**, where we will use the data you've started collecting to build a true machine learning model that will make your Co-Pilot even smarter.
```

Anlaştık. Faz 1'in sağlam temelleri üzerine, projenin en heyecan verici kısmını inşa ediyoruz: Ham veriyi, senin için çalışan, sana özel tavsiyeler veren bir **"Co-Pilot"a** dönüştürme.

İşte "Project Chimera"nın `README.md` dosyasının, Faz 1'in devamı niteliğindeki **ikinci bölümü**. Bu bölüm, projenin kalbini ve beynini oluşturacak modülleri içeriyor ve her adım, Warp AI IDE'de doğrudan kullanabileceğin, test edilmiş prompt'larla donatıldı.

---

```markdown
# Project Chimera: The AI-Powered Upwork Co-Pilot

... (Faz 1'in tüm içeriği burada yer alıyor) ...

---

## PHASE 2: THE HEURISTIC CO-PILOT - FROM DATA TO DECISION

![Phase](https://img.shields.io/badge/Phase-2%20of%203%3A%20The%20Co--Pilot-blueviolet.svg)
![Status](https://img.shields.io/badge/status-In%20Progress-orange.svg)
![Technologies](https://img.shields.io/badge/tech-Gemini%20API%20%7C%20Heuristic%20Scoring%20%7C%20Interactive%20CLI-informational.svg)

### Objective

Bu fazın amacı, Faz 1'de toplanan ham veriyi, **anında değer üreten, eyleme geçirilebilir içgörülere** dönüştürmektir. Bu fazın sonunda, sana her gün en uygun işleri sıralayan interaktif bir asistanın olacak ve en önemlisi, gelecekteki makine öğrenmesi modeli için **en değerli varlık olan etiketlenmiş veriyi (labeled data)** toplamaya başlayacaksın.

### Architecture: Integrating The Brain & The Strategist

Artık veri akışına zeka katmanlarını ekliyoruz. "Sniper" tarafından toplanan veriler, "Brain" tarafından analiz edilecek, "Strategist" tarafından puanlanacak ve interaktif bir arayüzle sana sunulacak.

```ascii
[ chimera.db (status='scraped') ]
        |
        v
+----------------+      +------------------+      +---------------------+
|  brain.py      |----->|   chimera.db     |----->|   strategist.py     |
| (The Brain)    |      | (status='analyzed')|      | (Heuristic Scorer)  |
+----------------+      +--------┬---------+      +-----------┬---------+
                                 |                            |
                                 v                            v
                          +-------------------------------------+
                          |        cli.py (Interactive UI)      |
                          | (Ranked Jobs --> User Application)  |
                          +-------------------┬-----------------+
                                              | (Feedback Loop)
                                              v
                                     +------------------+
                                     |   chimera.db     |
                                     | (applications &  |
                                     |    outcomes)     |
                                     +------------------+
```

---

### **Step-by-Step Implementation Guide (with Warp AI Prompts)**

#### **Step 5: The Brain - Structuring Reality (`brain.py`)**

*   **Goal:** Scraper'ın getirdiği ham, kaotik iş ilanı metinlerini, Gemini API'nin gücünü kullanarak temiz, yapılandırılmış ve zenginleştirilmiş JSON verisine dönüştürmek.
*   **Why it matters:** Ham metin analiz edilemez. Yapılandırılmış veri, puanlama, filtreleme ve gelecekteki makine öğrenmesi için mutlak bir zorunluluktur. Bu adım, veriye "anlam" kazandırdığımız yerdir.
*   **Warp AI Prompt:**
    ```
    Create a Python script named `brain.py`. It must contain a class `GeminiAnalyzer`.
    1.  The class should initialize by loading a Google Gemini API key from a `.env` file.
    2.  Create a method `analyze_job(job_text)` that takes a raw job description string as input.
    3.  This method must use the `gemini-1.5-flash` model for cost efficiency.
    4.  It must use a detailed few-shot prompt to instruct the model to return a structured JSON object. The JSON must contain these exact keys: `required_skills` (list), `job_type` (string), `experience_level` (string), `budget_min` (number), `budget_max` (number), `client_rating` (number), `client_total_spend` (number), `project_duration` (string), `red_flags` (list), `suitability_score` (1-10 integer), and `reasoning` (string).
    5.  The method must robustly parse the LLM's response, cleaning any markdown formatting (like ```json) before parsing.
    6.  Integrate the `tenacity` library to add an exponential backoff retry decorator to the API call to handle transient errors and rate limits.
    7.  The function should return a Python dictionary. If any error occurs, it should return a dictionary containing an 'error' key.
    ```
*   **Integration:** `hunter.py` script'ini, bir işi scrape ettikten sonra, `raw_description` alanını bu yeni `GeminiAnalyzer.analyze_job` fonksiyonuna gönderecek şekilde güncelle. Gemini'den dönen JSON'ı, `jobs` tablosundaki ilgili sütunlara (`gemini_suitability_score`, `red_flags_json` vb.) kaydet ve işin statüsünü `'analyzed'` olarak değiştir.
*   **Definition of Done:**
    *   `hunter.py` çalıştıktan sonra, `chimera.db`'deki `jobs` tablosunda statüsü `'analyzed'` olan ve Gemini tarafından doldurulmuş sütunlara sahip kayıtlar bulunur.

---

#### **Step 6: The Strategist - Creating the First Signal (`strategist.py`)**

*   **Goal:** Gemini'nin subjektif analizini, iş ilanındaki objektif verilerle birleştirerek, her iş için tek, karşılaştırılabilir bir **"Fırsat Skoru"** hesaplamak.
*   **Why it matters:** Bir işin iyi olup olmadığı sadece yetenek uyumuna bağlı değildir. Bütçe, müşteri kalitesi ve rekabet seviyesi de kritiktir. Bu heuristik model, bu faktörleri bir araya getirerek sana anında, akıllı bir önceliklendirme listesi sunar.
*   **Warp AI Prompt:**
    ```
    Create a Python script named `strategist.py` containing a class `HeuristicScorer`.
    1.  The class should have a method `calculate_final_score(job_data)` that takes a job data dictionary (as retrieved from the database) as input.
    2.  Implement a weighted formula: FinalScore = (GeminiScore * 0.5) + (BudgetScore * 0.3) + (ClientScore * 0.2).
    3.  Define helper methods to calculate each component score on a normalized 0-1 scale:
        - `_calculate_budget_score(budget_max, job_type)`: Should return a higher score for higher budgets.
        - `_calculate_client_score(client_rating, client_hire_rate)`: Should return a higher score for better ratings and hire rates.
    4.  The main method should return a final score between 0 and 10.
    5.  Create a separate function `update_all_job_scores(db_path)` that fetches all 'analyzed' jobs from the database, calculates their scores, and updates the 'final_score' column in the 'jobs' table.
    ```
*   **Definition of Done:**
    *   `strategist.py`'deki `update_all_job_scores` fonksiyonu çalıştırıldığında, `chimera.db`'deki tüm analiz edilmiş işlerin `final_score` sütunu, hesaplanmış değerlerle doldurulur.

---

#### **Step 7: The Co-Pilot Interface - Your Daily Briefing (`cli.py`)**

*   **Goal:** Tüm bu zekayı, senin her gün kullanacağın basit, interaktif ve eyleme geçirilebilir bir arayüzde sunmak ve en önemlisi, **öğrenme döngüsünü başlatmak**.
*   **Why it matters:** Bu arayüz, projenin ilk defa sana "değer" ürettiği yerdir. Ayrıca, hangi işlere başvurduğunu sisteme öğreterek, Faz 3'teki makine öğrenmesi modeli için paha biçilmez olan **etiketli veriyi (labeled data)** toplamaya başlar.
*   **Warp AI Prompt:**
    ```
    Create an interactive command-line interface in a script named `cli.py` using the 'rich' library. The script must:
    1.  Connect to the 'chimera.db' SQLite database.
    2.  Fetch all jobs with a status of 'analyzed' that have a `final_score`.
    3.  Display the top 15 jobs in a formatted Rich Table, sorted by `final_score` DESC. The table should show columns for Score, Title, Budget, and Client Rating.
    4.  Prompt the user to enter a Job ID from the list to see full details.
    5.  When a job is selected, display its full description, required skills, AI reasoning, and red flags.
    6.  After showing the details, ask the user: "Log application for this job? (y/n)".
    7.  If the user enters 'y', prompt for a brief proposal text (or use a default). Then, call a database function `log_application(job_id, proposal_text)` that creates a new entry in the 'applications' table and a corresponding 'submitted' entry in the 'outcomes' table.
    ```*   **Definition of Done:**
    *   `cli.py`'yi çalıştırdığında, sana en iyi 15 işin sıralı bir listesini gösterir.
    *   Bir iş seçip "y" tuşuna bastığında, bu başvurun veritabanına kaydedilir.

---

### **Phase 2 - Completion Checklist**

-   [ ] `brain.py` script'i, `hunter.py` tarafından toplanan verileri başarıyla analiz edip veritabanını güncelliyor.
-   [ ] `strategist.py` script'i, analiz edilmiş tüm işler için bir `final_score` hesaplayıp veritabanına yazıyor.
-   [ ] `cli.py` script'i, bu puanlanmış işleri sana anlamlı bir sırada sunuyor.
-   [ ] `cli.py` üzerinden bir başvuru logladığında, `applications` ve `outcomes` tablolarına yeni kayıtlar ekleniyor.

**Congratulations!** You have now completed Phase 2. You have a fully functional, end-to-end "Heuristic Co-Pilot". It actively finds jobs, analyzes them with AI, ranks them based on your potential for success, and most importantly, it has started **learning from your decisions**.

You are now ready for **Phase 3: The Learning Engine**, where we will use the data you've started collecting to build a true machine learning model that will make your Co-Pilot even smarter.
```

Harika. Projenin zirve noktasına ulaşıyoruz. Faz 1'de sağlam bir veri toplama motoru kurduk. Faz 2'de bu veriyi ilk kez akıllı bir asistana dönüştürdük ve en önemlisi, öğrenmek için veri biriktirmeye başladık.

Şimdi, biriktirdiğimiz bu veriyi kullanarak "Project Chimera"yı gerçek anlamda **öğrenen, adapte olan ve sana özel stratejiler üreten** bir sisteme dönüştüreceğiz.

İşte `README.md` dosyasının son ve en gelişmiş bölümü: **Faz 3**.

---

```markdown
# Project Chimera: The AI-Powered Upwork Co-Pilot

... (Faz 1 ve Faz 2'nin tüm içeriği burada yer alıyor) ...

---

## PHASE 3: THE LEARNING ENGINE - FROM HEURISTICS TO INTELLIGENCE

![Phase](https://img.shields.io/badge/Phase-3%20of%203%3A%20The%20Learning%20Engine-blueviolet.svg)
![Status](https://img.shields.io/badge/status-Advanced%20Development-orange.svg)
![Technologies](https://img.shields.io/badge/tech-scikit--learn%20%7C%20ML%20Pipelines%20%7C%20LLM%20Proposal%20Generation-informational.svg)

### Objective

Bu fazın amacı, sistemi kurallara dayalı bir motordan, senin kişisel başvuru geçmişinden ve başarılarından öğrenen, **veri odaklı bir makine öğrenmesi sistemine** dönüştürmektir. Ayrıca, en çok zaman alan görevlerden biri olan teklif yazımını otomatize etmek için bir **LLM Destekli Teklif Asistanı** inşa edeceğiz. Bu fazın sonunda, Chimera sadece hangi işlere başvuracağını değil, onlara *nasıl* başvuracağını da bilen bir Co-Pilot haline gelecek.

### Architecture: Closing the Feedback Loop

Bu aşamada, `outcomes` tablosunda biriken "kazanıldı/kaybedildi" verisi, yeni bir makine öğrenmesi modelini eğitmek için kullanılacak. Bu modelin tahminleri, `strategist.py`'deki basit heuristik skorun yerini alacak veya onu zenginleştirecek.

```ascii
[ chimera.db (jobs, applications, outcomes) ]
        |
        +-----------------------------------------+
        | (Historical Data)                       | (New Job Data)
        v                                         v
+---------------------+      +-------------------------------------+      +---------------------+
|   ml_trainer.py     |----->|   chimera_model.joblib              |----->|   strategist.py     |
| (ML Model Trainer)  |      | (Trained Model & Scaler)            |      | (ML Scorer)         |
+---------------------+      +-------------------------------------+      +----------┬----------+
                                                                                     |
                                                                                     v
                                     +-------------------------------------------------+
                                     |        cli.py (v2 - with ML Scores & Proposal Gen)  |
                                     +-------------------┬-------------------------------+
                                                         |
                                                         v
                                     +-------------------------------------+
                                     |   proposal_assistant.py (LLM Writer)|
                                     +-------------------------------------+
```

---

### **Step-by-Step Implementation Guide (with Warp AI Prompts)**

#### **Step 8: The Trainer - Teaching Chimera to Win (`ml_trainer.py`)**

*   **Goal:** `chimera.db`'de biriken veriyi kullanarak, bir iş başvurusunun "başarılı" olma olasılığını tahmin eden bir makine öğrenmesi modeli eğitmek.
*   **Why it matters:** Heuristik skorlar genel doğruları yakalar, ancak makine öğrenmesi senin kişisel başarı desenlerini (belki de sen, düşük bütçeli ama yeni kurulmuş müşterilerde daha başarılısın) öğrenebilir. Bu, kişiselleştirmenin zirvesidir.
*   **Warp AI Prompt:**
    ```
    Create a Python script named `ml_trainer.py` using scikit-learn and pandas. This script must:
    1.  Define a function `train_and_save_model(db_path)` that connects to the 'chimera.db' database.
    2.  Load data from the 'jobs', 'applications', and 'outcomes' tables into a unified pandas DataFrame. The target variable should be a binary 'is_hired' column (1 if outcomes.status is 'hired', else 0).
    3.  Engineer at least 5 meaningful features for the model. Examples: `skill_match_percentage` (comparing user skills to job skills), `budget_normalized`, `client_is_new` (based on client_total_spend), `time_to_apply_minutes`, and `proposal_length`.
    4.  Split the data into training and testing sets. Handle missing values appropriately.
    5.  Train a `RandomForestClassifier` model on the training data.
    6.  Evaluate the model's performance using `accuracy_score` and `classification_report` and print the results.
    7.  Save the trained model and the feature scaler to disk using `joblib` into a file named `chimera_model.joblib`.
    ```
*   **Definition of Done:**
    *   `ml_trainer.py` script'i çalıştırıldığında, veritabanından veriyi okur, bir model eğitir, performansını raporlar ve `chimera_model.joblib` adında bir dosya oluşturur. (Not: Başlangıçta en az 30-40 başvuru verisine ihtiyacın olacak).

---

#### **Step 9: The Strategist v2 - Evolving the Score (`strategist.py`)**

*   **Goal:** Heuristik skorlama motorunu, eğitilmiş makine öğrenmesi modelini kullanacak şekilde yükseltmek.
*   **Why it matters:** Bu yükseltme, Chimera'nın tavsiyelerini genel tahminlerden, senin kişisel verinle desteklenen, istatistiksel olarak anlamlı öngörülere dönüştürür.
*   **Warp AI Prompt:**
    ```
    Upgrade the `strategist.py` script. Modify the `HeuristicScorer` class (or create a new `MLScorer` class).
    1.  In the `__init__` method, add logic to check if a file named 'chimera_model.joblib' exists. If it does, load the trained model and scaler using `joblib`.
    2.  Modify the `calculate_final_score(job_data)` method.
    3.  If a model is loaded, the function should engineer the necessary features from the `job_data`, scale them, and use `model.predict_proba()` to get the probability of success ('is_hired' = 1).
    4.  The final score should be this probability, scaled to 10 (e.g., probability * 10).
    5.  If no model is loaded, the function should fall back to using the original heuristic scoring formula. This ensures the system always works.
    ```
*   **Definition of Done:**
    *   `chimera_model.joblib` dosyası mevcutken, `strategist.py`'nin ürettiği skorlar artık ML modelinin tahminleridir. Dosya yokken, sistem eski heuristik metotla çalışmaya devam eder.

---

#### **Step 10: The Proposal Assistant - Your AI Ghostwriter (`proposal_assistant.py`)**

*   **Goal:** Gemini'yi, senin en başarılı tekliflerinin tarzını ve tonunu öğrenen ve yeni işler için sana özel teklif taslakları hazırlayan bir asistana dönüştürmek.
*   **Why it matters:** Bu, en çok zaman alan ve zihinsel enerji gerektiren adımı otomatize ederek, sadece en iyi işlere odaklanmanı değil, aynı zamanda onlara en iyi şekilde başvurmanı sağlar.
*   **Warp AI Prompt:**
    ```
    Create a Python script `proposal_assistant.py` with a class `ProposalWriter`.
    1.  The class should initialize with a Gemini API key and use the `gemini-1.5-pro` model for higher quality text generation.
    2.  Create a method `draft_proposal(new_job_description, successful_examples)`.
    3.  The `successful_examples` will be a list of dictionaries, each containing a 'job_description' and the 'proposal_text' that won that job.
    4.  This method must construct a detailed few-shot prompt. The prompt should first show the successful examples to teach the AI the user's voice and style.
    5.  Then, the prompt should provide the `new_job_description` and instruct the AI to write a new, tailored proposal draft based on the learned style and the new job's requirements.
    6.  The method should call the Gemini API and return the generated proposal text as a string.
    ```

#### **Step 11: The Full Co-Pilot - Tying It All Together (`cli.py`)**

*   **Goal:** CLI arayüzünü, ML skorlarını gösterecek ve teklif asistanını tetikleyecek şekilde son haline getirmek.
*   **Warp AI Prompt:**
    ```
    Upgrade the `cli.py` script.
    1.  When displaying the ranked job list, add a new column to show the 'ML Score' if available, otherwise show the 'Heuristic Score'.
    2.  After a user selects a job to view details, add a new prompt: "Generate a proposal draft with AI? (y/n)".
    3.  If the user enters 'y', the script should:
        a. Fetch the user's top 3 most successful (hired) past proposals from the 'applications' and 'outcomes' tables in the database.
        b. Call the `ProposalWriter.draft_proposal` method with the new job's description and the successful examples.
        c. Print the AI-generated proposal draft to the console for the user to review and copy.
    ```
*   **Definition of Done:**
    *   `cli.py` artık ML tabanlı skorları gösteriyor.
    *   Kullanıcılar, tek bir komutla, kendi başarı geçmişlerine dayalı, yapay zeka tarafından yazılmış kişiselleştirilmiş teklif taslakları alabiliyor.

---

### **Phase 3 - Completion Checklist**

-   [ ] `ml_trainer.py` script'i, veritabanındaki verilerle başarılı bir şekilde bir model eğitiyor ve `chimera_model.joblib` dosyasını oluşturuyor.
-   [ ] `strategist.py`, eğitilmiş model mevcut olduğunda ML tabanlı skorlar üretiyor.
-   [ ] `proposal_assistant.py`, geçmiş başarılardan öğrenerek yeni teklif taslakları oluşturabiliyor.
-   [ ] `cli.py`, bu yeni yetenekleri kullanıcıya sunarak tam teşekküllü bir "Kariyer Co-Pilot"u deneyimi sağlıyor.

**Congratulations!** You have now built a true learning machine. Project Chimera is no longer just a tool; it's a strategic partner that gets smarter and more effective with every job you apply for and win. The foundation is now complete for building a full-fledged web application or expanding its capabilities into new areas.
```