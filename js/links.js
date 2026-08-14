document.addEventListener('DOMContentLoaded', function() {
  var filterBtns = document.querySelectorAll('.links-filter-btn');
  var cards = document.querySelectorAll('.link-card');
  var searchInput = document.querySelector('.links-search input');
  var emptyMsg = document.querySelector('.links-empty');
  var activeCategory = 'all';

  if (!filterBtns.length || !cards.length) return;

  function filterCards() {
    var query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    var visibleCount = 0;

    for (var i = 0; i &lt; cards.length; i++) {
      var card = cards[i];
      var categoryMatch = activeCategory === 'all' || card.getAttribute('data-category') === activeCategory;
      var name = (card.getAttribute('data-name') || '').toLowerCase();
      var desc = (card.getAttribute('data-desc') || '').toLowerCase();
      var textMatch = !query || name.indexOf(query) !== -1 || desc.indexOf(query) !== -1;

      if (categoryMatch &amp;&amp; textMatch) {
        card.style.display = '';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    }

    if (emptyMsg) {
      emptyMsg.style.display = visibleCount === 0 ? 'block' : 'none';
    }
  }

  for (var i = 0; i &lt; filterBtns.length; i++) {
    (function(btn) {
      btn.addEventListener('click', function() {
        for (var j = 0; j &lt; filterBtns.length; j++) {
          filterBtns[j].classList.remove('active');
        }
        btn.classList.add('active');
        activeCategory = btn.getAttribute('data-category');
        filterCards();
      });
    })(filterBtns[i]);
  }

  if (searchInput) {
    searchInput.addEventListener('input', filterCards);
  }
});
