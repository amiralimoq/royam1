document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. Sidebar ---
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            if (item.classList.contains('logout')) {
                if (confirm("Are you sure you want to logout?")) window.location.href = 'login.html';
                return;
            }
            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });

    // --- 2. Real Database Update with Optimistic UI ---
    const orderGrid = document.querySelector('.order-grid');

    orderGrid.addEventListener('click', async (e) => {
        const target = e.target;
        const acceptBtn = target.closest('.btn-check');
        const rejectBtn = target.closest('.btn-close');

        if (acceptBtn || rejectBtn) {
            const card = target.closest('.card');
            const orderIdStr = card.querySelector('.order-id').innerText; // "Order #351"
            const orderId = orderIdStr.replace('Order #', '').trim();
            const footer = card.querySelector('.card-footer');
            const actionsDiv = footer.querySelector('.actions');

            // Save previous state for rollback
            const previousHTML = footer.innerHTML;

            // OPTIMISTIC UPDATE (UI FIRST)
            let newStatus = '';
            if (acceptBtn) {
                newStatus = 'completed';
                actionsDiv.remove();
                const badge = document.createElement('div');
                badge.className = 'status-badge badge-completed';
                badge.innerHTML = '<i class="ri-check-line"></i> COMPLETED';
                footer.appendChild(badge);
            } else if (rejectBtn) {
                newStatus = 'cancelled';
                actionsDiv.remove();
                const badge = document.createElement('div');
                badge.className = 'status-badge badge-rejected';
                badge.innerHTML = '<i class="ri-close-line"></i> REJECTED';
                footer.appendChild(badge);
            }

            // DB REQUEST
            try {
                // Assuming RLS allows update on this table for kitchen role
                const { error } = await window.supabaseClient
                    .from('orders')
                    .update({ status: newStatus })
                    .eq('id', orderId); // Assuming real ID matches

                if (error) throw error;
                
                showToast(`Order #${orderId} marked as ${newStatus}`, acceptBtn ? 'success' : 'info');

            } catch (err) {
                console.error("Update failed:", err);
                showToast("Update failed! Reverting...", "error");
                
                // REVERT UI
                footer.innerHTML = previousHTML;
            }
        }
    });

    // --- 3. Live Search ---
    const searchInput = document.querySelector('.search-bar input');
    searchInput.addEventListener('input', (e) => {
        const searchText = e.target.value.toLowerCase();
        document.querySelectorAll('.card').forEach(card => {
            const orderId = card.querySelector('.order-id').innerText.toLowerCase();
            const foodNames = Array.from(card.querySelectorAll('.food-info h4'))
                                   .map(h => h.innerText.toLowerCase())
                                   .join(' ');
            if (orderId.includes(searchText) || foodNames.includes(searchText)) card.style.display = 'block';
            else card.style.display = 'none';
        });
    });

    // --- 4. Notification ---
    const notifBtn = document.querySelector('.ri-notification-3-line');
    if(notifBtn) {
        notifBtn.style.cursor = 'pointer';
        notifBtn.addEventListener('click', () => {
            showToast("Checking for new orders...", "info");
        });
    }
});
