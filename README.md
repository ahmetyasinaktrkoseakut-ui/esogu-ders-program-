# ESOGÜ İlahiyat Fakültesi Ders Seçim ve Haftalık Ders Programı Sistemi

Eskişehir Osmangazi Üniversitesi (ESOGÜ) İlahiyat Fakültesi öğrencileri için resmi Öğrenci Bilgi Sistemi (**ogubs1.ogu.edu.tr/DersSecim.aspx**) kayıt arayüzünün birebir resmi görünüm ve işlevselliğine sahip ders programı hazırlama ve simülasyon sistemidir.

---

## 🏛️ Özellikler

- **Birebir Resmi ÖBS Tasarımı:** İki sütunlu yerleşim, kırmızı alt çizgili resmi tablo başlıkları, seçilen derslerde gri satır boyama (#cccccc), ders programında resmi açık yeşil (#90ee90) hücre renklendirmesi.
- **Eksiksiz Ders ve Şube Verisi:** 2026-2027 Güz Dönemi ders programı Excel verisinin tamamı (700 ham saat satırı, 228 açık şube, 135 farklı ders).
- **Akıllı Cinsiyet Filtreleme:** Yalnızca Kur'an-ı Kerim derslerinde geçerli olan Kız / Erkek şube ayrımı (A, B, C Kız / D, E Erkek). Diğer tüm dersler herkese açıktır.
- **Başarısız Dersler ve Alttan Seçmeli Havuzu:** 1, 2, 3 ve 4. sınıflara ait 54 tekil zorunlu ders içinden alttan kalanları seçebilme; alttan seçmeli adedi girildiğinde ders seçildikçe otomatik düşen akıllı sayaç.
- **Çakışma Koruması ve Esnek Şube Değişimi:** Çakışan ders saatlerinde anında bilgilendirme; aynı dersin farklı bir şubesine tıklandığında eski şubenin otomatik yenisiyle değiştirilmesi.
- **Seçmeli Ders Belirteci (Seç):** Tüm seçmeli derslerin yanında belirgin (Seç) etiketi ve dönemlik seçmeli kotası denetimi.
- **Gelişmiş Arama:** Büyük/küçük harf ve Türkçe karakter (İ, I, ı, i, ş, ğ, ü, ö, ç) duyarsız anlık arama motoru.
- **Yazdırma ve PNG Dışa Aktarma:** Kaydırma çubuğu olmadan, seçilen tüm dersleri ve haftalık programı eksiksiz yazdırabilme ve yüksek çözünürlüklü PNG resmi olarak indirebilme.
- **Mobil Uyumlu (Responsive):** Telefon ve tabletlerde dikey akış, pürüzsüz yatay kaydırma ve dokunmatik uyumlu kontroller.
- **Açılış Kullanım Kılavuzu:** İlk açılışta adım adım yönlendirme ve sağ kenarda sabit duran pratik 📖 Kılavuz erişim butonu.

---

## 🚀 Çalıştırma

Projeyi yerel bilgisayarınızda çalıştırmak için:

1. **Pratik Yöntem:** Klasör içindeki aslat.bat dosyasına çift tıklayın. Tarayıcınızda otomatik olarak açılacaktır.
2. **Terminal Yöntemi:**
   `ash
   python -m http.server 8080
   `
   Tarayıcınızdan http://localhost:8080 adresine gidin.

---

## 📂 Dosya Yapısı

- index.html - Ana ÖBS arayüzü, modal pencereler ve stil tanımları.
- css/style.css - Resmi ÖBS tipografisi, renkleri ve mobil duyarlılık stilleri.
- js/app.js - Arayüz etkileşimleri, ders seçimi, sepet yönetimi, arama ve dışa aktarım motoru.
- js/solver.js - Çakışma denetimi, şube uygunluğu, kredi ve AKTS hesaplama motoru.
- js/html2canvas.min.js - Ders programını PNG olarak dışa aktaran kütüphane.
- data/schedule_data.js & schedule_data.json - Fakültenin 228 şubeli ders programı veritabanı.
- data/parse_excel.py - Resmi Excel dosyasını işleyip JSON/JS verisine dönüştüren parser.
