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
    // lazy: the row is hidden on wider screens, so these never download there
    im.loading = 'lazy'; im.decoding = 'async'; im.alt = ''; im.src = t.dataset.img;
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
  let railGoal = -1; // the sack the rail is gliding to after a tap; no picking on the way
  const tabList = tabs[0].parentElement;
  const bagMid = (i) => railBags[i].offsetLeft + railBags[i].offsetWidth / 2;
  const chipLeft = (i) => tabs[i].offsetLeft - (tabList.clientWidth - tabs[i].offsetWidth) / 2;
  // swiping the sacks: the sack nearest the middle
  const centred = () => {
    const mid = rail.scrollLeft + rail.clientWidth / 2;
    let best = 0;
    railBags.forEach((b, j) => { if (Math.abs(bagMid(j) - mid) < Math.abs(bagMid(best) - mid)) best = j; });
    return best;
  };
  // phones: the chip row moves with the sack row, so the chip in the middle always matches the sack in the middle
  const syncChips = () => {
    const mid = rail.scrollLeft + rail.clientWidth / 2;
    let k = 0;
    while (k < railBags.length - 2 && mid > bagMid(k + 1)) k++;
    const t = Math.min(1, Math.max(0, (mid - bagMid(k)) / (bagMid(k + 1) - bagMid(k))));
    tabList.scrollLeft = chipLeft(k) + t * (chipLeft(k + 1) - chipLeft(k));
  };

  const select = (i, save = true) => {
    current = i;
    tabs.forEach((t, j) => { const on = i === j; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
    shown = -1;
    show(i);
    markRail(i);
    if (railOn() && !fromRail) {
      if (centred() !== i) railGoal = i;
      railTo(i, save);
      syncChips();
    }
    if (save) remember('product', tabs[i].dataset.filter);
  };

  // at most once per frame: read where the row is, then move the chips to match
  let railFrame = 0;
  const onRail = () => {
    railFrame = 0;
    syncChips();
    const i = centred();
    markRail(i);
    if (railGoal !== -1) { if (i === railGoal) railGoal = -1; return; }
    if (i !== current) { fromRail = true; select(i); fromRail = false; }
  };
  rail.addEventListener('scroll', () => { if (!railFrame) railFrame = requestAnimationFrame(onRail); }, { passive: true });
  rail.addEventListener('pointerdown', () => { railGoal = -1; });
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
  // the product tabs stand in a column only on wide screens; elsewhere they run in a row (the default)
  const tallTabs = matchMedia('not all and (max-width: 64rem)');
  const orient = () => { if (tallTabs.matches) tabList.setAttribute('aria-orientation', 'vertical'); else tabList.removeAttribute('aria-orientation'); };
  orient();
  tallTabs.addEventListener('change', orient);
  const placeRows = () => { if (railOn()) { railTo(current, false); syncChips(); } };
  requestAnimationFrame(placeRows);
  addEventListener('resize', placeRows);

  // ---------- applications ----------
  const aTabs = [...document.querySelectorAll('.seg-tab')];
  const aPanels = aTabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
  // phones: the cases sit in a sideways row; previous / next step through it and the counter says where you are
  const caseCount = document.querySelector('.case-count');
  let aCurrent = 0;
  const caseStart = (panel, fig) => fig.offsetLeft - parseFloat(getComputedStyle(panel).scrollPaddingInlineStart || 0);
  const caseAt = (panel) => {
    const figs = [...panel.children];
    if (panel.scrollLeft >= panel.scrollWidth - panel.clientWidth - 2) return figs.length - 1;
    let best = 0;
    figs.forEach((f, j) => { if (Math.abs(caseStart(panel, f) - panel.scrollLeft) < Math.abs(caseStart(panel, figs[best]) - panel.scrollLeft)) best = j; });
    return best;
  };
  const countCases = () => {
    const panel = aPanels[aCurrent];
    const text = `${caseAt(panel) + 1} / ${panel.children.length}`;
    if (caseCount.textContent !== text) caseCount.textContent = text;
  };
  document.querySelectorAll('.case-step').forEach((b) => b.addEventListener('click', () => {
    const panel = aPanels[aCurrent];
    const n = panel.children.length;
    const next = (caseAt(panel) + Number(b.dataset.step) + n) % n; // past either end it wraps round
    panel.scrollTo({ left: caseStart(panel, panel.children[next]), behavior: reduce.matches ? 'auto' : 'smooth' });
  }));
  aPanels.forEach((p) => {
    let frame = 0;
    p.addEventListener('scroll', () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; countCases(); }); }, { passive: true });
  });

  const aSelect = (i, save = true) => {
    aCurrent = i;
    aTabs.forEach((t, j) => { const on = i === j; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; aPanels[j].hidden = !on; });
    countCases();
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

  // ---------- snap whole screens only when every screen fits the window ----------
  const wide = matchMedia('(min-width: 64rem) and (min-height: 700px)');
  const screens = [...document.querySelectorAll('.screen')];
  const fitSnap = () => document.documentElement.classList.toggle('snap',
    wide.matches && screens.every((s) => s.offsetHeight <= innerHeight + 1));
  const fitWatch = new ResizeObserver(fitSnap);
  screens.forEach((s) => fitWatch.observe(s));
  addEventListener('resize', fitSnap);
  fitSnap();

  // ---------- mark the screen in view in the nav ----------
  const links = [...document.querySelectorAll('.nav-link')];
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) links.forEach((l) => l.classList.toggle('active', l.getAttribute('href') === '#' + en.target.id));
  }), { threshold: 0.55 });
  document.querySelectorAll('.screen').forEach((s) => io.observe(s));
})();
