# LERESSAE — versi dipisah

Sumber: Untitled-1.html

Struktur:
- index.html — markup utama
- css/leressae.css — seluruh CSS inline, digabung tanpa mengubah isi aturan
- js/ — seluruh blok JavaScript inline, dipisah sesuai urutan eksekusi asli

Catatan penting:
- Urutan script dipertahankan agar dependency/fungsi tetap sama.
- ID, class, markup, API, dan logika tidak ditulis ulang pada tahap ini.
- Ini adalah pemisahan aman tahap pertama; pemecahan JavaScript lebih jauh menjadi admin/teknisi/public sebaiknya dilakukan setelah regression test.
- Jalankan melalui web server lokal (mis. VS Code Live Server), bukan file:// jika ada API/fetch yang memerlukan server.

Script yang dibuat:
- 01-app.js
- 02-admin-operational-chart-filter-js.js
- 03-app.js
- 04-app.js
- 05-app.js
