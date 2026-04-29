document.addEventListener('DOMContentLoaded', () => {
    // Event Listeners untuk semua tombol
    document.getElementById('btnHelp').addEventListener('click', () => toggleHelp(true));
    document.getElementById('btnCloseHelp').addEventListener('click', () => toggleHelp(false));
    document.getElementById('btnSave').addEventListener('click', saveData);
    document.getElementById('btnClear').addEventListener('click', clearData);
    document.getElementById('btnToggleAll').addEventListener('click', toggleAll);
    document.getElementById('btnSendWA').addEventListener('click', sendWA);
    document.getElementById('search').addEventListener('keyup', filterList);

    // Muat data saat pertama kali dibuka
    loadData();
});

// Fungsi untuk mengekstrak Nama dan Nomor HP 
function parseContact(line) {
    line = line.trim();
    if (!line) return null;

    // Cari pola angka untuk nomor HP
    const phoneRegex = /(?:\+62|62|0)[0-9\- ]{7,15}/g;
    const phoneMatch = line.match(phoneRegex);
    let phone = phoneMatch ? phoneMatch[0].replace(/[^0-9\+]/g, '') : '';
    
    // Hapus nomor dari baris untuk mendapatkan nama saja
    let name = line.replace(phoneRegex, '').replace(/[-()]/g, '').trim();
    
    // Jika tidak ada huruf sama sekali, gunakan teks asli
    if (!name) name = line;

    // Bersihkan nama dari spasi berlebih agar tag menempel
    name = name.replace(/\s+/g, ''); 

    return { name, phone, original: line };
}

function saveData() {
    const raw = document.getElementById('rawInput').value;
    const lines = raw.split('\n');
    const contacts = lines.map(parseContact).filter(c => c !== null);
    
    localStorage.setItem('wa_db_wahyu', JSON.stringify(contacts));
    render(contacts);
    alert("✅ Data berhasil disimpan & dioptimalkan!");
}

function loadData() {
    const saved = localStorage.getItem('wa_db_wahyu');
    if(saved) { 
        const contacts = JSON.parse(saved);
        render(contacts); 
        document.getElementById('rawInput').value = contacts.map(c => c.original).join('\n'); 
    }
}

function clearData() {
    if(confirm("Yakin ingin menghapus semua data?")) {
        localStorage.removeItem('wa_db_wahyu');
        document.getElementById('rawInput').value = '';
        render([]);
    }
}

function render(data) {
    const container = document.getElementById('nameList');
    container.innerHTML = data.map((c) => `
        <div class="list-item" onclick="toggleItem(this)">
            <div class="list-item-left">
                <input type="checkbox" class="chk" data-name="${c.name}" data-phone="${c.phone}">
                <span>${c.name || 'Tanpa Nama'}</span>
            </div>
            ${c.phone ? `<span class="contact-phone">${c.phone}</span>` : ''}
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
    const tagByPhone = document.getElementById('tagByPhone').checked;
    const pesan = document.getElementById('msgInput').value;

    const formatted = checkboxes.map((cb, i) => {
        const name = cb.getAttribute('data-name');
        let phone = cb.getAttribute('data-phone');
        
        if (phone && phone.startsWith('0')) {
            phone = '62' + phone.substring(1);
        }

        let identifier = (tagByPhone && phone) ? phone : name;
        let res = useAt ? "@" + identifier : identifier;
        
        return useNum ? (i+1) + ". " + res : res;
    });

    const namePart = useNum ? formatted.join('\n') : formatted.join(' ');
    return pesan ? pesan + "\n\n" + namePart : namePart;
}

function copyBatch(batchCbs) {
    const txt = formatText(batchCbs);
    navigator.clipboard.writeText(txt).then(() => {
        alert("✅ Teks Disalin!\n\nBuka WA, Tempel (Paste). Lalu hapus 1 huruf terakhir dari nama orang tersebut, dan ketik ulang hurufnya agar tag biru muncul.");
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
