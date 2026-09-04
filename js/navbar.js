/**
 * navbar.js — Gestion du menu hamburger responsive
 * Inclure après le DOM : <script src="js/navbar.js"></script>
 */
(function () {
    function initNavbar() {
        const toggle = document.getElementById('nav-toggle');
        const nav = document.getElementById('main-nav');
        const header = document.getElementById('main-header');

        if (!toggle || !nav || !header) return;

        // Ouvrir / fermer le menu
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = nav.classList.toggle('open');
            toggle.classList.toggle('open', isOpen);
            toggle.setAttribute('aria-expanded', String(isOpen));
        });

        // Fermer en cliquant en dehors
        document.addEventListener('click', (e) => {
            if (!header.contains(e.target)) {
                nav.classList.remove('open');
                toggle.classList.remove('open');
                toggle.setAttribute('aria-expanded', 'false');
            }
        });

        // Fermer après clic sur un lien
        nav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                nav.classList.remove('open');
                toggle.classList.remove('open');
                toggle.setAttribute('aria-expanded', 'false');
            });
        });

        // Shadow au scroll
        window.addEventListener('scroll', () => {
            header.classList.toggle('scrolled', window.scrollY > 10);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNavbar);
    } else {
        initNavbar();
    }
})();
