/* global CONFIG */

document.addEventListener('DOMContentLoaded', () => {

  const isRight = CONFIG.sidebar.position === 'right';

  const sidebarToggleMotion = {
    mouse: {},
    init : function() {
      window.addEventListener('mousedown', this.mousedownHandler.bind(this));
      window.addEventListener('mouseup', this.mouseupHandler.bind(this));
      document.querySelector('.sidebar-dimmer').addEventListener('click', this.clickHandler.bind(this));
      document.querySelector('.sidebar-toggle').addEventListener('click', this.clickHandler.bind(this));
      window.addEventListener('sidebar:show', this.showSidebar);
      window.addEventListener('sidebar:hide', this.hideSidebar);
    },
    mousedownHandler: function(event) {
      this.mouse.X = event.pageX;
      this.mouse.Y = event.pageY;
      this.mouse.target = event.target;
      this.mouse.button = event.button;
    },
    mouseupHandler: function(event) {
      if (event.button !== 0 || this.mouse.button !== 0) return;
      const deltaX = event.pageX - this.mouse.X;
      const deltaY = event.pageY - this.mouse.Y;
      const clickingBlankPart = Math.hypot(deltaX, deltaY) < 20 && event.target === this.mouse.target &&
        event.target.matches('.main') && window.getSelection().isCollapsed;
      if (clickingBlankPart) {
        this.clickHandler();
        return;
      }
      // Fancybox has z-index property, but medium-zoom does not, so the sidebar will overlay the zoomed image.
      if (event.target.matches('img.medium-zoom-image')) {
        this.hideSidebar();
      }
    },
    clickHandler: function() {
      document.body.classList.contains('sidebar-active') ? this.hideSidebar() : this.showSidebar();
    },
    showSidebar: function() {
      document.body.classList.add('sidebar-active');
      const animateAction = isRight ? 'fadeInRight' : 'fadeInLeft';
      document.querySelectorAll('.sidebar .animated').forEach((element, index) => {
        element.style.animationDelay = (100 * index) + 'ms';
        element.classList.remove(animateAction);
        setTimeout(() => {
          // Trigger a DOM reflow
          element.classList.add(animateAction);
        });
      });
    },
    hideSidebar: function() {
      document.body.classList.remove('sidebar-active');
    }
  };
  if (CONFIG.sidebar.display !== 'remove') sidebarToggleMotion.init();

  function updateFooterPosition() {
    const footer = document.querySelector('.footer');
    const containerHeight = document.querySelector('.main').offsetHeight + footer.offsetHeight;
    footer.classList.toggle('footer-fixed', containerHeight <= window.innerHeight);
  }

  updateFooterPosition();
  window.addEventListener('resize', updateFooterPosition);
  window.addEventListener('scroll', updateFooterPosition, { passive: true });
});
