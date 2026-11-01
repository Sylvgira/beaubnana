document.addEventListener('DOMContentLoaded', function() {
  console.log('Include.js loaded and running');
  
  // Navbar and footer inclusion is now handled by the build process (scripts/include-common-elements.js).
  // The getRelativePath function and includeHTML calls for navbar and footer have been removed.
  // The current year in the footer is also set during the build process.

  // If you have other HTML content to include dynamically, you can adapt the old includeHTML function here.
  // For example:
  /*
  const getRelativePath = () => { // Simplified or adjusted as needed
    // ... logic to determine base path if still needed for other includes
    return ''; // or appropriate path
  };

  const includeHTML = (elementId, filePath) => {
    const element = document.getElementById(elementId);
    if (element) {
      const relativePath = getRelativePath(); // Or determine path directly
      const url = `${relativePath}${filePath}`;
      fetch(url)
        .then(response => {
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status} loading ${filePath}`);
          return response.text();
        })
        .then(data => {
          element.innerHTML = data;
        })
        .catch(error => {
          console.error('Error fetching include file:', error);
          element.innerHTML = `<p style="color: red;">Error loading ${elementId}.</p>`;
        });
    }
  };

  // Example: includeHTML('my-other-placeholder', 'includes/my-other-content.html');
  */
});
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
