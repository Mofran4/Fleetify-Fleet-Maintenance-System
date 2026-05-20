/**
 * Fleetify – Frontend App
 * Pure Vanilla JS | DOM manipulation via createElement / DocumentFragment
 * NO innerHTML used for rendering data (per constraint 4.2)
 */

// ═══════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════
const state = {
  currentUser: null,
  users: [],
  vehicles: [],
  masterItems: [],
  reports: [],
  completeTargetId: null,
};

// ═══════════════════════════════════════════════════════════
// API HELPER
// ═══════════════════════════════════════════════════════════
async function api(method, path, body = null, isFormData = false) {
  const headers = { 'X-User-ID': String(state.currentUser?.id ?? 1) };
  if (!isFormData && body) headers['Content-Type'] = 'application/json';

  const res = await fetch('/api' + path, {
    method,
    headers,
    body: isFormData ? body : (body ? JSON.stringify(body) : null),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request gagal');
  return data;
}

// ═══════════════════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════════════════
function showToast(msg, type = 'success') {
  const toastEl = document.getElementById('appToast');
  const toastBody = document.getElementById('toastBody');
  toastEl.className = `toast align-items-center border-0 text-bg-${type}`;
  toastBody.textContent = msg;
  bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 3500 }).show();
}

// ═══════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════
const pages = { history: 'pageHistory', create: 'pageCreate', pending: 'pagePending' };
const pageTitles = { history: 'Riwayat Laporan', create: 'Buat Laporan Baru', pending: 'Persetujuan Laporan' };

function navigateTo(name) {
  Object.values(pages).forEach(id => document.getElementById(id).classList.add('d-none'));
  document.getElementById(pages[name]).classList.remove('d-none');
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === name);
  });
  document.getElementById('pageTitle').textContent = pageTitles[name];

  if (name === 'history')  loadReports();
  if (name === 'create')   setupCreateForm();
  if (name === 'pending')  loadPending();
}

// ═══════════════════════════════════════════════════════════
// USER / INIT
// ═══════════════════════════════════════════════════════════
async function init() {
  try {
    // Fetch users using user ID 1 as bootstrap (SA exists by default)
    state.currentUser = { id: 1, username: 'loading', role: 'SA' };
    const [users, vehicles, items] = await Promise.all([
      api('GET', '/users'),
      api('GET', '/vehicles'),
      api('GET', '/master-items'),
    ]);
    state.users = users;
    state.vehicles = vehicles;
    state.masterItems = items;

    populateUserSelect();
    setCurrentUser(users[0]);
    loadReports();
  } catch (e) {
    showToast('Gagal terhubung ke server: ' + e.message, 'danger');
  }
}

function populateUserSelect() {
  const sel = document.getElementById('userSelect');
  sel.textContent = ''; // safe clear
  state.users.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.id;
    opt.textContent = `${u.username} (${u.role})`;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', () => {
    const u = state.users.find(x => x.id == sel.value);
    if (u) setCurrentUser(u);
  });
}

function setCurrentUser(user) {
  state.currentUser = user;
  document.getElementById('userName').textContent = user.username;
  document.getElementById('userRole').textContent = user.role;
  document.getElementById('userAvatar').textContent = user.username[0].toUpperCase();
  document.getElementById('userSelect').value = user.id;

  // Show/hide role-specific nav items
  document.querySelectorAll('.sa-only').forEach(el => {
    el.style.display = user.role === 'SA' ? 'flex' : 'none';
  });
  document.querySelectorAll('.approval-only').forEach(el => {
    el.style.display = user.role === 'APPROVAL' ? 'flex' : 'none';
  });

  navigateTo('history');
}

// ═══════════════════════════════════════════════════════════
// HISTORY PAGE
// ═══════════════════════════════════════════════════════════
async function loadReports() {
  try {
    const reports = await api('GET', '/reports');
    state.reports = reports;
    renderReportTable(reports);
  } catch (e) {
    showToast(e.message, 'danger');
  }
}

function renderReportTable(reports) {
  const tbody = document.getElementById('reportTableBody');
  const empty = document.getElementById('reportEmpty');
  tbody.textContent = '';

  if (!reports.length) {
    empty.classList.remove('d-none');
    return;
  }
  empty.classList.add('d-none');

  const frag = document.createDocumentFragment();
  reports.forEach((r, i) => {
    const tr = document.createElement('tr');

    const tdIdx    = createTd(String(i + 1));
    const tdVeh    = createTd(`${r.vehicle?.license_plate ?? '—'}\n${r.vehicle?.model ?? ''}`);
    tdVeh.querySelector('span').style.cssText = 'display:block;font-size:.75rem;color:#6b7280';
    const tdSA     = createTd(r.creator?.username ?? '—');
    const tdOdo    = createTd(r.odometer.toLocaleString('id') + ' km');
    const tdStatus = document.createElement('td');
    tdStatus.appendChild(buildStatusBadge(r.status));
    const tdDate   = createTd(formatDate(r.created_at));
    const tdAction = document.createElement('td');

    // Action button
    const btnDetail = document.createElement('button');
    btnDetail.className = 'btn btn-sm btn-outline-secondary';
    btnDetail.appendChild(makeIcon('bi-eye'));
    btnDetail.addEventListener('click', () => openDetailModal(r.id));
    tdAction.appendChild(btnDetail);

    // Complete button for SA on APPROVED reports
    if (state.currentUser.role === 'SA' && r.status === 'APPROVED') {
      const btnComplete = document.createElement('button');
      btnComplete.className = 'btn btn-sm btn-success ms-1';
      btnComplete.appendChild(makeIcon('bi-check2-circle'));
      btnComplete.addEventListener('click', () => openCompleteModal(r.id));
      tdAction.appendChild(btnComplete);
    }

    [tdIdx, tdVeh, tdSA, tdOdo, tdStatus, tdDate, tdAction].forEach(td => tr.appendChild(td));
    frag.appendChild(tr);
  });
  tbody.appendChild(frag);
}

function createTd(text) {
  const td = document.createElement('td');
  const span = document.createElement('span');
  span.textContent = text;
  td.appendChild(span);
  return td;
}

function makeIcon(cls) {
  const i = document.createElement('i');
  i.className = `bi ${cls}`;
  return i;
}

function buildStatusBadge(status) {
  const span = document.createElement('span');
  span.className = 'badge-status';
  const iconMap = { PENDING_APPROVAL: 'bi-hourglass', APPROVED: 'bi-check-circle', COMPLETED: 'bi-flag-fill' };
  const classMap = { PENDING_APPROVAL: 'status-pending', APPROVED: 'status-approved', COMPLETED: 'status-completed' };
  span.classList.add(classMap[status] ?? 'status-pending');
  const ic = document.createElement('i');
  ic.className = `bi ${iconMap[status] ?? 'bi-circle'}`;
  span.appendChild(ic);
  span.appendChild(document.createTextNode(' ' + status.replace(/_/g, ' ')));
  return span;
}

// Search filter
document.getElementById('searchInput').addEventListener('input', function () {
  const q = this.value.toLowerCase();
  const filtered = state.reports.filter(r =>
    (r.vehicle?.license_plate ?? '').toLowerCase().includes(q) ||
    (r.creator?.username ?? '').toLowerCase().includes(q)
  );
  renderReportTable(filtered);
});

// ═══════════════════════════════════════════════════════════
// DETAIL MODAL
// ═══════════════════════════════════════════════════════════
async function openDetailModal(id) {
  const body   = document.getElementById('reportDetailBody');
  const footer = document.getElementById('reportDetailFooter');
  body.textContent = 'Memuat…';
  footer.textContent = '';

  const modal = new bootstrap.Modal(document.getElementById('reportDetailModal'));
  modal.show();

  try {
    const r = await api('GET', '/reports/' + id);
    const frag = document.createDocumentFragment();

    const addRow = (label, value) => {
      const row = document.createElement('div');
      row.className = 'detail-row';
      const lb = document.createElement('span');
      lb.className = 'detail-label';
      lb.textContent = label;
      const val = document.createElement('span');
      val.textContent = value;
      row.appendChild(lb);
      row.appendChild(val);
      frag.appendChild(row);
    };

    addRow('Kendaraan', `${r.vehicle?.license_plate} – ${r.vehicle?.model}`);
    addRow('Service Advisor', r.creator?.username);
    addRow('Odometer', r.odometer.toLocaleString('id') + ' km');
    addRow('Keluhan', r.complaint);
    addRow('Status', r.status.replace(/_/g,' '));
    addRow('Tanggal', formatDate(r.created_at));

    if (r.initial_photo) {
      const imgRow = document.createElement('div');
      imgRow.className = 'mb-2';
      const lb = document.createElement('div');
      lb.className = 'detail-label';
      lb.textContent = 'Foto Awal:';
      const img = document.createElement('img');
      img.src = r.initial_photo;
      img.style.cssText = 'max-height:150px;border-radius:8px;margin-top:4px;display:block';
      imgRow.appendChild(lb); imgRow.appendChild(img);
      frag.appendChild(imgRow);
    }
    if (r.proof_photo) {
      const imgRow = document.createElement('div');
      imgRow.className = 'mb-2';
      const lb = document.createElement('div');
      lb.className = 'detail-label';
      lb.textContent = 'Foto Bukti:';
      const img = document.createElement('img');
      img.src = r.proof_photo;
      img.style.cssText = 'max-height:150px;border-radius:8px;margin-top:4px;display:block';
      imgRow.appendChild(lb); imgRow.appendChild(img);
      frag.appendChild(imgRow);
    }

    // Items table
    if (r.items && r.items.length) {
      const title = document.createElement('div');
      title.className = 'fw-semibold mt-3 mb-1';
      title.textContent = 'Item Part & Jasa:';
      frag.appendChild(title);

      const tbl = document.createElement('table');
      tbl.className = 'detail-items-table';
      const thead = document.createElement('thead');
      const hrow = document.createElement('tr');
      ['Item', 'Tipe', 'Qty', 'Harga', 'Subtotal'].forEach(h => {
        const th = document.createElement('th');
        th.textContent = h;
        hrow.appendChild(th);
      });
      thead.appendChild(hrow);
      tbl.appendChild(thead);

      const tbody = document.createElement('tbody');
      let grand = 0;
      r.items.forEach(it => {
        const sub = it.quantity * it.price_snapshot;
        grand += sub;
        const row = document.createElement('tr');
        [it.item?.item_name ?? '—', it.item?.type ?? '—',
         it.quantity, formatRp(it.price_snapshot), formatRp(sub)].forEach(v => {
          const td = document.createElement('td');
          td.textContent = v;
          row.appendChild(td);
        });
        tbody.appendChild(row);
      });

      // Total row
      const totalRow = document.createElement('tr');
      totalRow.style.fontWeight = '700';
      const emptyTd = document.createElement('td');
      emptyTd.colSpan = 4;
      emptyTd.textContent = 'Total Estimasi';
      const totalTd = document.createElement('td');
      totalTd.textContent = formatRp(grand);
      totalRow.appendChild(emptyTd); totalRow.appendChild(totalTd);
      tbody.appendChild(totalRow);

      tbl.appendChild(tbody);
      frag.appendChild(tbl);
    }

    body.textContent = '';
    body.appendChild(frag);

    // Approve button for APPROVAL role
    if (state.currentUser.role === 'APPROVAL' && r.status === 'PENDING_APPROVAL') {
      const btn = document.createElement('button');
      btn.className = 'btn btn-success';
      btn.appendChild(makeIcon('bi-check-lg'));
      btn.appendChild(document.createTextNode(' Setujui'));
      btn.addEventListener('click', async () => {
        try {
          await api('PATCH', '/reports/' + r.id + '/approve');
          showToast('Laporan disetujui!');
          modal.hide();
          loadReports();
        } catch(e) { showToast(e.message, 'danger'); }
      });
      footer.appendChild(btn);
    }

  } catch (e) {
    body.textContent = 'Gagal memuat: ' + e.message;
  }
}

// ═══════════════════════════════════════════════════════════
// CREATE REPORT PAGE
// ═══════════════════════════════════════════════════════════
function setupCreateForm() {
  const sel = document.getElementById('vehicleSelect');
  sel.textContent = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = '— Pilih Kendaraan —';
  sel.appendChild(placeholder);
  state.vehicles.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.id;
    opt.textContent = `${v.license_plate} – ${v.model}`;
    sel.appendChild(opt);
  });

  // Clear item rows
  document.getElementById('itemRows').textContent = '';
  addItemRow();
  updateTotal();
}

function addItemRow() {
  const container = document.getElementById('itemRows');
  const row = document.createElement('div');
  row.className = 'item-row';

  const sel = document.createElement('select');
  sel.className = 'form-select form-select-sm';
  const ph = document.createElement('option');
  ph.value = ''; ph.textContent = '— Pilih Item —';
  sel.appendChild(ph);
  state.masterItems.forEach(it => {
    const opt = document.createElement('option');
    opt.value = it.id;
    opt.dataset.price = it.price;
    opt.textContent = `${it.item_name} (${it.type})`;
    sel.appendChild(opt);
  });

  const qtyInput = document.createElement('input');
  qtyInput.type = 'number';
  qtyInput.className = 'form-control form-control-sm';
  qtyInput.value = 1;
  qtyInput.min = 1;

  const subtotalSpan = document.createElement('span');
  subtotalSpan.className = 'item-subtotal';
  subtotalSpan.textContent = 'Rp 0';

  const update = () => {
    const opt = sel.options[sel.selectedIndex];
    const price = parseFloat(opt?.dataset?.price ?? 0);
    const qty   = parseInt(qtyInput.value) || 1;
    subtotalSpan.textContent = formatRp(price * qty);
    updateTotal();
  };

  sel.addEventListener('change', update);
  qtyInput.addEventListener('input', update);

  const btnRemove = document.createElement('button');
  btnRemove.className = 'btn btn-outline-danger btn-sm btn-remove';
  btnRemove.appendChild(makeIcon('bi-trash'));
  btnRemove.addEventListener('click', () => {
    row.remove();
    updateTotal();
  });

  [sel, qtyInput, subtotalSpan, btnRemove].forEach(el => row.appendChild(el));
  container.appendChild(row);
}

function updateTotal() {
  let total = 0;
  document.querySelectorAll('.item-row').forEach(row => {
    const sel = row.querySelector('select');
    const qty = parseInt(row.querySelector('input[type=number]').value) || 1;
    const opt = sel.options[sel.selectedIndex];
    const price = parseFloat(opt?.dataset?.price ?? 0);
    total += price * qty;
  });
  document.getElementById('totalCost').textContent = formatRp(total);
}

// Photo preview
document.getElementById('initialPhotoInput').addEventListener('change', function () {
  const preview = document.getElementById('photoPreview');
  preview.textContent = '';
  if (this.files[0]) {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(this.files[0]);
    preview.appendChild(img);
  }
});

document.getElementById('btnAddItem').addEventListener('click', addItemRow);

document.getElementById('btnSubmitReport').addEventListener('click', async () => {
  const vehicleID = document.getElementById('vehicleSelect').value;
  const odometer  = document.getElementById('odometerInput').value;
  const complaint = document.getElementById('complaintInput').value.trim();

  if (!vehicleID || !odometer || !complaint) {
    showToast('Lengkapi semua field yang wajib diisi', 'warning');
    return;
  }

  const fd = new FormData();
  fd.append('vehicle_id', vehicleID);
  fd.append('odometer', odometer);
  fd.append('complaint', complaint);

  const photoFile = document.getElementById('initialPhotoInput').files[0];
  if (photoFile) fd.append('initial_photo', photoFile);

  document.querySelectorAll('.item-row').forEach(row => {
    const sel = row.querySelector('select');
    const qty = row.querySelector('input[type=number]').value;
    if (sel.value) {
      fd.append('item_ids[]', sel.value);
      fd.append('quantities[]', qty);
    }
  });

  const btn = document.getElementById('btnSubmitReport');
  btn.disabled = true;
  btn.textContent = 'Mengirim…';

  try {
    await api('POST', '/reports', fd, true);
    showToast('Laporan berhasil dibuat!');
    // Reset form
    document.getElementById('vehicleSelect').value    = '';
    document.getElementById('odometerInput').value    = '';
    document.getElementById('complaintInput').value   = '';
    document.getElementById('initialPhotoInput').value = '';
    document.getElementById('photoPreview').textContent = '';
    document.getElementById('itemRows').textContent = '';
    addItemRow();
    updateTotal();
    navigateTo('history');
  } catch (e) {
    showToast(e.message, 'danger');
  } finally {
    btn.disabled = false;
    btn.textContent = ''; 
    btn.appendChild(makeIcon('bi-send-check'));
    btn.appendChild(document.createTextNode(' Kirim Laporan'));
  }
});

// ═══════════════════════════════════════════════════════════
// PENDING APPROVAL PAGE
// ═══════════════════════════════════════════════════════════
async function loadPending() {
  try {
    const reports = await api('GET', '/reports');
    const pending = reports.filter(r => r.status === 'PENDING_APPROVAL');
    renderPendingCards(pending);
  } catch (e) {
    showToast(e.message, 'danger');
  }
}

function renderPendingCards(reports) {
  const container = document.getElementById('pendingList');
  const empty     = document.getElementById('pendingEmpty');
  container.textContent = '';

  if (!reports.length) {
    empty.classList.remove('d-none');
    return;
  }
  empty.classList.add('d-none');

  const frag = document.createDocumentFragment();
  reports.forEach(r => {
    const col  = document.createElement('div');
    col.className = 'col-md-6 col-xl-4';

    const card = document.createElement('div');
    card.className = 'pending-card';

    const title = document.createElement('div');
    title.className = 'pending-card-title mb-1';
    title.textContent = r.vehicle?.license_plate ?? '—';

    const model = document.createElement('div');
    model.className = 'pending-card-meta mb-2';
    model.textContent = r.vehicle?.model ?? '';

    const complaint = document.createElement('div');
    complaint.className = 'small text-muted mb-2';
    complaint.textContent = `"${r.complaint}"`;

    const meta = document.createElement('div');
    meta.className = 'd-flex justify-content-between align-items-center';
    const saSpan = document.createElement('span');
    saSpan.className = 'small';
    saSpan.textContent = `SA: ${r.creator?.username ?? '—'}`;
    const dateSpan = document.createElement('span');
    dateSpan.className = 'small text-muted';
    dateSpan.textContent = formatDate(r.created_at);
    meta.appendChild(saSpan); meta.appendChild(dateSpan);

    const actions = document.createElement('div');
    actions.className = 'd-flex gap-2 mt-3';

    const btnDetail = document.createElement('button');
    btnDetail.className = 'btn btn-sm btn-outline-secondary flex-fill';
    btnDetail.appendChild(makeIcon('bi-eye'));
    btnDetail.appendChild(document.createTextNode(' Detail'));
    btnDetail.addEventListener('click', () => openDetailModal(r.id));

    const btnApprove = document.createElement('button');
    btnApprove.className = 'btn btn-sm btn-success flex-fill';
    btnApprove.appendChild(makeIcon('bi-check-lg'));
    btnApprove.appendChild(document.createTextNode(' Setujui'));
    btnApprove.addEventListener('click', async () => {
      try {
        await api('PATCH', '/reports/' + r.id + '/approve');
        showToast('Laporan disetujui!');
        loadPending();
      } catch(e) { showToast(e.message, 'danger'); }
    });

    actions.appendChild(btnDetail); actions.appendChild(btnApprove);
    [title, model, complaint, meta, actions].forEach(el => card.appendChild(el));
    col.appendChild(card);
    frag.appendChild(col);
  });
  container.appendChild(frag);
}

// ═══════════════════════════════════════════════════════════
// COMPLETE MODAL
// ═══════════════════════════════════════════════════════════
function openCompleteModal(id) {
  state.completeTargetId = id;
  document.getElementById('completeReportId').textContent = '#' + id;
  document.getElementById('proofPhotoInput').value = '';
  new bootstrap.Modal(document.getElementById('completeModal')).show();
}

document.getElementById('btnConfirmComplete').addEventListener('click', async () => {
  const fd = new FormData();
  const file = document.getElementById('proofPhotoInput').files[0];
  if (file) fd.append('proof_photo', file);

  try {
    await api('PATCH', '/reports/' + state.completeTargetId + '/complete', fd, true);
    showToast('Laporan diselesaikan!');
    bootstrap.Modal.getInstance(document.getElementById('completeModal')).hide();
    loadReports();
  } catch(e) { showToast(e.message, 'danger'); }
});

// ═══════════════════════════════════════════════════════════
// EXPORT CSV (Native JS – Bonus B-01)
// ═══════════════════════════════════════════════════════════
document.getElementById('btnExportCsv').addEventListener('click', () => {
  if (!state.reports.length) { showToast('Tidak ada data untuk diekspor', 'warning'); return; }

  const headers = ['ID','Kendaraan','Nopol','Service Advisor','Odometer','Keluhan','Status','Tanggal'];
  const rows = state.reports.map(r => [
    r.id,
    (r.vehicle?.model ?? '').replace(/,/g,''),
    r.vehicle?.license_plate ?? '',
    r.creator?.username ?? '',
    r.odometer,
    (r.complaint ?? '').replace(/,/g,'').replace(/\n/g,' '),
    r.status,
    formatDate(r.created_at),
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(v => `"${v}"`).join(','))
    .join('\r\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `fleetify_laporan_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('CSV berhasil diunduh!');
});

// ═══════════════════════════════════════════════════════════
// SIDEBAR TOGGLE (mobile)
// ═══════════════════════════════════════════════════════════
document.getElementById('sidebarToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// ═══════════════════════════════════════════════════════════
// NAV LINKS
// ═══════════════════════════════════════════════════════════
document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', e => {
    e.preventDefault();
    navigateTo(el.dataset.page);
    document.getElementById('sidebar').classList.remove('open');
  });
});

// ═══════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════
function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('id-ID', {
    day:'2-digit', month:'short', year:'numeric',
    hour:'2-digit', minute:'2-digit',
  });
}

function formatRp(n) {
  return 'Rp ' + Number(n).toLocaleString('id-ID');
}

// ═══════════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════════
init();
