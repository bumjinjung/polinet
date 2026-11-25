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
  // phones: every sack in a row you can swipe; CSS shows it only on narrow screens
  const stage = document.querySelector('.bag-stage');
  const rail = document.createElement('div');
  rail.className = 'bag-rail';
  const railBags = tabs.map((t) => {
    const fig = document.createElement('figure');
    fig.className = 'rail-bag';
    const im = new Image(547, 900);
    im.src = t.dataset.img; im.alt = ''; im.decoding = 'async';
    fig.append(im);
    rail.append(fig);
    return fig;
  });
  stage.append(rail);
  stage.classList.add('has-rail');
  const railOn = () => rail.offsetParent !== null;
  const railTo = (i, smooth) => {
    const b = railBags[i];
    rail.scrollTo({ left: b.offsetLeft - (rail.clientWidth - b.offsetWidth) / 2, behavior: smooth && !reduce.matches ? 'smooth' : 'auto' });
  };
  const markRail = (i) => railBags.forEach((b, j) => b.classList.toggle('is-active', i === j));
  let fromRail = false;
  // phones: the chosen chip sits in the middle of the chip row, like its sack below
  const tabList = tabs[0].parentElement;
  const chipTo = (i, smooth) => {
    const c = tabs[i];
    tabList.scrollTo({ left: c.offsetLeft - (tabList.clientWidth - c.offsetWidth) / 2, behavior: smooth && !reduce.matches ? 'smooth' : 'auto' });
  };

  const select = (i, save = true) => {
    current = i;
    tabs.forEach((t, j) => { const on = i === j; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
    shown = -1;
    show(i);
    markRail(i);
    if (railOn()) {
      if (!fromRail) railTo(i, save);
      chipTo(i, save);
    }
    if (save) remember('product', tabs[i].dataset.filter);
  };

  // swiping the sacks picks the one that settles in the middle
  const centred = () => {
    const mid = rail.scrollLeft + rail.clientWidth / 2;
    let best = 0;
    railBags.forEach((b, j) => {
      if (Math.abs(b.offsetLeft + b.offsetWidth / 2 - mid) < Math.abs(railBags[best].offsetLeft + railBags[best].offsetWidth / 2 - mid)) best = j;
    });
    return best;
  };
  let settle;
  rail.addEventListener('scroll', () => {
    markRail(centred());
    clearTimeout(settle);
    settle = setTimeout(() => {
      const i = centred();
      if (i !== current) { fromRail = true; select(i); fromRail = false; }
    }, 120);
  }, { passive: true });
  railBags.forEach((b, i) => b.addEventListener('click', () => select(i)));

  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(i));
    t.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') show(i); });
  });
  tabList.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') show(current); });
  keyNav(tabs, (i) => select(i));
  const startProduct = tabs.findIndex((t) => t.dataset.filter === params.get('product'));
  select(Math.max(0, startProduct), false);
  // place the rail once layout is known, and again when the screen turns or resizes
  const placeRows = () => { if (railOn()) { railTo(current, false); chipTo(current, false); } };
  requestAnimationFrame(placeRows);
  addEventListener('resize', placeRows);

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
