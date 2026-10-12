// Externalized from Untitled-1.html; original script order preserved.
(function(){


  function enforceRoleNavbar(){
    const nav=document.querySelector('.navbar');
    if(!nav) return;
    const adminPage=document.getElementById('page-admin');
    const techPage=document.getElementById('page-technician');
    const roleActive=!!(
      (adminPage && adminPage.classList.contains('active')) ||
      (techPage && techPage.classList.contains('active'))
    );
    document.body.classList.toggle('role-session-active', roleActive);
    nav.classList.toggle('role-session-navbar-hidden', roleActive);
    if(roleActive){
      nav.setAttribute('hidden','hidden');
      nav.style.setProperty('display','none','important');
      nav.style.setProperty('visibility','hidden','important');
      nav.style.setProperty('pointer-events','none','important');
    }else{
      nav.removeAttribute('hidden');
      nav.style.removeProperty('display');
      nav.style.removeProperty('visibility');
      nav.style.removeProperty('pointer-events');
    }
  }
  window.__LERESSAE_ENFORCE_ROLE_NAVBAR__=enforceRoleNavbar;
  document.addEventListener('DOMContentLoaded', function(){
    enforceRoleNavbar();
    setTimeout(enforceRoleNavbar,100);
    setTimeout(enforceRoleNavbar,500);
  });
  window.addEventListener('storage', enforceRoleNavbar);
  const originalSync=window.syncRoleNavbar;
  if(typeof originalSync==='function'){
    window.syncRoleNavbar=function(){
      const result=originalSync.apply(this,arguments);
      enforceRoleNavbar();
      return result;
    };
  }
  const observer=new MutationObserver(enforceRoleNavbar);
  observer.observe(document.documentElement,{subtree:true,childList:true});
})();
