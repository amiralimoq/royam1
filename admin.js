// admin.js - Core Logic, Dashboard, Menu, Profile & Settings
// Depends on: config.js (loaded before this)

document.addEventListener('DOMContentLoaded', async () => {

    // 1. Auth Check
    if(sessionStorage.getItem('role') !== 'admin') {
        window.location.href = 'login.html';
        return;
    }
    
    // 2. Sidebar & Navigation Logic
    const menuItems = document.querySelectorAll('.menu-item:not(.logout)');
    const sections = document.querySelectorAll('.content-section');

    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            // Update Sidebar UI
            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            // Show Section
            const targetId = item.getAttribute('data-target');
            sections.forEach(sec => sec.classList.remove('active-section'));
            const targetSection = document.getElementById(targetId);
            if(targetSection) targetSection.classList.add('active-section');
            
            // Mobile Sidebar Close
            if(window.innerWidth < 768) toggleSidebar();
            
            // Route to specific logic
            if(targetId === 'dashboard') initDashboard();
            if(targetId === 'menu-management') loadMenuItems();
            if(targetId === 'customers' && window.loadAllCustomers) window.loadAllCustomers(); // From users.js/custom logic
            if(targetId === 'sales' && window.quickReport) window.quickReport(30); // From reports.js
            if(targetId === 'users' && window.loadStaffList) window.loadStaffList(); // From users.js
            if(targetId === 'discounts' && window.loadDiscounts) window.loadDiscounts(); // From discounts.js
            if(targetId === 'templates') loadCurrentTheme();
            if(targetId === 'reviews') loadReviews();
            if(targetId === 'messages') loadMessages();
        });
    });

    window.toggleSidebar = function() {
        document.querySelector('.sidebar').classList.toggle('active');
        document.querySelector('.sidebar-overlay').classList.toggle('active');
    }

    // ==========================================
    // DASHBOARD & SETTINGS
    // ==========================================
    async function initDashboard() {
        const now = new Date();
        const f = new Date(now.getFullYear(), now.getMonth(), 1);
        const dateTitle = document.getElementById('dashboard-date-title');
        if(dateTitle) {
            dateTitle.innerText = `${f.getDate()} ${f.toLocaleString('en',{month:'short'})} - ${now.getDate()} ${now.toLocaleString('en',{month:'short'})} ${now.getFullYear()}`;
        }
        
        loadMonthStats();
        
        // Load Settings (Working Hours)
        const { data } = await window.supabaseClient.from('settings').select('*');
        if(data) {
            data.forEach(s => { 
                const el = document.querySelector(`#chip-${s.key} .val`); 
                if(el) el.innerText = s.value; 
            });
        }
    }

    async function loadMonthStats() {
        const d = new Date(); d.setDate(1);
        const { data } = await window.supabaseClient
            .from('orders')
            .select('total_amount')
            .eq('status','completed')
            .gte('created_at', d.toISOString());
            
        if(data) {
            const r = data.reduce((a,b)=>a+(parseFloat(b.total_amount)||0),0);
            const ordEl = document.getElementById('month-orders');
            const revEl = document.getElementById('month-revenue');
            if(ordEl) ordEl.innerText = data.length;
            if(revEl) revEl.innerText = '$'+r.toLocaleString();
        }
    }

    // Working Hours Save
    const saveWhBtn = document.getElementById('save-wh-btn');
    if(saveWhBtn) {
        saveWhBtn.onclick = async () => {
            const updates = [
                {key:'start-time',value:document.querySelector('#chip-start-time .val').innerText},
                {key:'end-time',value:document.querySelector('#chip-end-time .val').innerText},
                {key:'start-day',value:document.querySelector('#chip-start-day .val').innerText},
                {key:'end-day',value:document.querySelector('#chip-end-day .val').innerText}
            ];
            
            for(let u of updates) await window.supabaseClient.from('settings').upsert(u);
            showToast("Working hours saved!", "success");
        };
    }

    // Chip Dropdown Logic (Settings)
    window.toggleChip = (id) => { 
        document.querySelectorAll('.chip-menu').forEach(m=>m.classList.remove('show')); 
        const menu = document.getElementById('menu-'+id);
        if(menu) menu.classList.add('show'); 
    };
    
    // Populate Time/Day Dropdowns
    const times = Array.from({length:24},(_,i)=>`${i.toString().padStart(2,'0')}:00`); 
    const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']; 
    
    ['start-time','end-time'].forEach(t => fillDropdown(t, times)); 
    ['start-day','end-day'].forEach(t => fillDropdown(t, days));

    function fillDropdown(id, arr){ 
        const m = document.getElementById('menu-'+id);
        if(!m) return;
        m.innerHTML = '';
        arr.forEach(v => { 
            const d = document.createElement('div'); 
            d.className = 'chip-option'; 
            d.innerText = v; 
            d.onclick = () => { 
                document.querySelector(`#chip-${id} .val`).innerText = v; 
                m.classList.remove('show'); 
            }; 
            m.appendChild(d); 
        }); 
    }

    // ==========================================
    // MENU MANAGEMENT (FULL LOGIC)
    // ==========================================
    let editingMenuId = null;

    window.openMenuModal = function(mode, dataJson = null) {
        document.getElementById('menu-modal').style.display = 'flex';
        const titleEl = document.getElementById('menu-modal-title');
        const btnEl = document.getElementById('save-menu-btn');
        
        if (mode === 'add') {
            editingMenuId = null;
            titleEl.innerText = 'Add Menu Item';
            btnEl.innerText = 'Confirm';
            document.getElementById('menu-cat').value = 'Main Course';
            document.getElementById('menu-name').value = '';
            document.getElementById('menu-desc').value = '';
            document.getElementById('menu-price').value = '';
            document.getElementById('menu-img').value = ''; 
        } else {
            editingMenuId = dataJson.id;
            titleEl.innerText = 'Edit Menu Item';
            btnEl.innerText = 'Update';
            
            document.getElementById('menu-cat').value = dataJson.category;
            document.getElementById('menu-name').value = dataJson.name;
            document.getElementById('menu-desc').value = dataJson.description;
            document.getElementById('menu-price').value = dataJson.price;
        }
    }

    window.saveMenuItem = async function() {
        const category = document.getElementById('menu-cat').value;
        const name = document.getElementById('menu-name').value;
        const desc = document.getElementById('menu-desc').value;
        const price = parseFloat(document.getElementById('menu-price').value);
        const imgInput = document.getElementById('menu-img');
        
        if (!name || !price) return showToast("Name and Price are required.", "error");

        let imgData = null;
        if (imgInput.files && imgInput.files[0]) {
            imgData = await toBase64(imgInput.files[0]);
        }

        const payload = {
            category,
            name,
            description: desc,
            price,
            status: editingMenuId ? undefined : 'active'
        };
        if (imgData) payload.image_url = imgData;

        let error;
        if (editingMenuId) {
            const res = await window.supabaseClient.from('menu_items').update(payload).eq('id', editingMenuId);
            error = res.error;
        } else {
            const res = await window.supabaseClient.from('menu_items').insert([payload]);
            error = res.error;
        }

        if(error) showToast("Error: " + error.message, "error");
        else { 
            showToast(editingMenuId ? "Item Updated!" : "Item Created!", "success"); 
            document.getElementById('menu-modal').style.display = 'none'; 
            loadMenuItems(); 
        }
    }

    window.loadMenuItems = async function() {
        const container = document.getElementById('menu-list-container');
        if(!container) return;
        container.innerHTML = 'Loading...';

        const { data, error } = await window.supabaseClient.from('menu_items').select('*').order('created_at', {ascending: false});
        
        if (error || !data || data.length === 0) {
            container.innerHTML = '<div style="padding:15px;color:#888;">No items found.</div>';
            return;
        }

        container.innerHTML = '';
        data.forEach(item => {
            // Escape JSON for HTML attribute safety
            const safeItem = JSON.stringify(item).replace(/"/g, '&quot;');
            
            const isActive = item.status === 'active';
            const statusClass = isActive ? 'status-active' : 'status-inactive';
            const statusLabel = isActive ? 'Active' : 'Inactive';
            
            const imgHtml = item.image_url 
                ? `<img src="${item.image_url}" style="width:100%; height:100%; object-fit:cover;">` 
                : `<i class="ri-image-2-line" style="font-size:20px; color:#ccc;"></i>`;

            const row = document.createElement('div');
            row.className = 'table-row';
            row.innerHTML = `
                <span class="flex-1"><div class="menu-img-box">${imgHtml}</div></span>
                <span class="flex-2 font-600">${item.name}</span>
                <span class="flex-1 text-sm-grey">${item.category}</span>
                <span class="flex-1 font-500">$${item.price}</span>
                <span class="flex-1"><span class="status-toggle-btn ${statusClass}" onclick="toggleMenuStatus(${item.id}, '${item.status}')">${statusLabel}</span></span>
                <span class="flex-1 text-right" style="display:flex; justify-content:flex-end; gap:10px;">
                    <button onclick="openMenuPreview(${safeItem})" style="background:none; border:none; color:#3498DB; cursor:pointer;" title="View"><i class="ri-eye-line" style="font-size:18px;"></i></button>
                    <button onclick="openMenuModal('edit', ${safeItem})" style="background:none; border:none; color:#F39C12; cursor:pointer;" title="Edit"><i class="ri-pencil-line" style="font-size:18px;"></i></button>
                </span>
            `;
            container.appendChild(row);
        });
    }

    window.toggleMenuStatus = async function(id, currentStatus) {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        await window.supabaseClient.from('menu_items').update({ status: newStatus }).eq('id', id);
        loadMenuItems();
    }

    window.openMenuPreview = function(item) {
        document.getElementById('prev-name').innerText = item.name;
        document.getElementById('prev-desc').innerText = item.description || 'No description.';
        document.getElementById('prev-price').innerText = '$' + item.price;
        const imgEl = document.getElementById('prev-img');
        if (item.image_url) imgEl.src = item.image_url;
        else imgEl.src = ''; 
        document.getElementById('menu-preview-modal').style.display = 'flex';
    }

    // Helper: File to Base64
    const toBase64 = file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });

    // ==========================================
    // THEMES & PROFILE
    // ==========================================
    async function loadCurrentTheme() {
        const { data } = await window.supabaseClient.from('settings').select('value').eq('key', 'active_theme').single();
        const current = data ? data.value : 'default';
        document.querySelectorAll('.template-card').forEach(c => c.classList.remove('active-theme'));
        const cards = document.querySelectorAll('.template-card');
        if(current === 'default' && cards[0]) cards[0].classList.add('active-theme');
        if(current === 'dark' && cards[1]) cards[1].classList.add('active-theme');
        if(current === 'ocean' && cards[2]) cards[2].classList.add('active-theme');
    }

    window.setTheme = async function(themeName, el) {
        await window.supabaseClient.from('settings').upsert({key: 'active_theme', value: themeName});
        loadCurrentTheme();
        showToast(`Theme set to ${themeName}`, "success");
    }

    // Profile Logic
    const profileTrigger = document.getElementById('profile-trigger');
    if(profileTrigger) {
        profileTrigger.onclick = () => {
            document.getElementById('profile-modal').style.display = 'flex';
            const userSpan = document.getElementById('header-username');
            if(userSpan) document.getElementById('edit-self-user').value = userSpan.innerText;
        };
    }

    const saveProfileBtn = document.getElementById('save-profile-btn');
    if(saveProfileBtn) {
        saveProfileBtn.onclick = async () => {
            const u = document.getElementById('edit-self-user').value.trim();
            const p = document.getElementById('edit-self-pass').value.trim();
            const ph = document.getElementById('edit-self-phone').value.trim();
            const em = document.getElementById('edit-self-email').value.trim();
            const currentName = document.getElementById('header-username').innerText;

            if (!u || !p || !ph || !em) return showToast("All fields required.", "error");

            const { error } = await window.supabaseClient.from('admins')
                .update({ username: u, password: p, phone: ph, email: em })
                .eq('username', currentName);

            if (error) showToast("Update failed: " + error.message, "error");
            else {
                showToast("Profile updated! Login again.", "success");
                setTimeout(() => window.location.href = 'login.html', 1500);
            }
        };
    }
    
    // Reviews & Messages (Simple Loaders)
    async function loadReviews(){ 
        const {data}=await window.supabaseClient.from('reviews').select('*'); 
        const c=document.getElementById('reviews-container'); 
        if(c) {
            c.innerHTML=''; 
            if(data) data.forEach(r=>{ c.innerHTML+=`<div class="clean-table" style="margin-bottom:10px;padding:15px;"><strong>${r.customer_name}</strong> (${r.rating} stars)<p style="margin:5px 0 0 0;color:#666;">${r.comment}</p></div>`; }); 
        }
    }
    async function loadMessages(){ 
        const {data}=await window.supabaseClient.from('messages').select('*'); 
        const c=document.getElementById('messages-container'); 
        if(c) {
            c.innerHTML=''; 
            if(data) data.forEach(m=>{ c.innerHTML+=`<div style="padding:10px;border-bottom:1px solid #eee;"><b>${m.title}</b>: ${m.body}</div>`; }); 
        }
    }

    // Global click listener for closing modals/dropdowns
    window.onclick = function(e) {
        if (!e.target.closest('.chip-dropdown') && !e.target.closest('.pill-dropdown')) {
            document.querySelectorAll('.chip-menu, .pill-menu').forEach(m => m.classList.remove('show'));
        }
        if (e.target.classList.contains('modal-overlay')) {
            e.target.style.display = 'none';
        }
    }

    // Initial Load
    initDashboard();
});
