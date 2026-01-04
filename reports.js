// reports.js - Analytics
window.switchSalesMode = function(m, el) { 
    document.querySelectorAll('#sales .pill-tab').forEach(t=>t.classList.remove('active-tab')); 
    el.classList.add('active-tab'); 
    document.getElementById('sales-cash-view').style.display=m==='cash'?'block':'none'; 
    document.getElementById('sales-product-view').style.display=m==='product'?'block':'none'; 
}

window.quickReport = async function(d) { 
    const s=new Date(); s.setDate(s.getDate()-d); 
    const {data}=await window.supabaseClient.from('orders').select('total_amount').gte('created_at',s.toISOString()); 
    const t=data?data.reduce((a,b)=>a+(parseFloat(b.total_amount)||0),0):0; 
    document.getElementById('report-revenue').innerText='$'+t.toLocaleString(); 
}
