// users.js - User Management Module

window.switchUserTab = function(t, el) { 
    document.querySelectorAll('#users .pill-tab').forEach(x=>x.classList.remove('active-tab')); 
    el.classList.add('active-tab'); 
    document.getElementById('user-tab-staff').style.display=t==='staff'?'block':'none'; 
    document.getElementById('user-tab-admin').style.display=t==='admin'?'block':'none'; 
    if(t==='staff') loadStaffList(); 
    else loadAdminList(); 
}

document.addEventListener('DOMContentLoaded', () => {
    const createStaffBtn = document.getElementById('create-btn');
    if(createStaffBtn) {
        createStaffBtn.onclick = async()=>{ 
            const u=document.getElementById('new-user').value; 
            const p=document.getElementById('new-pass').value; 
            if(!u || !p) return showToast("Enter details", "error");
            const {error} = await window.supabaseClient.from('staff').insert([{username:u,password:p}]); 
            if(error) showToast("Error creating staff", "error");
            else { showToast("Staff created", "success"); loadStaffList(); }
        };
    }
    
    const createAdminBtn = document.getElementById('create-admin-btn');
    if(createAdminBtn) {
        createAdminBtn.onclick = async()=>{ 
            const u=document.getElementById('admin-user').value; 
            const p=document.getElementById('admin-pass').value; 
            if(!u || !p) return showToast("Enter details", "error");
            const {error} = await window.supabaseClient.from('admins').insert([{username:u,password:p}]); 
            if(error) showToast("Error creating admin", "error");
            else { showToast("Admin created", "success"); loadAdminList(); }
        };
    }
});

window.loadStaffList = async function(){ 
    const c=document.getElementById('staff-list-container'); 
    c.innerHTML = 'Loading...';
    const {data}=await window.supabaseClient.from('staff').select('*'); 
    renderU(c,data,'staff'); 
}

window.loadAdminList = async function(){ 
    const c=document.getElementById('admin-list-container'); 
    c.innerHTML = 'Loading...';
    const {data}=await window.supabaseClient.from('admins').select('*'); 
    renderU(c,data,'admins'); 
}

function renderU(c,d,t){ 
    c.innerHTML=''; 
    if(d) d.forEach(u=>{ 
        const div=document.createElement('div'); 
        div.className='table-row'; 
        div.innerHTML=`<span style="flex:1;font-weight:500;">${u.username}</span><span style="flex:1;text-align:right;"><button onclick="deleteUser('${t}',${u.id})" style="background:none;border:none;color:#E74C3C;cursor:pointer;">Delete</button></span>`; 
        c.appendChild(div); 
    }); 
}

window.deleteUser = async(t,id)=>{ 
    if(confirm('Delete?')){ 
        const {error} = await window.supabaseClient.from(t).delete().eq('id',id); 
        if(error) showToast("Delete failed", "error");
        else {
            showToast("User deleted", "success");
            if(t==='staff') loadStaffList(); else loadAdminList(); 
        }
    } 
}
