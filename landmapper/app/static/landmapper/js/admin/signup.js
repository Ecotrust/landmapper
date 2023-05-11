const next = window.location.search.split('?next=')[1] ? window.location.search.split('?next=')[1] : '/';
document.querySelector('#signup_form').action = `/auth/signup/?next=/${next}`;