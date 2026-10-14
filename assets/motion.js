/* =====================================================================
   Blog Do Neto Dev — motion compartilhado (sem bibliotecas).
   <body data-motion="full"> → boot, saída, LED de scroll, statusline,
   hero, reveal, scramble, cards e botões magnéticos.
   <body data-motion="lite"> (posts) → só boot + saída.
   ===================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var boot = document.getElementById('boot');
  var bootCmd = document.getElementById('boot-cmd');
  var ativo = root.classList.contains('js-motion') && !!boot;

  function arquivoDe(url) {
    var partes = url.pathname.split('/');
    var arq = partes.pop() || 'index.html';
    return { pasta: partes.pop() || '', nome: arq.replace(/\.html$/, '') };
  }
  function caminhoNormal(url) {
    return url.pathname.replace(/index\.html$/, '');
  }
  function comandoPara(url) {
    var a = arquivoDe(url);
    if (a.pasta === 'posts') return 'cat posts/' + a.nome + '.md';
    if (a.nome === 'index') return url.hash.length > 1 ? 'cd ~/' + url.hash.slice(1) : 'cd ~';
    return 'cd ~/' + a.nome;
  }

  function ir(href, cmd) {
    var url = new URL(href, location.href);
    if (!ativo) { location.href = url.href; return; }
    if (bootCmd) bootCmd.textContent = cmd || comandoPara(url);
    var barra = boot.querySelector('.boot-barra');
    if (barra) barra.innerHTML = '<i></i>';
    boot.classList.remove('saiu', 'cobrindo');
    void boot.offsetWidth;
    boot.classList.add('cobrindo');
    setTimeout(function () { location.href = url.href; }, 620);
    /* se a navegação não acontecer (bloqueada, offline), devolve a página */
    setTimeout(function () {
      boot.classList.remove('cobrindo');
      boot.classList.add('saiu');
    }, 6000);
  }

  window.blogMotion = { ir: ir };
  if (!ativo) return;

  var body = document.body;
  var completo = body.getAttribute('data-motion') === 'full';
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- entrada ---------- */
  function sair() { boot.classList.add('saiu'); }
  var t = performance.now();
  /* se o script chegou tarde, a animação CSS de fallback já está tirando o boot */
  if (t < 400) setTimeout(sair, 420 - t);
  else boot.addEventListener('animationend', function (e) { if (e.target === boot) sair(); });

  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    boot.classList.remove('cobrindo');
    sair();
  });

  /* ---------- saída: wipe de baixo pra cima com o comando do destino ---------- */
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.hasAttribute('data-sem-boot')) return;
    if ((a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) === '#') return;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin || !/^https?:$/.test(url.protocol)) return;
    if (caminhoNormal(url) === caminhoNormal(location) && url.search === location.search) return;
    e.preventDefault();
    ir(url.href, a.getAttribute('data-boot-cmd'));
  });

  if (!completo) return;

  /* ---------- LED de progresso + statusline ---------- */
  var led = document.createElement('div');
  led.className = 'scroll-led';
  led.setAttribute('aria-hidden', 'true');
  body.appendChild(led);

  var statusline = null, slSecao = null, slPct = null;
  if (window.matchMedia('(min-width: 900px) and (pointer: fine)').matches) {
    statusline = document.createElement('div');
    statusline.className = 'statusline';
    statusline.setAttribute('aria-hidden', 'true');
    statusline.innerHTML = '<span class="sl-modo">NORMAL</span><span class="sl-arq"></span><span class="sl-pct">Top</span>';
    var arq = statusline.querySelector('.sl-arq');
    arq.textContent = (body.getAttribute('data-sl-arq') || arquivoDe(location).nome + '.html') + ' ';
    slSecao = document.createElement('b');
    arq.appendChild(slSecao);
    slPct = statusline.querySelector('.sl-pct');
    body.appendChild(statusline);
  }

  var hero = document.querySelector('[data-hero]');
  var heroTerm = hero && hero.querySelector('.term');
  setTimeout(function () { if (heroTerm) heroTerm.classList.add('on'); }, 700);

  var temIO = 'IntersectionObserver' in window;

  /* ---------- reveal em cascata (por lote que entra junto) ---------- */
  var reveals = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
  function finalizarReveal(el) {
    el.addEventListener('transitionend', function fim(ev) {
      if (ev.target !== el || ev.propertyName !== 'transform') return;
      el.removeEventListener('transitionend', fim);
      el.removeAttribute('data-reveal');
      el.classList.remove('on');
      el.style.removeProperty('--d');
    });
  }
  function revelar(el, i) {
    el.style.setProperty('--d', Math.min(i * 0.08, 0.48).toFixed(2) + 's');
    if (el.hasAttribute('data-card')) {
      el.classList.add('scan');
      el.addEventListener('animationend', function fimScan(ev) {
        if (ev.target !== el) return;
        el.removeEventListener('animationend', fimScan);
        el.classList.remove('scan');
      });
    }
    finalizarReveal(el);
    el.classList.add('on');
  }
  if (temIO) {
    var ioReveal = new IntersectionObserver(function (entradas) {
      var lote = entradas.filter(function (en) { return en.isIntersecting; })
        .map(function (en) { return en.target; })
        .sort(function (a, b) {
          var ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
          return (ra.top - rb.top) || (ra.left - rb.left);
        });
      lote.forEach(function (el, i) {
        ioReveal.unobserve(el);
        revelar(el, i);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    reveals.forEach(function (el) { ioReveal.observe(el); });
  } else {
    reveals.forEach(function (el) { el.removeAttribute('data-reveal'); });
  }

  /* ---------- scramble/decode nos títulos ---------- */
  var glifos = '!<>-_\\/[]{}=+*^?#01';
  function embaralhar(el) {
    var final = el.textContent;
    el.setAttribute('aria-label', final);
    var duracao = 700;
    var t0 = performance.now();
    function quadro(agora) {
      var p = Math.min(1, (agora - t0) / duracao);
      var fixos = Math.floor(p * final.length);
      var s = '';
      for (var i = 0; i < final.length; i++) {
        var c = final.charAt(i);
        s += (i < fixos || c === ' ') ? c : glifos.charAt(Math.floor(Math.random() * glifos.length));
      }
      el.textContent = s;
      if (p < 1) requestAnimationFrame(quadro);
      else el.textContent = final;
    }
    requestAnimationFrame(quadro);
  }
  if (temIO) {
    var ioScr = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (!en.isIntersecting) return;
        ioScr.unobserve(en.target);
        embaralhar(en.target);
      });
    }, { threshold: 0.6 });
    Array.prototype.forEach.call(document.querySelectorAll('[data-scramble]'), function (el) {
      /* só texto puro: não destrói markup interno */
      if (el.children.length === 0) ioScr.observe(el);
    });
  }

  /* ---------- seção atual na statusline ---------- */
  if (temIO && slSecao) {
    var ioSecao = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (en.isIntersecting) slSecao.textContent = '› #' + en.target.getAttribute('data-sl');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Array.prototype.forEach.call(document.querySelectorAll('[data-sl]'), function (el) { ioSecao.observe(el); });
  }

  /* ---------- scroll: progresso, parallax, timeline, statusline, ticker ---------- */
  var linhas = Array.prototype.slice.call(document.querySelectorAll('[data-linha]'));
  var trilho = document.querySelector('.ticker-trilho');
  var animTicker = trilho && trilho.getAnimations ? trilho.getAnimations()[0] : null;
  var ultimoY = window.scrollY;
  var boost = 1;
  var tickerRodando = false;
  function loopTicker() {
    boost += (1 - boost) * 0.06;
    if (Math.abs(boost - 1) < 0.01) { boost = 1; tickerRodando = false; }
    if (animTicker) animTicker.playbackRate = boost;
    if (tickerRodando) requestAnimationFrame(loopTicker);
  }

  var agendado = false;
  function aoRolar() {
    agendado = false;
    var y = window.scrollY;
    var vh = window.innerHeight;
    var max = Math.max(1, root.scrollHeight - vh);
    var prog = Math.min(1, Math.max(0, y / max));
    root.style.setProperty('--prog', prog.toFixed(4));

    if (hero) {
      var h = hero.offsetHeight;
      if (y < h) hero.style.setProperty('--grid-y', (y * 0.25).toFixed(1) + 'px');
      if (statusline) statusline.classList.toggle('on', y > h * 0.6);
    }
    if (slPct) slPct.textContent = prog <= 0.005 ? 'Top' : prog >= 0.995 ? 'Bot' : Math.round(prog * 100) + '%';

    linhas.forEach(function (el) {
      var r = el.getBoundingClientRect();
      var p = (vh * 0.7 - r.top) / Math.max(1, r.height);
      el.style.setProperty('--tl', Math.min(1, Math.max(0, p)).toFixed(3));
    });

    var delta = Math.abs(y - ultimoY);
    ultimoY = y;
    if (animTicker && delta > 0) {
      boost = Math.min(6, Math.max(boost, 1 + delta * 0.08));
      if (!tickerRodando) { tickerRodando = true; requestAnimationFrame(loopTicker); }
    }
  }
  window.addEventListener('scroll', function () {
    if (!agendado) { agendado = true; requestAnimationFrame(aoRolar); }
  }, { passive: true });
  window.addEventListener('resize', aoRolar);
  aoRolar();

  if (!finePointer) return;

  /* ---------- spotlight no hero ---------- */
  if (hero) {
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      hero.style.setProperty('--mx', (e.clientX - r.left).toFixed(0) + 'px');
      hero.style.setProperty('--my', (e.clientY - r.top).toFixed(0) + 'px');
      hero.style.setProperty('--spot', '1');
    });
    hero.addEventListener('pointerleave', function () { hero.style.setProperty('--spot', '0'); });
  }

  /* ---------- tilt + spotlight nos cards ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-card]'), function (card) {
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      var x = e.clientX - r.left;
      var y = e.clientY - r.top;
      card.style.setProperty('--sx', x.toFixed(0) + 'px');
      card.style.setProperty('--sy', y.toFixed(0) + 'px');
      if (card.hasAttribute('data-reveal')) return;
      var rx = ((y / r.height) - 0.5) * -5;
      var ry = ((x / r.width) - 0.5) * 5;
      card.classList.add('tilt');
      card.style.transform = 'perspective(900px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) translateY(-3px)';
    });
    card.addEventListener('pointerleave', function () {
      card.style.transform = '';
      card.classList.remove('tilt');
    });
  });

  /* ---------- botões magnéticos ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-magnet]'), function (btn) {
    btn.addEventListener('pointermove', function (e) {
      var r = btn.getBoundingClientRect();
      var dx = (e.clientX - (r.left + r.width / 2)) * 0.25;
      var dy = (e.clientY - (r.top + r.height / 2)) * 0.25;
      btn.classList.add('magnet');
      btn.style.transform = 'translate(' + dx.toFixed(1) + 'px, ' + dy.toFixed(1) + 'px)';
    });
    btn.addEventListener('pointerleave', function () {
      btn.style.transform = '';
      btn.classList.remove('magnet');
    });
  });
})();
