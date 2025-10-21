// === SETUP API ===
const API_BASE = '<<PASTE_WEB_APP_URL_GAS_DI_SINI>>'; // contoh: https://script.google.com/macros/s/AKfycbx.../exec

const $ = s => document.querySelector(s);
const byId = id => document.getElementById(id);

function fmtJPY(n){ return new Intl.NumberFormat('ja-JP',{style:'currency',currency:'JPY'}).format(Number(n||0)); }

async function apiGet(action, params={}){
  const q = new URLSearchParams({ action, ...params });
  const res = await fetch(`${API_BASE}?${q}`);
  return res.json();
}
async function apiPost(action, data){
  const res = await fetch(API_BASE, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({action, data}) });
  return res.json();
}

// === Tabs ===
document.querySelectorAll('.tab').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('section').forEach(s=>s.classList.add('hidden'));
    byId(btn.dataset.tab).classList.remove('hidden');
    document.querySelectorAll('.tab').forEach(b=>b.classList.remove('bg-white','shadow'));
    btn.classList.add('bg-white','shadow');
  });
});

// === Init ===
(async function init(){
  byId('bulan').value = new Date().toISOString().slice(0,7);
  await loadDashboard();
  await loadStudents();
  await loadClasses();
  wirePayments();
})();

$('#btnRefresh').addEventListener('click', loadDashboard);

async function loadDashboard(){
  const month = byId('bulan').value;
  const unpaid = await apiGet('unpaidStudents', { month });
  const invoices = await apiGet('listInvoices', { month });
  const muk = await apiGet('mukafaah', { month });
  const kas = await apiGet('cashbook', { month });

  byId('stats').innerHTML = `
    <div class="p-4 rounded-2xl bg-white shadow">
      <div class="text-sm text-slate-500">Invoice (Unpaid/Partial)</div>
      <div class="text-2xl font-semibold">${unpaid.length}</div>
    </div>
    <div class="p-4 rounded-2xl bg-white shadow">
      <div class="text-sm text-slate-500">Total Tagihan</div>
      <div class="text-2xl font-semibold">${fmtJPY(invoices.reduce((s,i)=>s+Number(i.total_due_jpy||0),0))}</div>
    </div>
    <div class="p-4 rounded-2xl bg-white shadow">
      <div class="text-sm text-slate-500">Kas (Net)</div>
      <div class="text-2xl font-semibold">${fmtJPY(kas.net_jpy)}</div>
    </div>
  `;

  byId('unpaid').innerHTML = `
    <table class="min-w-full border">
      <tr class="bg-slate-100">
        <th class="p-2 text-left">Siswa</th>
        <th class="p-2">Bulan</th>
        <th class="p-2">Due</th>
        <th class="p-2">Paid</th>
        <th class="p-2">Status</th>
        <th class="p-2">Aksi</th>
      </tr>
      ${unpaid.map(u=>`
        <tr class="border-t">
          <td class="p-2">${u.student_id}</td>
          <td class="p-2">${u.month}</td>
          <td class="p-2 text-right">${fmtJPY(u.total_due_jpy)}</td>
          <td class="p-2 text-right">${fmtJPY(u.total_paid_jpy)}</td>
          <td class="p-2">${u.status}</td>
          <td class="p-2">
            <button class="px-2 py-1 rounded bg-slate-900 text-white" data-invid="${u.id}" onclick="genInvoice('${u.id}')">Cetak Invoice</button>
          </td>
        </tr>`).join('')}
    </table>
  `;

  // tabel invoice penuh
  const invFull = await apiGet('listInvoices', { month });
  byId('tblInvoice').innerHTML = `
    <table class="min-w-full border">
      <tr class="bg-slate-100">
        <th class="p-2 text-left">ID</th><th class="p-2">Siswa</th><th class="p-2">Bulan</th>
        <th class="p-2">Due</th><th class="p-2">Paid</th><th class="p-2">Status</th><th class="p-2">PDF</th>
      </tr>
      ${invFull.map(i=>`
        <tr class="border-t">
          <td class="p-2">${i.id}</td>
          <td class="p-2">${i.student_id}</td>
          <td class="p-2">${i.month}</td>
          <td class="p-2 text-right">${fmtJPY(i.total_due_jpy)}</td>
          <td class="p-2 text-right">${fmtJPY(i.total_paid_jpy)}</td>
          <td class="p-2">${i.status}</td>
          <td class="p-2"><button class="px-2 py-1 rounded bg-slate-900 text-white" onclick="genInvoice('${i.id}')">Cetak</button></td>
        </tr>
      `).join('')}
    </table>
  `;

  // mukafaah
  byId('tblMuk').innerHTML = `
    <table class="min-w-full border">
      <tr class="bg-slate-100"><th class="p-2 text-left">Guru</th><th class="p-2">Bulan</th><th class="p-2">Mukafaah (70%)</th></tr>
      ${muk.map(m=>`<tr class="border-t"><td class="p-2">${m.full_name||m.teacher_id}</td><td class="p-2">${m.month}</td><td class="p-2 text-right">${fmtJPY(m.mukafaah_jpy)}</td></tr>`).join('')}
    </table>
  `;

  // kas
  byId('boxKas').innerHTML = `
    <div class="grid md:grid-cols-3 gap-3">
      <div class="p-3 rounded bg-white shadow"><div class="text-slate-500 text-sm">Pemasukan</div><div class="text-xl font-semibold">${fmtJPY(kas.total_income_jpy)}</div></div>
      <div class="p-3 rounded bg-white shadow"><div class="text-slate-500 text-sm">Pengeluaran</div><div class="text-xl font-semibold">${fmtJPY(kas.total_expense_jpy)}</div></div>
      <div class="p-3 rounded bg-white shadow"><div class="text-slate-500 text-sm">Net</div><div class="text-xl font-semibold">${fmtJPY(kas.net_jpy)}</div></div>
    </div>
  `;
}

async function loadStudents(){
  const S = await apiGet('listStudents');
  byId('tblSiswa').innerHTML = `
    <table class="min-w-full border">
      <tr class="bg-slate-100"><th class="p-2 text-left">ID</th><th class="p-2">Nama</th><th class="p-2">Family Key</th><th class="p-2">Ortu</th><th class="p-2">Status</th></tr>
      ${S.map(s=>`<tr class="border-t"><td class="p-2">${s.id}</td><td class="p-2">${s.full_name}</td><td class="p-2">${s.family_key}</td><td class="p-2">${s.parent_name}</td><td class="p-2">${s.status}</td></tr>`).join('')}
    </table>
  `;
  // isi dropdown pembayaran
  byId('payStudent').innerHTML = S.map(s=>`<option value="${s.id}">${s.full_name} (${s.id})</option>`).join('');
}

async function loadClasses(){
  const C = await apiGet('listClasses');
  byId('payClass').innerHTML = C.map(c=>`<option value="${c.id}">${c.class_name} — ¥${c.monthly_fee_jpy}</option>`).join('');
}

function wirePayments(){
  byId('payForm').addEventListener('submit', async (ev)=>{
    ev.preventDefault();
    const payload = {
      student_id: byId('payStudent').value,
      class_id: byId('payClass').value,
      month: byId('payMonth').value,
      amount_jpy: byId('payAmount').value,
      method: 'Cash'
    };
    const res = await apiPost('addPayment', payload);
    if (res?.payment_id){
      // generate kwitansi
      const gen = await fetch(API_BASE, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({action:'genReceiptPdf', payment_id: res.payment_id}) }).then(r=>r.json());
      byId('payResult').innerHTML = gen?.file_id ? `✅ Tersimpan. Kwitansi dibuat (Drive fileId: ${gen.file_id}).` : 'Tersimpan, gagal buat kwitansi.';
      await loadDashboard();
    } else {
      byId('payResult').innerText = 'Gagal menyimpan pembayaran.';
    }
  });
}

async function genInvoice(invoice_id){
  const gen = await fetch(API_BASE, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({action:'genInvoicePdf', invoice_id}) }).then(r=>r.json());
  alert(gen?.file_id ? `Invoice PDF dibuat. fileId: ${gen.file_id}` : 'Gagal membuat PDF.');
}
