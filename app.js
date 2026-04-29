document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnHelp').addEventListener('click', () => toggleHelp(true));
    document.getElementById('btnCloseHelp').addEventListener('click', () => toggleHelp(false));
    document.getElementById('btnSave').addEventListener('click', saveData);
    document.getElementById('btnClear').addEventListener('click', clearData);
    document.getElementById('btnToggleAll').addEventListener('click', toggleAll);
    document.getElementById('btnSendWA').addEventListener('click', sendWA);
    document.getElementById('search').addEventListener('keyup', filterList);

    loadData();
});

// Fungsi pembersih yang disederhanakan: HANYA menghapus spasi berlebih di awal/akhir baris
// Tidak lagi menghapus angka atau membuang spasi di tengah nama
function cleanName(txt) {
    return txt.trim();
}

function saveData() {
    const raw = document.getElementById('rawInput').value;
    // Pisahkan berdasarkan baris, bersihkan, dan buang baris yang kosong
    const names = raw.split('\n').map(cleanName).filter(n => n !== "");
    
    localStorage.setItem('wa_db_wahyu', JSON.stringify(names));
    render(names);
    alert("✅ Data berhasil disimpan!");
}

function loadData() {
    const saved = localStorage.getItem('wa_db_wahyu');
    if(saved) { 
        const names = JSON.parse(saved);
        render(names); 
        document.getElementById('rawInput').value = names.join('\n'); 
    }
}

function clearData() {
    if(confirm("Yakin ingin menghapus semua data?")) {
        localStorage.removeItem('wa_db_wahyu');
        document.getElementById('rawInput').value = '';
        render([]);
    }
}

function render(names) {
    const container = document.getElementById('nameList');
    container.innerHTML = names.map((name) => `
        <div class="list-item" onclick="toggleItem(this)">
            <div class="list-item-left">
                <input type="checkbox" class="chk" value="${name}">
                <span>${name}</span>
            </div>
        </div>
    `).join('');
    updateCount();
}

function toggleItem(div) {
    const cb = div.querySelector('input');
    if(event.target.type !== 'checkbox') cb.checked = !cb.checked;
    updateCount();
}

function updateCount() {
    const selected = document.querySelectorAll('.chk:checked');
    const batchSection = document.getElementById('batchSection');
    const grid = document.getElementById('batchButtons');
    
    if(selected.length > 0) {
        batchSection.style.display = 'block';
        grid.innerHTML = '';
        const batchSize = 20;
        const selectedArr = Array.from(selected);

        for (let i = 0; i < selectedArr.length; i += batchSize) {
            const batch = selectedArr.slice(i, i + batchSize);
            const btn = document.createElement('button');
            btn.className = 'main-btn btn-batch-copy';
            btn.innerText = `Salin Orang ${i+1} - ${Math.min(i + batchSize, selectedArr.length)}`;
            btn.onclick = () => copyBatch(batch);
            grid.appendChild(btn);
        }
    } else {
        batchSection.style.display = 'none';
    }
}

function formatText(checkboxes) {
    const useAt = document.getElementById('atTag').checked;
    const useNum = document.getElementById('numTag').checked;
    const pesan = document.getElementById('msgInput').value;

    const formatted = checkboxes.map((cb, i) => {
        const name = cb.value;
        // Mempertahankan nama utuh (contoh: @ARN251-28214 SUNARSA)
        let res = useAt ? "@" + name : name;
        return useNum ? (i+1) + ". " + res : res;
    });

    const namePart = useNum ? formatted.join('\n') : formatted.join(' ');
    return pesan ? pesan + "\n\n" + namePart : namePart;
}

function copyBatch(batchCbs) {
    const txt = formatText(batchCbs);
    navigator.clipboard.writeText(txt).then(() => {
        alert("✅ Teks Disalin!\n\nBuka WA, Tempel (Paste). Lalu hapus 1 huruf terakhir dari nama, dan ketik ulang hurufnya.");
    });
}

function sendWA() {
    const selected = Array.from(document.querySelectorAll('.chk:checked'));
    if(selected.length === 0) return alert("Pilih minimal satu orang!");
    
    const txt = formatText(selected);
    window.open("https://wa.me/?text=" + encodeURIComponent(txt), "_blank");
}

function filterList() {
    const q = document.getElementById('search').value.toLowerCase();
    document.querySelectorAll('.list-item').forEach(item => {
        const textContent = item.innerText.toLowerCase();
        item.style.display = textContent.includes(q) ? 'flex' : 'none';
    });
}

function toggleAll() {
    const cbs = document.querySelectorAll('.chk');
    if(cbs.length === 0) return;
    
    let anyUnchecked = Array.from(cbs).some(c => !c.checked && c.closest('.list-item').style.display !== 'none');
    
    cbs.forEach(c => { 
        if(c.closest('.list-item').style.display !== 'none') {
            c.checked = anyUnchecked; 
        }
    });
    updateCount();
}

function toggleHelp(show) { 
    document.getElementById('helpModal').style.display = show ? 'block' : 'none'; 
}
