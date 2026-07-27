// GANTI LINK DI BAWAH INI DENGAN LINK WEB APP APPS SCRIPT MILIKMU
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbzR9AiCrmh2y6daywe9L1b8ZTIhzQaCSnHp-mXr27_RAdQYJIMv-B3KuTiefNESM2u5/exec";

let mediaData = [];
let currentMediaIndex = 0;
let mediaTimer = null;

// 1. UPDATE JAM REAL-TIME
function updateClock() {
  const now = new Date();
  
  const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
  document.getElementById('clock-time').textContent = now.toLocaleTimeString('id-ID', timeOptions).replace(/\./g, ':');

  const dateOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  document.getElementById('clock-date').textContent = now.toLocaleDateString('id-ID', dateOptions);
}
setInterval(updateClock, 1000);
updateClock();

// 2. FETCH DATA DARI GOOGLE APPS SCRIPT
async function loadData() {
  try {
    const response = await fetch(GAS_API_URL);
    const data = await response.json();

    renderAgenda(data.agenda || []);
    renderRunningText(data.runningText || []);
    
    if (data.media && data.media.length > 0) {
      mediaData = data.media.filter(item => {
        const status = (item["Status"] || item["Status Media"] || "").toString().toLowerCase();
        return status === "aktif" || status === "ya" || status === "";
      });

      if (mediaData.length > 0) {
        showMedia(currentMediaIndex);
      }
    }
  } catch (error) {
    console.error("Gagal mengambil data:", error);
  }
}

// 3. RENDER AGENDA (SIDEBAR KIRI) & UPDATE COUNTDOWN
function renderAgenda(agendaList) {
  const container = document.getElementById('agenda-container');
  container.innerHTML = '';

  const activeAgenda = agendaList.filter(item => {
    const status = (item["Status"] || "").toString().toLowerCase();
    return status !== "selesai" && status !== "nonaktif";
  });

  if (activeAgenda.length === 0) {
    container.innerHTML = '<div class="loading">Tidak ada agenda bulan ini.</div>';
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let upcomingEvent = null;
  let minDiffDays = Infinity;

  activeAgenda.forEach(item => {
    const nama = item["Nama Kegiatan"] || item["Nama Kegiatan / Agenda"] || "Agenda";
    const tglMulaiStr = item["Tanggal Mulai"] || item["Tanggal"] || "";
    const tglSelesaiStr = item["Tanggal Selesai"] || "";
    const kategori = item["Kategori"] || "Umum";

    let dateDisplay = tglMulaiStr;
    if (tglSelesaiStr && tglSelesaiStr !== tglMulaiStr) {
      dateDisplay = `${tglMulaiStr} s/d ${tglSelesaiStr}`;
    }

    // Buat Kartu Agenda
    const card = document.createElement('div');
    card.className = 'agenda-card';
    card.innerHTML = `
      <div class="agenda-date">📅 ${dateDisplay}</div>
      <div class="agenda-name">${nama}</div>
      <span class="agenda-badge">${kategori}</span>
    `;
    container.appendChild(card);

    // Hitung Countdown Agenda Terdekat
    if (tglMulaiStr) {
      const eventDate = new Date(tglMulaiStr);
      eventDate.setHours(0, 0, 0, 0);
      
      const diffTime = eventDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays >= 0 && diffDays < minDiffDays) {
        minDiffDays = diffDays;
        upcomingEvent = { nama, diffDays };
      }
    }
  });

  // Tampilkan Countdown Widget jika ada event terdekat
  const countdownCard = document.getElementById('countdown-card');
  if (upcomingEvent) {
    document.getElementById('countdown-title').textContent = upcomingEvent.nama;
    document.getElementById('countdown-timer').textContent = upcomingEvent.diffDays === 0 ? "HARI INI!" : `${upcomingEvent.diffDays} Hari Lagi`;
    countdownCard.style.display = 'block';
  } else {
    countdownCard.style.display = 'none';
  }
}

// 4. CONVERT LINK DRIVE/YOUTUBE
function parseMediaUrl(url, type) {
  if (!url) return '';
  
  // Handle YouTube Link
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    let videoId = '';
    if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split('?')[0];
    } else if (url.includes('watch?v=')) {
      videoId = url.split('watch?v=')[1].split('&')[0];
    }
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}`;
  }

  // Handle Google Drive Image Link
  if (url.includes('drive.google.com')) {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
  }

  return url;
}

// 5. RENDER MEDIA SLIDER
function showMedia(index) {
  if (mediaData.length === 0) return;

  clearTimeout(mediaTimer);
  const container = document.getElementById('media-container');
  const captionBox = document.getElementById('media-caption');
  
  const current = mediaData[index];
  const type = (current["Tipe Media"] || current["Tipe"] || "Gambar").toLowerCase();
  const rawUrl = current["Link URL / Media"] || current["Link URL"] || current["Link Media"] || "";
  const title = current["Judul / Deskripsi Media"] || current["Judul"] || "";
  const category = current["Kategori Media"] || current["Kategori"] || "INFO";
  const duration = parseInt(current["Durasi (detik)"]) || 10;

  const parsedUrl = parseMediaUrl(rawUrl, type);

  container.innerHTML = '';

  if (type.includes('video') || rawUrl.includes('youtube') || rawUrl.includes('youtu.be')) {
    container.innerHTML = `<iframe src="${parsedUrl}" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  } else {
    container.innerHTML = `<img src="${parsedUrl}" alt="${title}">`;
  }

  // Caption Overlay
  if (title) {
    document.getElementById('media-category').textContent = category;
    document.getElementById('media-title').textContent = title;
    captionBox.style.display = 'block';
  } else {
    captionBox.style.display = 'none';
  }

  // Timer putaran slide berikutnya
  mediaTimer = setTimeout(() => {
    currentMediaIndex = (currentMediaIndex + 1) % mediaData.length;
    showMedia(currentMediaIndex);
  }, duration * 1000);
}

// 6. RENDER RUNNING TEXT
function renderRunningText(textList) {
  const container = document.getElementById('running-text-container');
  
  const activeTexts = textList
    .filter(item => {
      const status = (item["Status"] || "").toString().toLowerCase();
      return status === "aktif" || status === "ya" || status === "";
    })
    .map(item => item["Teks Pengumuman"] || item["Teks"] || item["Pengumuman"] || "")
    .filter(t => t !== "");

  if (activeTexts.length > 0) {
    container.textContent = activeTexts.join("  •  📢  ");
  }
}

// Inisialisasi Pertama
loadData();

// Auto Refresh Data di Latar Belakang Setiap 3 Menit
setInterval(loadData, 3 * 60 * 1000);
