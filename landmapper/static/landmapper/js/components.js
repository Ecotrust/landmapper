$(document).ready(function() {
  $(".button-collapse").sideNav();
  $('.tooltipped').tooltip({delay: 50});
  $('#help').on('click', function() {
    $('.t1').tapTarget('open');
    window.setTimeout(function() {
      Materialize.showStaggeredList('#start-steps');
    }, 1000);

    window.setTimeout(function() {
      $('.t1').tapTarget('close');
    }, 5000);

    window.setTimeout(function() {
      $('.t2').tapTarget('open');
      window.setTimeout(function() {
        Materialize.showStaggeredList('#start-step3');
      }, 1000);
    }, 5500);

    window.setTimeout(function() {
      $('.t2').tapTarget('close');
    }, 10000);
  });
});
