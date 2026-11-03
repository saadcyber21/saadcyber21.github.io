/* ═══════════════════════════════════════════════════════════════════════
   MD SAAD — dossier · app.js (v3)
   Renders window.SITE into the document. No framework, no tracker.
   The verification-lab detector below is a faithful port of secret-sweep's
   documented logic and is exposed as window.__lab so it stays testable
   outside the browser (node lab_test.js).
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var S = window.SITE;
  var RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var LANG = "en";

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function L(obj, en) { return LANG === "zh" ? (obj[en + "Zh"] || obj[en]) : obj[en]; }

  var toastT;
  function toast(msg) {
    var t = $("#toast"); if (!t) return;
    t.textContent = msg; t.classList.add("on");
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove("on"); }, 2600);
  }
  function copy(text, label) {
    function ok() { toast("copied — " + (label || "to clipboard")); }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, function () { toast(text); });
      else { toast(text); }
    } catch (e) { toast(text); }
  }
  function go(id) {
    var el = document.getElementById(id); if (!el) return;
    el.scrollIntoView({ behavior: RM ? "auto" : "smooth", block: "start" });
    try { history.replaceState(null, "", "#" + id); } catch (e) {}
  }
  function tele(s) {
    return String(s).replace(/\{\{(\w+)\}\}/g, function (_, k) {
      return S.meta[k] != null ? S.meta[k] : "{{" + k + "}}";
    });
  }

  /* ══ verification-lab engine — verbatim port of secret-sweep's documented
        detection logic. Keep this region stable: lab_test.js exercises it. ══ */
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
      res.style.borderColor = blocked ? "var(--accent)" : "var(--good)";
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

  /* ══ hero ═══════════════════════════════════════════════════════════ */
  function initHero() {
    var d = S.dossier, m = S.meta;
    var set = function (id, v) { var el = $("#" + id); if (el) el.textContent = v; };
    set("mastBuild", "data of record " + m.buildDate);
    set("mastTitle", d.titleEn);
    set("mastLoc", d.location);
    set("mastMail", d.email);
    set("epigraphText", m.thesis);

    initBento();

    set("mastProv", "Repository data pulled from the GitHub REST API on " + m.buildDate +
      " (" + m.publicRepos + " public repositories · " + m.totalCommits +
      " commits · account since " + m.accountSince + " · active " + m.activeWindow +
      "). Nothing on this page live-updates; a number that silently drifts is worse than a stale one with a date on it.");

    var mq = $("#mqTrack");
    if (mq) {
      var words = ["SIEM engineering", "threat hunting", "MITRE ATT&CK", "red team",
        "prompt injection", "zero trust", "detection engineering", "SARIF 2.1.0",
        "OWASP ASI 2026", "calibrated false-positive rates", "malware analysis",
        "incident response", "compliance as code", "explainable forensics"];
      var half = words.map(function (w) { return "<span>" + esc(w) + "</span>"; }).join("");
      mq.innerHTML = half + half; /* doubled so the -50% loop is seamless */
    }
  }


  /* bento board — every tile carries its source, per the house rule */
  function initBento() {
    var host = $("#bento"); if (!host) return;
    var d = S.dossier, m = S.meta;
    function src(label, href, internal) {
      return '<p class="ev-src">source: <a href="' + esc(href) + '"' +
        (internal ? "" : ' target="_blank" rel="noopener noreferrer"') + '>' + esc(label) + '</a></p>';
    }
    var tiles = [];
    tiles.push('<div class="btile b2x2 sp">' +
      '<p class="bt-k">SOC operator</p>' +
      '<p class="bt-big">24×7</p>' +
      '<p class="bt-l">enterprise SOC coverage, SLA-bound — detect · respond · report</p>' +
      '<div class="bmini">' + [d.glance[0], d.glance[1], d.glance[3]].map(function (g) {
        return '<div class="g"><div class="k">' + esc(g.k) + '</div><div class="l">' + esc(g.l) + '</div></div>';
      }).join("") + '<div class="g"><div class="k">Mar 25 →</div><div class="l">lead analyst &amp; compliance manager, current role</div></div></div>' +
      src("§07 experience", "#experience", true) + '</div>');
    tiles.push('<div class="btile b2 sp">' +
      '<p class="bt-k">secret-sweep · calibrated noise</p>' +
      '<p class="bt-big">610 → 23</p>' +
      '<div class="bbars">' +
        '<div class="bbar"><span>naive</span><i><b class="fill naive"></b></i><span>610</span></div>' +
        '<div class="bbar"><span>calibrated</span><i><b class="fill calib"></b></i><span>23</span></div>' +
      '</div>' +
      '<p class="bt-l">false positives over 304,467 lines of CPython 3.11 stdlib</p>' +
      src("scripts/calibrate.py", "https://github.com/saadcyber21/secret-sweep/blob/main/scripts/calibrate.py") + '</div>');
    tiles.push('<div class="btile sp">' +
      '<p class="bt-k">open output</p>' +
      '<p class="bt-big">' + m.publicRepos + ' · ' + m.totalCommits + '</p>' +
      '<p class="bt-l">public repositories · commits, API-verified</p>' +
      src("github.com/saadcyber21", "https://github.com/saadcyber21") + '</div>');
    tiles.push('<div class="btile sp">' +
      '<p class="bt-k">certified</p>' +
      '<p class="bt-big">' + S.certs.length + '</p>' +
      '<p class="bt-l">certifications &amp; career paths · SC-200 in progress</p>' +
      src("§06 credentials", "#credentials", true) + '</div>');
    tiles.push('<div class="btile b2 sp">' +
      '<p class="bt-k">owasp asi 2026 · attack coverage</p>' +
      '<p class="bt-big">6 / 10</p>' +
      '<div class="bdots">' + S.asi.rows.map(function (r) {
        return '<i class="' + (r.state === "covered" ? "on" : "") + '" title="' + esc(r.id) + '"></i>';
      }).join("") + '</div>' +
      '<p class="bt-l">six categories under active attack; four blind spots printed on every run</p>' +
      src("§04 coverage", "#coverage", true) + '</div>');
    tiles.push('<div class="btile b2 sp">' +
      '<p class="bt-k">quillback · CI-gated</p>' +
      '<p class="bt-big">19 → 0</p>' +
      '<p class="bt-l">findings on the vulnerable reference agent → hardened variant, on every commit · 18 attacks · 0 deps</p>' +
      src("github.com/saadcyber21/quillback", "https://github.com/saadcyber21/quillback") + '</div>');
    host.innerHTML = tiles.join("");
  }

  /* ══ header nav + scroll-spy ══════════════════════════════════════════ */
  function initNav() {
    var nav = $("#nav"); if (!nav) return;
    nav.innerHTML = S.nav.filter(function (n) { return n.hd; }).map(function (n) {
      return '<a href="#' + n.id + '" data-t="' + n.id + '">' + esc(n.label) + '</a>';
    }).join("");
    nav.addEventListener("click", function (e) {
      var a = e.target.closest ? e.target.closest("a[data-t]") : null;
      if (a) { e.preventDefault(); go(a.getAttribute("data-t")); }
    });
  }
  function initScrollSpy() {
    if (!("IntersectionObserver" in window)) return;
    var links = $$("#nav a[data-t]");
    if (!links.length) return;
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute("data-t")] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) { a.classList.remove("on"); });
        var a = byId[en.target.id];
        if (a) a.classList.add("on");
      });
    }, { rootMargin: "-30% 0px -60% 0px" });
    Object.keys(byId).forEach(function (id) {
      var sec = document.getElementById(id);
      if (sec) io.observe(sec);
    });
  }

  /* ══ reveal + spotlight ═══════════════════════════════════════════════ */
  function initReveal() {
    var els = $$(".rv");
    if (RM || !("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("in"); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
        });
      }, { threshold: 0.06 });
      els.forEach(function (el) { io.observe(el); });
    }
  }
  function initSpotlight() {
    if (RM || !window.matchMedia("(hover: hover)").matches) return;
    $$(".sp").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty("--mx", (e.clientX - r.left) + "px");
        el.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });
  }

  /* ══ §01 profile ══════════════════════════════════════════════════════ */
  function renderDossier() {
    var d = S.dossier;
    var intro = $("#dosIntro"); if (!intro) return;
    intro.className = "prose rv in" + (LANG === "zh" ? " zh" : "");
    intro.innerHTML = (LANG === "zh" ? d.introZh : d.introEn).map(function (p) {
      return "<p>" + esc(p) + "</p>";
    }).join("");
    var lbl = $("#dosIntLabel");
    if (lbl) lbl.textContent = LANG === "zh" ? "职业兴趣" : "Professional interests";
    var di = $("#dosInterests");
    if (di) di.textContent = LANG === "zh" ? d.interestsZh : d.interestsEn;
    var g = $("#glance");
    if (g) {
      g.innerHTML = d.glance.map(function (x) {
        return '<div class="g"><div class="k">' + esc(x.k) + '</div>' +
          '<div class="l">' + esc(LANG === "zh" ? x.lZh : x.l) + '</div>' +
          '<div class="s">' + esc(x.sub) + '</div></div>';
      }).join("");
    }
  }
  function initLangSwitch() {
    var en = $("#langEn"), zh = $("#langZh");
    function setLang(next) {
      LANG = next;
      if (en) en.classList.toggle("on", LANG === "en");
      if (zh) zh.classList.toggle("on", LANG === "zh");
      renderDossier(); renderSkills(); renderExperience();
      toast(LANG === "zh" ? "简介已切换为中文" : "Introduction switched to English");
    }
    if (en) en.addEventListener("click", function () { setLang("en"); });
    if (zh) zh.addEventListener("click", function () { setLang("zh"); });
  }

  /* ══ §02 method ═══════════════════════════════════════════════════════ */
  function initMethod() {
    var host = $("#principles"); if (!host) return;
    host.innerHTML = S.principles.map(function (p) {
      return '<article class="maxim sp rv">' +
        '<p class="mn">RULE ' + esc(p.n) + '</p>' +
        '<h3>' + esc(p.title) + '</h3>' +
        '<p>' + p.body + '</p>' +
        '<p class="mp">' + esc(p.proof) + ' <a href="' + esc(p.link[1]) + '" target="_blank" rel="noopener noreferrer">' + esc(p.link[0]) + ' ↗</a></p>' +
        '</article>';
    }).join("");
  }

  /* ══ §03 selected work — exhibits ═════════════════════════════════════ */
  function initWork() {
    var host = $("#dossiers"); if (!host) return;
    host.innerHTML = S.projects.map(function (p, i) {
      var no = ("0" + (i + 1)).slice(-2);
      return '<article class="exhibit sp rv" id="d-' + esc(p.key) + '">' +
        '<div class="ex-head">' +
          '<span class="ex-no">EXHIBIT ' + no + '</span>' +
          '<h3 class="ex-name"><a href="' + esc(p.url) + '" target="_blank" rel="noopener noreferrer">' + esc(p.name) + '</a></h3>' +
          '<span class="ex-chips">' +
            '<span class="chip v">' + esc(p.version) + '</span>' +
            '<span class="chip">' + esc(p.lang) + '</span>' +
            '<span class="chip">' + p.commits + ' commits</span>' +
            '<span class="chip">' + p.deps + ' deps</span>' +
          '</span>' +
        '</div>' +
        '<p class="ex-tag">' + esc(p.tag) + '</p>' +
        '<p class="ex-claim">' + esc(p.claim) + '</p>' +
        '<p class="ex-story">' + p.story + '</p>' +
        '<div class="ex-metrics">' + p.metrics.map(function (m) {
          return '<div class="mc"><p class="mk">' + esc(m.k) + '</p><p class="ml">' + esc(m.l) + '</p></div>';
        }).join("") + '</div>' +
        '<div class="ex-verify"><span class="vl">Reproduce</span><code>' + esc(p.verify) + '</code>' +
          '<button class="copy" type="button" data-copy="' + esc(p.verify) + '">copy</button></div>' +
        '<div class="ex-honest"><span class="hl">What it does not do</span><p>' + esc(p.honest) + '</p></div>' +
        '<p class="ex-extra">' + p.extra + '</p>' +
        '<div class="ex-topics">' + p.topics.map(function (t) {
          return '<span class="tp">' + esc(t) + '</span>';
        }).join("") + '</div>' +
        '</article>';
    }).join("");
    $$(".ex-verify .copy", host).forEach(function (b) {
      b.addEventListener("click", function () { copy(b.getAttribute("data-copy"), "reproduction command"); });
    });
  }

  /* ══ §04 coverage — tile grid ═════════════════════════════════════════ */
  function initCoverage() {
    var grid = $("#asiGrid"); if (!grid) return;
    var lede = $("#covLede");
    if (lede) lede.textContent = "quillback's attack library currently covers " + S.asi.covered.length +
      " of the 10 categories in the OWASP Top 10 for Agentic Applications (2026). The " +
      S.asi.blind.length + " blind spots are printed in every report the tool produces — a coverage claim that hides its holes is advertising.";
    grid.innerHTML = S.asi.rows.map(function (r, i) {
      var cov = r.state === "covered";
      return '<div class="covtile sp ' + (cov ? "covered" : "blind") + '" data-i="' + i + '" role="row">' +
        '<span class="cid" role="cell">' + esc(r.id) + '</span>' +
        '<span class="cnm" role="cell">' + esc(r.name) + '</span>' +
        '<span class="cst ' + (cov ? "cov" : "blind") + '" role="cell">' +
          '<span class="dot ' + (cov ? "cov" : "blind") + '" aria-hidden="true"></span>' +
          (cov ? "covered" : "blind spot") + '</span>' +
        '<span class="cnote" role="cell">' + esc(r.note) + '</span>' +
        '</div>';
    }).join("");
  }

  /* ══ §05 lab wiring (engine + runners above are the ported logic) ═════ */
  function initLab() {
    var inp = $("#secIn");
    if (inp) inp.placeholder = 'AWS_ACCESS_KEY_ID = "AKIA…" — or pick a preset below';
    var host = $("#secPresets");
    if (host) {
      host.innerHTML = S.lab.secrets.presets.map(function (p) {
        return '<button class="pset" type="button" data-p="' + esc(p.id) + '">' + esc(p.label) + '</button>';
      }).join("");
      $$(".pset", host).forEach(function (b) {
        b.addEventListener("click", function () {
          var id = b.getAttribute("data-p");
          var preset = null;
          S.lab.secrets.presets.forEach(function (p) { if (p.id === id) preset = p; });
          if (!preset || !inp) return;
          inp.value = preset.text;
          runSecretScan();
        });
      });
    }
    var run = $("#secRun");
    if (run) run.addEventListener("click", runSecretScan);
    var clr = $("#secClear");
    if (clr) clr.addEventListener("click", function () {
      if (inp) inp.value = "";
      var o = $("#secOut"); if (o) o.innerHTML = "";
      var v = $("#secVerdict"); if (v) v.hidden = true;
    });
    if (inp) inp.addEventListener("keydown", function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") runSecretScan();
    });

    var cc = $("#calibCorpus"), cf = $("#calibFiles"), cl = $("#calibLines");
    if (cc) cc.textContent = S.lab.secrets.corpus;
    if (cf) cf.textContent = S.lab.secrets.corpusFiles.toLocaleString("en-US");
    if (cl) cl.textContent = S.lab.secrets.corpusLines.toLocaleString("en-US");

    initGateway();
    initCalib();
    initTabs();
  }
  function initTabs() {
    var tabs = $$(".tabs button[role='tab']");
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        tabs.forEach(function (t) {
          var on = t === tab;
          t.classList.toggle("on", on);
          t.setAttribute("aria-selected", on ? "true" : "false");
          var pane = document.getElementById(t.getAttribute("aria-controls"));
          if (pane) { pane.classList.toggle("on", on); pane.hidden = !on; }
        });
      });
    });
  }

  /* ══ §06 credentials ══════════════════════════════════════════════════ */
  function renderSkills() {
    var host = $("#skills"); if (!host) return;
    host.innerHTML = S.skills.map(function (g) {
      return '<div class="skg sp"><h4>' + esc(LANG === "zh" ? g.gZh : g.g) + '</h4><ul>' +
        g.items.map(function (it) {
          var lbl = S.evLabels[it.ev] ? (LANG === "zh" ? S.evLabels[it.ev].zh : S.evLabels[it.ev].en) : it.ev;
          var tag = '<span class="evtag ' + esc(it.ev) + '">' + esc(lbl) +
            (it.repo ? ' · <a href="https://github.com/saadcyber21/' + esc(it.repo) + '" target="_blank" rel="noopener noreferrer">' + esc(it.repo) + ' ↗</a>' : "") + '</span>';
          return '<li><span class="nm">' + esc(it.n) + '</span>' + tag + '</li>';
        }).join("") + '</ul></div>';
    }).join("");
    var cc = $("#certCount"); if (cc) cc.textContent = S.certs.length;
    var cs = $("#certs");
    if (cs) {
      cs.innerHTML = S.certs.map(function (c) {
        return '<li><span><span class="cn">' + esc(c.n) + '</span>' +
          '<span class="co">' + esc(c.org) + (c.id ? ' · <span class="cid">ID ' + esc(c.id) + '</span>' : '') + '</span></span>' +
          '<span class="cw' + (c.when === "in progress" ? " prog" : "") + '">' + esc(c.when) + '</span></li>';
      }).join("");
    }
    var e = S.edu, edu = $("#edu");
    if (edu) {
      edu.innerHTML = '<div class="deg">' + esc(e.deg) + '</div>' +
        '<div class="sch">' + esc(e.school) + ' — ' + esc(e.place) + '</div>' +
        '<div class="meta"><span>' + esc(e.when) + '</span><span><b>' + esc(e.score) + '</b></span></div>';
    }
  }

  /* ══ §07 experience ═══════════════════════════════════════════════════ */
  function renderExperience() {
    var host = $("#xlist"); if (!host) return;
    var note = $("#expNote");
    if (note) note.textContent = S.expNote[LANG];
    host.innerHTML = S.experience.map(function (x) {
      return '<article class="xentry rv in">' +
        '<div class="xwhen"><div class="wr">' + esc(x.when) + '</div><div class="wm">' + esc(x.mode) + '</div>' +
        '<span class="anon">' + (LANG === "zh" ? "雇主名称略" : "employer withheld") + '</span></div>' +
        '<div class="xbody"><h3>' + esc(x.role) + '</h3><ul>' +
        x.bullets.map(function (b) { return '<li>' + esc(b) + '</li>'; }).join("") + '</ul>' +
        '<div class="xmuscle"><span class="ml">' + (LANG === "zh" ? "同源公开作品" : "same muscle, in the open") + '</span>' +
        x.muscle.map(function (m) {
          return '<a href="https://github.com/saadcyber21/' + esc(m) + '" target="_blank" rel="noopener noreferrer">' + esc(m) + ' ↗</a>';
        }).join("") + '</div></div></article>';
    }).join("");
    var pc = $("#printContact");
    if (pc) pc.innerHTML =
      '<b>' + esc(S.dossier.name) + '</b> — ' + esc(S.dossier.titleEn) + '<br>' +
      esc(S.dossier.location) + ' · ' + esc(S.dossier.email) + ' · ' + esc(S.dossier.phone) + '<br>' +
      'github.com/saadcyber21 · saadcyber21.github.io<br>' +
      '<span style="color:#555">References, engagement letters and full employer details available on request.</span>';
  }

  /* ══ §08 supporting work ══════════════════════════════════════════════ */
  function initSupport() {
    var host = $("#controls");
    if (host) {
      host.innerHTML = S.controls.map(function (c) {
        return '<a class="ccard sp rv" href="' + esc(c.url) + '" target="_blank" rel="noopener noreferrer">' +
          '<div class="cn">' + esc(c.real) + '</div>' +
          '<div class="al">repo · ' + esc(c.name) + '</div>' +
          '<p>' + c.tag + '</p>' +
          '<div class="why"><b>why it is built this way —</b> ' + c.why + '</div>' +
          '<div class="foot"><span>' + c.commits + ' commits · 0 deps</span><span class="go">source ↗</span></div>' +
          '</a>';
      }).join("");
    }
    var sys = $("#systems");
    if (sys) {
      sys.innerHTML = S.systems.map(function (s) {
        return '<div class="sysrow sp rv">' +
          '<div class="sn">' + esc(s.name) + '</div>' +
          '<div class="st2">' + esc(s.tag) + '</div>' +
          '<p class="sd">' + s.detail + '</p>' +
          '<p class="sc"><b>stated limitation</b>' + esc(s.caveat) + '</p>' +
          '<div class="sf"><span>' + s.commits + ' commits · 0 deps</span>' +
          '<a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">source ↗</a></div>' +
          '</div>';
      }).join("");
    }
  }

  /* ══ §09 limitations · §10 path · §11 contact ═════════════════════════ */
  function initLedger() {
    var host = $("#ledgerList"); if (!host) return;
    host.innerHTML = S.ledger.map(function (l) {
      return '<div class="ledrow rv" data-s="' + esc(l.s) + '">' +
        '<span class="ls">' + esc(l.s === "this-site" ? "site" : l.s) + '</span>' +
        '<div><p class="lt">' + esc(l.t) + '</p><p class="ld">' + esc(l.d) + '</p></div>' +
        '</div>';
    }).join("");
  }
  function initTimeline() {
    var host = $("#timeline"); if (!host) return;
    host.innerHTML = S.timeline.map(function (t) {
      return '<div class="tli rv"><div class="tw">' + esc(t.when) + '</div>' +
        '<div><h3>' + esc(t.what) + '</h3><p>' + t.detail + '</p>' +
        '<div class="tr">' + t.repos.map(function (r) { return '<span>' + esc(r) + '</span>'; }).join("") + '</div></div></div>';
    }).join("");
  }
  function initContact() {
    var host = $("#ctlinks"); if (!host) return;
    var links = [
      { l: "copy email", copy: S.dossier.email },
      { l: "github ↗", href: "https://github.com/saadcyber21" },
      { l: "résumé pdf ↗", href: "resume.pdf" },
      { l: "page source ↗", href: "https://github.com/saadcyber21/saadcyber21.github.io" }
    ];
    host.innerHTML = links.map(function (x) {
      return '<button class="ctl" type="button"' +
        (x.copy ? ' data-copy="' + esc(x.copy) + '"' : '') +
        (x.href ? ' data-href="' + esc(x.href) + '"' : '') + '>' + esc(x.l) + '</button>';
    }).join("");
    $$(".ctl", host).forEach(function (b) {
      b.addEventListener("click", function () {
        var c = b.getAttribute("data-copy"), h = b.getAttribute("data-href");
        if (c) copy(c, "email address");
        else if (h) window.open(h, h.indexOf("http") === 0 ? "_blank" : "_self", "noopener");
      });
    });
  }
  function initColophon() {
    var host = $("#colophon"); if (!host) return;
    host.innerHTML = '<p>' + S.colophon.line + '</p>' +
      '<p><b>' + esc(S.colophon.assertions) + '</b> automated assertions green at build · ' +
      'data of record: GitHub REST API, <b>' + esc(S.meta.buildDate) + '</b> · ' +
      'tools MIT-licensed · © 2026 MD SAAD</p>';
  }

  /* ══ command palette ══════════════════════════════════════════════════ */
  function initPalette() {
    var pal = $("#pal"), input = $("#palIn"), listEl = $("#palList");
    if (!pal || !input || !listEl) return;

    var items = S.nav.map(function (n) {
      return { t: "section", k: n.k, l: n.label, act: function () { go(n.id); } };
    });
    S.projects.forEach(function (p, i) {
      items.push({ t: "exhibit", k: "p" + (i + 1), l: p.name + " — " + p.tag,
        act: function () { go("d-" + p.key); } });
    });
    S.controls.forEach(function (c, i) {
      items.push({ t: "repo", k: "c" + (i + 1), l: c.name, act: function () { window.open(c.url, "_blank", "noopener"); } });
    });
    S.systems.forEach(function (s, i) {
      items.push({ t: "repo", k: "s" + (i + 1), l: s.name, act: function () { window.open(s.url, "_blank", "noopener"); } });
    });
    items.push({ t: "action", k: "gh", l: "open github profile", act: function () { window.open(S.meta.profileUrl, "_blank", "noopener"); } });
    items.push({ t: "action", k: "@", l: "copy email address", act: function () { copy(S.dossier.email, "email address"); } });
    items.push({ t: "action", k: "cv", l: "open résumé (pdf)", act: function () { window.open("resume.pdf", "_blank", "noopener"); } });
    items.push({ t: "action", k: "prt", l: "print this dossier", act: function () { window.print(); } });
    items.push({ t: "action", k: "中文", l: "switch introduction language", act: function () {
      var b = LANG === "zh" ? $("#langEn") : $("#langZh");
      if (b) b.click();
    } });

    var sel = 0, shown = items, isOpen = false;
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
    function choose() {
      var it = shown[sel];
      close();
      if (it) it.act();
    }
    function open() {
      isOpen = true; pal.hidden = false;
      input.value = ""; filter(); input.focus();
    }
    function close() {
      isOpen = false; pal.hidden = true;
      var pb = $("#palBtn"); if (pb) pb.focus({ preventScroll: true });
    }
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); sel = Math.min(sel + 1, Math.min(shown.length, 40) - 1); draw(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(sel - 1, 0); draw(); }
      else if (e.key === "Enter") { e.preventDefault(); choose(); }
      else if (e.key === "Escape") { e.preventDefault(); close(); }
    });
    input.addEventListener("input", filter);
    pal.addEventListener("click", function (e) { if (e.target === pal) close(); });
    var btn = $("#palBtn");
    if (btn) btn.addEventListener("click", function () { isOpen ? close() : open(); });
    document.addEventListener("keydown", function (e) {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault(); isOpen ? close() : open();
      } else if (e.key === "Escape" && isOpen) close();
    });
  }

  /* ══ misc: print buttons, back-to-top ═════════════════════════════════ */
  function initMisc() {
    ["printBtn", "printBtn2"].forEach(function (id) {
      var b = $("#" + id);
      if (b) b.addEventListener("click", function () { window.print(); });
    });
    var top = $("#top");
    if (top) {
      top.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: RM ? "auto" : "smooth" }); });
      var ticking = false;
      window.addEventListener("scroll", function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
          top.classList.toggle("on", (window.pageYOffset || document.documentElement.scrollTop) > 700);
          ticking = false;
        });
      }, { passive: true });
    }
  }

  /* ══ boot ═════════════════════════════════════════════════════════════ */
  function renderAll() {
    initHero();
    initNav();
    renderDossier();
    initLangSwitch();
    initMethod();
    initWork();
    initCoverage();
    initLab();
    renderSkills();
    renderExperience();
    initSupport();
    initLedger();
    initTimeline();
    initContact();
    initColophon();
    initPalette();
    initMisc();
    initReveal();
    initSpotlight();
    initScrollSpy();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", renderAll);
  else renderAll();
})();
