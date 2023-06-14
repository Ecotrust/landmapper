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
})();