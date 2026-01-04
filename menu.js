document.addEventListener('DOMContentLoaded', async () => {
    
    // --- 0. LOAD THEME FROM DB ---
    try {
        const { data } = await window.supabaseClient.from('settings').select('value').eq('key', 'active_theme').single();
        if (data && data.value) applyTheme(data.value);
    } catch (err) {
        console.log("Using default theme");
    }

    function applyTheme(themeName) {
        const root = document.documentElement;
        if(themeName === 'dark') {
            root.style.setProperty('--primary-color', '#FF724C');
            root.style.setProperty('--bg-color', '#121212');
            root.style.setProperty('--sidebar-bg', '#1E1E1E');
            root.style.setProperty('--text-dark', '#FFFFFF');
            root.style.setProperty('--text-grey', '#AAAAAA');
            document.body.style.backgroundColor = '#000';
            document.querySelectorAll('.menu-card, .tab, .search-bar').forEach(el => {
                el.style.backgroundColor = '#1E1E1E';
                el.style.color = '#fff';
            });
        }
        else if(themeName === 'ocean') {
            root.style.setProperty('--primary-color', '#0288D1');
            root.style.setProperty('--bg-color', '#E3F2FD');
            document.body.style.backgroundColor = '#B3E5FC';
            document.querySelector('.logo span').style.color = '#0288D1';
            document.querySelectorAll('.btn-add, .badge, .active-cat').forEach(el => {
                el.style.backgroundColor = '#0288D1';
            });
        }
    }

    // --- 1. SIDEBAR & MOBILE ---
    const menuItems = document.querySelectorAll('.sidebar .menu-item:not(.logout)');
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            if(window.innerWidth < 768) toggleSidebar();
        });
    });

    const logoutBtn = document.querySelector('.logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm("Are you sure you want to logout?")) window.location.href = 'login.html';
        });
    }

    window.toggleSidebar = function() {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        sidebar.classList.toggle('active');
        if(overlay) overlay.classList.toggle('active');
    }

    // --- 2. PRODUCTION READY CART SYSTEM ---
    let cart = []; // State for Cart
    const cartBadge = document.querySelector('.cart-btn .badge');
    const checkoutBtn = document.getElementById('checkout-btn');
    const cartBtns = document.querySelectorAll('.btn-add');

    // Update Cart UI
    function updateCartUI() {
        const totalQty = cart.reduce((acc, item) => acc + item.qty, 0);
        cartBadge.innerText = totalQty;
        
        if (totalQty > 0) {
            checkoutBtn.style.display = 'inline-block';
            checkoutBtn.innerHTML = `Checkout $${cart.reduce((a, b) => a + (b.price * b.qty), 0).toFixed(2)} <i class="ri-arrow-right-line"></i>`;
        } else {
            checkoutBtn.style.display = 'none';
        }
    }

    // Add to Cart Logic
    cartBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const card = this.closest('.menu-card');
            const id = card.getAttribute('data-id');
            const name = card.getAttribute('data-name');
            const price = parseFloat(card.getAttribute('data-price'));

            // Check if exists
            const existingItem = cart.find(item => item.id === id);
            if (existingItem) {
                existingItem.qty++;
            } else {
                cart.push({ id, name, price, qty: 1 });
            }

            // Visual Feedback
            const originalText = this.innerHTML;
            this.innerHTML = '<i class="ri-check-line"></i> Added';
            this.style.backgroundColor = '#2ECC71';
            this.classList.add('added');
            
            updateCartUI();
            showToast(`Added ${name} to cart!`, 'success');

            setTimeout(() => {
                this.innerHTML = originalText;
                this.style.backgroundColor = ''; 
                this.classList.remove('added');
            }, 1000);
        });
    });

    // --- 3. CHECKOUT LOGIC (Database Insert) ---
    checkoutBtn.addEventListener('click', async () => {
        if (cart.length === 0) return;

        checkoutBtn.disabled = true;
        checkoutBtn.innerText = "Processing...";

        try {
            // Get Current User (Implicitly handled by Supabase Auth, but we can verify)
            const { data: { user } } = await window.supabaseClient.auth.getUser();
            
            // Note: If no user logged in, Supabase Anon Key allows insert depending on RLS policy.
            // For production, usually we need a user_id. Assuming anonymous user or derived from auth.
            const userId = user ? user.id : null; 

            // 1. Calculate Total
            const totalAmount = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

            // 2. Insert into 'orders'
            const orderPayload = {
                total_amount: totalAmount,
                status: 'pending',
                // customer_id: userId // Uncomment if RLS requires it and user is logged in
            };

            const { data: orderData, error: orderError } = await window.supabaseClient
                .from('orders')
                .insert([orderPayload])
                .select()
                .single();

            if (orderError) throw orderError;
            const orderId = orderData.id;

            // 3. Insert into 'order_items'
            const itemsPayload = cart.map(item => ({
                order_id: orderId,
                product_name: item.name,
                quantity: item.qty,
                final_price: item.price
            }));

            const { error: itemsError } = await window.supabaseClient
                .from('order_items')
                .insert(itemsPayload);

            if (itemsError) throw itemsError;

            // Success Flow
            showToast("Order placed successfully!", "success");
            cart = [];
            updateCartUI();

        } catch (err) {
            console.error("Checkout Error:", err);
            showToast("Failed to place order. Try again.", "error");
        } finally {
            checkoutBtn.disabled = false;
        }
    });

    // --- 4. FILTER & SEARCH ---
    const categoryTabs = document.querySelectorAll('.menu-categories .tab');
    const menuCards = document.querySelectorAll('.menu-card');
    
    categoryTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            categoryTabs.forEach(t => t.classList.remove('active-cat'));
            tab.classList.add('active-cat');
            const category = tab.innerText.trim().toLowerCase();
            menuCards.forEach(card => {
                const title = card.querySelector('h4').innerText.toLowerCase();
                const desc = card.querySelector('.menu-desc').innerText.toLowerCase();
                if (category === 'all' || title.includes(category) || desc.includes(category)) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });

    const searchInput = document.querySelector('.search-bar input');
    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchText = e.target.value.toLowerCase();
            menuCards.forEach(card => {
                const title = card.querySelector('h4').innerText.toLowerCase();
                if (title.includes(searchText)) card.style.display = 'flex';
                else card.style.display = 'none';
            });
        });
    }
});
