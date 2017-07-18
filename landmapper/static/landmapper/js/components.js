$(document).ready(function() {
  $(".button-collapse").sideNav();

  $('.t1').tapTarget('open');

  window.setTimeout(function() {
    $('.t1').tapTarget('close');
  }, 2000);

  window.setTimeout(function() {
    $('.t2').tapTarget('open');
  }, 2200);

  window.setTimeout(function() {
    $('.t2').tapTarget('close');
  }, 4000);
});
