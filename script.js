'use strict';

/**
 * VIXIES GROUP — LOGIKA APLIKASI UTAMA
 * Vanilla JavaScript (ES6+). Tanpa framework, tanpa dependensi eksternal.
 *
 * Tanggung jawab modul ini:
 *  1. Mengelola interaksi navigasi mobile (hamburger toggle).
 *  2. Mengambil data relasional dari ./data.json melalui Fetch API.
 *  3. Merender Bento Grid (proyek & tim) secara dinamis menggunakan DocumentFragment
 *     untuk meminimalisasi siklus reflow browser.
 *  4. Memetakan lencana (badge) warna berdasarkan nilai 'division' / 'category'
 *     (Vixies Team -> Navy, Vixies Studio -> Orange).
 *  5. Menangani kegagalan fetch akibat protokol file:// (CORS/CORB) dengan
 *     pesan mitigasi yang jelas untuk pengembang.
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initFooterYear();
  loadSiteData();
});

/* ==========================================================================
   1. NAVIGASI MOBILE
   ========================================================================== */
function initNavigation() {
  const toggle = document.getElementById('nav-toggle');
  const menu = document.getElementById('nav-menu');

  if (!toggle || !menu) return;

  toggle.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.classList.toggle('is-active', isOpen);
  });

  // UX: tutup menu otomatis begitu salah satu tautan navigasi diklik.
  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      menu.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.classList.remove('is-active');
    });
  });
}

function initFooterYear() {
  const yearEl = document.getElementById('current-year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
}

/* ==========================================================================
   2. POLA UKURAN BENTO (ASIMETRI TERKENDALI)
   ========================================================================== */
// Siklus kelas ukuran dirotasi berdasarkan indeks elemen, bukan dihardcode per-item.
// Ini menjaga tata letak tetap asimetris namun dapat diskalakan untuk jumlah
// data apa pun yang ditambahkan ke data.json di masa depan.
const BENTO_PATTERN = ['span-big', 'span-normal', 'span-tall', 'span-normal', 'span-wide', 'span-normal'];

function getBentoClass(index) {
  return BENTO_PATTERN[index % BENTO_PATTERN.length];
}

/* ==========================================================================
   3. PEMUATAN DATA UTAMA (FETCH API)
   ========================================================================== */
async function loadSiteData() {
  try {
    const response = await fetch('./data.json');

    if (!response.ok) {
      throw new Error(`Permintaan HTTP gagal dengan status: ${response.status}`);
    }

    const data = await response.json();

    renderCompanyInfo(data.companyInfo);
    renderProjects(data.projects);
    renderTeam(data.team);
  } catch (error) {
    handleFetchError(error);
  }
}

/**
 * Menangani kegagalan fetch. Penyebab paling umum saat pengembangan lokal
 * adalah membuka index.html langsung lewat protokol file:// — browser modern
 * memblokir permintaan tersebut akibat Same-Origin Policy & Opaque Response
 * Blocking (CORB/CORS). Setelah di-deploy ke GitHub Pages (HTTPS), hal ini
 * tidak akan terjadi karena dokumen dan data.json akan berasal dari origin
 * yang sama secara sah.
 */
function handleFetchError(error) {
  const isLocalFile = window.location.protocol === 'file:';

  console.error('[Vixies Group] Gagal memuat data.json:', error);

  if (isLocalFile) {
    console.error(
      '%c[PERINGATAN PENGEMBANG] Halaman ini dibuka langsung via protokol file://. ' +
        'Fetch API ke berkas lokal diblokir oleh Same-Origin Policy / CORB pada browser modern. ' +
        'Jalankan proyek melalui server HTTP lokal (contoh: ekstensi "Live Server" di VS Code, ' +
        'atau jalankan `npx serve` / `python -m http.server` dari root proyek) untuk menguji secara akurat. ' +
        'Setelah di-deploy ke GitHub Pages melalui HTTPS, fetch("./data.json") akan berjalan normal.',
      'color: #FF8200; font-weight: bold;'
    );
  }

  renderErrorState('project-grid', isLocalFile);
  renderErrorState('team-grid', isLocalFile);
}

function renderErrorState(containerId, isLocalFile) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '';

  const message = document.createElement('p');
  message.className = 'data-state data-state--error';
  message.textContent = isLocalFile
    ? 'Gagal memuat data. Buka proyek ini melalui server HTTP lokal (mis. Live Server) — protokol file:// tidak didukung oleh Fetch API.'
    : 'Gagal memuat data.json. Periksa koneksi jaringan atau struktur berkas.';

  container.appendChild(message);
}

/* ==========================================================================
   4. RENDER: INFO PERUSAHAAN (companyInfo)
   ========================================================================== */
function renderCompanyInfo(companyInfo) {
  if (!companyInfo) return;

  const nameEl = document.getElementById('company-name');
  const descEl = document.getElementById('company-description');

  if (nameEl) nameEl.textContent = companyInfo.name;
  if (descEl) descEl.textContent = companyInfo.description;
}

/* ==========================================================================
   5. RENDER: PROYEK (Vixies Studio)
   ========================================================================== */
function renderProjects(projects = []) {
  const grid = document.getElementById('project-grid');
  if (!grid) return;

  grid.innerHTML = '';

  if (projects.length === 0) {
    renderErrorState('project-grid', false);
    return;
  }

  // DocumentFragment: seluruh kartu dibangun di memori terlebih dahulu,
  // lalu disuntikkan ke DOM dalam SATU operasi append untuk menghindari
  // banyak siklus reflow/repaint berturut-turut.
  const fragment = document.createDocumentFragment();

  projects.forEach((project, index) => {
    fragment.appendChild(buildProjectCard(project, index));
  });

  grid.appendChild(fragment);
}

function buildProjectCard(project, index) {
  const article = document.createElement('article');
  article.className = `bento-item project-card ${getBentoClass(index)} fade-in`;
  article.style.animationDelay = `${index * 0.1}s`;
  article.setAttribute('tabindex', '0');

  const imageWrap = document.createElement('div');
  imageWrap.className = 'card-image-wrap';

  const img = document.createElement('img');
  img.src = project.imageUrl;
  img.alt = `Tangkapan layar atau logo proyek ${project.title}`;
  img.loading = 'lazy';
  imageWrap.appendChild(img);

  // Lencana kategori: Vixies Studio -> oranye, kategori lain -> navy.
  const badge = document.createElement('span');
  badge.className = `badge ${project.category === 'Vixies Studio' ? 'badge-studio' : 'badge-team'}`;
  badge.textContent = project.category;
  imageWrap.appendChild(badge);

  const body = document.createElement('div');
  body.className = 'card-body';

  const title = document.createElement('h3');
  title.textContent = project.title;

  const desc = document.createElement('p');
  desc.textContent = project.description;

  body.append(title, desc);
  article.append(imageWrap, body);

  return article;
}

/* ==========================================================================
   6. RENDER: TIM (Vixies Team & Vixies Studio)
   ========================================================================== */
function renderTeam(team = []) {
  const grid = document.getElementById('team-grid');
  if (!grid) return;

  grid.innerHTML = '';

  if (team.length === 0) {
    renderErrorState('team-grid', false);
    return;
  }

  const fragment = document.createDocumentFragment();

  team.forEach((member, index) => {
    fragment.appendChild(buildTeamCard(member, index));
  });

  grid.appendChild(fragment);
}

function buildTeamCard(member, index) {
  // Pemetaan warna lencana & aksen kartu berdasarkan nilai 'division':
  //   - "Vixies Studio" -> aksen Orange Fox (energi, kreativitas)
  //   - "Vixies Team"   -> aksen Navy Blue  (fondasi, struktur)
  const isStudio = member.division === 'Vixies Studio';
  const divisionModifier = isStudio ? 'studio' : 'team';

  const article = document.createElement('article');
  article.className = `bento-item team-card team-card--${divisionModifier} ${getBentoClass(index)} fade-in`;
  article.style.animationDelay = `${index * 0.08}s`;
  article.setAttribute('tabindex', '0');

  const avatar = document.createElement('div');
  avatar.className = `avatar-placeholder avatar-${divisionModifier}`;
  avatar.setAttribute('aria-hidden', 'true');
  avatar.textContent = member.name.charAt(0).toUpperCase();

  const name = document.createElement('h3');
  name.textContent = member.name;

  const role = document.createElement('p');
  role.className = 'role';
  role.textContent = member.role;

  const badge = document.createElement('span');
  badge.className = `badge badge-${divisionModifier}`;
  badge.textContent = member.division;

  article.append(avatar, name, role, badge);

  return article;
}
