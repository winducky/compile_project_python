document.addEventListener('DOMContentLoaded', function () {
    AOS.init({
        duration: 600,
        once: true,
        offset: 50,
        disable: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    });
});
