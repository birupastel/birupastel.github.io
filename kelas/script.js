// PENTING: Ganti dengan URL .csv dari Google Sheet Anda
const sheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQWPV-ygrhLMjDvEM0sg_4L3d2SuPPZt0fN0TBAt2ycGTpJirqPJTxIGVs_aOreswmtzaXtykriMy1R/pubhtml?gid=126319670&single=true';

document.addEventListener('DOMContentLoaded', () => {
    fetch(sheetURL)
        .then(response => {
            if (!response.ok) {
                throw new Error('Gagal memuat data. Periksa kembali URL atau pengaturan publikasi Google Sheet Anda.');
            }
            return response.text();
        })
        .then(csvText => processData(csvText))
        .catch(error => {
            console.error('Terjadi kesalahan:', error);
            const tbody = document.getElementById('data-klasemen');
            tbody.innerHTML = `<tr><td colspan="3" style="color: red;">Gagal memuat data. Silakan cek konsol (F12) untuk detail.</td></tr>`;
        });
});

function processData(csvText) {
    const lines = csvText.split('\n');
    if (lines.length < 2) {
        // Menangani kasus jika sheet kosong
        displayData([]); 
        return;
    }

    // Baris pertama (index 0) adalah header (Timestamp, Tanggal, [Abdulgani], [Amelya], ...)
    const headers = lines[0].split(',');
    const records = {};
    
    // Inisialisasi data siswa dari header, dimulai dari kolom ke-3 (index 2)
    for (let i = 2; i < headers.length; i++) {
        const namaSiswa = headers[i].trim().replace(/\[|\]/g, "");
        if (namaSiswa) {
            records[namaSiswa] = {
                nama: namaSiswa,
                total_terlambat: 0
            };
        }
    }

    // Proses setiap baris data (mulai dari index 1)
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === "") continue;

        const columns = line.split(',');
        
        // Cek setiap kolom data, dimulai dari index 2
        for (let j = 2; j < headers.length; j++) {
            const namaSiswaHeader = headers[j].trim().replace(/\[|\]/g, "");
            // Pastikan kolom ada di baris data saat ini
            if (columns[j] && columns[j].trim().toLowerCase() === 'ya') {
                if (records[namaSiswaHeader]) {
                    records[namaSiswaHeader].total_terlambat++;
                }
            }
        }
    }

    // Ubah objek menjadi array agar bisa diurutkan
    const sortedRecords = Object.values(records).sort((a, b) => b.total_terlambat - a.total_terlambat);

    displayData(sortedRecords);
}

function displayData(sortedRecords) {
    const tbody = document.getElementById('data-klasemen');
    tbody.innerHTML = ''; 

    if (sortedRecords.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3">Belum ada data siswa.</td></tr>';
        return;
    }

    sortedRecords.forEach((record, index) => {
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
