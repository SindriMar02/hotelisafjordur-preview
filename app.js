/* Westman Islands — THE CROSSING. Vanilla + GSAP ScrollTrigger; Lenis on desktop pointers only.
   Pinning is CSS position:sticky everywhere (no ScrollTrigger pin), scroll only drives transforms.
   Devices ported from 21st.dev and re-choreographed: Scroll Choreography (the crossing),
   Scroll Reveal Image (their words), Text Reveal Mask (headlines), Sticky Content Wrapper
   (the island), Kinetic Scroll Gallery (property galleries). Map machine from Kerbyggð/Holt. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var touch = matchMedia('(hover: none) and (pointer: coarse)').matches;
  var mdUp = function () { return matchMedia('(min-width: 900px)').matches; };
  var VW = function () { return document.documentElement.clientWidth; };
  var VH = function () { return window.innerHeight; };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var hasGsap = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  /* ---- smooth scroll: desktop pointers only, never on touch (lenis-mobile-damage) ---- */
  var lenis = null;
  if (hasGsap && !reduce && !touch && typeof Lenis !== 'undefined') {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.9, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  var scrollTo = function (target) {
    var el = typeof target === 'string' ? $(target) : target; if (!el) return;
    var top = el.getBoundingClientRect().top + window.scrollY - 8;
    if (lenis) lenis.scrollTo(top, { duration: 1.4 }); else window.scrollTo({ top: top, behavior: reduce ? 'auto' : 'smooth' });
  };
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href'); if (id.length < 2 || !$(id)) return;
      e.preventDefault(); closeMenu(); scrollTo(id); history.replaceState(null, '', id);
    });
  });

  /* ---- lazy images from the ladders the manifest actually produced ---- */
  var lazy = (function () {
    var imgs = $$('img[data-src]');
    var load = function (img) {
      if (img.dataset.done) return; img.dataset.done = '1';
      var base = img.dataset.src, ws = img.dataset.w.split(/\s+/).map(Number);
      // Nearly every frame here is object-fit:cover, so the browser renders it WIDER than its box
      // whenever the box is taller in proportion than the photograph. Sizing from the box width
      // under-declared the whole build and the browser picked rungs for a slot half the size.
      // The width/height attributes carry the real aspect, so derive the cover width from them.
      var _r = img.getBoundingClientRect();
      var _aw = +img.getAttribute('width'), _ah = +img.getAttribute('height');
      var _cover = (_aw && _ah && _r.height) ? Math.max(_r.width, _r.height * (_aw / _ah)) : _r.width;
      var frac = clamp(_cover / VW(), 0.25, 3);
      // A frame that is scaled down at load time (the crossing's hero plate) or drawn larger
      // than the viewport (the map sheet) must not size itself from its box, or it locks in a
      // candidate far too small for what it grows into.
      img.sizes = img.dataset.sizes || (Math.ceil(frac * 100 / 5) * 5) + 'vw';
      img.srcset = ws.map(function (w) { return base + '@' + w + '.webp ' + w + 'w'; }).join(', ');
      img.src = base + '@' + ws[ws.length - 1] + '.webp';
      img.decoding = 'async';
    };
    if (!('IntersectionObserver' in window)) { imgs.forEach(load); return { load: load }; }
    var groups = $$('[data-img-group]');
    if (groups.length) {
      var gio = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { $$('img[data-src]', e.target).forEach(load); gio.unobserve(e.target); } });
      }, { rootMargin: '1200px 0px' });
      groups.forEach(function (g) { gio.observe(g); });
    }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { load(e.target); io.unobserve(e.target); } }); }, { rootMargin: '900px 1200px' });
    imgs.forEach(function (i) { io.observe(i); });
    return { load: load };
  })();

  /* ---- menu ---- */
  var burger = $('.hi-burger'), menu = $('.hi-menu'), scrollY0 = 0;
  function openMenu() {
    if (!menu) return; scrollY0 = window.scrollY;
    menu.classList.add('is-open'); menu.setAttribute('aria-hidden', 'false'); burger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('hi-locked'); document.body.style.top = -scrollY0 + 'px'; var m = $('#main'); if (m) m.inert = true;
    if (lenis) lenis.stop();
  }
  function closeMenu() {
    if (!menu || !menu.classList.contains('is-open')) return;
    menu.classList.remove('is-open'); menu.setAttribute('aria-hidden', 'true'); burger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('hi-locked'); document.body.style.top = ''; window.scrollTo(0, scrollY0); var m = $('#main'); if (m) m.inert = false;
    if (lenis) lenis.start();
  }
  if (burger) burger.addEventListener('click', function () { menu.classList.contains('is-open') ? closeMenu() : openMenu(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

  /* ---- reveals: split lines under a mask, slide up (Text Reveal Mask, ported) ---- */
  function splitLines(el) {
    if (el.dataset.split) return; el.dataset.split = '1';
    var text = el.textContent.trim(), words = text.split(/\s+/);
    el.setAttribute('aria-label', text);
    el.innerHTML = words.map(function (w) { return '<span class="hi-w">' + w + '</span>'; }).join(' ');
    var spans = $$('.hi-w', el), lines = [], last = -1;
    spans.forEach(function (s) { var t = s.offsetTop; if (t !== last) { lines.push([]); last = t; } lines[lines.length - 1].push(s.textContent); });
    el.innerHTML = lines.map(function (l, i) { return '<span class="hi-rl" aria-hidden="true"><span style="--hi-i:' + i + '">' + l.join(' ') + '</span></span>'; }).join('');
  }
  function armReveals() {
    var reveals = $$('[data-reveal]'), rises = $$('[data-rise]');
    if (reduce) { reveals.concat(rises).forEach(function (el) { el.classList.add('is-in'); }); return; }
    reveals.forEach(splitLines);
    var all = reveals.concat(rises);
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -12% 0px', threshold: 0.01 });
    all.forEach(function (el) { io.observe(el); });
    var resplit = function () { reveals.forEach(function (el) { if (!el.classList.contains('is-in')) { delete el.dataset.split; el.textContent = el.getAttribute('aria-label'); splitLines(el); } }); };
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(resplit, 200); });
  }
  var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  ready.then(function () { requestAnimationFrame(armReveals); });

  /* ---- the Heklusýn drift: every .hi-drift frame's img drifts -p*d% as the frame crosses the viewport ---- */
  (function () {
    var frames = $$('.hi-drift'); if (!frames.length || reduce) return;
    frames.forEach(function (f) { var d = Number(f.dataset.drift || 9); f.style.setProperty('--dz', Math.max(10, d * 1.7) + '%'); });
    var tick = function () {
      var vh = VH(), writes = [];
      for (var i = 0; i < frames.length; i++) {
        var f = frames[i], img = f.firstElementChild; if (!img) continue;
        var ref = f.dataset.driftRef ? f.closest(f.dataset.driftRef) : null;
        var r = (ref || f).getBoundingClientRect(); if (r.bottom < -240 || r.top > vh + 240) continue;
        var d = Number(f.dataset.drift || 9), p;
        if (ref) { // a pinned stage: the frame itself never crosses the viewport, so sweep -1..1 across the pin
          var travel = Math.max(1, r.height - vh); p = 1 - 2 * clamp(-r.top / travel, 0, 1);
        } else p = clamp((r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2), -1, 1);
        writes.push([img, 'translate3d(0,' + (-p * d).toFixed(2) + '%,0)']);
      }
      for (var k = 0; k < writes.length; k++) writes[k][0].style.transform = writes[k][1];
    };
    if (hasGsap) gsap.ticker.add(tick); else (function loop() { tick(); requestAnimationFrame(loop); })();
    tick();
  })();

  /* ---- the arrival: the name is set letter by letter over the painting, then the rule draws
     out from the centre and the line under it rises. CSS holds the choreography; this only
     builds the letters and fires the class once the fonts are in. ---- */
  (function () {
    var hero = $('.hi-hero') || $('.hi-phero'); if (!hero) return;
    var media = $('.hi-hero__media, .hi-phero__media', hero);
    var word = $('.js-intro-word', hero), tag = $('.js-intro-tag', hero);
    if (word && word.dataset.word) {
      // one span per WORD, letters inside it, nothing allowed to break mid-word: ÍSAFJÖRÐUR at
      // this tracking is far too long to share a line with HÓTEL, and letting flex wrap it split
      // the name across two lines mid-word. See icelandic-titles-break-a-display-scale.
      var n = 0;
      word.innerHTML = word.dataset.word.split(' ').map(function (w) {
        return '<span class="hi-intro__w">' + w.split('').map(function (ch) {
          return '<i style="--i:' + (n++) + '">' + ch + '</i>';
        }).join('') + '</span>';
      }).join('');
    }
    if (tag && !tag.firstElementChild) tag.innerHTML = '<span>' + tag.textContent + '</span>';
    ready.then(function () { requestAnimationFrame(function () {
      hero.classList.add('is-in'); if (media) media.classList.add('is-in');
    }); });
    if (!hasGsap || reduce) return;
    var inner = $('.hi-hero__in, .hi-phero__in', hero);
    // the whole lockup lifts and thins away as the stage is scrolled off; the painting stays put
    if (inner) gsap.to(inner, { yPercent: -14, opacity: 0, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: hero.classList.contains('hi-hero') ? '58% top' : 'bottom top', scrub: true } });
    if (media) gsap.fromTo(media, { scale: 1 }, { scale: 1.05, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
  })();

  /* ---- the bar takes its glass only once the hero is behind you. DESKTOP ONLY: below 1024px
     the mobile chrome standard applies untouched (constant bar, awning, no listener). ---- */
  (function () {
    var bar = $('.hi-bar'); if (!bar) return;
    var desk = matchMedia('(min-width: 1024px)');
    var hero = $('.hi-hero');
    var solid = null;
    var tick = function () {
      if (!desk.matches) { if (solid !== null) { bar.classList.remove('is-solid'); solid = null; } return; }
      // Clear over the landing hero only. The property pages keep the glass bar from first paint:
      // their heroes are mid-tone photographs and an ink marque on them is not a contrast bet worth
      // taking for a page nobody complained about.
      var want = hero ? hero.getBoundingClientRect().bottom <= VH() * 0.6 : true;
      if (want === solid) return; solid = want;
      bar.classList.toggle('is-solid', want);
    };
    tick();
    if (hasGsap) gsap.ticker.add(tick); else (function loop() { tick(); requestAnimationFrame(loop); })();
    desk.addEventListener('change', function () { solid = null; tick(); });
  })();

  /* ---- THE CROSSING: the postcards rise into a spread, drift past each other, gather, and the
     harbour opens (21st.dev Scroll Choreography, re-choreographed). At progress 0 every frame is
     held BELOW the stage, so during the approach - while the sticky stage is still crossing the
     fold and is only partly on screen - there is nothing to see but the ground. Starting them in
     the spread is what made the section look broken the first time it scrolled in. ---- */
  (function () {
    var section = $('.hi-cross'), stage = $('.js-cross'); if (!section || !stage || !hasGsap || reduce) return;
    var frames = $$('.js-cf', stage), lines = $$('.js-cl', stage), count = $('.js-cross-count'), scrim = $('.js-cross-scrim');
    var hero = frames[3];
    // the hero frame is viewport-sized and scaled DOWN, so its expansion is transform-only and stays crisp
    gsap.set(hero, { width: '100vw', height: '100svh', aspectRatio: 'auto' });
    var small = function () { return mdUp() ? 0.36 : 0.34; };
    var P = function () { return mdUp() ? { x: 22, y: 15 } : { x: 14, y: 8 }; };
    var GY = function () { return mdUp() ? 0 : -17; };   // phones: the gathered stack sits above the caption
    // where each postcard rests once it has risen, and where it drifts to
    var SPREAD = [
      { x: function () { return -P().x; },       y: function () { return GY() - P().y; },        r: -3,   to: function () { return GY() + P().y; },        r2: -1.5 },
      { x: function () { return P().x; },        y: function () { return GY() - P().y; },        r: 2,    to: function () { return GY() - P().y * 0.4; },  r2: 2 },
      { x: function () { return -P().x * 0.9; }, y: function () { return GY() + P().y; },        r: 1.5,  to: function () { return GY() + P().y * 0.35; }, r2: 1.5 },
      { x: function () { return P().x * 0.9; },  y: function () { return GY() + P().y; },        r: -1,   to: function () { return GY() - P().y * 0.3; },  r2: 0.5 }
    ];
    var tl = gsap.timeline({ scrollTrigger: { trigger: section, start: 'top top', end: 'bottom bottom', scrub: 0.9, invalidateOnRefresh: true } });
    frames.forEach(function (f, i) {
      var s = SPREAD[i], isHero = i === 3;
      var base = { xPercent: -50, yPercent: -50, rotate: s.r };
      if (isHero) base.scale = small;
      // A: rise from below the fold into the spread
      tl.fromTo(f, Object.assign({}, base, {
        x: function () { return s.x() + 'vw'; },
        y: function () { return (s.y() + 125) + 'vh'; }
      }), {
        y: function () { return s.y() + 'vh'; }, ease: 'power2.out', duration: 0.15
      }, i * 0.025)
      // B: drift past each other
        .to(f, { y: function () { return s.to() + 'vh'; }, rotate: s.r2, ease: 'none', duration: 0.24 }, 0.18)
      // C: gather to the centre, a stack of four
        .to(f, { x: 0, y: function () { return GY() + 'vh'; }, rotate: 0, ease: 'power2.inOut', duration: 0.26 }, 0.46 + i * 0.015);
    });
    // D: the harbour opens
    tl.to(hero, { scale: 1, y: 0, ease: 'power2.inOut', duration: 0.22 }, 0.74)
      .to([frames[0], frames[1], frames[2]], { opacity: 0, ease: 'none', duration: 0.1 }, 0.8)
      .to({}, { duration: 0.04 });
    var setLine = function (i) {
      lines.forEach(function (l, k) { l.classList.toggle('is-on', k === i); l.classList.toggle('is-light', i === 3); });
      if (count) count.textContent = '0' + (i + 1) + ' / 04';
      if (scrim) scrim.classList.toggle('is-on', i === 3);
    };
    var last = -1;
    ScrollTrigger.create({ trigger: section, start: 'top top', end: 'bottom bottom', onUpdate: function (st) {
      var p = st.progress, i = p < 0.3 ? 0 : p < 0.52 ? 1 : p < 0.74 ? 2 : 3;
      if (i !== last) { last = i; setLine(i); }
    } });
    setLine(0);
  })();

  /* ---- their words: the plate unclips and settles (Scroll Reveal Image, ported to clip-path) ---- */
  (function () {
    var plate = $('.js-plate'); if (!plate || !hasGsap) return;
    var inner = plate.firstElementChild;
    gsap.set(plate, { width: '92vw', clipPath: 'inset(0% 24% 0% 24%)' });
    if (reduce) { gsap.set(plate, { clipPath: 'inset(0% 0% 0% 0%)' }); gsap.set(inner, { scale: 1 }); return; }
    gsap.to(plate, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: { trigger: plate, start: 'top 90%', end: 'top 12%', scrub: 0.8 } });
    gsap.fromTo(inner, { scale: 1.5 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: plate, start: 'top 90%', end: 'bottom 40%', scrub: 0.8 } });
  })();

  /* ---- the three doors: arrive one by one ---- */
  (function () {
    var doors = $$('.hi-door'); if (!doors.length || !hasGsap || reduce) return;
    gsap.from(doors.map(function (d) { return $('.hi-door__media img', d); }), { scale: 1.18, ease: 'power3.out', duration: 1.8, stagger: 0.12, scrollTrigger: { trigger: '.js-doors', start: 'top 75%', once: true } });
    gsap.from(doors.map(function (d) { return $('.hi-door__in', d); }), { y: 28, opacity: 0, ease: 'power3.out', duration: 1.1, stagger: 0.12, delay: 0.2, scrollTrigger: { trigger: '.js-doors', start: 'top 75%', once: true } });
  })();

  /* ---- THE ROW: one street, panned by the scroll ---- */
  (function () {
    var pin = $('.js-row'), track = $('.js-row-track'), lead = $('.js-row-lead'), railFill = $('.js-row-rail i b'); if (!pin || !track || !hasGsap || reduce) return;
    var build = function () {
      if (!mdUp()) return;
      gsap.to(track, { x: function () { return -(track.scrollWidth - VW()); }, ease: 'none', scrollTrigger: { trigger: pin, start: 'top top', end: 'bottom bottom', scrub: 1, invalidateOnRefresh: true, onUpdate: function (st) { if (railFill) railFill.style.transform = 'scaleX(' + st.progress.toFixed(3) + ')'; } } });
      // the counter-pan translates +/-3%, so the scale can never drop below 1 + 2*0.03 or an edge shows
      if (lead) gsap.fromTo(lead, { scale: 1.22, xPercent: -3 }, { scale: 1.12, xPercent: 3, ease: 'none', scrollTrigger: { trigger: pin, start: 'top top', end: 'bottom bottom', scrub: 1 } });
    };
    ScrollTrigger.matchMedia({ '(min-width: 900px)': build });
  })();

  /* ---- THE CROSSING MAP ---- */
  (function () {
    var pin = $('.js-map'), stage = $('.js-map-view') || $('.js-map-stage'), sheet = $('.js-map-sheet'); if (!pin || !sheet) return;
    var walker = $('.js-walker', sheet), goBtns = $$('.js-map-go'), walk = null;
    var routes = $$('.js-route', sheet), pins = $$('.hi-pin', sheet), steps = $$('.hi-map__step'), count = $('.js-map-count');
    var STOPS = [['airport', 'torg'], ['torg', 'horn'], ['torg', 'gamla'], ['torg', 'hostel'], ['torg', 'torfnes']];
    var lens = routes.map(function (r) { var L = r.getTotalLength(); r.style.strokeDasharray = L; r.style.strokeDashoffset = L; r.style.setProperty('--len', L); return L; });
    var SW = 1600, SH = 1280;
    var cur = { x: 0, y: 0, s: 1 }, want = { x: 0, y: 0, s: 1 }, last = -1, intro = true;
    var vb = routes[0] ? routes[0].ownerSVGElement.viewBox.baseVal : { width: 125, height: 100 };
    var box = function (i) { var r = routes[i]; if (!r) return null; var b = r.getBBox(); return { x0: b.x / vb.width, x1: (b.x + b.width) / vb.width, y0: b.y / vb.height, y1: (b.y + b.height) / vb.height }; };
    var frame = function (b, freeCx, freeCy, freeW, freeH, sMax, sMin) {
      var pad = 0.03; b = { x0: b.x0 - pad, x1: b.x1 + pad, y0: b.y0 - pad, y1: b.y1 + pad };
      var bw = Math.max(1, (b.x1 - b.x0) * SW), bh = Math.max(1, (b.y1 - b.y0) * SH);
      var s = clamp(Math.min(freeW * 0.78 / bw, freeH * 0.72 / bh), sMin, sMax);
      var cx = ((b.x0 + b.x1) / 2 - 0.5) * SW, cy = ((b.y0 + b.y1) / 2 - 0.5) * SH;
      var W = stage.clientWidth, H = stage.clientHeight;
      var x = freeCx - W / 2 - s * cx, y = freeCy - H / 2 - s * cy;
      // Centring on the route's midpoint can pan the sheet far enough to expose the frame's own
      // background at an edge. Keep the pan inside the range where the sheet still covers.
      var hx = Math.max(0, s * SW / 2 - W / 2), hy = Math.max(0, s * SH / 2 - H / 2);
      return { x: clamp(x, -hx, hx), y: clamp(y, -hy, hy), s: s };
    };
    var frameStop = function (i) {
      var b = box(i) || { x0: 0.4, x1: 0.6, y0: 0.4, y1: 0.6 }, W = stage.clientWidth, H = stage.clientHeight;
      // The floor is the scale at which the sheet still COVERS the frame. A constant floor was
      // wrong in both directions: 0.6 could not fit the 5.5 km airport leg on a phone (the frame
      // settled on open water with no route in it), and a low constant let the sheet shrink
      // smaller than the view and leave a void around it.
      var cover = Math.max(W / SW, H / SH) * 1.02;
      if (mdUp()) return frame(b, W * 0.54, H * 0.5, W * 0.92, H, 2.6, cover);
      return frame(b, W / 2, H * 0.44, W, H * 0.82, 2.2, cover);
    };
    var frameAll = function () { var W = stage.clientWidth, H = stage.clientHeight, s = Math.max(W / SW, H / SH) * 1.02; return { x: 0, y: 0, s: s }; };
    var setIndex = function (i) {
      if (i === last) return; last = i;
      var on = STOPS[i] || [];
      pins.forEach(function (p) { p.classList.toggle('is-active', on.indexOf(p.dataset.key) !== -1); });
      routes.forEach(function (r, k) { var d = k === i; r.classList.toggle('is-drawn', d); r.style.strokeDashoffset = d ? 0 : lens[k]; });
      steps.forEach(function (s, k) { s.classList.toggle('is-on', k === i); });
      goBtns.forEach(function (b, k) { b.classList.toggle('is-on', k === i); });
      if (count) count.textContent = '0' + (i + 1) + ' / 0' + STOPS.length;
      walk = routes[i] ? { i: i, t0: performance.now() } : null; if (walker) walker.classList.remove('is-on');
      want = frameStop(i);
    };
    var tick = function () {
      cur.x = lerp(cur.x, want.x, 0.07); cur.y = lerp(cur.y, want.y, 0.07); cur.s = lerp(cur.s, want.s, 0.07);
      sheet.style.transform = 'translate(-50%,-50%) translate(' + cur.x.toFixed(1) + 'px,' + cur.y.toFixed(1) + 'px) scale(' + cur.s.toFixed(4) + ')';
      var inv = (1 / cur.s); pins.forEach(function (p) { p.style.transform = 'scale(' + (inv * (p.classList.contains('is-active') ? 1.3 : 1)).toFixed(3) + ')'; });
      if (walk && walker) { var t = clamp((performance.now() - walk.t0 - 350) / 1650, 0, 1); if (t > 0) { var pt = routes[walk.i].getPointAtLength(t * lens[walk.i]); walker.setAttribute('cx', pt.x.toFixed(3)); walker.setAttribute('cy', pt.y.toFixed(3)); walker.setAttribute('r', (0.42 * inv).toFixed(3)); walker.classList.add('is-on'); } if (t >= 1) walk = null; }
    };
    want = frameAll(); cur = { x: want.x, y: want.y, s: want.s }; tick();
    if (hasGsap) gsap.ticker.add(tick); else (function loop() { tick(); requestAnimationFrame(loop); })();
    var goTo = function (i) {
      i = clamp(i, 0, STOPS.length - 1);
      if (mdUp() && hasGsap && !reduce) { var top = pin.getBoundingClientRect().top + window.scrollY, H = pin.offsetHeight - VH(); scrollTo({ getBoundingClientRect: function () { return { top: top + H * ((i + 0.5) / STOPS.length) - window.scrollY + 8 }; } }); }
      else { intro = false; setIndex(i); }
    };
    goBtns.forEach(function (b) { b.addEventListener('click', function () { goTo(+b.dataset.i); }); });
    $('.js-map-prev') && $('.js-map-prev').addEventListener('click', function () { goTo((last < 0 ? 0 : last) - 1); });
    $('.js-map-next') && $('.js-map-next').addEventListener('click', function () { goTo((last < 0 ? -1 : last) + 1); });
    if (hasGsap && !reduce) {
      ScrollTrigger.matchMedia({ '(min-width: 900px)': function () {
        ScrollTrigger.create({ trigger: pin, start: 'top top', end: 'bottom bottom', onUpdate: function (st) {
          var p = st.progress;
          if (p < 0.06) { if (!intro) { intro = true; want = frameAll(); } return; }
          intro = false; setIndex(clamp(Math.floor((p - 0.06) / 0.94 * STOPS.length), 0, STOPS.length - 1));
        }, onLeaveBack: function () { intro = true; want = frameAll(); } });
      }, '(max-width: 899px)': function () { intro = false; setIndex(0); } });
    } else { intro = false; setIndex(0); }
    window.addEventListener('resize', function () { want = intro ? frameAll() : frameStop(Math.max(0, last)); });
  })();

  /* ---- sticky split chapters (the hotel, the island): one module, every .js-island on the page ---- */
  $$('.js-island').forEach(function (pin) {
    var steps = $$('.hi-step', pin), figs = $$('.js-island-media figure', pin), idx = $$('.js-island-idx button', pin);
    var last = 0;
    var set = function (i) { if (i === last && steps[i].classList.contains('is-on')) return; last = i; steps.forEach(function (s, k) { s.classList.toggle('is-on', k === i); }); figs.forEach(function (f, k) { f.classList.toggle('is-on', k === i); }); idx.forEach(function (b, k) { b.classList.toggle('is-on', k === i); }); };
    idx.forEach(function (b, k) { b.addEventListener('click', function () { if (hasGsap && mdUp() && !reduce) { var top = pin.getBoundingClientRect().top + window.scrollY, H = pin.offsetHeight - VH(); window.scrollTo({ top: top + H * ((k + 0.5) / steps.length), behavior: 'smooth' }); } else set(k); }); });
    if (!hasGsap || reduce) return;
    ScrollTrigger.matchMedia({ '(min-width: 900px)': function () {
      ScrollTrigger.create({ trigger: pin, start: 'top top', end: 'bottom bottom', onUpdate: function (st) { set(clamp(Math.floor(st.progress * steps.length), 0, steps.length - 1)); } });
    } });
  });

  /* ---- guest quote rotators: independently timed, pausable (N18) ---- */
  (function () {
    var rotators = $$('[data-rotator]'); if (!rotators.length) return;
    var HOLD = 6000, STAGGER = 1800, paused = reduce;
    var units = rotators.map(function (root, idx) {
      var slides = $$('.hi-slide', root), dotWrap = $('.hi-dots', root), i = 0, timer = null, hovered = false;
      var dots = slides.map(function (_, n) { var b = document.createElement('button'); b.className = 'hi-dot' + (n === 0 ? ' is-on' : ''); b.type = 'button'; b.innerHTML = '<i></i>'; b.setAttribute('aria-label', 'Show review ' + (n + 1) + ' of ' + slides.length); b.addEventListener('click', function () { show(n); restart(); }); if (slides.length > 1) dotWrap.appendChild(b); return b; });
      function show(n) { i = (n + slides.length) % slides.length; slides.forEach(function (s, k) { s.classList.toggle('is-on', k === i); }); dots.forEach(function (d, k) { d.classList.toggle('is-on', k === i); d.setAttribute('aria-current', k === i ? 'true' : 'false'); }); }
      function tick() { if (!paused && !hovered) show(i + 1); }
      function restart() { clearInterval(timer); if (slides.length < 2) return; timer = setInterval(tick, HOLD); }
      function start() { if (slides.length < 2 || reduce) return; setTimeout(restart, idx * STAGGER); }
      ['mouseenter', 'focusin'].forEach(function (ev) { root.addEventListener(ev, function () { hovered = true; }); });
      ['mouseleave', 'focusout'].forEach(function (ev) { root.addEventListener(ev, function () { hovered = false; }); });
      show(0); start();
      return { restart: restart, stop: function () { clearInterval(timer); } };
    });
    var toggle = $('[data-rotator-pause]');
    if (toggle) { if (reduce) toggle.hidden = true; toggle.setAttribute('aria-pressed', 'false'); toggle.addEventListener('click', function () { paused = !paused; toggle.setAttribute('aria-pressed', String(paused)); $('[data-pause-label]', toggle).textContent = paused ? 'Play reviews' : 'Pause reviews'; units.forEach(function (u) { paused ? u.stop() : u.restart(); }); }); }
  })();

  /* ---- the stay picker: a real range calendar, square caps, 44px cells, then the Godo handoff ---- */
  (function () {
    var form = $('.js-stay'); if (!form) return;
    var months = $('.js-cal-months', form), title = $('.js-cal-title', form), sum = $('.js-stay-sum', form), go = $('.js-stay-go', form);
    var inOut = $('.js-stay-in-out', form), outOut = $('.js-stay-out-out', form), hin = $('.js-stay-in', form), hout = $('.js-stay-out', form), hn = $('.js-stay-n', form);
    var gOut = $('.js-g-out', form), gHid = $('.js-stay-g', form), gMax = +(form.dataset.gmax || 11), guests = 2;
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var view = new Date(today.getFullYear(), today.getMonth(), 1), start = null, end = null;
    var MN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var iso = function (d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    var fmt = function (d) { return d.getDate() + ' ' + MN[d.getMonth()].slice(0, 3) + ' ' + d.getFullYear(); };
    var two = function () { return months.clientWidth >= 560; };
    function render() {
      months.innerHTML = '';
      var n = two() ? 2 : 1;
      months.setAttribute('data-months', n);
      title.textContent = MN[view.getMonth()] + ' ' + view.getFullYear() + (n === 2 ? '  ·  ' + MN[(view.getMonth() + 1) % 12] + ' ' + (view.getMonth() === 11 ? view.getFullYear() + 1 : view.getFullYear()) : '');
      for (var m = 0; m < n; m++) {
        var d0 = new Date(view.getFullYear(), view.getMonth() + m, 1), wrap = document.createElement('div'); wrap.className = 'hi-month';
        wrap.innerHTML = '<h4>' + MN[d0.getMonth()] + ' ' + d0.getFullYear() + '</h4><div class="hi-month__grid">' + ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(function (d) { return '<span class="hi-month__dow">' + d + '</span>'; }).join('') + '</div>';
        var grid = $('.hi-month__grid', wrap), lead = (d0.getDay() + 6) % 7;
        for (var i = 0; i < lead; i++) grid.appendChild(document.createElement('span'));
        var days = new Date(d0.getFullYear(), d0.getMonth() + 1, 0).getDate();
        for (var day = 1; day <= days; day++) {
          var d = new Date(d0.getFullYear(), d0.getMonth(), day), b = document.createElement('button'); b.type = 'button'; b.className = 'hi-day'; b.textContent = day; b.dataset.d = iso(d);
          if (d < today) b.disabled = true;
          if (+d === +today) b.classList.add('is-today');
          if (start && !end && +d === +start) b.classList.add('is-cap', 'is-start');
          if (start && end) { if (+d === +start) b.classList.add('is-cap', 'is-start'); else if (+d === +end) b.classList.add('is-cap', 'is-end'); else if (d > start && d < end) b.classList.add('is-in'); }
          b.setAttribute('aria-label', fmt(d)); grid.appendChild(b);
        }
        months.appendChild(wrap);
      }
    }
    function pick(d) {
      if (!start || (start && end)) { start = d; end = null; }
      else if (d <= start) { start = d; end = null; }
      else end = d;
      inOut.textContent = start ? fmt(start) : ''; outOut.textContent = end ? fmt(end) : '';
      var nights = start && end ? Math.round((end - start) / 864e5) : 0;
      hin.value = start ? iso(start) : ''; hout.value = end ? iso(end) : ''; hn.value = nights || '';
      go.disabled = !nights;
      sum.innerHTML = nights ? '<b>' + nights + (nights === 1 ? ' night' : ' nights') + '</b> · ' + guests + (guests === 1 ? ' guest' : ' guests') : (start ? 'Now pick the morning you leave.' : 'No nights picked yet.');
      render();
    }
    months.addEventListener('click', function (e) { var b = e.target.closest('.hi-day'); if (!b || b.disabled) return; var p = b.dataset.d.split('-'); pick(new Date(+p[0], +p[1] - 1, +p[2])); });
    $('.js-cal-prev', form).addEventListener('click', function () { if (view > today) { view = new Date(view.getFullYear(), view.getMonth() - 1, 1); render(); } });
    $('.js-cal-next', form).addEventListener('click', function () { view = new Date(view.getFullYear(), view.getMonth() + 1, 1); render(); });
    var setG = function (g) { guests = clamp(g, 1, gMax); gOut.textContent = guests; if (gHid) gHid.value = guests; if (start && end) pick(end); };
    $('.js-g-dec', form).addEventListener('click', function () { setG(guests - 1); });
    $('.js-g-inc', form).addEventListener('click', function () { setG(guests + 1); });
    window.addEventListener('resize', render);
    render();
  })();


  /* ---- property pages ---- */
  // THE DOCK: the picture climbs out of the water as you scroll
  (function () {
    var dock = $('.js-dock'); if (!dock || !hasGsap || reduce) return;
    var img = $('.hi-dock__col img', dock), cap = $('.hi-dock__cap', dock);
    gsap.fromTo(img, { '--cut': '62%' }, { '--cut': '0%', ease: 'none', scrollTrigger: { trigger: dock, start: 'top top', end: 'bottom bottom', scrub: 0.6 } });
    if (cap) gsap.fromTo(cap, { opacity: 0, y: 24 }, { opacity: 1, y: 0, ease: 'power2.out', scrollTrigger: { trigger: dock, start: '55% bottom', end: '75% bottom', scrub: true } });
  })();
  // THE SUNDECK: floors stack, the lower one settling back as the next arrives
  (function () {
    var floors = $$('.js-floor'); if (!floors.length || !hasGsap || reduce) return;
    floors.forEach(function (f, i) {
      var next = floors[i + 1]; if (!next) return;
      gsap.to(f, { scale: 0.94, opacity: 0.5, ease: 'none', scrollTrigger: { trigger: next, start: 'top bottom', end: 'top top', scrub: true } });
    });
  })();
  // kinetic gallery: skew follows scroll velocity
  (function () {
    var figs = $$('.hi-gal figure'); if (!figs.length || !hasGsap || reduce || touch) return;
    var v = 0, target = 0;
    ScrollTrigger.create({ onUpdate: function (st) { target = clamp(st.getVelocity() / 140, -9, 9); } });
    gsap.ticker.add(function () { v = lerp(v, target, 0.12); target = lerp(target, 0, 0.08); figs.forEach(function (f) { f.style.transform = 'skewY(' + (v * 0.35).toFixed(2) + 'deg) translateZ(0)'; }); });
    figs.forEach(function (f) { gsap.fromTo($('img', f), { scale: 1.16 }, { scale: 1.04, ease: 'none', scrollTrigger: { trigger: f, start: 'top bottom', end: 'bottom top', scrub: true } }); });
  })();

  window.addEventListener('load', function () { if (hasGsap) ScrollTrigger.refresh(); });
})();
