document.addEventListener('DOMContentLoaded', () => {
    [['.filter_filters-button', '.filter_filters-modal'], ['.dropdown_toggle', '.dropdown_dropdown-list']].forEach(([controlSelector, panelSelector], index) => {
        const control = document.querySelector(controlSelector), panel = document.querySelector(panelSelector);
        if (!control || !panel) return;
        panel.id = `catalogue-popover-${index}`;
        control.setAttribute('aria-controls', panel.id);
        control.setAttribute('aria-expanded', 'false');
        control.setAttribute('role', 'button');
        const sync = () => control.setAttribute('aria-expanded', String(panel.classList.contains('is-open')));
        new MutationObserver(sync).observe(panel, {attributes:true, attributeFilter:['class']});
        control.addEventListener('keydown', event => {
            if (event.key === ' ' && control.tagName !== 'BUTTON') { event.preventDefault(); control.click(); }
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && panel.classList.contains('is-open')) {
                panel.classList.remove('is-open'); control.focus();
            }
        });
    });
});
