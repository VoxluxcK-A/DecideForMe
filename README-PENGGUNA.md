# Decide For Me — README Panduan Pengguna

> Panduan lengkap untuk mendaftar, mengelola opsi, membuat keputusan, memakai AI opsional, memeriksa riwayat, dan mengelola akun sebagai admin.

## Daftar Isi

- [Memulai](#memulai)
- [Mendaftar dan Masuk](#mendaftar-dan-masuk)
- [Membuat Kategori dan Opsi](#membuat-kategori-dan-opsi)
- [Menggunakan Favorit dan Pengecualian](#menggunakan-favorit-dan-pengecualian)
- [Membuat Keputusan](#membuat-keputusan)
- [Memahami Status dan Riwayat](#memahami-status-dan-riwayat)
- [Memakai Alasan AI](#memakai-alasan-ai)
- [Lupa Password](#lupa-password)
- [Panduan Admin](#panduan-admin)
- [Keluar dari Akun](#keluar-dari-akun)
- [Pemecahan Masalah](#pemecahan-masalah)
- [Privasi dan Keamanan](#privasi-dan-keamanan)

## Memulai

Buka halaman utama aplikasi, lalu pilih **Make a decision** atau tautan untuk masuk/membuat akun. Dashboard dan data pribadi memerlukan akun.

Alamat halaman yang umum:

| Halaman | Alamat |
|---|---|
| Halaman utama | `/home` |
| Masuk | `/login` |
| Daftar | `/register` |
| Dashboard keputusan user | `/decide` |
| Pengelolaan akun admin | `/admin` |
| Meminta reset password | `/forgot-password` |
| Membuat password baru | `/reset-password` melalui tautan email |

## Mendaftar dan Masuk

### Membuat akun

1. Buka `/register`.
2. Masukkan nama, email, password minimal 8 karakter, lalu konfirmasi password.
3. Pilih **Create account**.
4. Setelah berhasil, aplikasi membuka dashboard.

Semua akun yang dibuat lewat pendaftaran biasa mendapatkan role **user**. Role admin tidak dapat dipilih dari form pendaftaran.

### Masuk

1. Buka `/login`.
2. Masukkan email dan password.
3. Pilih **Sign in**.

Jika kredensial keliru atau akun dinonaktifkan, ikuti pesan yang tampil. Akun yang dinonaktifkan perlu bantuan admin agar dapat diaktifkan kembali.

## Membuat Kategori dan Opsi

Kategori membantu mengelompokkan pilihan, misalnya “Makanan”, “Kegiatan”, atau “Belajar”.

### Membuat kategori

1. Buka bagian **Categories**.
2. Pilih **Create category**.
3. Isi nama kategori dan, jika perlu, keterangan singkat.
4. Simpan kategori.

Anda dapat mengubah kategori dari kartu kategori atau menghapusnya. Periksa konfirmasi sebelum menghapus karena kategori dan opsi terkait akan ikut terhapus.

### Menambahkan opsi

1. Buka **All options**, atau buka kategori yang sesuai.
2. Pilih **Add option**.
3. Masukkan nama opsi.
4. Pilih kategori dan tambahkan keterangan jika diperlukan.
5. Simpan.

Untuk memperbarui atau menghapus opsi, gunakan tombol aksi pada baris opsi. Opsi yang dihapus tidak lagi tersedia untuk keputusan baru.

### Mencari dan merapikan daftar

Pada daftar kategori atau opsi, gunakan kotak pencarian untuk menemukan nama/keterangan. Jika tersedia, pilih kategori sebagai filter dan atur urutan, misalnya berdasarkan waktu ditambahkan atau alfabetis.

## Menggunakan Favorit dan Pengecualian

- **Favorit:** tekan ikon hati pada opsi untuk menyimpannya sebagai favorit. Buka **Favorites** untuk meninjau atau memilih dari opsi favorit.
- **Pengecualian:** pada halaman membuat keputusan, tekan ikon larangan untuk mengecualikan opsi sementara dari pengundian. Tekan lagi untuk memasukkannya kembali.
- Opsi yang dikecualikan tidak akan terpilih, termasuk dalam mode favorit.
- Pastikan setidaknya ada satu opsi tersedia sebelum memulai pengundian.

## Membuat Keputusan

1. Buka **Make a decision**.
2. Pilih kategori yang berisi opsi yang ingin dipertimbangkan.
3. Periksa daftar opsi. Keluarkan opsi yang tidak ingin dipilih menggunakan ikon larangan.
4. Jika ingin, masukkan konteks singkat pada bagian **A little context**. Jangan masukkan informasi sensitif.
5. Pilih **Pick for me**. Aplikasi memilih secara acak dari opsi yang tersedia dan menyimpan hasilnya.

Untuk memilih dari semua favorit yang tersedia, gunakan **Pick from favorites**. Opsi favorit yang dikecualikan tetap tidak akan dipilih.

### Memilih opsi lain sendiri

Jika hasil acak tidak cocok:

1. Pilih **Choose another** di bawah hasil.
2. Pilih opsi alternatif yang Anda inginkan dari daftar.
3. Hasil sebelumnya yang masih berstatus **Pending** berubah menjadi **Skipped**.
4. Opsi yang dipilih sendiri disimpan sebagai keputusan baru dengan status **Pending**.

Jika tidak ada opsi alternatif lain, tambahkan opsi baru atau masukkan kembali opsi yang dikecualikan.

## Memahami Status dan Riwayat

- **Pending:** keputusan belum ditandai selesai atau dilewati.
- **Done:** keputusan sudah ditindaklanjuti.
- **Skipped:** keputusan dilewati, termasuk hasil lama saat Anda memilih opsi alternatif.

Anda dapat memperbarui status melalui tombol aksi di hasil atau pada daftar **History**. Riwayat menyimpan nama opsi, kategori, waktu, status, dan alasan AI jika ada.

Pada halaman **History**, Anda dapat:

- melihat keputusan terbaru dan memuat keputusan yang lebih lama;
- mengubah status Pending menjadi Done atau Skipped;
- menghapus satu entri riwayat; atau
- memilih **Clear history** untuk menghapus seluruh riwayat.

Penghapusan riwayat tidak dapat dibatalkan. Hapus hanya jika memang diinginkan.

## Memakai Alasan AI

AI bersifat opsional dan bukan pengambil keputusan:

1. Aplikasi mengundi atau menyimpan pilihan yang Anda tentukan terlebih dahulu.
2. Jika layanan AI tersedia, Gemini memberi perspektif singkat berdasarkan opsi terpilih dan konteks opsional.
3. Hasil alasan dapat disimpan pada riwayat keputusan.

Jika Gemini tidak diatur atau sedang bermasalah, keputusan tetap tersedia. Gunakan **Try again** pada pesan kegagalan jika tombol tersebut muncul. Konteks yang ditulis dikirim ke Google Gemini untuk menghasilkan alasan dan tidak disimpan oleh aplikasi; hindari mengirim informasi pribadi atau rahasia.

## Lupa Password

Reset password membutuhkan layanan email yang dikonfigurasi oleh pengelola aplikasi.

1. Di halaman masuk, pilih **Forgot your password?**
2. Masukkan email akun dan pilih **Send reset link**.
3. Periksa inbox, folder spam, atau folder promosi untuk email reset.
4. Buka tautan reset sebelum masa berlakunya habis. Tautan berlaku 60 menit dan hanya dapat digunakan sekali.
5. Masukkan email, password baru minimal 8 karakter, dan konfirmasi password.
6. Pilih **Reset password**, lalu masuk menggunakan password baru.

Pesan setelah permintaan reset dibuat secara generik untuk menjaga privasi; pesan tersebut tidak memastikan bahwa alamat email terdaftar maupun bahwa email benar-benar sampai. Bila email tidak datang, hubungi pengelola aplikasi.

## Panduan Admin

Admin hanya bertugas mengelola akun dan tidak memiliki menu untuk membuat keputusan, mengelola opsi, atau membuka riwayat keputusan.

### Membuka panel

Admin harus diberikan role oleh operator server untuk akun yang sudah terdaftar. Setelah login, buka **User management** atau `/admin`.

### Mencari akun dan mengubah status

1. Cari nama atau email melalui kolom pencarian, lalu pilih **Search**.
2. Periksa nama, email, role, status, dan tanggal bergabung.
3. Pada akun user aktif, pilih **Deactivate** untuk mencabut akses.
4. Pada akun user nonaktif, pilih **Reactivate** untuk mengembalikan akses.
5. Gunakan **Previous** dan **Next** untuk berpindah halaman hasil.

Akun user yang dinonaktifkan tidak dapat masuk atau menggunakan endpoint yang memerlukan akun aktif. Akun admin dilindungi agar tidak dinonaktifkan melalui panel ini. Admin tidak melihat data keputusan pribadi user.

## Keluar dari Akun

Pilih **Sign out** di bagian bawah navigasi dashboard. Setelah keluar, Anda perlu masuk kembali untuk membuka dashboard dan data akun.

## Pemecahan Masalah

| Masalah | Yang dapat dicoba |
|---|---|
| Dashboard tidak bisa dibuka | Periksa koneksi dan sesi login. Muat ulang halaman atau masuk kembali. |
| Tidak ada opsi untuk diundi | Buat opsi pada kategori terpilih atau masukkan kembali opsi yang dikecualikan. |
| Tidak ada favorit yang dapat dipilih | Tandai opsi sebagai favorit dan pastikan opsinya tidak dikecualikan. |
| Alasan AI gagal dibuat | Coba **Try again**. Jika masih gagal, gunakan hasil keputusan tanpa AI dan hubungi pengelola aplikasi. |
| Email reset tidak datang | Periksa spam/promosi, pastikan alamat yang dimasukkan benar, lalu hubungi pengelola untuk memeriksa SMTP dan log email. |
| Akun tidak dapat masuk | Pastikan email/password benar. Jika akun dinonaktifkan, minta admin mengaktifkannya kembali. |
| Perubahan status akun gagal | Muat ulang daftar dan pastikan akun yang dituju adalah user; akun admin dilindungi dari perubahan ini. |

## Privasi dan Keamanan

- Kategori, opsi, favorit, dan riwayat hanya dapat dikelola oleh pemilik akun.
- Admin hanya melihat informasi akun dasar untuk menjalankan pengelolaan akun.
- Jangan membagikan password, tautan reset password, SMTP credential, atau Gemini API key.
- Hindari memasukkan data pribadi ke kolom konteks AI karena konteks dikirim ke Google Gemini.
