// LINK WEB APP APPS SCRIPT
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbzR9AiCrmh2y6daywe9L1b8ZTIhzQaCSnHp-mXr27_RAdQYJIMv-B3KuTiefNESM2u5/exec";

let mediaSlides = [];
let allAgendaData = [];
let currentMediaIndex = 0;
let mediaTimer = null;

// PALET WARNA KHUSUS AGENDA (DI-GENERATE KONSISTEN BERDASARKAN NAMA AGENDA)
const COLOR_PALETTE = [
  "#2563eb", "#059669", "#d97706", "#7c3aed", 
  "#0891b2", "#e11d48", "#4f46e5", "#0284c7", 
  "#b45309", "#4d7c0f", "#c026d3", "#0d9488"
];

function getEventColor(title) {
  if (!title) return COLOR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLOR_PALETTE.length;
  return COLOR_PALETTE[index];
}

// 1. JAM & TANGGAL REAL-TIME (WIB - UTC+7 ASIA/JAKARTA)
function updateClock() {
  const now = new Date();
  
  const timeOptions = { 
    timeZone: 'Asia/Jakarta', 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit', 
    hour12: false 
  };
  const timeStr = new Intl.DateTimeFormat('id-ID', timeOptions).format(now).replace(/\./g, ':');
  document.getElementById('clock-time').textContent = timeStr;

  const dateOptions = { 
    timeZone: 'Asia/Jakarta', 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  };
  const dateStr = new Intl.DateTimeFormat('id-ID', dateOptions).format(now);
  document.getElementById('clock-date').textContent = dateStr;
}
setInterval(updateClock, 1000);
updateClock();

// HELPER READ JSON PROPERTY
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

// PARSER TANGGAL PINTAR (SUPPORT MM/DD/YYYY & YYYY-MM-DD & ISO STRING)
function parseToDateObj(dateValue) {
  if (!dateValue) return null;
  
  if (dateValue instanceof Date) return dateValue;

  let str = String(dateValue).trim();
  if (str.includes('T')) str = str.split('T')[0]; // Hapus jam ISO jika ada

  // Cek jika format dipisahkan oleh slas, dash, atau titik
  const parts = str.split(/[-/.]/);
  
  if (parts.length === 3) {
    const p0 = parseInt(parts[0], 10);
    const p1 = parseInt(parts[1], 10);
    const p2 = parseInt(parts[2], 10);

    // Format YYYY-MM-DD
    if (parts[0].length === 4) {
      return new Date(p0, p1 - 1, p2);
    }
    
    // Format MM/DD/YYYY atau DD/MM/YYYY
    if (parts[2].length === 4) {
      let month = p0;
      let day = p1;
      let year = p2;

      // Jika p1 > 12 (contoh 8/24/2026), berarti p0 pasti Bulan (8), p1 pasti Tanggal (24)
      if (p1 > 12) {
        month = p0;
        day = p1;
      } 
      // Jika p0 > 12 (contoh 24/8/2026), berarti p0 pasti Tanggal (24), p1 pasti Bulan (8)
      else if (p0 > 12) {
        day = p0;
        month = p1;
      }
      // Jika keduanya <= 12, standar Google Sheet US adalah M/D/YYYY
      else {
        month = p0;
        day = p1;
      }

      return new Date(year, month - 1, day);
    }
  }

  const fallback = new Date(str);
  return isNaN(fallback.getTime()) ? null : fallback;
}

// FORMAT TANGGAL SINGKAT
function formatTanggalSingkat(dateValue) {
  if (!dateValue) return "";
  let d = parseToDateObj(dateValue);
  if (!d || isNaN(d.getTime())) return String(dateValue);

  const bln = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
  return `${d.getDate()} ${bln[d.getMonth()]} ${d.getFullYear()}`;
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

  // Waktu Jakarta untuk acuan Hari Ini
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
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

// 4. PARSER MEDIA
function parseMediaUrl(url) {
  if (!url) return { isYoutube: false, fileId: '', directUrl: '' };
  url = String(url).trim();

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

  let fileId = '';
  const matchD = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  const matchId = url.match(/id=([a-zA-Z0-9_-]+)/);

  if (matchD && matchD[1]) fileId = matchD[1];
  else if (matchId && matchId[1]) fileId = matchId[1];

  if (fileId) {
    return {
      isYoutube: false,
      fileId: fileId,
      previewUrl: `https://drive.google.com/file/d/${fileId}/preview`,
      directImg: `https://lh3.googleusercontent.com/d/${fileId}`
    };
  }

  return { isYoutube: false, directUrl: url };
}

// 5. GENERATE KALENDER GOOGLE CALENDAR STYLE
function renderCalendarSlide(container) {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  const year = now.getFullYear();
  const month = now.getMonth();

  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  let startDayOfWeek = firstDay.getDay() - 1; // Mulai Senin (0)
  if (startDayOfWeek === -1) startDayOfWeek = 6;

  const daySlots = {}; 
  
  const sortedAgenda = [...allAgendaData].map(item => {
    const nama = getValue(item, ["Nama Kegiatan", "Nama Kegiatan / Agenda", "Judul Agenda", "Nama"], "Agenda");
    const tglMulaiRaw = getValue(item, ["Tanggal Mulai Agenda", "Tanggal Mulai", "Tanggal"], "");
    const tglSelesaiRaw = getValue(item, ["Tanggal Selesai Agenda", "Tanggal Selesai"], tglMulaiRaw);
    const dStart = parseToDateObj(tglMulaiRaw);
    const dEnd = tglSelesaiRaw ? parseToDateObj(tglSelesaiRaw) : dStart;

    return {
      nama,
      dStart,
      dEnd: dEnd && !isNaN(dEnd.getTime()) ? dEnd : dStart,
      color: getEventColor(nama)
    };
  }).filter(ev => ev.dStart && !isNaN(ev.dStart.getTime()));

  sortedAgenda.sort((a, b) => a.dStart - b.dStart || (b.dEnd - b.dStart) - (a.dEnd - a.dStart));

  sortedAgenda.forEach(ev => {
    let cur = new Date(ev.dStart);
    const end = ev.dEnd;

    let targetSlot = 0;
    while (true) {
      let isSlotFree = true;
      let checkCur = new Date(cur);
      while (checkCur <= end) {
        if (checkCur.getMonth() === month && checkCur.getFullYear() === year) {
          const dayNum = checkCur.getDate();
          if (daySlots[dayNum] && daySlots[dayNum][targetSlot]) {
            isSlotFree = false;
            break;
          }
        }
        checkCur.setDate(checkCur.getDate() + 1);
      }
      if (isSlotFree) break;
      targetSlot++;
    }

    while (cur <= end) {
      if (cur.getMonth() === month && cur.getFullYear() === year) {
        const dayNum = cur.getDate();
        if (!daySlots[dayNum]) daySlots[dayNum] = [];
        while (daySlots[dayNum].length < targetSlot) {
          daySlots[dayNum].push(null);
        }
        daySlots[dayNum][targetSlot] = ev;
      }
      cur.setDate(cur.getDate() + 1);
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

  for (let i = 0; i < startDayOfWeek; i++) {
    html += `<div class="gcal-cell other-month"></div>`;
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const isToday = day === now.getDate();
    const todayClass = isToday ? 'today' : '';
    
    let pillsHtml = '';
    if (daySlots[day]) {
      daySlots[day].forEach(ev => {
        if (ev) {
          pillsHtml += `<div class="gcal-event-pill" style="background-color: ${ev.color};" title="${ev.nama}">${ev.nama}</div>`;
        } else {
          pillsHtml += `<div class="gcal-event-pill spacer">&nbsp;</div>`;
        }
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

  if (currentSlide.isCalendar) {
    captionBox.style.display = 'none';
    renderCalendarSlide(container);
  } else {
    const current = currentSlide.data;
    const rawUrl = getValue(current, ["Link URL", "Link URL / Media", "URL", "Link Media", "Link"], "");
    const title = getValue(current, ["Judul / Deskripsi Media", "Judul", "Deskripsi"], "");
    const category = getValue(current, ["Kategori Media", "Kategori"], "INFORMASI");

    const parsed = parseMediaUrl(rawUrl);

    if (parsed.isYoutube) {
      container.innerHTML = `<iframe src="${parsed.embedUrl}" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    } else if (parsed.fileId) {
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
    const joinedText = activeTexts.join(" &nbsp;&nbsp;📢&nbsp;&nbsp; ") + " &nbsp;&nbsp;📢&nbsp;&nbsp; ";
    container.innerHTML = `<span>${joinedText}</span><span>${joinedText}</span>`;
  }
}

// Inisialisasi
loadData();
setInterval(loadData, 1 * 60 * 1000);
