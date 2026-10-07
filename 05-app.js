// Externalized from Untitled-1.html; original script order preserved.
(function(){
    function restoreRoleAfterRefresh(){
        try {
            if(typeof window.isAdminLoggedIn==='function' && window.isAdminLoggedIn()) {
                const allowed=['dashboard','services','running','completed','customers','technicians','stock','locations','media','news','reports','settings'];
                const saved=typeof window.getSavedRolePage==='function' ? window.getSavedRolePage('admin') : '';
                const target=allowed.includes(saved)?saved:'dashboard';
                if(typeof window.showAdminPage==='function') window.showAdminPage(target,{resetHistory:true,fromRefresh:true});
                if(typeof window.syncRoleNavbar==='function') window.syncRoleNavbar();
                return;
            }
            if(typeof window.isTechnicianLoggedIn==='function' && window.isTechnicianLoggedIn()) {
                const allowed=['dashboard','clients','status','stock','profile'];
                const saved=typeof window.getSavedRolePage==='function' ? window.getSavedRolePage('technician') : '';
                const target=allowed.includes(saved)?saved:'dashboard';
                window.__LERESSAE_TECH_HISTORY=[target];
                if(typeof window.renderTechnicianPanelPage==='function') {
                    window.renderTechnicianPanelPage();
                }
                if(typeof window.renderTechView==='function') {
                    window.renderTechView(target,{resetHistory:true});
                }
                if(typeof window.syncRoleNavbar==='function') window.syncRoleNavbar();
            }
        } catch(error) {
            console.warn('Pemulihan halaman sesi setelah refresh gagal:',error);
        }
    }
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',restoreRoleAfterRefresh,{once:true});
    else restoreRoleAfterRefresh();
    window.addEventListener('load',restoreRoleAfterRefresh,{once:true});
})();
