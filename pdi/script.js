// LINK WEB APP APPS SCRIPT
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbzR9AiCrmh2y6daywe9L1b8ZTIhzQaCSnHp-mXr27_RAdQYJIMv-B3KuTiefNESM2u5/exec";

let mediaData = [];
let currentMediaIndex = 0;
let mediaTimer = null;

// 1. JAM & TANGGAL REAL-TIME
function updateClock() {
  const now = new Date();
  const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
  document.getElementById('clock-time').textContent = now.toLocaleTimeString('id-ID', timeOptions).replace(/\./g, ':');

  const dateOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  document.getElementById('clock-date').textContent = now.toLocaleDateString('id-ID', dateOptions);
}
setInterval(updateClock, 1000);
updateClock();

// FORMAT TANGGAL SINGKAT
function formatTanggalSingkat(dateValue) {
  if (!dateValue) return "";
  
  let d;
  if (typeof dateValue === 'string') {
    const cleanStr = dateValue.split('T')[0].trim();
    const parts = cleanStr.split(/[-/.]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      } else if (parts[2].length === 4) {
        d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      }
    }
  }

  if (!d || isNaN(d.getTime())) {
    d = new Date(dateValue);
  }

  if (isNaN(d.getTime())) return String(dateValue);

  const bln = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
  return `${d.getDate()} ${bln[d.getMonth()]} ${d.getFullYear()}`;
}

// 2. LOAD DATA DARI APPS SCRIPT
async function loadData() {
  try {
    const response = await fetch(GAS_API_URL);
    const data = await response.json();

    renderAgenda(data.agenda || []);
    renderRunningText(data.runningText || []);
    
    if (data.media && data.media.length > 0) {
      // Filter Media berdasarkan kolom 'Status'
      mediaData = data.media.filter(item => {
        const status = String(item["Status"] || "").toLowerCase().trim();
        return status === "aktif" || status === "ya" || status === "true" || status === "";
      });

      if (mediaData.length > 0) {
        showMedia(currentMediaIndex);
      }
    }
  } catch (error) {
    console.error("Gagal memuat data API:", error);
  }
}

// 3. RENDER AGENDA
function renderAgenda(agendaList) {
  const container = document.getElementById('agenda-container');
  container.innerHTML = '';

  const activeAgenda = agendaList.filter(item => {
    const status = String(item["Status"] || "").toLowerCase().trim();
    return status !== "selesai" && status !== "nonaktif";
  });

  if (activeAgenda.length === 0) {
    container.innerHTML = '<div class="empty-state">Belum ada agenda bulan ini</div>';
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let upcomingEvent = null;
  let minDiffDays = Infinity;

  activeAgenda.forEach(item => {
    const nama = item["Nama Kegiatan"] || "Agenda Sekolah";
    const tglMulaiRaw = item["Tanggal Mulai Agenda"] || "";
    const tglSelesaiRaw = item["Tanggal Selesai Agenda"] || "";
    const kategori = item["Kategori"] || item["Ketegori"] || "Umum";

    const tglMulaiFormatted = formatTanggalSingkat(tglMulaiRaw);
    const tglSelesaiFormatted = formatTanggalSingkat(tglSelesaiRaw);

    let dateStr = "";
    if (tglMulaiFormatted && tglSelesaiFormatted && tglMulaiFormatted !== tglSelesaiFormatted) {
      dateStr = `${tglMulaiFormatted} - ${tglSelesaiFormatted}`;
    } else if (tglMulaiFormatted) {
      dateStr = tglMulaiFormatted;
    } else {
      dateStr = "Tanggal belum diatur";
    }

    const katLower = String(kategori).toLowerCase();
    let badgeClass = "badge-umum";
    if (katLower.includes("akademik") || katLower.includes("ujian")) badgeClass = "badge-akademik";
    else if (katLower.includes("siswa") || katLower.includes("ekstra") || katLower.includes("lomba") || katLower.includes("prestasi")) badgeClass = "badge-siswa";
    else if (katLower.includes("libur")) badgeClass = "badge-libur";
    else if (katLower.includes("rapat") || katLower.includes("dinas")) badgeClass = "badge-rapat";

    const card = document.createElement('div');
    card.className = 'agenda-card';
    card.innerHTML = `
      <div class="agenda-header">
        <span class="agenda-badge ${badgeClass}">${kategori}</span>
      </div>
      <div class="agenda-name">${nama}</div>
      <div class="agenda-date">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        <span>${dateStr}</span>
      </div>
    `;
    container.appendChild(card);

    if (tglMulaiRaw) {
      const eventDate = new Date(tglMulaiRaw);
      if (!isNaN(eventDate.getTime())) {
        eventDate.setHours(0, 0, 0, 0);
        const diffTime = eventDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays >= 0 && diffDays < minDiffDays) {
          minDiffDays = diffDays;
          upcomingEvent = { nama, diffDays };
        }
      }
    }
  });

  const countdownCard = document.getElementById('countdown-card');
  if (upcomingEvent) {
    document.getElementById('countdown-title').textContent = upcomingEvent.nama;
    document.getElementById('countdown-timer').textContent = upcomingEvent.diffDays === 0 ? "HARI INI" : `${upcomingEvent.diffDays} Hari Lagi`;
    countdownCard.style.display = 'flex';
  } else {
    countdownCard.style.display = 'none';
  }
}

// 4. FUNCTION PARSING LINK MEDIA YANG LEBIH TAHAN BANTING
function parseMediaUrl(url) {
  if (!url) return { type: 'image', url: '' };
  url = url.trim();

  // YOUTUBE
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    let videoId = '';
    if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split('?')[0].split('&')[0];
    } else if (url.includes('watch?v=')) {
      videoId = url.split('watch?v=')[1].split('&')[0];
    }
    return {
      type: 'youtube',
      url: `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}`
    };
  }

  // GOOGLE DRIVE
  if (url.includes('drive.google.com')) {
    let fileId = '';
    const matchD = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    const matchId = url.match(/id=([a-zA-Z0-9_-]+)/);

    if (matchD && matchD[1]) fileId = matchD[1];
    else if (matchId && matchId[1]) fileId = matchId[1];

    if (fileId) {
      return {
        type: 'image',
        fileId: fileId,
        url: `https://lh3.googleusercontent.com/d/${fileId}`
      };
    }
  }

  return { type: 'image', url: url };
}

// 5. RENDER MEDIA
function showMedia(index) {
  if (mediaData.length === 0) return;

  clearTimeout(mediaTimer);
  const container = document.getElementById('media-container');
  const captionBox = document.getElementById('media-caption');
  
  const current = mediaData[index];
  
  const rawUrl = current["Link URL"] || "";
  const title = current["Judul / Deskripsi Media"] || "";
  const category = current["Kategori Media"] || "INFORMASI";
  const type = String(current["Tipe Media"] || "Gambar").toLowerCase();

  const parsed = parseMediaUrl(rawUrl);

  container.innerHTML = '';

  if (type.includes('video') || parsed.type === 'youtube') {
    container.innerHTML = `<iframe src="${parsed.url}" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  } else {
    // Penggunaan onerror multi-level agar jika 1 server CDN Google gagal, ia akan mencoba server alternatif secara otomatis
    const fileId = parsed.fileId || '';
    const altUrl1 = fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w1920` : parsed.url;
    const altUrl2 = fileId ? `https://docs.google.com/uc?export=view&id=${fileId}` : parsed.url;

    container.innerHTML = `
      <img src="${parsed.url}" alt="${title}" 
           onerror="if (this.src !== '${altUrl1}') { this.src='${altUrl1}'; } else if (this.src !== '${altUrl2}') { this.src='${altUrl2}'; } else { this.src='https://placehold.co/1280x720/e2e8f0/475569?text=Gagal+Memuat+Gambar'; }">
    `;
  }

  // Caption Overlay
  if (title) {
    document.getElementById('media-category').textContent = category;
    document.getElementById('media-title').textContent = title;
    captionBox.style.display = 'block';
  } else {
    captionBox.style.display = 'none';
  }

  // Durasi Pindah Slide (Default 10 Detik)
  mediaTimer = setTimeout(() => {
    currentMediaIndex = (currentMediaIndex + 1) % mediaData.length;
    showMedia(currentMediaIndex);
  }, 10000);
}

// 6. RENDER RUNNING TEXT
function renderRunningText(textList) {
  const container = document.getElementById('running-text-container');
  
  const activeTexts = textList
    .filter(item => {
      const status = String(item["Status"] || "").toLowerCase().trim();
      return status === "aktif" || status === "ya" || status === "true" || status === "";
    })
    .map(item => item["Teks Pengumuman"] || "")
    .filter(t => t !== "");

  if (activeTexts.length > 0) {
    container.textContent = activeTexts.join("  —  📢  ");
  }
}

// Inisialisasi
loadData();
setInterval(loadData, 1 * 60 * 1000); // Auto update data tiap 1 menit
