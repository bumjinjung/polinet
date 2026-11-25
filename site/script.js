(() => {
  const header = document.getElementById('header');
  const navMenu = document.getElementById('navMenu');
  const menuBtn = document.getElementById('mobileMenuBtn');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const params = new URLSearchParams(location.search);

  // ---------- mobile menu ----------
  const setMenu = (open) => {
    navMenu.classList.toggle('active', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
  };
  menuBtn.addEventListener('click', () => setMenu(!navMenu.classList.contains('active')));
  document.addEventListener('click', (e) => { if (!e.target.closest('#header')) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navMenu.classList.contains('active')) { setMenu(false); menuBtn.focus(); }
  });

  // ---------- tab lists: arrows, Home and End move between tabs ----------
  const keyNav = (list, choose) => list.forEach((t, i) => t.addEventListener('keydown', (e) => {
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    let next = null;
    if (step) next = (i + step + list.length) % list.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = list.length - 1;
    if (next === null) return;
    e.preventDefault();
    choose(next);
    list[next].focus();
  }));

  // keep the chosen tab in the address bar, without adding history entries
  const remember = (key, value) => {
    const p = new URLSearchParams(location.search);
    p.set(key, value);
    history.replaceState(history.state, '', `${location.pathname}?${p}${location.hash}`);
  };

  // ---------- products: hover previews, click selects ----------
  const tabs = [...document.querySelectorAll('.tab')];
  const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
  const bag = document.getElementById('stageBag');
  let current = 0;
  let shown = -1;

  const show = (i) => {
    if (i === shown) return;
    shown = i;
    panels.forEach((p, j) => { p.hidden = i !== j; });
    tabs.forEach((t, j) => t.classList.toggle('is-preview', j === i && i !== current));
    bag.src = tabs[i].dataset.img;
    if (!reduce.matches && bag.animate) {
      bag.animate([{ opacity: 0, transform: 'translateY(-20px)' }, { opacity: 1, transform: 'none' }],
        { duration: 300, easing: 'cubic-bezier(.3,.8,.3,1)' });
    }
  };
  const select = (i, save = true) => {
    current = i;
    tabs.forEach((t, j) => { const on = i === j; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
    shown = -1;
    show(i);
    if (save) remember('product', tabs[i].dataset.filter);
  };
  const tabList = tabs[0].parentElement;
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(i));
    t.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') show(i); });
  });
  tabList.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') show(current); });
  keyNav(tabs, (i) => select(i));
  const startProduct = tabs.findIndex((t) => t.dataset.filter === params.get('product'));
  select(Math.max(0, startProduct), false);

  // ---------- applications ----------
  const aTabs = [...document.querySelectorAll('.seg-tab')];
  const aPanels = aTabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
  const aSelect = (i, save = true) => {
    aTabs.forEach((t, j) => { const on = i === j; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; aPanels[j].hidden = !on; });
    if (save) remember('use', aTabs[i].id.replace('at-', ''));
  };
  aTabs.forEach((t, i) => t.addEventListener('click', () => aSelect(i)));
  keyNav(aTabs, (i) => aSelect(i));
  const startUse = aTabs.findIndex((t) => t.id === 'at-' + params.get('use'));
  aSelect(Math.max(0, startUse), false);

  // ---------- in-page links: scroll, move focus there, keep the hash ----------
  const goTo = (target, smooth) => {
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.scrollIntoView({ behavior: smooth && !reduce.matches ? 'smooth' : 'auto' });
    target.focus({ preventScroll: true });
  };
  document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    const target = id.length > 1 && document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    history.pushState(null, '', id);
    goTo(target, true);
    setMenu(false);
  }));

  // ---------- mark the screen in view in the nav ----------
  const links = [...document.querySelectorAll('.nav-link')];
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) links.forEach((l) => l.classList.toggle('active', l.getAttribute('href') === '#' + en.target.id));
  }), { threshold: 0.55 });
  document.querySelectorAll('.screen').forEach((s) => io.observe(s));
})();
