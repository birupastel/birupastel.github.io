<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Papan Informasi Digital Sekolah</title>
  <link rel="stylesheet" href="style.css">
  <!-- Google Fonts -->
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
</head>
<body>

  <!-- HEADER -->
  <header class="header">
    <div class="brand">
      <img src="https://lh3.googleusercontent.com/d/1_PLACEHOLDER_LOGO" alt="Logo Sekolah" id="school-logo" class="logo">
      <div class="school-info">
        <h1 id="school-name">SMAN 1 GARUT</h1>
        <p id="school-sub">Papan Informasi Digital Resmi</p>
      </div>
    </div>
    <div class="clock-container">
      <div id="clock-time">00:00:00</div>
      <div id="clock-date">Senin, 1 Januari 2026</div>
    </div>
  </header>

  <!-- MAIN BODY -->
  <main class="main-container">
    
    <!-- SIDEBAR KIRI: AGENDA -->
    <aside class="sidebar">
      <div class="section-title">
        <span>📅 Agenda Bulan Ini</span>
      </div>
      <div class="agenda-list" id="agenda-container">
        <div class="loading">Memuat agenda...</div>
      </div>
    </aside>

    <!-- AREA KANAN: MEDIA SLIDER & VIDEO -->
    <section class="media-section">
      <div class="media-container" id="media-container">
        <!-- Render Media Gambar / Video YouTube via JS -->
        <div class="loading">Memuat media...</div>
      </div>

      <!-- COUNTDOWN OVERLAY (OTOMATIS DARI AGENDA TERDEKAT) -->
      <div class="countdown-card" id="countdown-card" style="display: none;">
        <span class="countdown-badge">⏳ AGENDA MENDATANG</span>
        <div class="countdown-title" id="countdown-title">-</div>
        <div class="countdown-timer" id="countdown-timer">- Hari Lagi</div>
      </div>

      <!-- CAPTION / OVERLAY TEXT MEDIA -->
      <div class="media-caption" id="media-caption" style="display: none;">
        <span class="category-badge" id="media-category">UMUM</span>
        <p id="media-title">-</p>
      </div>
    </section>

  </main>

  <!-- FOOTER: RUNNING TEXT -->
  <footer class="footer">
    <div class="ticker-label">INFORMASI</div>
    <div class="ticker-wrap">
      <div class="ticker-move" id="running-text-container">
        Selamat datang di Papan Informasi Digital Sekolah...
      </div>
    </div>
  </footer>

  <script src="script.js"></script>
</body>
</html>
