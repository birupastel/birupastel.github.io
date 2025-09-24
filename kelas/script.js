// PENTING: Ganti dengan URL .csv dari Google Sheet Anda
const sheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQWPV-ygrhLMjDvEM0sg_4L3d2SuPPZt0fN0TBAt2ycGTpJirqPJTxIGVs_aOreswmtzaXtykriMy1R/pub?output=csv';

document.addEventListener('DOMContentLoaded', () => {
    fetch(sheetURL)
        .then(response => response.text())
        .then(csvText => processData(csvText));
});

function processData(csvText) {
    const lines = csvText.split('\n');
    if (lines.length < 2) {
        // Tidak ada data untuk diproses
        displayData([]);
        return;
    }

    // Langkah 1: Ambil header untuk mendapatkan nama-nama siswa
    // Kita bersihkan juga dari karakter aneh seperti [ atau ] dan spasi
    const headers = lines[0].split(',').map(header => header.replace(/\[|\]/g, '').trim());
    const records = {};

    // Langkah 2: Buat papan skor awal dari header
    // Asumsi nama siswa dimulai dari kolom ke-3 (indeks 2)
    // Sesuaikan angka '2' ini jika nama siswa tidak dimulai dari Kolom C
    for (let i = 2; i < headers.length; i++) {
        const studentName = headers[i];
        if (studentName) {
            records[studentName] = {
                nama: studentName,
                total_terlambat: 0
            };
        }
    }

    // Langkah 3: Loop melalui setiap baris data (mulai dari baris kedua)
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === "") continue;

        const columns = line.split(',');

        // Langkah 4: Cek setiap kolom siswa di baris ini
        // Mulai dari indeks 2, sesuaikan jika perlu
        for (let j = 2; j < columns.length; j++) {
            const studentName = headers[j];
            const isLate = columns[j] && columns[j].trim() === '1';

            if (isLate && records[studentName]) {
                records[studentName].total_terlambat++;
            }
        }
    }

    const sortedRecords = Object.values(records).sort((a, b) => b.total_terlambat - a.total_terlambat);
    displayData(sortedRecords);
}


function displayData(sortedRecords) {
    const tbody = document.getElementById('data-klasemen');
    tbody.innerHTML = ''; 

    if (sortedRecords.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3">Belum ada data keterlambatan.</td></tr>';
        return;
    }

    sortedRecords.forEach((record, index) => {
        // Menampilkan siswa meskipun total terlambatnya 0
        const row = `
            <tr>
                <td>${index + 1}</td>
                <td>${record.nama}</td>
                <td>${record.total_terlambat}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}
