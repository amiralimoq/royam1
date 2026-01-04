// discounts.js - Discount Logic

let editingDiscountId = null;
let discountFilters = { status: 'all', usage: 'all', scope: 'all' };

window.loadDiscounts = async function() {
    const container = document.getElementById('discount-list');
    container.innerHTML = 'Loading...';
    let {data, error} = await window.supabaseClient.from('discounts').select('*').order('created_at', {ascending: false});
    if(!data) { container.innerHTML = 'No data'; return; }

    container.innerHTML = '';
    data.forEach(d => {
        // Simplified rendering for brevity - Production would use full template
        const div = document.createElement('div');
        div.className = 'table-row';
        div.innerHTML = `
            <span style="flex:2; font-weight:600;">${d.code}</span>
            <span style="flex:1; font-size:12px;">${d.type}</span>
            <span style="flex:1;">${d.status}</span>
            <span style="flex:1; text-align:right;">
                <button onclick="deleteDiscount(${d.id})" style="color:#FF7675; border:none; background:none; cursor:pointer;"><i class="ri-delete-bin-line"></i></button>
            </span>
        `;
        container.appendChild(div);
    });
}

window.openDiscountModal = function(editData = null) {
    document.getElementById('discount-modal').style.display = 'flex';
    // Logic to fill form would go here
}

window.saveDiscount = async function() {
    // Basic implementation for structure
    showToast("Discount saved (Logic placeholder)", "success");
    document.getElementById('discount-modal').style.display = 'none';
    loadDiscounts();
}

window.deleteDiscount = async function(id) {
    if(confirm("Delete?")) { 
        await window.supabaseClient.from('discounts').delete().eq('id', id); 
        loadDiscounts(); 
    }
}
