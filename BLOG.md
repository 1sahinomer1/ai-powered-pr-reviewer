# 🚀 Geleceğin Çevik Takımları İçin: Yapay Zeka Destekli Code Review Asistanı

Yazılım dünyasında değişmeyen tek gerçek şudur: **Code Review, yazılım geliştirme sürecinin en büyük darboğazıdır.**

Bir yandan yeni feature'ları "Ship" etmeniz gerekirken, diğer yandan gelen PR'ları titizlikle incelemeniz beklenir. Bir Senior Developer gününün %20-30'unu sadece kod incelemeye ayırabilir. Peki ya bu süreçteki mekanik, tekrarlayan ve sıkıcı işleri bir robota devretseydik?

İşte bu vizyonla geliştirdiğim **AI-Powered PR Reviewer** projesini size tanıtmak istiyorum. Bu sıradan bir linter değil; **Jira ticket'ınızı okuyan, projenizin kurallarını bilen ve size satır satır mentorluk yapan bir yapay zeka asistanı.**

---

## 🏗️ Nasıl Çalışıyor? (Teknik Mimari)

Proje, GitHub Actions üzerinde çalışan bir Node.js scriptidir. Temel mimarisi şu şekildedir:

1.  **Event Trigger:** Bir PR açıldığında (`opened`) veya güncellendiğinde (`synchronize`) tetiklenir.
2.  **Context Extraction:**
    *   **Git Diff:** Sadece değişen dosyaların (`git diff`) "patch" kısmını alır. Tüm dosyayı okuyup token israf etmez.
    *   **Jira Integration:** PR başlığındaki `PROJ-123` stringini regex ile yakalar. Jira API'ına gidip o işin *ne olduğunu* (Description, Acceptance Criteria) sorgular.
3.  **Rule Engine:** Projenin kök dizinindeki `PR_RULES.md` dosyasını okuyarak proje özelindeki kuralları hafızasına alır.
4.  **AI Analysis:** Toplanan tüm bu veriyi (Diff + Jira Context + Custom Rules) OpenAI GPT-4o modeline gönderir.
5.  **GitHub Feedback:** Modelden dönen JSON çıktısını parse eder ve GitHub API kullanarak ilgili satırlara **Inline Comment** olarak basar.

---

## 🧠 Neden "Sadece Bir Linter" Değil?

### 1. İş Mantığını Anlıyor (Business Logic Awareness)
ESLint veya SonarQube size *"Burada noktalı virgül eksik"* diyebilir. Ama şunları diyemez:

> *"Jira task'ında 'Kullanıcı onayı olmadan silinemez' yazıyor, ama yazdığın `deleteUser` fonksiyonunda hiçbir kontrol yok!"*

Bu bot, Jira description'ı prompt'a dahil ettiği için yazdığınız kodun **business requirement**'lara uygunluğunu da denetler.

### 2. Sizin Kurallarınızı Öğreniyor (Custom Rules Engine)
Her takımın kendine has, linter'lara sığdıramadığı kuralları vardır.
*   *"Bizde `moment.js` kullanmak yasak, `date-fns` kullan."*
*   *"Utility fonksiyonları asla component içinde tanımlama."*

Bu kuralları projenizin içinde `PR_RULES.md` adında bir dosyada tanımlarsınız. AI, her incelemede bu kuralları "System Prompt" olarak alır ve bir Senior Developer gibi sizi uyarır.

**Örnek `PR_RULES.md`:**
```markdown
- [ ] **Security:** SQL sorgularında string concatenation yasak.
- [ ] **Performance:** `forEach` yerine `map` veya `reduce` tercih et.
- [ ] **Naming:** Boolean değişkenler `is`, `has`, `should` ile başlamalı.
```

### 3. Akıllı Filtreleme ve Optimizasyon
Her dosyayı incelemek pahalı ve gereksizdir. Script:
*   `package-lock.json`, `.md`, `.txt` gibi gereksiz dosyaları otomatik eler.
*   Sadece `added` (yeni eklenen) satırlara yorum yapar. Eski koda yorum yapıp kalabalık yaratmaz.
*   Token limitlerini yöneterek maliyeti düşük tutar.

---

## 🛠️ Kurulum ve Entegrasyon

Projenizi bu sisteme dahil etmek sadece 5 dakikanızı alır.

1.  **Repository Secrets:** GitHub Repository ayarlarında `OPENAI_API_KEY`, `JIRA_API_TOKEN` gibi değerleri tanımlayın.
2.  **Workflow Dosyası:** `.github/workflows/pr-review.yml` dosyasını reponuza ekleyin.
3.  **Opsiyonel Ayarlar:** Model (`gpt-4omni`, `gpt-3.5`), sıcaklık (`temperature`), dil (`tr`, `en`) gibi ayarları değiştirebilirsiniz.

### Örnek Workflow Config
```yaml
env:
  OPENAI_MODEL: gpt-4o
  OPENAI_TEMPERATURE: 0.2
  LANGUAGE: tr
  MAX_FILES: 15
```

---

## 🎯 Sonuç: Daha İyi Kod, Daha Hızlı Sprintler

Bu proje, Senior Developer'ların yerini almak için değil, onlara **süper güçler kazandırmak** için tasarlandı.

*   **Junior Dev:** Anında geri bildirim alarak daha hızlı öğrenir.
*   **Senior Dev:** Typo veya syntax hatalarıyla uğraşmaz, mimari ve logic review'a odaklanır.
*   **Team Lead:** Kod standartlarının (Convention) otomatik dayatıldığından emin olur.

Code review süreçlerinizi otomatize etmek ve ekibinizin verimliliğini artırmak istiyorsanız, projeyi deneyin ve katkıda bulunun!

---
*Open Source with ❤️ by Sahin Omer*
