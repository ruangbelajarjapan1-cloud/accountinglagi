// ======== KONFIG =========
const API_BASE = 'https://script.google.com/macros/s/AKfycbwLwGA4QErZIBPzPSJ7-lQcxKqrlzz1XIUUyOl0u9ERLvG49LW8zW4DUpGcNH0iKbG7Qg/exec'; // <- ganti dengan URL Web App GAS kamu

const $ = sel => document.querySelector(sel);
const byId = id => document.getElementById(id);
function fmtJPY(n){ return new Intl.NumberFormat('ja-JP',{style:'currency',currency:'JPY'}).format(Number(n||0)); }

// API helper
async function apiGet(action, params={}){
  const q = new URLSearchParams({ action, ...params });
  const res = await fetch(`${API_BASE}?${q}`);
  return res.json();
}
async function apiPost(action, data){
  const res = await fetch(API_BASE, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({action, data}) });
  return res.json();
}

// ========== APP LOGIC ==========
async function loadDashboard(){
  const month = byId('bulan')?.value || new Date().toISOString().slice(0,7);
  const [unpaid, invoices, muk, kas] = await Promise.all([
    apiGet('unpaidStudents', { month }),
    apiGet('listInvoices', { month }),
    apiGet('mukafaah', { month }),
    apiGet('cashbook', { month })
  ]);

  $('#stats').innerHTML = `
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

  $('#unpaid').innerHTML = `
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
            <button class="px-2 py-1 rounded bg-slate-900 text-white" onclick="genInvoice('${u.id}')">Cetak Invoice</button>
          </td>
        </tr>`).join('')}
    </table>
  `;

  $('#tblInvoice').innerHTML = `
    <table class="min-w-full border">
      <tr class="bg-slate-100">
        <th class="p-2 text-left">ID</th><th class="p-2">Siswa</th><th class="p-2">Bulan</th>
        <th class="p-2">Due</th><th class="p-2">Paid</th><th class="p-2">Status</th><th class="p-2">PDF</th>
      </tr>
      ${invoices.map(i=>`
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

  $('#tblMuk').innerHTML = `
    <table class="min-w-full border">
      <tr class="bg-slate-100"><th class="p-2 text-left">Guru</th><th class="p-2">Bulan</th><th class="p-2">Mukafaah (70%)</th></tr>
      ${(await apiGet('mukafaah', { month })).map(m=>`<tr class="border-t"><td class="p-2">${m.full_name||m.teacher_id}</td><td class="p-2">${m.month}</td><td class="p-2 text-right">${fmtJPY(m.mukafaah_jpy)}</td></tr>`).join('')}
    </table>
  `;

  $('#boxKas').innerHTML = `
    <div class="grid md:grid-cols-3 gap-3">
      <div class="p-3 rounded bg-white shadow"><div class="text-slate-500 text-sm">Pemasukan</div><div class="text-xl font-semibold">${fmtJPY(kas.total_income_jpy)}</div></div>
      <div class="p-3 rounded bg-white shadow"><div class="text-slate-500 text-sm">Pengeluaran</div><div class="text-xl font-semibold">${fmtJPY(kas.total_expense_jpy)}</div></div>
      <div class="p-3 rounded bg-white shadow"><div class="text-slate-500 text-sm">Net</div><div class="text-xl font-semibold">${fmtJPY(kas.net_jpy)}</div></div>
    </div>
  `;
}

async function loadStudents(){
  const S = await apiGet('listStudents');
  $('#tblSiswa').innerHTML = `
    <table class="min-w-full border">
      <tr class="bg-slate-100"><th class="p-2 text-left">ID</th><th class="p-2">Nama</th><th class="p-2">Family Key</th><th class="p-2">Ortu</th><th class="p-2">Status</th></tr>
      ${S.map(s=>`<tr class="border-t"><td class="p-2">${s.id}</td><td class="p-2">${s.full_name}</td><td class="p-2">${s.family_key}</td><td class="p-2">${s.parent_name}</td><td class="p-2">${s.status}</td></tr>`).join('')}
    </table>
  `;
  const opt = S.map(s=>`<option value="${s.id}">${s.full_name} (${s.id})</option>`).join('');
  const payStudent = byId('payStudent'); if (payStudent) payStudent.innerHTML = opt;
}

async function loadClasses(){
  const C = await apiGet('listClasses');
  const payClass = byId('payClass');
  if (payClass) payClass.innerHTML = C.map(c=>`<option value="${c.id}">${c.class_name} — ¥${c.monthly_fee_jpy}</option>`).join('');
}

function wirePayments(){
  const f = byId('payForm'); if (!f) return;
  f.addEventListener('submit', async (ev)=>{
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
      const gen = await fetch(API_BASE, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({action:'genReceiptPdf', payment_id: res.payment_id}) }).then(r=>r.json());
      byId('payResult').innerHTML = gen?.file_id ? `✅ Tersimpan. Kwitansi dibuat (Drive fileId: ${gen.file_id}).` : 'Tersimpan, gagal buat kwitansi.';
      await loadDashboard();
    } else {
      byId('payResult').innerText = 'Gagal menyimpan pembayaran.';
    }
  });
}

async function loadBilling(){
  const month = byId('billMonth')?.value || new Date().toISOString().slice(0,7);
  const unpaid = await apiGet('unpaidStudents', { month });
  const tbl = byId('tblBill'); if (!tbl) return;
  tbl.innerHTML = `
    <table class="min-w-full border">
      <tr class="bg-slate-100">
        <th class="p-2 text-left">Invoice ID</th>
        <th class="p-2">Siswa</th>
        <th class="p-2">Bulan</th>
        <th class="p-2">Due</th>
        <th class="p-2">Paid</th>
        <th class="p-2">Status</th>
        <th class="p-2">Aksi</th>
      </tr>
      ${unpaid.map(u=>`
        <tr class="border-t">
          <td class="p-2">${u.id}</td>
          <td class="p-2">${u.student_id}</td>
          <td class="p-2">${u.month}</td>
          <td class="p-2 text-right">${fmtJPY(u.total_due_jpy)}</td>
          <td class="p-2 text-right">${fmtJPY(u.total_paid_jpy)}</td>
          <td class="p-2">${u.status}</td>
          <td class="p-2">
            <button class="px-2 py-1 rounded bg-slate-900 text-white" onclick="genInvoice('${u.id}')">Cetak</button>
          </td>
        </tr>
      `).join('')}
    </table>
  `;
}

async function genInvoice(invoice_id){
  const gen = await fetch(API_BASE, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({action:'genInvoicePdf', invoice_id}) }).then(r=>r.json());
  alert(gen?.file_id ? `Invoice PDF dibuat. fileId: ${gen.file_id}` : 'Gagal membuat PDF.');
}

// ======= BOOTSTRAP =======
document.addEventListener('DOMContentLoaded', async () => {
  // Tab controller
  const sections = Array.from(document.querySelectorAll('section'));
  const tabs = Array.from(document.querySelectorAll('.tab'));
  function showTab(name){
    sections.forEach(s => s.classList.add('hidden'));
    document.getElementById(name)?.classList.remove('hidden');
    tabs.forEach(t => t.classList.remove('active'));
    tabs.find(t => t.dataset.tab===name)?.classList.add('active');
  }
  tabs.forEach(btn => btn.addEventListener('click', () => showTab(btn.dataset.tab)));
  showTab(tabs[0]?.dataset.tab || 'dashboard');

  // Default bulan
  const monthNow = new Date().toISOString().slice(0,7);
  if (byId('bulan')) byId('bulan').value = monthNow;
  if (byId('billMonth')) byId('billMonth').value = monthNow;

  // Buttons
  $('#btnRefresh')?.addEventListener('click', loadDashboard);
  byId('btnLoadBilling')?.addEventListener('click', loadBilling);
  byId('btnBulk')?.addEventListener('click', async ()=>{
    const month = byId('billMonth')?.value || monthNow;
    const res = await fetch(API_BASE, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'genInvoicePdfBulk', month }) }).then(r=>r.json());
    alert(res?.ok ? `Berhasil membuat ${res.generated} PDF.` : 'Gagal cetak massal.');
    await loadBilling();
  });

  // Load data
  try{
    await loadDashboard();
    await loadStudents();
    await loadClasses();
    wirePayments();
    await loadBilling();
  }catch(err){ console.error('Init error:', err); }
});
