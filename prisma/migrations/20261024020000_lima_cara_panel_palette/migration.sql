-- Palet panel baru memakai biru untuk cara pertama. Ubah hanya warna netral
-- dari desain kartu lama; pilihan warna lain yang dibuat admin tetap utuh.
UPDATE section_beranda
SET warna_background = '#076bda'
WHERE kunci = 'lima-cara'
  AND lower(warna_background) = '#f2f2f4';
