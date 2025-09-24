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
        displayData([]); 
        return;
    }

    const headers = lines[0].split(',');
    const records = {};
    
    for (let i = 2; i < headers.length; i++) {
        const namaSiswa = headers[i].trim().replace(/\[|\]/g, "");
        if (namaSiswa) {
            records[namaSiswa] = {
                nama: namaSiswa,
                total_terlambat: 0
            };
        }
    }

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === "") continue;

        const columns = line.split(',');
        
        for (let j = 2; j < headers.length; j++) {
            const namaSiswaHeader = headers[j].trim().replace(/\[|\]/g, "");
            
            // ===== PERUBAHAN ADA DI BARIS INI =====
            if (columns[j] && columns[j].trim() === '1') {
                if (records[namaSiswaHeader]) {
                    records[namaSiswaHeader].total_terlambat++;
                }
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
