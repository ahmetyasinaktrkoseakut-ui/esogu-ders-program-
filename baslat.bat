@echo off
chcp 65001 >nul
echo ===================================================================
echo   ESOGÜ İlahiyat Fakültesi Çakışmasız Ders Programı Oluşturucu
echo ===================================================================
echo Yerel web sunucusu baslatiliyor (Port: 8080)...
echo Tarayiciniz otomatik olarak acilacaktir: http://localhost:8080
echo Kapatmak icin bu pencereyi kapatabilirsiniz.
echo ===================================================================

start "" "http://localhost:8080"
python -m http.server 8080
