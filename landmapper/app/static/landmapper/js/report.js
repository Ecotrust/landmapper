(function() {
var shareLinks = document.querySelectorAll('.copy-link');
for (var i = 0; i < shareLinks.length; i++) {
  shareLinks[i].addEventListener('click', function(e) {
    var mapDiv = e.target.closest('.section-report');
    var url = window.location.href
    const el = document.createElement('textarea');
    el.value = url.split('#')[0] + '#' + mapDiv.id;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    window.alert('URL has been copied to your clipboard')
  })
}

/**
 * Add href to the copy to account button
 * redirects user back to the report after signing in or creating an account
 */
let copyToAccountBtn = document.querySelector('#copy-to-account');
let documentPathSplit = document.location.pathname.split('/');
let documentPropertyIdSplit = documentPathSplit[documentPathSplit.length - 1].split('%7C');
// copyToUserId is defined in report-overview.html template
if (typeof(copyToUserId) !== 'undefined') {
  documentPropertyIdSplit[1] = copyToUserId;
}
let newPropertyID = documentPropertyIdSplit.join('%7C');
if (copyToAccountBtn) {
  copyToAccountBtn.href = `/landmapper/report/${newPropertyID}`;
}

  
  /**
   *  Add event listener to the export layer button
   */
  function exportLayerHandler() {
    const propertyPk = this.getAttribute('data-property-id');
    const propertyName = this.getAttribute('data-property-name');
    const exportLayerButton = this;

    // Disable the button to prevent multiple clicks
    exportLayerButton.disabled = true;

    fetch(`/export_layer/${propertyPk}/shp`, {
      method: 'GET',
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      }
    })
      .then(response => response.ok ? response.blob() : response.text().then(text => { throw new Error(text); }))
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${propertyName}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      })
      .catch(error => {
        console.error('Error:', error);
        alert('An error occurred while exporting the layer.');
      })
      .finally(() => {
        exportLayerButton.disabled = false;
      });
  }

  function setupExportLayerButton() {
    const exportLayerButton = document.getElementById('export-layer-button');
    if (exportLayerButton) {
      exportLayerButton.addEventListener('click', exportLayerHandler);
    }
  }

  function init() {
    setupExportLayerButton();
  }

  document.addEventListener('DOMContentLoaded', init);
  
})();