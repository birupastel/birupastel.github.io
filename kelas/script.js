// PENTING: Ganti dengan URL .csv dari Google Sheet Anda
const sheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQWPV-ygrhLMjDvEM0sg_4L3d2SuPPZt0fN0TBAt2ycGTpJirqPJTxIGVs_aOreswmtzaXtykriMy1R/pubhtml?gid=126319670&single=true';

// Variabel global untuk menyimpan semua data mentah agar tidak perlu fetch berulang kali
let allLatenessData = [];
let studentNames = [];

// Elemen filter
const yearFilter = document.getElementById('year-filter');
const monthFilter = document.getElementById('month-filter');

document.addEventListener('DOMContentLoaded', () => {
    fetch(sheetURL)
        .then(response => {
            if (!response.ok) {
                throw new Error('Gagal memuat data.');
            }
            return response.text();
        })
        .then(csvText => {
            parseAndStoreData(csvText);
            populateFilters();
            updateDisplay(); // Tampilkan data "Semua Waktu" saat pertama kali dimuat
        })
        .catch(error => {
            console.error('Terjadi kesalahan:', error);
            const tbody = document.getElementById('data-klasemen');
            tbody.innerHTML = `<tr><td colspan="3" style="color: red;">Gagal memuat data.</td></tr>`;
        });

    // Tambahkan event listener agar tabel diperbarui saat filter diubah
    yearFilter.addEventListener('change', updateDisplay);
    monthFilter.addEventListener('change', updateDisplay);
});

function parseAndStoreData(csvText) {
    const lines = csvText.split('\n');
    if (lines.length < 2) return;

    const headers = lines[0].split(',');
    // Ambil daftar nama siswa dari header (mulai dari kolom ke-3)
    studentNames = headers.slice(2).map(name => name.trim().replace(/\[|\]/g, ""));

    // Proses setiap baris data
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === "") continue;
        const columns = line.split(',');

        // Asumsikan kolom Tanggal ada di index 1
        const date = new Date(columns[1]);
        if (isNaN(date.getTime())) continue; // Lewati jika tanggal tidak valid

        for (let j = 2; j < headers.length; j++) {
            if (columns[j] && columns[j].trim() === '1') {
                allLatenessData.push({
                    name: studentNames[j - 2],
                    date: date
                });
            }
        }
    }
}

function populateFilters() {
    const years = [...new Set(allLatenessData.map(item => item.date.getFullYear()))];
    years.sort((a, b) => b - a); // Urutkan tahun dari terbaru

    yearFilter.innerHTML = '<option value="semua">Semua Tahun</option>';
    years.forEach(year => {
        yearFilter.innerHTML += `<option value="${year}">${year}</option>`;
    });

    monthFilter.innerHTML = '<option value="semua">Semua Bulan</option>';
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    months.forEach((month, index) => {
        monthFilter.innerHTML += `<option value="${index}">${month}</option>`;
    });
}

function updateDisplay() {
    const selectedYear = yearFilter.value;
    const selectedMonth = monthFilter.value;

    // Filter data berdasarkan pilihan
    const filteredData = allLatenessData.filter(item => {
        const yearMatch = (selectedYear === 'semua') || (item.date.getFullYear() == selectedYear);
        const monthMatch = (selectedMonth === 'semua') || (item.date.getMonth() == selectedMonth);
        return yearMatch && monthMatch;
    });

    // Hitung total keterlambatan dari data yang sudah difilter
    const records = {};
    studentNames.forEach(name => {
        records[name] = { name: name, total_terlambat: 0 };
    });

    filteredData.forEach(item => {
        if (records[item.name]) {
            records[item.name].total_terlambat++;
        }
    });

    const sortedRecords = Object.values(records).sort((a, b) => b.total_terlambat - a.total_terlambat);
    displayData(sortedRecords);
}

function displayData(sortedRecords) {
    const tbody = document.getElementById('data-klasemen');
    tbody.innerHTML = ''; 

    if (sortedRecords.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3">Tidak ada data untuk ditampilkan.</td></tr>';
        return;
    }

    let rank = 1;
    sortedRecords.forEach(record => {
        const row = `
            <tr>
                <td>${rank++}</td>
                <td>${record.nama}</td>
                <td>${record.total_terlambat}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}
