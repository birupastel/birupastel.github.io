const GAS_API_URL = "https://script.google.com/macros/s/AKfycbzR9AiCrmh2y6daywe9L1b8ZTIhzQaCSnHp-mXr27_RAdQYJIMv-B3KuTiefNESM2u5/exec";

let mediaData = [];
let currentMediaIndex = 0;
let mediaTimer = null;

function updateClock() {
  const now = new Date();
  const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
  document.getElementById('clock-time').textContent = now.toLocaleTimeString('id-ID', timeOptions).replace(/\./g, ':');

  const dateOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  document.getElementById('clock-date').textContent = now.toLocaleDateString('id-ID', dateOptions);
}
setInterval(updateClock, 1000);
updateClock();

function getProp(obj, possibleKeys, defaultValue = "") {
  if (!obj) return defaultValue;
  const keys = Object.keys(obj);
  for (let key of keys) {
    const cleanKey = key.trim().toLowerCase();
    for (let pKey of possibleKeys) {
      if (cleanKey === pKey.toLowerCase()) {
        return obj[key] !== undefined && obj[key] !== null ? obj[key] : defaultValue;
      }
    }
  }
  return defaultValue;
}

async function loadData() {
  try {
    const response = await fetch(GAS_API_URL);
    const data = await response.json();

    renderAgenda(data.agenda || []);
    renderRunningText(data.runningText || []);
    
    if (data.media && data.media.length > 0) {
      mediaData = data.media.filter(item => {
        const status = String(getProp(item, ["Status Media", "Status", "Status/Aktif"], "Aktif")).toLowerCase();
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

function renderAgenda(agendaList) {
  const container = document.getElementById('agenda-container');
  container.innerHTML = '';

  const activeAgenda = agendaList.filter(item => {
    const status = String(getProp(item, ["Status", "Status Agenda"], "Aktif")).toLowerCase();
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
    const nama = getProp(item, ["Nama Kegiatan", "Nama Kegiatan / Agenda", "Judul Agenda", "Agenda", "Nama"], "Agenda Sekolah");
    const tglMulai = getProp(item, ["Tanggal Mulai", "Tanggal", "Tgl Mulai"], "");
    const tglSelesai = getProp(item, ["Tanggal Selesai", "Tgl Selesai"], "");
    const kategori = getProp(item, ["Kategori", "Kategori Agenda", "Jenis"], "Umum");

    let dateStr = "";
    if (tglMulai && tglSelesai && tglMulai !== tglSelesai) {
      dateStr = `${formatTanggalSingkat(tglMulai)} - ${formatTanggalSingkat(tglSelesai)}`;
    } else if (tglMulai) {
      dateStr = formatTanggalSingkat(tglMulai);
    } else {
      dateStr = "Tanggal belum diatur";
    }

    const katLower = kategori.toLowerCase();
    let badgeClass = "badge-umum";
    if (katLower.includes("akademik") || katLower.includes("ujian")) badgeClass = "badge-akademik";
    else if (katLower.includes("siswa") || katLower.includes("ekstra") || katLower.includes("lomba")) badgeClass = "badge-siswa";
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

    if (tglMulai) {
      const eventDate = new Date(tglMulai);
      eventDate.setHours(0, 0, 0, 0);
      const diffTime = eventDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays >= 0 && diffDays < minDiffDays) {
        minDiffDays = diffDays;
        upcomingEvent = { nama, diffDays };
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

function formatTanggalSingkat(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  const bln = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
  return `${d.getDate()} ${bln[d.getMonth()]} ${d.getFullYear()}`;
}

function parseMediaUrl(url) {
  if (!url) return '';
  url = url.trim();

  // YouTube
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

  // Google Drive Image
  if (url.includes('drive.google.com')) {
    let fileId = '';
    const matchD = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    const matchId = url.match(/id=([a-zA-Z0-9_-]+)/);

    if (matchD && matchD[1]) fileId = matchD[1];
    else if (matchId && matchId[1]) fileId = matchId[1];

    if (fileId) {
      // Menggunakan Thumbnail API Google Drive agar gambar dijamin muncul tanpa terblokir CORS
      return {
        type: 'image',
        url: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1920`
      };
    }
  }

  // Direct Image URL biasa
  return { type: 'image', url: url };
}

function showMedia(index) {
  if (mediaData.length === 0) return;

  clearTimeout(mediaTimer);
  const container = document.getElementById('media-container');
  const captionBox = document.getElementById('media-caption');
  
  const current = mediaData[index];
  const rawUrl = getProp(current, ["Link URL / Media", "Link URL", "Link Media", "URL", "Link"], "");
  const title = getProp(current, ["Judul / Deskripsi Media", "Judul", "Deskripsi", "Caption"], "");
  const category = getProp(current, ["Kategori Media", "Kategori", "Jenis"], "INFORMASI");
  const duration = parseInt(getProp(current, ["Durasi Tampil (detik)", "Durasi (detik)", "Durasi"], 10)) || 10;

  const parsed = parseMediaUrl(rawUrl);

  container.innerHTML = '';

  if (parsed.type === 'youtube') {
    container.innerHTML = `<iframe src="${parsed.url}" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  } else {
    container.innerHTML = `<img src="${parsed.url}" alt="${title}" onerror="this.onerror=null; this.src='https://placehold.co/1280x720/e2e8f0/475569?text=Gagal+Memuat+Gambar';">`;
  }

  // Overlay Caption
  if (title) {
    document.getElementById('media-category').textContent = category;
    document.getElementById('media-title').textContent = title;
    captionBox.style.display = 'block';
  } else {
    captionBox.style.display = 'none';
  }

  // Timer putaran slide selanjutnya
  mediaTimer = setTimeout(() => {
    currentMediaIndex = (currentMediaIndex + 1) % mediaData.length;
    showMedia(currentMediaIndex);
  }, duration * 1000);
}

function renderRunningText(textList) {
  const container = document.getElementById('running-text-container');
  
  const activeTexts = textList
    .filter(item => {
      const status = String(getProp(item, ["Status", "Status Text"], "Aktif")).toLowerCase();
      return status === "aktif" || status === "ya" || status === "true" || status === "";
    })
    .map(item => getProp(item, ["Teks Pengumuman", "Teks", "Pengumuman", "Isi"], ""))
    .filter(t => t !== "");

  if (activeTexts.length > 0) {
    container.textContent = activeTexts.join("  —  📢  ");
  }
}

// Inisialisasi
loadData();
setInterval(loadData, 3 * 60 * 1000); // Auto-update data tiap 3 menit
