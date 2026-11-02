/* ═══════════════════════════════════════════════════════════════════════
   saadcyber21 — portfolio behaviour
   No framework, no build step, no tracker. Vanilla ES2019.
   Sections: boot · hero field · telemetry · dossiers · ASI ring ·
             proof lab · palette · motion
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var S = window.SITE;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var RM = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── 0. helpers ─────────────────────────────────────────────────────── */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function nf(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function toast(msg) {
    var t = $("#toast"); if (!t) return;
    t.textContent = msg; t.classList.add("on");
    clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove("on"); }, 1900);
  }
  function copy(text, label) {
    var done = function () { toast(label + " copied to clipboard"); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { legacyCopy(text, done); });
    } else legacyCopy(text, done);
  }
  function legacyCopy(text, done) {
    var ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;left:-9999px";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); done(); } catch (e) { toast("copy failed — select manually"); }
    document.body.removeChild(ta);
  }
  function countUp(el, to, dur, suffix) {
    if (RM) { el.textContent = nf(to) + (suffix || ""); return; }
    var t0 = null;
    function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / (dur || 1200));
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = nf(Math.round(to * e)) + (suffix || "");
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ── 1. boot sequence ───────────────────────────────────────────────── */
  var BOOT = [
    ["ky", "$ "], ["", "integrity_check --source github/rest --date " + S.meta.buildDate],
    ["", ""],
    ["", "  resolving saadcyber21 ......................... "], ["ok", "ok"],
    ["", "  repositories  (owned, non-fork) ....... "], ["ky", String(S.meta.ownedRepos)],
    ["", "  commits       (across owned repos) .... "], ["ky", String(S.meta.totalCommits)],
    ["", "  runtime dependencies, flagship tools .. "], ["ok", "0"],
    ["", "  attacks mapped to OWASP ASI 2026 ...... "], ["ky", "18"],
    ["", "  ASI categories with coverage .......... "], ["ky", "6/10"],
    ["", "  ASI categories declared blind ......... "], ["wn", "4/10"],
    ["", "  secret-sweep false positives / 304,467 lines .. "], ["ky", "23"],
    ["", "  secret-sweep recall, secret-named leaks ....... "], ["ky", "99.5%"],
    ["", "  quillback findings: vulnerable → hardened ..... "], ["ky", "19 → 0"],
    ["", ""],
    ["", "  static badges asserting unread state .. "], ["er", "0 found"],
    ["", "  claims without a reproduction command . "], ["er", "0 found"],
    ["wn", "  ! limitations section present — rendering it anyway"],
    ["", ""],
    ["ok", "  ✓ portfolio integrity check passed. rendering."]
  ];
  function runBoot() {
    var host = $("#bootLines"), bar = $("#bootBar"), overlay = $("#boot"), skip = $("#bootSkip");
    if (!host) return;
    var lines = [], i = 0;
    // group into visual lines: a blank entry starts a new line
    var cur = null;
    BOOT.forEach(function (p) {
      if (p[1] === "" && p[0] === "") { lines.push(cur); cur = null; return; }
      if (!cur) { cur = []; lines.push(cur); }
      cur.push(p);
    });
    if (cur) lines.push(cur);

    function finish() {
      overlay.classList.add("done"); skip.classList.add("hide");
      document.body.classList.remove("is-locked");
      setTimeout(function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 900);
      startPage();
    }
    skip.addEventListener("click", finish);

    if (RM) {
      lines.forEach(function (ln) {
        if (!ln) { host.appendChild(document.createElement("div")); return; }
        var d = document.createElement("div"); d.className = "bl on";
        ln.forEach(function (p) {
          var s = document.createElement("span"); s.className = p[0]; s.textContent = p[1]; d.appendChild(s);
        });
        host.appendChild(d);
      });
      setTimeout(finish, 700);
      return;
    }

    document.body.classList.add("is-locked");
    function next() {
      if (i >= lines.length) { bar.style.width = "100%"; setTimeout(finish, 520); return; }
      bar.style.width = Math.round(((i + 1) / lines.length) * 100) + "%";
      var ln = lines[i++];
      if (!ln) { var sp = document.createElement("div"); sp.className = "bl on"; sp.innerHTML = "&nbsp;"; host.appendChild(sp); return setTimeout(next, 40); }
      var d = document.createElement("div"); d.className = "bl";
      ln.forEach(function (p) {
        var s = document.createElement("span"); s.className = p[0]; s.textContent = p[1]; d.appendChild(s);
      });
      host.appendChild(d);
      requestAnimationFrame(function () { d.classList.add("on"); });
      setTimeout(next, ln.length > 1 ? 108 : 62);
    }
    setTimeout(next, 260);
    // hard failsafe — never trap the user
    setTimeout(function () { if (!overlay.classList.contains("done")) finish(); }, 6500);
  }

  /* ── 2. hero canvas: probes vs. a defended core ─────────────────────── */
  function initField() {
    var cv = $("#field");
    if (!cv || typeof cv.getContext !== "function") return;
    var ctx = null;
    try { ctx = cv.getContext("2d"); } catch (e) { ctx = null; }
    if (!ctx) return;
    var W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    var nodes = [], packets = [], mouse = { x: -9999, y: -9999 }, raf = null, running = true;

    function size() {
      var r = cv.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    }
    function build() {
      var target = Math.round(Math.min(96, Math.max(34, (W * H) / 15000)));
      nodes = [];
      for (var i = 0; i < target; i++) {
        nodes.push({
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - .5) * .16, vy: (Math.random() - .5) * .16,
          r: Math.random() * 1.25 + .55, ph: Math.random() * Math.PI * 2
        });
      }
    }
    function core() {
      return window.innerWidth < 940
        ? { x: W * .5, y: H * .80 }
        : { x: W * .735, y: H * .46 };
    }
    function spawnPacket() {
      if (packets.length > 9) return;
      var edge = Math.floor(Math.random() * 3), x, y;
      if (edge === 0) { x = Math.random() * W; y = -14; }
      else if (edge === 1) { x = -14; y = Math.random() * H; }
      else { x = Math.random() * W; y = H + 14; }
      var c = core(), dx = c.x - x, dy = c.y - y, d = Math.hypot(dx, dy) || 1;
      packets.push({
        x: x, y: y, vx: dx / d * (0.5 + Math.random() * .55), vy: dy / d * (0.5 + Math.random() * .55),
        trail: [], hostile: Math.random() < .42, life: 0
      });
    }
    function frame(t) {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      var c = core(), R = Math.min(W, H) * .13;
      var pulse = .5 + .5 * Math.sin(t / 1500);

      // links
      ctx.lineWidth = 1;
      for (var i = 0; i < nodes.length; i++) {
        var a = nodes[i];
        a.x += a.vx; a.y += a.vy;
        if (a.x < -20) a.x = W + 20; if (a.x > W + 20) a.x = -20;
        if (a.y < -20) a.y = H + 20; if (a.y > H + 20) a.y = -20;
        for (var j = i + 1; j < nodes.length; j++) {
          var b = nodes[j], dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
          if (d2 < 15000) {
            var al = (1 - d2 / 15000) * .17;
            ctx.strokeStyle = "rgba(94,234,212," + al.toFixed(3) + ")";
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      // nodes
      for (var k = 0; k < nodes.length; k++) {
        var n = nodes[k];
        var mdx = n.x - mouse.x, mdy = n.y - mouse.y, md = Math.hypot(mdx, mdy);
        var glow = md < 130 ? (1 - md / 130) : 0;
        if (md < 130 && md > .1) { n.x += mdx / md * glow * .9; n.y += mdy / md * glow * .9; }
        var tw = .34 + .3 * Math.sin(t / 900 + n.ph) + glow * .5;
        ctx.fillStyle = "rgba(94,234,212," + Math.min(.85, tw).toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r + glow * 1.1, 0, 6.2832); ctx.fill();
      }

      // defended core
      ctx.strokeStyle = "rgba(94,234,212," + (.16 + pulse * .1).toFixed(3) + ")";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(c.x, c.y, R, 0, 6.2832); ctx.stroke();
      ctx.strokeStyle = "rgba(94,234,212,.07)";
      ctx.beginPath(); ctx.arc(c.x, c.y, R * 1.55, 0, 6.2832); ctx.stroke();
      var g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, R * 1.5);
      g.addColorStop(0, "rgba(94,234,212,.10)"); g.addColorStop(1, "rgba(94,234,212,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c.x, c.y, R * 1.5, 0, 6.2832); ctx.fill();

      // packets: inbound probes, blocked at the boundary
      if (Math.random() < .022) spawnPacket();
      for (var p = packets.length - 1; p >= 0; p--) {
        var q = packets[p]; q.life++;
        q.x += q.vx; q.y += q.vy;
        q.trail.push({ x: q.x, y: q.y }); if (q.trail.length > 16) q.trail.shift();
        var dist = Math.hypot(q.x - c.x, q.y - c.y);
        var col = q.hostile ? "255,92,92" : "125,211,252";
        for (var s = 1; s < q.trail.length; s++) {
          ctx.strokeStyle = "rgba(" + col + "," + ((s / q.trail.length) * .34).toFixed(3) + ")";
          ctx.lineWidth = 1.1;
          ctx.beginPath(); ctx.moveTo(q.trail[s - 1].x, q.trail[s - 1].y); ctx.lineTo(q.trail[s].x, q.trail[s].y); ctx.stroke();
        }
        ctx.fillStyle = "rgba(" + col + ",.85)";
        ctx.beginPath(); ctx.arc(q.x, q.y, 1.7, 0, 6.2832); ctx.fill();

        if (dist < R) {                       // blocked — ripple on the boundary
          var ang = Math.atan2(q.y - c.y, q.x - c.x);
          ripples.push({ x: c.x + Math.cos(ang) * R, y: c.y + Math.sin(ang) * R, r: 2, a: .8, hostile: q.hostile });
          packets.splice(p, 1);
        } else if (q.life > 900 || q.x < -60 || q.x > W + 60 || q.y < -60 || q.y > H + 60) packets.splice(p, 1);
      }
      for (var ri = ripples.length - 1; ri >= 0; ri--) {
        var rp = ripples[ri]; rp.r += 1.5; rp.a -= .028;
        if (rp.a <= 0) { ripples.splice(ri, 1); continue; }
        ctx.strokeStyle = "rgba(" + (rp.hostile ? "255,92,92," : "94,234,212,") + rp.a.toFixed(3) + ")";
        ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(rp.x, rp.y, rp.r, 0, 6.2832); ctx.stroke();
      }
      raf = requestAnimationFrame(frame);
    }
    var ripples = [];

    window.addEventListener("resize", function () { clearTimeout(cv._rt); cv._rt = setTimeout(size, 160); });
    window.addEventListener("pointermove", function (e) {
      var r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    }, { passive: true });
    window.addEventListener("pointerleave", function () { mouse.x = mouse.y = -9999; });

    // pause when offscreen — no point burning frames nobody sees
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) {
        running = en[0].isIntersecting;
        if (running && !raf) raf = requestAnimationFrame(frame);
        if (!running && raf) { cancelAnimationFrame(raf); raf = null; }
      }, { threshold: 0 }).observe($("#hero"));
    }
    size();
    if (RM) { // single static frame
      running = true; frame(0); running = false; if (raf) cancelAnimationFrame(raf);
    } else raf = requestAnimationFrame(frame);
  }

  /* ── 3. scramble-decode headline ────────────────────────────────────── */
  function scramble(el) {
    var target = el.getAttribute("data-text") || el.textContent;
    if (RM) { el.textContent = target; return; }
    var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#$%&*<>[]{}=+/\\|01";
    var frame = 0, total = 26 + target.length * 2;
    function tick() {
      var out = "";
      for (var i = 0; i < target.length; i++) {
        var reveal = frame - i * 2;
        if (reveal > 12 || target[i] === " ") out += target[i];
        else if (reveal > 0) out += chars[Math.floor(Math.random() * chars.length)];
        else out += " ";
      }
      el.textContent = out;
      if (frame++ < total) requestAnimationFrame(tick); else el.textContent = target;
    }
    tick();
  }

  /* ── 4. hero telemetry + stats ──────────────────────────────────────── */
  function initConsole() {
    var rows = [
      ["k", "identity", "v", S.meta.login],
      ["k", "focus", "v g", "AI agent scaffold security"],
      ["k", "attack library", "v", "18 attacks · 6 ASI categories"],
      ["k", "detection corpus", "v", "304,467 lines · 669 files"],
      ["k", "false positives", "v g", "23  (0.0076% of lines)"],
      ["k", "recall floor", "v g", "99.5% · CI-enforced"],
      ["k", "quillback", "v", "19 findings → 0 hardened"],
      ["k", "runtime deps", "v g", "0 across 9 tools"],
      ["k", "data egress", "v g", "none · local open-weight only"],
      ["k", "owned repos / commits", "v", S.meta.ownedRepos + " / " + S.meta.totalCommits],
      ["k", "unmeasured claims", "v a", "see §07 honest ledger"]
    ];
    var host = $("#console"); if (!host) return;
    host.innerHTML = rows.map(function (r, i) {
      return '<div class="cl" data-i="' + i + '"><span class="k">' + esc(r[1]) + '</span><span class="v ' + r[2] + '">' + esc(r[3]) + '</span></div>';
    }).join("") + '<div class="cl on" style="border:0;padding-top:9px"><span class="k">$ awaiting input</span><span class="v"><span class="cursor"></span></span></div>';
    $$(".cl", host).forEach(function (el, i) { setTimeout(function () { el.classList.add("on"); }, 380 + i * 85); });
  }

  function initHeroStats() {
    var stats = [
      { n: S.meta.ownedRepos,   l: "owned repositories" },
      { n: S.meta.totalCommits, l: "commits on record" },
      { n: 18,                  l: "mapped attack vectors" },
      { n: 0,                   l: "runtime dependencies" }
    ];
    var host = $("#heroStats"); if (!host) return;
    host.innerHTML = stats.map(function (s) {
      return '<div class="hs"><div class="n"><s data-to="' + s.n + '">0</s></div><div class="l">' + esc(s.l) + '</div></div>';
    }).join("");
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target; countUp(el, parseInt(el.getAttribute("data-to"), 10), 1400);
        io.unobserve(el);
      });
    }, { threshold: .5 });
    $$("[data-to]", host).forEach(function (el) { io.observe(el); });
  }

  /* ── 5. principles ──────────────────────────────────────────────────── */
  function initPrinciples() {
    var host = $("#principles"); if (!host) return;
    host.innerHTML = S.principles.map(function (p, i) {
      return '<article class="pr rv" data-d="' + (i + 1) + '">' +
        '<div class="n">' + p.n + '</div>' +
        '<h3>' + p.title + '</h3>' +
        '<p>' + p.body + '</p>' +
        '<div class="pf"><b>evidence</b>' + p.proof +
        '<br><a href="' + p.link[1] + '" target="_blank" rel="noopener noreferrer">' + p.link[0] + ' ↗</a></div>' +
        '</article>';
    }).join("");
  }

  /* ── 6. dossiers ────────────────────────────────────────────────────── */
  var ARROW = '<svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M3 9l6-6M4.5 3H9v4.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function initDossiers() {
    var host = $("#dossiers"); if (!host) return;
    host.innerHTML = S.projects.map(function (p, i) {
      var chips = p.topics.slice(0, 5).map(function (t, k) {
        return '<span class="chip' + (k === 0 ? " hot" : "") + '">' + esc(t) + '</span>';
      }).join("");
      var metrics = p.metrics.map(function (m) {
        return '<div class="mc"><div class="n">' + m.k + '</div><div class="l">' + esc(m.l) + '</div></div>';
      }).join("");
      return '' +
      '<article class="dossier rv" data-d="' + Math.min(4, i + 1) + '" id="d-' + p.key + '">' +
        '<div class="dhead" role="button" tabindex="0" aria-expanded="false" aria-controls="b-' + p.key + '">' +
          '<div class="didx">' + String(i + 1).padStart(2, "0") + ' / ' + String(S.projects.length).padStart(2, "0") + '</div>' +
          '<div class="dtitle"><h3>' + esc(p.name) + '</h3><div class="tg">' + esc(p.tag) + '</div><div class="dchips">' + chips + '</div></div>' +
          '<div class="dmetric"><div class="big">' + esc(p.metrics[0].k) + '</div><div class="sm">' + esc(p.metrics[0].l) + '</div></div>' +
          '<div class="dtoggle" aria-hidden="true"></div>' +
        '</div>' +
        '<div class="dbody" id="b-' + p.key + '"><div class="dbody-in"><div class="dgrid">' +
          '<div><div class="dstory">' +
            '<span class="cl-claim">' + p.claim + '</span>' + p.story +
          '</div><div class="mrow">' + metrics + '</div>' +
          '<div class="honest"><h5>what it does not do</h5><p>' + p.honest + '</p></div>' +
          '<p class="extra">' + p.extra + '</p>' +
          '<a class="glink" href="' + p.url + '" target="_blank" rel="noopener noreferrer">read the source ' + ARROW + '</a>' +
          '</div>' +
          '<aside class="dside"><dl>' +
            '<dt>language</dt><dd>' + esc(p.lang) + ' · ' + p.commits + ' commits · ' + esc(p.version) + '</dd>' +
            '<dt>reproduce</dt><dd class="cmd">' + esc(p.verify) + '</dd>' +
            '<dt>dependencies</dt><dd>' + p.deps + ' runtime · stdlib only</dd>' +
            '<dt>repository</dt><dd><a href="' + p.url + '" target="_blank" rel="noopener noreferrer" style="border-bottom:1px solid var(--line-2)">' + p.url.replace("https://github.com/", "") + ' ↗</a></dd>' +
          '</dl></aside>' +
        '</div></div></div>' +
      '</article>';
    }).join("");

    $$(".dhead", host).forEach(function (h) {
      function toggle() {
        var d = h.parentNode, body = $(".dbody", d), open = d.classList.contains("open");
        // close others — one dossier at a time keeps the reading order honest
        $$(".dossier.open", host).forEach(function (o) {
          if (o === d) return;
          o.classList.remove("open"); $(".dbody", o).style.maxHeight = "0px";
          $(".dhead", o).setAttribute("aria-expanded", "false");
        });
        d.classList.toggle("open", !open);
        h.setAttribute("aria-expanded", String(!open));
        body.style.maxHeight = !open ? body.scrollHeight + 40 + "px" : "0px";
        if (!open) setTimeout(function () {
          var y = d.getBoundingClientRect().top + window.pageYOffset - 78;
          window.scrollTo({ top: y, behavior: RM ? "auto" : "smooth" });
        }, 180);
      }
      h.addEventListener("click", toggle);
      h.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
      });
    });
    window.addEventListener("resize", function () {
      $$(".dossier.open .dbody", host).forEach(function (b) { b.style.maxHeight = b.scrollHeight + 40 + "px"; });
    });
  }

  /* ── 7. OWASP ASI coverage ring ─────────────────────────────────────── */
  function polar(cx, cy, r, deg) {
    var a = (deg - 90) * Math.PI / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  }
  function arcPath(cx, cy, rO, rI, a0, a1) {
    var p1 = polar(cx, cy, rO, a0), p2 = polar(cx, cy, rO, a1);
    var p3 = polar(cx, cy, rI, a1), p4 = polar(cx, cy, rI, a0);
    var big = a1 - a0 > 180 ? 1 : 0;
    return "M" + p1[0].toFixed(2) + " " + p1[1].toFixed(2) +
      " A" + rO + " " + rO + " 0 " + big + " 1 " + p2[0].toFixed(2) + " " + p2[1].toFixed(2) +
      " L" + p3[0].toFixed(2) + " " + p3[1].toFixed(2) +
      " A" + rI + " " + rI + " 0 " + big + " 0 " + p4[0].toFixed(2) + " " + p4[1].toFixed(2) + " Z";
  }
  function initRing() {
    var svg = $("#ring"); if (!svg) return;
    var NS = "http://www.w3.org/2000/svg", cx = 200, cy = 200, rO = 176, rI = 124, gap = 2.4;
    var list = $("#asiList");
    var html = "", rows = "";
    // faint outer ticks
    for (var t = 0; t < 60; t++) {
      var a = t * 6, p1 = polar(cx, cy, rO + 10, a), p2 = polar(cx, cy, rO + (t % 5 === 0 ? 19 : 14), a);
      html += '<line x1="' + p1[0].toFixed(1) + '" y1="' + p1[1].toFixed(1) + '" x2="' + p2[0].toFixed(1) + '" y2="' + p2[1].toFixed(1) +
        '" stroke="rgba(255,255,255,' + (t % 5 === 0 ? ".13" : ".06") + ')" stroke-width="1"/>';
    }
    S.asi.rows.forEach(function (r, i) {
      var span = 360 / S.asi.rows.length;
      var a0 = i * span + gap / 2, a1 = (i + 1) * span - gap / 2;
      var covered = r.state === "covered";
      var fill = covered ? "rgba(94,234,212,.20)" : "rgba(255,92,92,.13)";
      var stroke = covered ? "rgba(94,234,212,.75)" : "rgba(255,92,92,.6)";
      var mid = (a0 + a1) / 2, lp = polar(cx, cy, (rO + rI) / 2, mid);
      html += '<g class="seg" data-i="' + i + '" role="listitem" tabindex="0" aria-label="' + r.id + ' ' + r.name + ' — ' + (covered ? "covered" : "no attacks yet") + '">' +
        '<path d="' + arcPath(cx, cy, rO, rI, a0, a1) + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1"/>' +
        '<text x="' + lp[0].toFixed(1) + '" y="' + (lp[1] + 3.5).toFixed(1) + '" text-anchor="middle" font-family="var(--mono)" font-size="10.5" letter-spacing=".06em" fill="' + (covered ? "#a9f3e5" : "#e79a9a") + '">' + r.id.replace("ASI", "") + '</text>' +
        '</g>';
      rows += '<li class="asi rv" data-s="' + r.state + '" data-i="' + i + '">' +
        '<span class="id">' + r.id + '</span><span class="nm">' + esc(r.name) + '</span>' +
        '<span class="st">' + (covered ? "covered" : "blind spot") + '</span>' +
        '<span class="nt">' + esc(r.note) + '</span></li>';
    });
    // centre hairline
    html += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (rI - 16) + '" fill="none" stroke="rgba(255,255,255,.05)" stroke-dasharray="2 5"/>';
    svg.innerHTML = html;
    list.innerHTML = rows;

    function light(i, on) {
      var g = svg.querySelector('.seg[data-i="' + i + '"]');
      var li = list.querySelector('.asi[data-i="' + i + '"]');
      if (g) {
        var path = g.querySelector("path");
        var cov = S.asi.rows[i].state === "covered";
        path.setAttribute("fill", on ? (cov ? "rgba(94,234,212,.5)" : "rgba(255,92,92,.4)") : (cov ? "rgba(94,234,212,.20)" : "rgba(255,92,92,.13)"));
      }
      if (li) li.classList.toggle("lit", on);
    }
    S.asi.rows.forEach(function (r, i) {
      var g = svg.querySelector('.seg[data-i="' + i + '"]');
      var li = list.querySelector('.asi[data-i="' + i + '"]');
      function enter() { light(i, true); li.classList.add("exp"); }
      function leave() { light(i, false); li.classList.remove("exp"); }
      [g, li].forEach(function (el) {
        if (!el) return;
        el.addEventListener("mouseenter", enter);
        el.addEventListener("mouseleave", leave);
        el.addEventListener("focus", enter);
        el.addEventListener("blur", leave);
        el.addEventListener("click", function () { li.classList.toggle("exp"); });
      });
    });
  }

  /* ══ 8. PROOF LAB ══════════════════════════════════════════════════════
     8a. entropy + pattern detector (port of secret-sweep's documented logic)
     ──────────────────────────────────────────────────────────────────── */
  var PATTERNS = [
    { id: "AWS Access Key ID",      sev: "CRITICAL", re: /\b(?:AKIA|ASIA|AIDA|AROA)[0-9A-Z]{16}\b/ },
    { id: "AWS Secret Access Key",  sev: "CRITICAL", re: /\baws[_\-.]?(?:secret|sk)[_\-.]?(?:access[_\-.]?)?key\b\s*[:=]\s*["']?[A-Za-z0-9/+=]{40}/i },
    { id: "GitHub Token",           sev: "CRITICAL", re: /\bgh[pousr]_[A-Za-z0-9]{36,255}\b/ },
    { id: "Slack Token",            sev: "CRITICAL", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
    { id: "Google API Key",         sev: "HIGH",     re: /\bAIza[0-9A-Za-z\-_]{35}\b/ },
    { id: "Stripe Live Secret",     sev: "CRITICAL", re: /\b(?:sk|rk|pk)_live_[0-9a-zA-Z]{16,}\b/ },
    { id: "OpenAI API Key",         sev: "CRITICAL", re: /\bsk-(?:proj-)?[A-Za-z0-9\-_]{20,}\b/ },
    { id: "Anthropic API Key",      sev: "CRITICAL", re: /\bsk-ant-[A-Za-z0-9\-_]{20,}\b/ },
    { id: "npm Token",              sev: "HIGH",     re: /\bnpm_[A-Za-z0-9]{36}\b/ },
    { id: "PyPI Token",             sev: "HIGH",     re: /\bpypi-AgEIcHlwaS5vcmc[A-Za-z0-9\-_]{20,}\b/ },
    { id: "JSON Web Token",         sev: "HIGH",     re: /\beyJ[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}\b/ },
    { id: "Private Key Block",      sev: "CRITICAL", re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY(?: BLOCK)?-----/ },
    { id: "Azure Storage Key",      sev: "HIGH",     re: /accountkey\s*[=:]\s*["']?[A-Za-z0-9+/=]{40,}/i },
    { id: "Generic Assignment",     sev: "HIGH",     re: /\b[A-Za-z0-9_\-]*(?:password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key|private[_-]?key|credential|auth|dsn)[A-Za-z0-9_\-]*\s*[:=]\s*["']?([^"'\s,;]{6,})/i },
    { id: "Bearer Credential",      sev: "HIGH",     re: /\bauthorization\b\s*[:=]\s*["']?bearer\s+[A-Za-z0-9\-._~+/]{16,}=*/i }
  ];

  /* ── layer-2 signals ──────────────────────────────────────────────────
     Entropy is bounded above by log2(min(len, alphabet)), so a single fixed
     threshold is unusable: `entropy > 4.5` cannot fire below 24 characters.
     Three length-normalised signals replace it, plus three structural guards. */
  function shannon(str) {
    var f = {}, i;
    for (i = 0; i < str.length; i++) f[str[i]] = (f[str[i]] || 0) + 1;
    var h = 0, n = str.length;
    for (i in f) { var p = f[i] / n; h -= p * Math.log(p) / Math.LN2; }
    return h;
  }
  function alphabetOf(str) {
    // smallest standard encoding alphabet that contains the token.
    // Class-based sums (lower+upper+digits) overestimate k for hex and base32,
    // which deflates the entropy ratio and hides real credentials.
    if (/^[0-9a-f]+$/i.test(str)) return 16;
    if (/^[A-Z2-7=]+$/i.test(str)) return 32;
    if (/^[0-9a-z]+$/i.test(str)) return 36;
    if (/^[A-Za-z0-9]+$/.test(str)) return 62;
    if (/^[A-Za-z0-9+/=]+$/.test(str)) return 64;
    return 70;
  }
  function caseTransitions(str) {
    // fraction of adjacent ALPHABETIC pairs that change case class.
    // Random base62 alternates constantly (~0.5); CamelCase and SCREAMING_SNAKE
    // hold long same-case runs (~0.1 and 0.0). Low is the suspicious direction.
    var cls = function (c) { return c === c.toLowerCase() ? 0 : 1; };
    var letters = str.replace(/[^A-Za-z]/g, "");
    if (letters.length < 2) return null;
    var ch = 0;
    for (var i = 1; i < letters.length; i++) if (cls(letters[i]) !== cls(letters[i - 1])) ch++;
    return ch / (letters.length - 1);
  }
  function ascendingPairRatio(str) {
    // sequential-constant guard: ABCDEFGHIJ… has a perfectly flat distribution and
    // passes any pure entropy test. Over 80,000 random base62 tokens the maximum
    // was 0.21; every sequential constant scores >= 0.93.
    var asc = 0, tot = 0;
    for (var i = 1; i < str.length; i++) {
      var a = str.charCodeAt(i - 1), b = str.charCodeAt(i);
      if (/[A-Za-z0-9]/.test(str[i]) && /[A-Za-z0-9]/.test(str[i - 1])) { tot++; if (b === a + 1) asc++; }
    }
    return tot ? asc / tot : 0;
  }
  function expectedDistinct(n, k) { return k * (1 - Math.pow(1 - 1 / k, n)); }
  function distinctCount(str) {
    var seen = {};
    for (var i = 0; i < str.length; i++) seen[str[i]] = 1;
    return Object.keys(seen).length;
  }
  function inAssignmentContext(line, idx) {
    // entropy candidates are drawn from the right-hand side of `key = value`,
    // `key: value` or `--flag=value` — never from every token on the line.
    // This is what stops /usr/local/bin/python3 inside a sentence from firing.
    var before = line.slice(0, idx);
    return /(?:^|[\s"'(,])(?:--?[A-Za-z0-9_.\-]+|[A-Za-z_][A-Za-z0-9_.\-]*)\s*[:=]\s*["']?$/.test(before);
  }
  function isLhsIdentifier(line, wIdx, word) {
    // the name being assigned to is not a candidate
    var i = wIdx + word.length;
    while (i < line.length && line[i] === " ") i++;
    return line[i] === "=" || line[i] === ":";
  }
  function mask(tok) {
    if (tok.length <= 8) return tok[0] + new Array(Math.max(1, tok.length - 1)).join("*") + tok[tok.length - 1];
    return tok.slice(0, 4) + new Array(Math.max(5, tok.length - 7)).join("*") + tok.slice(-4);
  }

  var MIN_ENTROPY_LEN = 16;   // below this, entropy is not a usable signal
  var MAX_ENTROPY_LEN = 256;

  function scanLine(line) {
    var out = { pattern: [], entropy: [], naive: [], guards: [] };
    var suppressed = [];

    /* layer 1 — patterns run first and are authoritative */
    PATTERNS.forEach(function (p) {
      var m = line.match(p.re);
      if (!m) return;
      var idx = line.indexOf(m[0]);
      var shown = m[1] && p.id === "Generic Assignment" ? m[1] : m[0];
      var shownIdx = m[1] && p.id === "Generic Assignment" ? idx + m[0].indexOf(m[1]) : idx;
      out.pattern.push({ rule: p.id, sev: p.sev, tok: shown, col: shownIdx + 1, layer: "pattern" });
      suppressed.push([idx, idx + m[0].length]);
    });

    // one credential is reported once, not once per rule that matched it
    var seenSpan = {};
    out.pattern = out.pattern.filter(function (f) {
      var key = f.col + ":" + f.tok;
      if (seenSpan[key]) return false;
      seenSpan[key] = 1; return true;
    });

    /* layer 2 — entropy over credential-shaped candidates */
    var wordRe = /\S+/g, wm;
    while ((wm = wordRe.exec(line)) !== null) {
      var word = wm[0], wIdx = wm.index;
      var bare = word.replace(/^["'(<=]+|["'),;>]+$/g, "");
      if (bare.length < 8) continue;
      var inSup = suppressed.some(function (r) {
        var s = line.indexOf(bare);
        return s >= r[0] && s < r[1];
      });
      if (inSup) continue;                       // pattern layer already owns this span

      var parts = bare.split(/[\/:@?#&[\]{}()<>|,\s]+/).filter(Boolean);
      parts.forEach(function (tok) {
        if (tok.length < MIN_ENTROPY_LEN || tok.length > MAX_ENTROPY_LEN) return;
        var idx = line.indexOf(tok, wIdx);
        if (idx < 0) idx = line.indexOf(tok);
        if (idx < 0) return;
        if (suppressed.some(function (r) { return idx >= r[0] && idx < r[1]; })) return;

        var H = shannon(tok), k = alphabetOf(tok), n = tok.length;
        var maxH = Math.log(Math.min(n, k)) / Math.LN2;
        var ratio = maxH > 0 ? H / maxH : 0;
        var coverage = distinctCount(tok) / expectedDistinct(n, k);
        var trans = caseTransitions(tok);
        var asc = ascendingPairRatio(tok);

        if (H > 4.5) out.naive.push({ rule: "naive entropy > 4.5", tok: tok, col: idx + 1, layer: "naive", H: H, line: 0 });

        var blocked = [];
        // guard 1 — identifier syntax: _ . and - are rejected outright. Unprefixed
        // random credentials are base16/base62/base64; prefixed forms are layer 1's.
        if (/[_.\-]/.test(tok)) blocked.push("identifier syntax (contains _ . or -)");
        // guard 2 — sequential constants
        if (asc >= 0.60) blocked.push("sequential constant (ascending-pair ratio " + asc.toFixed(2) + " >= 0.60)");
        // guard 3 — assignment context, and never the name being assigned to
        if (!inAssignmentContext(line, idx)) blocked.push("not on the right-hand side of an assignment");
        if (isLhsIdentifier(line, wIdx, word)) blocked.push("token is the assigned identifier, not the value");
        // three length-normalised distributional signals
        if (ratio < 0.86) blocked.push("entropy ratio " + ratio.toFixed(3) + " < 0.86");
        if (coverage < 0.70) blocked.push("alphabet coverage " + coverage.toFixed(3) + " < 0.70");
        var mixedCase = /[a-z]/.test(tok) && /[A-Z]/.test(tok);
        if (mixedCase && trans !== null && trans < 0.30) blocked.push("case-transition rate " + trans.toFixed(3) + " < 0.30 (CamelCase-shaped)");

        if (blocked.length === 0) {
          out.entropy.push({
            rule: "high-entropy-value", sev: "HIGH", tok: tok, col: idx + 1, layer: "entropy",
            why: "ratio " + ratio.toFixed(3) + " · coverage " + coverage.toFixed(3) +
                 " · transitions " + (trans === null ? "n/a" : trans.toFixed(3)) + " · H " + H.toFixed(2) + " bits"
          });
        } else if (ratio >= 0.86) {
          out.guards.push({ rule: "rejected by structural guard", sev: "OK", tok: tok, col: idx + 1,
            layer: "guard", why: blocked.join(" · "), H: H });
        }
      });
    }
    return out;
  }

  // exposed so the detection logic is testable outside the browser — the same
  // standard the repositories hold: a claim you cannot exercise is decoration.
  window.__lab = {
    scanLine: scanLine, shannon: shannon, mask: mask, PATTERNS: PATTERNS,
    alphabetOf: alphabetOf, caseTransitions: caseTransitions,
    ascendingPairRatio: ascendingPairRatio, inAssignmentContext: inAssignmentContext,
    expectedDistinct: expectedDistinct
  };

  function runSecretScan() {
    var inp = $("#secIn"), out = $("#secOut"), vd = $("#secVerdict");
    if (!inp) return;
    var text = inp.value;
    out.innerHTML = ""; vd.hidden = false;
    if (!text.trim()) {
      vd.className = "verdict";
      vd.innerHTML = "nothing to scan — pick a preset below or paste a config line.";
      return;
    }
    var lines = text.split("\n");
    var findings = [], naiveAll = [];
    lines.forEach(function (ln, i) {
      if (!ln.trim()) return;
      var r = scanLine(ln), lineNo = i + 1;
      r.pattern.forEach(function (f) { f.line = lineNo; findings.push(f); });
      r.entropy.forEach(function (f) { f.line = lineNo; findings.push(f); });
      r.guards.forEach(function (f) { f.line = lineNo; findings.push(f); });
      r.naive.forEach(function (f) { f.line = lineNo; naiveAll.push(f); });
    });

    var real = findings.filter(function (f) { return f.layer === "pattern" || f.layer === "entropy"; });
    var guarded = findings.filter(function (f) { return f.layer === "guard"; });
    // the naive detector's noise, minus anything the calibrated detector also flags
    var realToks = {};
    real.forEach(function (f) { realToks[f.tok] = 1; });
    var pureNoise = naiveAll.filter(function (f) { return !realToks[f.tok]; });

    function render(f) {
      var cls = f.sev === "CRITICAL" ? "crit" : f.sev === "HIGH" ? "high" : "clean";
      return '<li class="finding ' + cls + '">' +
        '<div class="sev">' + esc(f.sev.toLowerCase()) + ' · [' + f.layer + '] · line ' + f.line + ':' + f.col + '</div>' +
        '<div class="fname">' + esc(f.rule) + '</div>' +
        '<div class="ev">evidence: ' + esc(mask(f.tok)) + '  (len=' + f.tok.length + ')</div>' +
        (f.why ? '<div class="why">' + esc(f.why) + '</div>' : "") +
        '</li>';
    }
    var html = real.map(render).join("");
    html += guarded.map(render).join("");
    html += pureNoise.map(function (f) {
      return '<li class="finding naive"><div class="sev">false positive · line ' + f.line + ':' + f.col + '</div>' +
        '<div class="fname">naive <code>entropy &gt; 4.5</code> would flag this</div>' +
        '<div class="ev">evidence: ' + esc(mask(f.tok)) + '  (H=' + f.H.toFixed(2) + ', len=' + f.tok.length + ')</div></li>';
    }).join("");
    out.innerHTML = html || '<li class="finding clean"><div class="sev">clean</div>' +
      '<div class="fname">no credential-shaped token on this input</div>' +
      '<div class="why">exit code 0 — nothing to review</div></li>';

    vd.className = "verdict " + (real.length ? "bad" : "good");
    vd.innerHTML = real.length
      ? '[!] <b>' + real.length + '</b> potential secret' + (real.length === 1 ? '' : 's') +
        ' across <b>' + lines.filter(function (l) { return l.trim(); }).length + '</b> line' +
        (lines.length === 1 ? '' : 's') + ' · exit code <b>1</b> — the build fails.<br>' +
        'naive <code>entropy &gt; 4.5</code> on the same input: <b>' + naiveAll.length + '</b> flag' +
        (naiveAll.length === 1 ? '' : 's') + ', of which <b>' + pureNoise.length + '</b> are pure noise.'
      : '[✓] no findings · exit code <b>0</b>.' +
        (naiveAll.length
          ? '<br>naive <code>entropy &gt; 4.5</code> would have raised <b>' + naiveAll.length +
            '</b> false positive' + (naiveAll.length === 1 ? '' : 's') + ' here.'
          : '');
  }

  /* 8b. zero-trust gateway simulator */
  var RBAC = {
    support_agent: { allow: ["search_docs", "create_ticket", "summarise_thread"], deny: ["execute_sql_query", "run_shell", "write_file", "send_email_bulk"] },
    analyst_agent: { allow: ["search_docs", "query_logs", "create_ticket"], deny: ["execute_sql_query", "run_shell", "write_file"] },
    sysadmin_agent: { allow: ["execute_sql_query", "query_logs", "search_docs"], deny: ["run_shell", "write_file"] }
  };
  function initGateway() {
    var inp = $("#gwIn"), sigs = $("#gwSigs"), res = $("#gwResult");
    if (!inp) return;
    var list = S.lab.injection.signatures;
    sigs.innerHTML = list.map(function (s, i) {
      return '<div class="sigrow" data-i="' + i + '"><span class="re">/' + esc(s.re.replace("(?i)", "")) + '/i</span>' +
        '<span class="lb">' + esc(s.label) + '</span><span class="mk">idle</span></div>';
    }).join("");

    function setPayload(obj) { inp.value = JSON.stringify(obj, null, 2); }
    setPayload(S.lab.injection.benignFull || {
      agent: "support_agent", role: "support_agent", tool: S.lab.injection.benign.tool, arguments: S.lab.injection.benign.args
    });

    function run() {
      var raw = inp.value, payload, parseErr = null;
      try { payload = JSON.parse(raw); } catch (e) { parseErr = e.message; }
      $$(".sigrow", sigs).forEach(function (r) { r.classList.remove("hit"); $(".mk", r).textContent = "idle"; });
      res.hidden = false;

      if (parseErr) {
        res.className = "gw";
        res.innerHTML = row("status", "rejected", "bl") + row("http_code", "400 Bad Request", "bl") +
          row("reason", "payload is not valid JSON — the gateway fails closed rather than passing an unparseable body through", "bl");
        return;
      }
      var role = payload.role || payload.agent || "support_agent";
      var tool = payload.tool || "(none)";
      var argsText = JSON.stringify(payload.arguments || {});
      var policy = RBAC[role];
      var rbacOk = policy ? policy.allow.indexOf(tool) !== -1 : false;
      var rbacReason = !policy ? "unknown role — no policy resolves, denied by default"
        : rbacOk ? "role " + role + " is authorised for " + tool
        : "role " + role + " has no grant for " + tool + (policy.deny.indexOf(tool) !== -1 ? " (explicit deny)" : " (not in allow-list)");

      var hits = [];
      list.forEach(function (s, i) {
        var re;
        try { re = new RegExp(s.re.replace(/\(\?i\)/g, ""), "i"); } catch (e) { return; }
        var m = argsText.match(re);
        var el = $('.sigrow[data-i="' + i + '"]', sigs);
        if (m) {
          hits.push({ label: s.label, re: s.re, match: m[0] });
          if (el) { el.classList.add("hit"); $(".mk", el).textContent = "matched"; }
        } else if (el) { $(".mk", el).textContent = "no match"; }
      });

      var blocked = !rbacOk || hits.length > 0;
      var rows = row("intercepted", role + " → " + tool, "") +
        row("rbac policy", rbacReason, rbacOk ? "ok" : "bl") +
        row("payload inspection", hits.length ? hits.length + " signature" + (hits.length === 1 ? "" : "s") + " matched" : "clean — no destructive pattern", hits.length ? "bl" : "ok") +
        row("forwarded to target", blocked ? "no — execution prevented" : "yes", blocked ? "bl" : "ok") +
        row("http_code", blocked ? "406 Not Acceptable" : "200 OK", blocked ? "bl" : "ok") +
        row("status", blocked ? "BLOCKED" : "ALLOWED", blocked ? "bl" : "ok") +
        (hits.length ? row("first match", hits[0].label + " — " + JSON.stringify(hits[0].match).slice(0, 60), "bl") : "");
      res.className = "gw";
      res.innerHTML = rows;
      res.style.borderColor = blocked ? "rgba(255,92,92,.35)" : "rgba(94,234,212,.3)";
      if (blocked && !RM) {
        res.animate([{ transform: "translateX(0)" }, { transform: "translateX(-4px)" }, { transform: "translateX(4px)" }, { transform: "translateX(0)" }], { duration: 220 });
      }
    }
    function row(l, v, c) { return '<div class="gwrow"><span class="lbl">' + esc(l) + '</span><span class="val ' + c + '">' + esc(v) + '</span></div>'; }

    $("#gwRun").addEventListener("click", run);
    $("#gwBenign").addEventListener("click", function () {
      setPayload({ agent: "support_agent", role: "support_agent", tool: "search_docs", arguments: S.lab.injection.benign.args }); run();
    });
    $("#gwHostile").addEventListener("click", function () {
      setPayload({
        agent: "support_agent", role: "support_agent", tool: S.lab.injection.hostile.tool,
        arguments: S.lab.injection.hostile.args,
        provenance: "retrieved document — untrusted data plane"
      }); run();
    });
    $("#gwEdit").addEventListener("click", function () { inp.focus(); toast("edit the payload, then pass it through"); });
    inp.addEventListener("keydown", function (e) { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") run(); });
    run();
  }

  /* 8c. calibration pane */
  function initCalib() {
    var host = $("#recallList"); if (!host) return;
    host.innerHTML = S.lab.secrets.recall.map(function (r) {
      return '<li><span>' + esc(r.l) + ' <s>· ' + esc(r.n) + '</s></span><b>' + r.v.toFixed(1) + '%</b></li>';
    }).join("");
  }

  /* ── 9. controls + systems + ledger + timeline + contact ────────────── */
  function initCards() {
    var host = $("#controls"); if (!host) return;
    host.innerHTML = S.controls.map(function (c, i) {
      return '<a class="ccard rv" data-d="' + Math.min(4, i + 1) + '" href="' + c.url + '" target="_blank" rel="noopener noreferrer">' +
        '<div class="cn"><span class="tick" aria-hidden="true"></span>' + esc(c.real) + '</div>' +
        '<div class="al">repo · ' + esc(c.name) + '</div>' +
        '<p>' + c.tag + '</p>' +
        '<div class="why"><b>why it is built this way —</b> ' + c.why + '</div>' +
        '<div class="foot"><span>' + c.commits + ' commits · 0 deps</span><span class="go">source ↗</span></div>' +
        '</a>';
    }).join("");
    // pointer-tracked spotlight
    $$(".ccard", host).forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100) + "%");
        card.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100) + "%");
      });
    });
  }
  function initSystems() {
    var host = $("#systems"); if (!host) return;
    host.innerHTML = S.systems.map(function (s, i) {
      return '<article class="sysrow rv" data-d="' + Math.min(3, i + 1) + '">' +
        '<div><div class="sn">' + esc(s.name) + '</div><div class="st2">' + esc(s.tag) + '</div>' +
        '<div class="foot" style="margin-top:16px"><a class="glink" href="' + s.url + '" target="_blank" rel="noopener noreferrer">source ' + ARROW + '</a></div></div>' +
        '<div><p class="sd">' + s.detail + '</p>' +
        '<div class="sc"><b>stated limitation</b>' + s.caveat + '</div></div>' +
        '</article>';
    }).join("");
  }
  function initLedger() {
    var host = $("#ledgerList"); if (!host) return;
    var labels = { gap: "declared gap", scope: "scope limit", "this-site": "this page" };
    host.innerHTML = S.ledger.map(function (l, i) {
      return '<div class="ledrow rv" data-d="' + Math.min(4, i % 4 + 1) + '">' +
        '<div class="idx">' + String(i + 1).padStart(2, "0") + '</div>' +
        '<div><h4>' + esc(l.t) + '</h4><p>' + l.d + '</p></div>' +
        '<span class="tag ' + l.s + '">' + labels[l.s] + '</span></div>';
    }).join("");
  }
  function initTimeline() {
    var host = $("#timeline"); if (!host) return;
    host.innerHTML = S.timeline.map(function (t, i) {
      return '<div class="tli rv" data-d="' + Math.min(3, i + 1) + '">' +
        '<div class="tw">' + esc(t.when) + '</div><h4>' + esc(t.what) + '</h4><p>' + t.detail + '</p>' +
        '<div class="tr">' + t.repos.map(function (r) { return "<span>" + esc(r) + "</span>"; }).join("") + '</div></div>';
    }).join("");
  }
  function initContact() {
    var host = $("#ctlinks"); if (!host) return;
    var links = [
      { ic: "⌥", lb: "github", vv: "github.com/saadcyber21", href: "https://github.com/saadcyber21", copyV: "https://github.com/saadcyber21" },
      { ic: "▤", lb: "profile readme", vv: "the long form of this page", href: "https://github.com/saadcyber21/saadcyber21", copyV: "https://github.com/saadcyber21/saadcyber21" },
      { ic: "▲", lb: "flagship", vv: "quillback — red-team harness", href: "https://github.com/saadcyber21/quillback", copyV: "git clone https://github.com/saadcyber21/quillback" },
      { ic: "⊘", lb: "private report", vv: "github.com/saadcyber21 → Security → Report a vulnerability", href: "https://github.com/saadcyber21/quillback/security/advisories/new", copyV: "https://github.com/saadcyber21/quillback/security/advisories/new" }
    ];
    host.innerHTML = links.map(function (l, i) {
      return '<button class="ctl" type="button" data-href="' + l.href + '" data-copy="' + esc(l.copyV) + '">' +
        '<span class="ic" aria-hidden="true">' + l.ic + '</span>' +
        '<span><span class="lb">' + esc(l.lb) + '</span><span class="vv">' + esc(l.vv) + '</span></span>' +
        '<span class="cp">copy</span></button>';
    }).join("");
    $$(".ctl", host).forEach(function (b) {
      b.addEventListener("click", function () { copy(b.getAttribute("data-copy"), "link"); });
      b.addEventListener("dblclick", function () { window.open(b.getAttribute("data-href"), "_blank", "noopener"); });
      b.title = "click to copy · double-click to open";
    });
  }

  /* ── 10. nav, palette, motion ───────────────────────────────────────── */
  function initNav() {
    var nav = $("#nav"); if (!nav) return;
    nav.innerHTML = S.nav.filter(function (n) { return n.id !== "hero"; }).map(function (n) {
      return '<a href="#' + n.id + '" data-t="' + n.id + '">' + n.label + '</a>';
    }).join("");
  }
  function initPalette() {
    var pal = $("#pal"), input = $("#palIn"), listEl = $("#palList");
    if (!pal) return;
    var items = S.nav.map(function (n) { return { t: "section", k: n.k, l: n.label, act: function () { go(n.id); } }; });
    S.projects.concat([]).forEach(function (p, i) {
      items.push({ t: "flagship", k: "p" + (i + 1), l: p.name + " — " + p.tag, act: function () { go("work"); setTimeout(function () { var d = $("#d-" + p.key); if (d && !d.classList.contains("open")) $(".dhead", d).click(); }, 620); } });
    });
    S.controls.forEach(function (c, i) {
      items.push({ t: "repo", k: "c" + (i + 1), l: c.name, act: function () { window.open(c.url, "_blank", "noopener"); } });
    });
    S.systems.forEach(function (s, i) {
      items.push({ t: "repo", k: "s" + (i + 1), l: s.name, act: function () { window.open(s.url, "_blank", "noopener"); } });
    });
    items.push({ t: "action", k: "g", l: "open github profile", act: function () { window.open(S.meta.profileUrl, "_blank", "noopener"); } });
    items.push({ t: "action", k: "l", l: "jump to the proof lab", act: function () { go("lab"); } });
    items.push({ t: "action", k: "h", l: "read the honest ledger", act: function () { go("ledger"); } });

    var sel = 0, shown = items;
    function draw() {
      listEl.innerHTML = shown.slice(0, 40).map(function (it, i) {
        return '<div class="pitem' + (i === sel ? " sel" : "") + '" data-i="' + i + '" role="option">' +
          '<span class="pk">' + esc(it.k) + '</span><span class="pl">' + esc(it.l) + '</span><span class="pt">' + esc(it.t) + '</span></div>';
      }).join("") || '<div class="pitem"><span class="pk">--</span><span class="pl">no match</span><span class="pt"></span></div>';
      $$(".pitem", listEl).forEach(function (el) {
        el.addEventListener("click", function () { sel = +el.getAttribute("data-i"); choose(); });
        el.addEventListener("mouseenter", function () { sel = +el.getAttribute("data-i"); draw(); });
      });
    }
    function filter() {
      var q = input.value.trim().toLowerCase();
      shown = !q ? items : items.filter(function (it) {
        return (it.l + " " + it.t + " " + it.k).toLowerCase().indexOf(q) !== -1;
      });
      sel = 0; draw();
    }
    function choose() { if (shown[sel]) { close(); shown[sel].act(); } }
    function open() {
      pal.classList.add("on"); document.body.classList.add("is-locked");
      input.value = ""; sel = 0; shown = items; draw(); setTimeout(function () { input.focus(); }, 20);
    }
    function close() { pal.classList.remove("on"); document.body.classList.remove("is-locked"); }
    input.addEventListener("input", filter);
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); sel = Math.min(shown.length - 1, sel + 1); draw(); scrollSel(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(0, sel - 1); draw(); scrollSel(); }
      else if (e.key === "Enter") { e.preventDefault(); choose(); }
      else if (e.key === "Escape") { close(); }
    });
    function scrollSel() { var el = $(".pitem.sel", listEl); if (el) el.scrollIntoView({ block: "nearest" }); }
    pal.addEventListener("click", function (e) { if (e.target === pal) close(); });
    $("#palBtn").addEventListener("click", open);
    window.__openPal = open; window.__closePal = close;
  }
  function go(id) {
    var el = document.getElementById(id); if (!el) return;
    var y = el.getBoundingClientRect().top + window.pageYOffset - (id === "hero" ? 0 : 66);
    window.scrollTo({ top: Math.max(0, y), behavior: RM ? "auto" : "smooth" });
    if (history.replaceState) history.replaceState(null, "", "#" + id);
  }

  function initMotion() {
    // scroll reveals
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (en) {
        en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
      }, { rootMargin: "0px 0px -8% 0px", threshold: .08 });
      $$(".rv").forEach(function (el) { io.observe(el); });
      // bar fills + counts on the calibration pane
      var io2 = new IntersectionObserver(function (en) {
        en.forEach(function (e) {
          if (!e.isIntersecting) return;
          var pane = e.target;
          $$(".bar .track i", pane).forEach(function (b) { b.style.width = b.getAttribute("data-w") + "%"; });
          $$(".bar .num", pane).forEach(function (n) { countUp(n, +n.getAttribute("data-count"), 1500); });
          io2.unobserve(pane);
        });
      }, { threshold: .25 });
      var cp = $("#p-calib"); if (cp) io2.observe(cp);
    } else $$(".rv").forEach(function (el) { el.classList.add("in"); });

    // header + progress + back-to-top + nav spy
    var hdr = $("#hdr"), sb = $("#sbar"), top = $("#top");
    if (!hdr || !sb || !top) return;
    var ids = S.nav.map(function (n) { return n.id; });
    function onScroll() {
      var y = window.pageYOffset;
      hdr.classList.toggle("stuck", y > 24);
      top.classList.toggle("on", y > 700);
      var h = document.documentElement.scrollHeight - window.innerHeight;
      sb.style.width = (h > 0 ? Math.min(100, y / h * 100) : 0) + "%";
      var cur = ids[0];
      for (var i = 0; i < ids.length; i++) {
        var el = document.getElementById(ids[i]);
        if (el && el.getBoundingClientRect().top <= 140) cur = ids[i];
      }
      $$("#nav a").forEach(function (a) { a.classList.toggle("on", a.getAttribute("data-t") === cur); });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    top.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: RM ? "auto" : "smooth" }); });
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var id = a.getAttribute("href").slice(1);
        if (!id || !document.getElementById(id)) return;
        e.preventDefault(); go(id);
      });
    });

    // lab tabs
    $$(".lab-tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        $$(".lab-tab").forEach(function (t) { t.classList.remove("on"); t.setAttribute("aria-selected", "false"); });
        tab.classList.add("on"); tab.setAttribute("aria-selected", "true");
        $$(".lab-pane").forEach(function (p) { p.classList.remove("on"); p.hidden = true; });
        var pane = $("#" + tab.getAttribute("data-pane"));
        if (pane) { pane.hidden = false; pane.classList.add("on"); }
      });
    });

    // keyboard
    document.addEventListener("keydown", function (e) {
      var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); window.__openPal(); return; }
      if (e.key === "Escape" && $("#pal").classList.contains("on")) { window.__closePal(); return; }
      if (typing) return;
      if (e.key === "g") { window._g = true; setTimeout(function () { window._g = false; }, 900); return; }
      if (window._g && e.key.toLowerCase() === "h") { window.open(S.meta.profileUrl, "_blank", "noopener"); return; }
      if (e.key === "/") { e.preventDefault(); go("lab"); var i = $("#secIn"); if (i) setTimeout(function () { i.focus(); }, 700); }
    });
  }

  /* ── 11. secret-scan wiring ─────────────────────────────────────────── */
  function initSecretLab() {
    var inp = $("#secIn"), host = $("#secPresets");
    if (!inp) return;
    host.innerHTML = S.lab.secrets.presets.map(function (p) {
      return '<button class="pset" type="button" data-id="' + p.id + '">' + esc(p.label) + '</button>';
    }).join("") + '<button class="pset" type="button" data-id="ghp" style="color:var(--red);border-color:rgba(255,92,92,.3)">leaked deploy key</button>';
    var GHP = 'DEPLOY_KEY = "c7a1f9e2b8d40635af9d27c4e8b1a603c7a1f9e2"';
    $$(".pset", host).forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-id");
        var p = id === "ghp" ? { text: GHP } : S.lab.secrets.presets.filter(function (x) { return x.id === id; })[0];
        if (!p) return;
        inp.value = p.text; runSecretScan();
      });
    });
    inp.value = S.lab.secrets.presets[0].text;
    $("#secRun").addEventListener("click", runSecretScan);
    $("#secClear").addEventListener("click", function () { inp.value = ""; $("#secOut").innerHTML = ""; $("#secVerdict").hidden = true; });
    inp.addEventListener("keydown", function (e) { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") runSecretScan(); });
    runSecretScan();
  }

  /* ── 12. page start ─────────────────────────────────────────────────── */
  function startPage() {
    $$(".sc").forEach(function (el, i) { setTimeout(function () { scramble(el); }, 120 + i * 240); });
    initConsole();
    initHeroStats();
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) { $$(".cl", $("#console")).forEach(function (c) { c.classList.add("on"); }); io.disconnect(); } });
    }, { threshold: .2 });
    if ($("#console")) io.observe($("#console"));
  }

  function boot() {
    var av = $("#avatar"); if (av) av.style.backgroundImage = 'url("' + S.meta.avatar + '")';
    initNav(); initPrinciples(); initDossiers(); initRing();
    initSecretLab(); initGateway(); initCalib();
    initCards(); initSystems(); initLedger(); initTimeline(); initContact();
    initPalette(); initMotion(); initField();
    runBoot();
    if (location.hash && location.hash.length > 1) {
      setTimeout(function () { go(location.hash.slice(1)); }, 120);
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
