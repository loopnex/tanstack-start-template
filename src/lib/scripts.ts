/**
 * Inline scripts injected into <head> before React hydrates.
 * They run synchronously on page load to avoid flashes of unstyled content.
 */

// Dark mode script
export const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);root.style.colorScheme=resolved;}catch(e){}})();`

// Dashboard Sidebar state script
export const SIDEBAR_INIT_SCRIPT = `(function(){try{var v=window.localStorage.getItem('sidebar-open');if(v==='false')document.documentElement.classList.add('sidebar-collapsed');}catch(e){}})();`
