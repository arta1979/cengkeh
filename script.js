// ================================================================
// 1.  KONFIGURASI SUPABASE
// ================================================================
const SUPABASE_URL = 'https://hqbsgzzuytxqqdnwwfrc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxYnNnenp1eXR4cXFkbnd3ZnJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMDYzNzcsImV4cCI6MjA5ODU4MjM3N30.iyCNEEoC4LRLe6dunw2akYPRNHHjCQliPtrzYuyLxuA';

let supabase = null;
let supabaseReady = false;
try {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  supabaseReady = true;
  console.log('✅ Supabase client initialized');
} catch (e) {
  console.error('❌ Supabase init error:', e);
  supabaseReady = false;
}

// ================================================================
// 2.  STATE
// ================================================================
let currentTab = 'petik';
let data = [];
let useSupabase = supabaseReady;

const HARGA = {
  petik: 7000,
  kepik: 1500
};

// ================================================================
// 3.  FUNGSI UTAMA
// ================================================================

// --- LOAD DATA ---
async function loadData() {
  console.log('🔄 Memuat data...');
  if (useSupabase) {
    try {
      const { data: rows, error } = await supabase
        .from('upah_cengkeh')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Supabase select error:', error);
        throw error;
      }

      if (rows && rows.length > 0) {
        data = rows;
        renderTabel();
        updateInfoBar();
        showIndicatorTemp(`✅ ${data.length} data dari Supabase`, 'success', 1500);
        console.log('✅ Data berhasil dimuat dari Supabase:', data.length);
        return;
      } else {
        data = [];
        renderTabel();
        updateInfoBar();
        showIndicatorTemp('📭 Tabel kosong, silakan tambah data', 'warning', 1500);
        return;
      }
    } catch (err) {
      console.warn('⚠️ Supabase gagal, beralih ke localStorage:', err.message);
      useSupabase = false;
      showStatusBar('⚠️ Koneksi Supabase gagal: ' + err.message, 'warning');
    }
  }

  // FALLBACK localStorage
  try {
    const saved = localStorage.getItem('upahCengkeh');
    if (saved) {
      data = JSON.parse(saved);
      renderTabel();
      updateInfoBar();
      showIndicatorTemp(`✅ ${data.length} data dari localStorage`, 'success', 1500);
    } else {
      data = [];
      renderTabel();
      updateInfoBar();
    }
  } catch (e) {
    console.error('❌ Load localStorage error:', e);
    data = [];
    renderTabel();
    updateInfoBar();
    showStatusBar('❌ Gagal memuat data lokal', 'error');
  }
}

// --- TAMBAH DATA ---
async function tambahDanSave() {
  const nama = document.getElementById('namaPekerja').value.trim();
  const berat = parseFloat(document.getElementById('berat').value);

  if (!nama) {
    showStatusBar('⚠️ Isi nama pekerja!', 'warning');
    return;
  }
  if (isNaN(berat) || berat <= 0) {
    showStatusBar('⚠️ Isi berat yang valid!', 'warning');
    return;
  }

  const btn = document.getElementById('btnTambahSave');
  btn.classList.add('loading');
  btn.textContent = '⏳ ...';

  const harga = HARGA[currentTab];
  const upah = berat * harga;
  const tipe = currentTab === 'petik' ? 'Petik' : 'Kepik';
  const newItem = { nama, berat, upah, tipe, harga };

  console.log('📝 Menyimpan data:', newItem, 'dengan tab:', currentTab);

  try {
    if (useSupabase) {
      const { data: inserted, error } = await supabase
        .from('upah_cengkeh')
        .insert([newItem])
        .select();

      if (error) {
        console.error('❌ Insert error:', error);
        throw error;
      }

      console.log('✅ Insert sukses:', inserted);
      await loadData();
      showIndicatorTemp(`✅ ${nama} (${tipe}) tersimpan di cloud`, 'success', 1500);
    } else {
      data.push(newItem);
      localStorage.setItem('upahCengkeh', JSON.stringify(data));
      renderTabel();
      updateInfoBar();
      showIndicatorTemp(`✅ ${nama} (${tipe}) tersimpan di lokal`, 'success', 1500);
    }
  } catch (err) {
    console.error('❌ Simpan error:', err);
    showStatusBar('❌ Gagal menyimpan! ' + err.message, 'error');
  } finally {
    btn.classList.remove('loading');
    btn.textContent = '➕ Tambah + Save';
    document.getElementById('namaPekerja').value = '';
    document.getElementById('berat').value = '';
    document.getElementById('namaPekerja').focus();
  }
}

// --- HAPUS SEMUA ---
async function hapusSemua() {
  if (data.length === 0) return;
  if (!confirm('⚠️ Yakin hapus SEMUA data?')) return;

  try {
    if (useSupabase) {
      const { error } = await supabase
        .from('upah_cengkeh')
        .delete()
        .neq('id', '');
      if (error) throw error;
      await loadData();
    } else {
      data = [];
      localStorage.setItem('upahCengkeh', JSON.stringify(data));
      renderTabel();
      updateInfoBar();
    }
    showIndicatorTemp('🗑 Semua data dihapus', 'warning', 1500);
  } catch (err) {
    console.error('❌ Hapus error:', err);
    showStatusBar('❌ Gagal menghapus data!', 'error');
  }
}

// --- RENDER TABEL ---
function renderTabel() {
  var tbody = document.getElementById('tabelBody');
  var tfoot = document.getElementById('tabelFooter');

  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="kosong">Belum ada data</td></tr>';
    tfoot.innerHTML = '';
    return;
  }

  var totalUpah = 0,
    totalBerat = 0;
  var html = '';
  for (var i = 0; i < data.length; i++) {
    var item = data[i];
    totalUpah += item.upah;
    totalBerat += item.berat;
    var tipeLabel = item.tipe === 'Petik' ? '🌱' : '🐛';
    var warnaTipe = item.tipe === 'Petik' ? '#2d5a27' : '#1b6b8a';
    html += '<tr>' +
      '<td style="text-align:left;padding-left:16px;">' + (i + 1) + '. ' + item.nama + '</td>' +
      '<td>' + item.berat.toFixed(2) + '</td>' +
      '<td>Rp ' + item.upah.toLocaleString('id-ID') + '</td>' +
      '<td style="font-size:11px;font-weight:600;color:' + warnaTipe + ';">' + tipeLabel + ' ' + item.tipe + '</td>' +
      '</tr>';
  }
  tbody.innerHTML = html;

  var petikData = data.filter(function(d) { return d.tipe === 'Petik'; });
  var kepikData = data.filter(function(d) { return d.tipe === 'Kepik'; });
  var totalPetik = 0,
    totalKepik = 0;
  var totalUpahPetik = 0,
    totalUpahKepik = 0;
  for (var j = 0; j < petikData.length; j++) {
    totalPetik += petikData[j].berat;
    totalUpahPetik += petikData[j].upah;
  }
  for (var k = 0; k < kepikData.length; k++) {
    totalKepik += kepikData[k].berat;
    totalUpahKepik += kepikData[k].upah;
  }

  tfoot.innerHTML =
    '<tr class="total-row">' +
    '<td style="text-align:right;padding-right:16px;font-weight:700;">TOTAL</td>' +
    '<td style="font-weight:800;">' + totalBerat.toFixed(2) + ' kg</td>' +
    '<td style="font-weight:800;">Rp ' + totalUpah.toLocaleString('id-ID') + '</td>' +
    '<td style="font-size:10px;font-weight:600;">🌱 ' + totalPetik.toFixed(2) + ' kg | 🐛 ' + totalKepik.toFixed(2) +
    ' kg</td>' +
    '</tr>' +
    '<tr class="total-row" style="border-top:none;">' +
    '<td colspan="2" style="text-align:right;padding-right:16px;font-weight:700;border-top:none;font-size:12px;">Detail</td>' +
    '<td style="border-top:none;font-size:12px;font-weight:600;">Petik: Rp ' + totalUpahPetik.toLocaleString('id-ID') +
    '</td>' +
    '<td style="border-top:none;font-size:12px;font-weight:600;">Kepik: Rp ' + totalUpahKepik.toLocaleString('id-ID') +
    '</td>' +
    '</tr>';
}

function updateInfoBar() {
  document.getElementById('jumlahData').textContent = data.length;
  document.getElementById('totalItem').textContent = data.length + ' item';
}

// ================================================================
// 4.  TAB - FUNGSI GLOBAL
// ================================================================
function switchTab(tab) {
  console.log('🔄 switchTab dipanggil dengan tab:', tab);
  currentTab = tab;
  var tabPetik = document.getElementById('tabPetik');
  var tabKepik = document.getElementById('tabKepik');
  var info = document.getElementById('infoUpah');

  // Reset class
  tabPetik.className = 'tab-btn';
  tabKepik.className = 'tab-btn';

  if (tab === 'petik') {
    tabPetik.classList.add('active-petik');
    info.className = 'info-upah petik';
    info.textContent = '💰 Upah Petik: Rp 7.000 / kg';
    console.log('🌱 Tab aktif: PETIK (Rp 7.000/kg)');
  } else {
    tabKepik.classList.add('active-kepik');
    info.className = 'info-upah kepik';
    info.textContent = '💰 Upah Kepik: Rp 1.500 / kg';
    console.log('🐛 Tab aktif: KEPIK (Rp 1.500/kg)');
  }
  document.getElementById('namaPekerja').focus();
  showIndicatorTemp('📋 Tab: ' + tab.toUpperCase(), 'success', 1000);
}

// ================================================================
// 5.  DOWNLOAD
// ================================================================
function downloadTXT() {
  if (data.length === 0) {
    showStatusBar('⚠️ Belum ada data!', 'warning');
    return;
  }

  var txt = '===== UPAH PETIK & KEPIK CENGKEH =====\n\n';
  var grandTotalUpah = 0,
    grandTotalBerat = 0;
  var totalPetik = 0,
    totalKepik = 0;
  var totalUpahPetik = 0,
    totalUpahKepik = 0;

  txt += '📋 DATA PER PEKERJA:\n\n';
  for (var i = 0; i < data.length; i++) {
    var item = data[i];
    var hargaLabel = item.tipe === 'Petik' ? 'Rp 7.000' : 'Rp 1.500';
    txt += (i + 1) + '. ' + item.nama + ' (' + item.tipe + ') : ' + item.berat.toFixed(2) +
      ' kg × ' + hargaLabel + ' = Rp ' + item.upah.toLocaleString('id-ID') + '\n';
    grandTotalUpah += item.upah;
    grandTotalBerat += item.berat;
    if (item.tipe === 'Petik') {
      totalPetik += item.berat;
      totalUpahPetik += item.upah;
    } else {
      totalKepik += item.berat;
      totalUpahKepik += item.upah;
    }
  }

  txt += '\n----------------------------------------\n';
  txt += '📊 REKAPITULASI:\n';
  txt += '   Total Berat : ' + grandTotalBerat.toFixed(2) + ' kg\n';
  txt += '   Total Upah  : Rp ' + grandTotalUpah.toLocaleString('id-ID') + '\n';
  txt += '\n   🌱 Petik : ' + totalPetik.toFixed(2) + ' kg  |  Rp ' + totalUpahPetik.toLocaleString('id-ID') + '\n';
  txt += '   🐛 Kepik : ' + totalKepik.toFixed(2) + ' kg  |  Rp ' + totalUpahKepik.toLocaleString('id-ID') + '\n';
  txt += '========================================\n';
  txt += '📅 ' + new Date().toLocaleString('id-ID');

  var blob = new Blob([txt], { type: 'text/plain' });
  var a = document.createElement('a');
  a.download = 'upah_cengkeh_' + new Date().toISOString().slice(0, 10) + '.txt';
  a.href = URL.createObjectURL(blob);
  a.click();
  URL.revokeObjectURL(a.href);
  showIndicatorTemp('✅ TXT di-download!', 'success', 1500);
}

function downloadPNG() {
  if (data.length === 0) {
    showStatusBar('⚠️ Belum ada data!', 'warning');
    return;
  }
  var tableWrap = document.getElementById('tableWrap');
  html2canvas(tableWrap, {
    scale: 2,
    backgroundColor: '#ffffff',
    allowTaint: false,
    useCORS: true,
    logging: false
  }).then(function(canvas) {
    var link = document.createElement('a');
    link.download = 'upah_cengkeh_' + new Date().toISOString().slice(0, 10) + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    showIndicatorTemp('✅ PNG di-download!', 'success', 1500);
  }).catch(function(err) {
    console.error('PNG error:', err);
    showStatusBar('⚠️ Gagal generate PNG!', 'error');
  });
}

// ================================================================
// 6.  INDIKATOR & STATUS BAR
// ================================================================
var indicatorTimeout = null;

function showIndicator(msg, type) {
  var el = document.getElementById('indicator');
  el.textContent = msg;
  el.className = 'indicator';
  if (type) el.classList.add(type);
  el.classList.add('show');
  if (indicatorTimeout) clearTimeout(indicatorTimeout);
}

function hideIndicator() {
  var el = document.getElementById('indicator');
  el.classList.remove('show');
  if (indicatorTimeout) clearTimeout(indicatorTimeout);
}

function showIndicatorTemp(msg, type, duration) {
  duration = duration || 2000;
  showIndicator(msg, type);
  if (indicatorTimeout) clearTimeout(indicatorTimeout);
  indicatorTimeout = setTimeout(hideIndicator, duration);
}

function showStatusBar(msg, type) {
  var bar = document.getElementById('statusBar');
  bar.textContent = msg;
  bar.className = 'status-bar show';
  if (type) bar.classList.add(type);
  if (indicatorTimeout) clearTimeout(indicatorTimeout);
  indicatorTimeout = setTimeout(function() {
    bar.classList.remove('show');
  }, 5000);
}

// ================================================================
// 7.  EVENT LISTENER (DOMContentLoaded)
// ================================================================
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 DOM siap, memasang event listener...');

  // Tombol tambah
  document.getElementById('btnTambahSave').addEventListener('click', tambahDanSave);

  // Tombol hapus
  document.getElementById('btnHapus').addEventListener('click', hapusSemua);

  // Download
  document.getElementById('btnDownloadTxt').addEventListener('click', downloadTXT);
  document.getElementById('btnDownloadPng').addEventListener('click', downloadPNG);

  // Enter key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      var aktif = document.activeElement;
      if (aktif && (aktif.id === 'namaPekerja' || aktif.id === 'berat')) {
        e.preventDefault();
        tambahDanSave();
      }
    }
  });

  // Load data
  loadData();

  console.log('✅ Aplikasi siap!');
  console.log('📋 Harga:', HARGA);
  console.log('📌 Tab awal:', currentTab);
  console.log('🔌 Supabase status:', useSupabase ? 'ONLINE' : 'OFFLINE (fallback localStorage)');
});

// Pastikan fungsi switchTab tersedia secara global
window.switchTab = switchTab;