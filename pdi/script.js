// LINK WEB APP APPS SCRIPT
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbzR9AiCrmh2y6daywe9L1b8ZTIhzQaCSnHp-mXr27_RAdQYJIMv-B3KuTiefNESM2u5/exec";

let mediaSlides = [];
let allAgendaData = [];
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

// HELPER MEMBACA VALUE DARI KUNCI APAPUN DALAM OBJECT JSON
function getValue(obj, possibleKeys, defaultValue = "") {
  if (!obj) return defaultValue;
  const objKeys = Object.keys(obj);
  for (let key of objKeys) {
    const cleanKey = key.trim().toLowerCase();
    for (let pKey of possibleKeys) {
      if (cleanKey === pKey.toLowerCase()) {
        if (obj[key] !== undefined && obj[key] !== null && obj[key] !== "") {
          return obj[key];
        }
      }
    }
  }
  return defaultValue;
}

// FORMAT TANGGAL SINGKAT
function formatTanggalSingkat(dateValue) {
  if (!dateValue) return "";
  let d = parseToDateObj(dateValue);
  if (!d || isNaN(d.getTime())) return String(dateValue);

  const bln = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
  return `${d.getDate()} ${bln[d.getMonth()]} ${d.getFullYear()}`;
}

function parseToDateObj(dateValue) {
  if (!dateValue) return null;
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
  if (!d || isNaN(d.getTime())) d = new Date(dateValue);
  return d;
}

// 2. LOAD DATA DARI APPS SCRIPT
async function loadData() {
  try {
    const response = await fetch(GAS_API_URL + "?nocache=" + new Date().getTime());
    const data = await response.json();

    allAgendaData = data.agenda || [];
    renderAgenda(allAgendaData);
    renderRunningText(data.runningText || []);
    
    mediaSlides = [];

    // Filter Media
    if (data.media && data.media.length > 0) {
      const activeMedia = data.media.filter(item => {
        const status = String(getValue(item, ["status"], "aktif")).toLowerCase().trim();
        return status === "aktif" || status === "ya" || status === "true" || status === "";
      });
      activeMedia.forEach(m => mediaSlides.push({ isCalendar: false, data: m }));
    }

    // Sisipkan Slide Kalender Bulanan
    mediaSlides.push({ isCalendar: true });

    if (mediaSlides.length > 0) {
      showMedia(currentMediaIndex);
    }
  } catch (error) {
    console.error("Gagal memuat data API:", error);
  }
}

// 3. RENDER AGENDA (SIDEBAR KIRI)
function renderAgenda(agendaList) {
  const container = document.getElementById('agenda-container');
  container.innerHTML = '';

  const activeAgenda = agendaList.filter(item => {
    const status = String(getValue(item, ["status"], "aktif")).toLowerCase().trim();
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
    const nama = getValue(item, ["Nama Kegiatan", "Nama Kegiatan / Agenda", "Judul Agenda", "Nama"], "Agenda Sekolah");
    const tglMulaiRaw = getValue(item, ["Tanggal Mulai Agenda", "Tanggal Mulai", "Tanggal", "Tgl Mulai"], "");
    const tglSelesaiRaw = getValue(item, ["Tanggal Selesai Agenda", "Tanggal Selesai", "Tgl Selesai"], "");
    const kategori = getValue(item, ["Kategori", "Ketegori"], "Umum");

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
    else if (katLower.includes("siswa") || katLower.includes("ekstra") || katLower.includes("lomba") || katLower.includes("prestasi") || katLower.includes("kesiswaan")) badgeClass = "badge-siswa";
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
      const eventDate = parseToDateObj(tglMulaiRaw);
      if (eventDate && !isNaN(eventDate.getTime())) {
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

// 4. PARSER UNTUK MEDIA (GARANSI HASIL PASTI ADA RESULT)
function parseMediaUrl(url) {
  if (!url) return { isYoutube: false, fileId: '', directUrl: '' };
  url = String(url).trim();

  // YOUTUBE
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    let videoId = '';
    if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split('?')[0].split('&')[0];
    } else if (url.includes('watch?v=')) {
      videoId = url.split('watch?v=')[1].split('&')[0];
    }
    return {
      isYoutube: true,
      embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}`
    };
  }

  // GOOGLE DRIVE
  let fileId = '';
  const matchD = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  const matchId = url.match(/id=([a-zA-Z0-9_-]+)/);

  if (matchD && matchD[1]) fileId = matchD[1];
  else if (matchId && matchId[1]) fileId = matchId[1];

  if (fileId) {
    return {
      isYoutube: false,
      fileId: fileId,
      // Gunakan Google Drive Viewer langsung untuk menjamin ketersediaan tampilan
      previewUrl: `https://drive.google.com/file/d/${fileId}/preview`,
      directImg: `https://lh3.googleusercontent.com/d/${fileId}`
    };
  }

  return { isYoutube: false, directUrl: url };
}

// 5. GENERATE KALENDER GOOGLE CALENDAR STYLE
function renderCalendarSlide(container) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  let startDayOfWeek = firstDay.getDay() - 1; // Mulai Senin (0)
  if (startDayOfWeek === -1) startDayOfWeek = 6;

  // Warna Pill Kategori Agenda
  const getCategoryColor = (cat) => {
    const c = String(cat).toLowerCase();
    if (c.includes("akademik") || c.includes("ujian")) return "#2563eb"; // Biru
    if (c.includes("siswa") || c.includes("ekstra") || c.includes("lomba") || c.includes("kesiswaan") || c.includes("prestasi")) return "#059669"; // Hijau
    if (c.includes("libur")) return "#dc2626"; // Merah
    if (c.includes("rapat") || c.includes("dinas")) return "#d97706"; // Oranye
    return "#475569"; // Slate
  };

  // Map Agenda ke Rentang Hari (Date Span)
  const eventMap = {};

  allAgendaData.forEach(item => {
    const nama = getValue(item, ["Nama Kegiatan", "Nama Kegiatan / Agenda", "Judul Agenda", "Nama"], "Agenda");
    const tglMulaiRaw = getValue(item, ["Tanggal Mulai Agenda", "Tanggal Mulai", "Tanggal"], "");
    const tglSelesaiRaw = getValue(item, ["Tanggal Selesai Agenda", "Tanggal Selesai"], tglMulaiRaw);
    const kategori = getValue(item, ["Kategori", "Ketegori"], "Umum");
    const color = getCategoryColor(kategori);

    if (tglMulaiRaw) {
      const dStart = parseToDateObj(tglMulaiRaw);
      const dEnd = tglSelesaiRaw ? parseToDateObj(tglSelesaiRaw) : dStart;

      if (dStart && !isNaN(dStart.getTime())) {
        let cur = new Date(dStart);
        const end = dEnd && !isNaN(dEnd.getTime()) ? dEnd : dStart;

        // Iterasi dari Tanggal Mulai sampai Tanggal Selesai
        while (cur <= end) {
          if (cur.getMonth() === month && cur.getFullYear() === year) {
            const dateNum = cur.getDate();
            if (!eventMap[dateNum]) eventMap[dateNum] = [];
            eventMap[dateNum].push({ nama, color });
          }
          cur.setDate(cur.getDate() + 1);
        }
      }
    }
  });

  let html = `
    <div class="gcal-container">
      <div class="gcal-header">
        <span>📅 Agenda Bulan ${monthNames[month]} ${year}</span>
      </div>
      <div class="gcal-grid-header">
        <div class="gcal-day-header">Sen</div>
        <div class="gcal-day-header">Sel</div>
        <div class="gcal-day-header">Rab</div>
        <div class="gcal-day-header">Kam</div>
        <div class="gcal-day-header">Jum</div>
        <div class="gcal-day-header">Sab</div>
        <div class="gcal-day-header">Min</div>
      </div>
      <div class="gcal-grid-body">
  `;

  // Hari Kosong Bulan Lalu
  for (let i = 0; i < startDayOfWeek; i++) {
    html += `<div class="gcal-cell other-month"></div>`;
  }

  // Hari Bulan Ini
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const isToday = day === now.getDate();
    const todayClass = isToday ? 'today' : '';
    
    let pillsHtml = '';
    if (eventMap[day]) {
      eventMap[day].forEach(ev => {
        pillsHtml += `<div class="gcal-event-pill" style="background-color: ${ev.color};" title="${ev.nama}">${ev.nama}</div>`;
      });
    }

    html += `
      <div class="gcal-cell ${todayClass}">
        <div class="gcal-date-num">${day}</div>
        <div class="gcal-events-list">
          ${pillsHtml}
        </div>
      </div>
    `;
  }

  html += `</div></div>`;
  container.innerHTML = html;
}

// 6. RENDER MEDIA SLIDE
function showMedia(index) {
  if (mediaSlides.length === 0) return;

  clearTimeout(mediaTimer);
  const container = document.getElementById('media-container');
  const captionBox = document.getElementById('media-caption');
  
  const currentSlide = mediaSlides[index];

  container.innerHTML = '';

  // JIKA SLIDE KALENDER
  if (currentSlide.isCalendar) {
    captionBox.style.display = 'none';
    renderCalendarSlide(container);
  } 
  // JIKA SLIDE GAMBAR / VIDEO
  else {
    const current = currentSlide.data;
    const rawUrl = getValue(current, ["Link URL", "Link URL / Media", "URL", "Link Media", "Link"], "");
    const title = getValue(current, ["Judul / Deskripsi Media", "Judul", "Deskripsi"], "");
    const category = getValue(current, ["Kategori Media", "Kategori"], "INFORMASI");

    const parsed = parseMediaUrl(rawUrl);

    if (parsed.isYoutube) {
      container.innerHTML = `<iframe src="${parsed.embedUrl}" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    } else if (parsed.fileId) {
      // Gunakan iframe preview Google Drive yang paling tahan terhadap CORS
      container.innerHTML = `<iframe src="${parsed.previewUrl}" allow="autoplay"></iframe>`;
    } else if (parsed.directUrl) {
      container.innerHTML = `
        <img src="${parsed.directUrl}" class="media-bg-blur" alt="bg-blur">
        <img src="${parsed.directUrl}" class="media-main-img" alt="${title}" onerror="this.src='https://placehold.co/1280x720/e2e8f0/475569?text=Gagal+Memuat+Gambar';">
      `;
    }

    if (title) {
      document.getElementById('media-category').textContent = category;
      document.getElementById('media-title').textContent = title;
      captionBox.style.display = 'block';
    } else {
      captionBox.style.display = 'none';
    }
  }

  // Durasi Pindah Slide (12 Detik)
  mediaTimer = setTimeout(() => {
    currentMediaIndex = (currentMediaIndex + 1) % mediaSlides.length;
    showMedia(currentMediaIndex);
  }, 12000);
}

// 7. RENDER RUNNING TEXT
function renderRunningText(textList) {
  const container = document.getElementById('running-text-container');
  
  const activeTexts = textList
    .filter(item => {
      const status = String(getValue(item, ["status"], "aktif")).toLowerCase().trim();
      return status === "aktif" || status === "ya" || status === "true" || status === "";
    })
    .map(item => getValue(item, ["Teks Pengumuman", "Teks", "Pengumuman"], ""))
    .filter(t => t !== "");

  if (activeTexts.length > 0) {
    container.textContent = activeTexts.join("  —  📢  ");
  }
}

// Inisialisasi
loadData();
setInterval(loadData, 1 * 60 * 1000);
