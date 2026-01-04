// config.js - Single Source of Truth

// 1. SUPABASE CONFIGURATION
const SUPABASE_URL = 'https://ducmehygksmijtynfuzt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1Y21laHlna3NtaWp0eW5mdXp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2NTgyNTQsImV4cCI6MjA4MTIzNDI1NH0.Zo0RTm5fPn-sA6AkqSIPCCiehn8iW2Ou4I26HnC2CfU';

// Initialize Global Client
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. TOAST NOTIFICATION SYSTEM (Production UX)
// Injecting minimal styles for Toast to avoid modifying CSS files
const style = document.createElement('style');
style.innerHTML = `
    .toast-container {
        position: fixed; top: 20px; right: 20px; z-index: 9999;
    }
    .toast {
        background: #333; color: #fff; padding: 12px 24px; border-radius: 8px;
        margin-bottom: 10px; opacity: 0; transform: translateY(-20px);
        transition: all 0.3s ease; box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        display: flex; align-items: center; font-family: 'Poppins', sans-serif; font-size: 14px;
    }
    .toast.success { border-left: 5px solid #2ECC71; }
    .toast.error { border-left: 5px solid #FF7675; }
    .toast.show { opacity: 1; transform: translateY(0); }
`;
document.head.appendChild(style);

// Create Container
const toastContainer = document.createElement('div');
toastContainer.className = 'toast-container';
document.body.appendChild(toastContainer);

window.showToast = function(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = message;
    
    toastContainer.appendChild(toast);
    
    // Trigger Animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
};
