/* ============================================================================
   app.js — the app's brain: screens, entry form, dashboard, charts.
   Talks to the data through Store (store.js) and Weather (weather.js).
   ============================================================================ */

(function () {
  "use strict";

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.prototype.slice.call(root.querySelectorAll(sel));

  const P = Store.PRODUCTS;
  const todayStr = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local
  const nice = (d) => new Date(d + "T00:00:00").toLocaleDateString(undefined,
    { weekday: "short", month: "short", day: "numeric" });
  const num = (v) => (isFinite(+v) ? +v : 0);

  /* ---------------------------------------------------------------------------
     SALES MATH
     End-of-day counts tell us what's LEFT. Units sold between two recorded days:
        sold = previous_ending + received_that_day − current_ending
     "received" covers restock deliveries so a delivery day doesn't look like
     negative sales. We clamp at 0 for display.
     --------------------------------------------------------------------------- */
  function salesSeries() {
    const entries = Store.getEntries();
    const out = []; // { date, weather, sold:{pid:units} }
    for (let i = 1; i < entries.length; i++) {
      const prev = entries[i - 1], cur = entries[i];
      const sold = {};
      P.forEach((p) => {
        const s = num(prev.counts[p.id]) + num(cur.received && cur.received[p.id]) - num(cur.counts[p.id]);
        sold[p.id] = Math.max(0, s);
      });
      out.push({ date: cur.date, weather: cur.weather || null, sold });
    }
    return out;
  }

  /* ===========================================================================
     LOGIN SCREEN
     =========================================================================== */
  function renderLogin() {
    const s = Store.settings();
    const app = $("#app");
    app.innerHTML = `
      <div class="login">
        <div class="login__card">
          <div class="brand"><span class="brand__mark">📦</span><span>${s.storeName}</span></div>
          <h1>Who's using this?</h1>
          <p class="muted">Pick your name so each entry is tagged.</p>
          <div class="login__users" id="loginUsers">
            ${Store.users().map((u) => `<button class="userbtn" data-user="${u}">${u}</button>`).join("")}
          </div>
          <form id="addUserForm" class="row">
            <input id="newUser" class="input" placeholder="Add a name" autocomplete="off">
            <button class="btn" type="submit">Add</button>
          </form>
        </div>
      </div>`;

    $("#loginUsers").addEventListener("click", (e) => {
      const b = e.target.closest("[data-user]");
      if (!b) return;
      Store.setUser(b.dataset.user);
      route("entry");
    });
    $("#addUserForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const v = $("#newUser").value.trim();
      if (v) { Store.addUser(v); renderLogin(); }
    });
  }

  /* ===========================================================================
     APP SHELL (header + bottom tab bar)
     =========================================================================== */
  function shell(activeTab, bodyHTML) {
    const s = Store.settings();
    return `
      <header class="topbar">
        <div class="brand"><span class="brand__mark">📦</span><span>${s.storeName}</span></div>
        <button class="who" id="whoBtn">${Store.currentUser()} ▾</button>
      </header>
      <main class="screen">${bodyHTML}</main>
      <nav class="tabs">
        <button class="tab ${activeTab==='entry'?'is-on':''}" data-tab="entry"><span>📝</span>Enter</button>
        <button class="tab ${activeTab==='dash'?'is-on':''}" data-tab="dash"><span>📊</span>Dashboard</button>
        <button class="tab ${activeTab==='settings'?'is-on':''}" data-tab="settings"><span>⚙️</span>Settings</button>
      </nav>`;
  }

  function wireShell() {
    $$(".tab").forEach((t) => t.addEventListener("click", () => route(t.dataset.tab)));
    $("#whoBtn").addEventListener("click", () => {
      Store.signOut();
      route("login");
    });
  }

  /* ===========================================================================
     ENTRY SCREEN
     =========================================================================== */
  function renderEntry() {
    const date = renderEntry._date || todayStr();
    const existing = Store.getEntry(date);
    const body = `
      <div class="wrap">
        <div class="field">
          <label>Date</label>
          <input type="date" id="entryDate" class="input" value="${date}" max="${todayStr()}">
        </div>

        <div id="weatherLine" class="weather">🌡️ Checking weather…</div>

        <p class="hint">Enter how many are <strong>left at the end of the day</strong>.</p>

        ${P.map((p) => {
          const c  = existing ? num(existing.counts[p.id]) : 0;
          const rc = existing && existing.received ? num(existing.received[p.id]) : 0;
          return `
          <div class="prod" style="--pc:${p.color}">
            <div class="prod__head">
              <span class="prod__name">${p.name}</span>
              <span class="prod__unit">${p.unit}</span>
            </div>
            <div class="stepper">
              <button type="button" class="step" data-step="-1" data-t="${p.id}">−</button>
              <input class="count" id="c_${p.id}" type="number" inputmode="numeric" min="0" value="${c}">
              <button type="button" class="step" data-step="1" data-t="${p.id}">+</button>
            </div>
            <details class="received">
              <summary>Got a delivery today? Add restock</summary>
              <div class="stepper stepper--sm">
                <button type="button" class="step" data-step="-1" data-t="r_${p.id}">−</button>
                <input class="count" id="r_${p.id}" type="number" inputmode="numeric" min="0" value="${rc}">
                <button type="button" class="step" data-step="1" data-t="r_${p.id}">+</button>
              </div>
            </details>
          </div>`;
        }).join("")}

        <button class="btn btn--primary btn--block" id="saveBtn">
          ${existing ? "Update today's counts" : "Save today's counts"}
        </button>
        <p id="saveMsg" class="savemsg"></p>
      </div>`;

    $("#app").innerHTML = shell("entry", body);
    wireShell();

    // steppers: data-t is the product id for counts, or "r_<id>" for restock
    $$(".step").forEach((b) => b.addEventListener("click", () => {
      const id = b.dataset.t.startsWith("r_") ? b.dataset.t : "c_" + b.dataset.t;
      const inp = document.getElementById(id);
      inp.value = Math.max(0, num(inp.value) + (+b.dataset.step));
    }));

    // date change reloads the form (to prefill that day)
    $("#entryDate").addEventListener("change", (e) => {
      renderEntry._date = e.target.value;
      renderEntry();
    });

    // weather: use the saved value if the entry exists, else fetch live
    const wl = $("#weatherLine");
    if (existing && existing.weather) {
      const w = existing.weather;
      wl.innerHTML = `${w.emoji} ${w.tempF}°F · ${w.desc} <span class="muted">(logged)</span>`;
      renderEntry._weather = w;
    } else {
      const s = Store.settings();
      Weather.fetchCurrent(s.lat, s.lon).then((w) => {
        renderEntry._weather = w;
        wl.innerHTML = w
          ? `${w.emoji} ${w.tempF}°F · ${w.desc} <span class="muted">· ${s.place}</span>`
          : `🌡️ Weather unavailable (will save without it)`;
      });
    }

    $("#saveBtn").addEventListener("click", () => {
      const d = $("#entryDate").value || todayStr();
      const counts = {}, received = {};
      P.forEach((p) => {
        counts[p.id]   = num($("#c_" + p.id).value);
        received[p.id] = num($("#r_" + p.id).value);
      });
      Store.saveEntry({
        date: d,
        user: Store.currentUser(),
        counts, received,
        weather: renderEntry._weather || null,
      });
      const m = $("#saveMsg");
      m.textContent = "✓ Saved. " + nice(d);
      m.classList.add("show");
      setTimeout(() => m.classList.remove("show"), 2500);
    });
  }

  /* ===========================================================================
     DASHBOARD
     =========================================================================== */
  function renderDashboard() {
    const entries = Store.getEntries();
    const series  = salesSeries();
    const latest  = entries[entries.length - 1] || null;
    const last7   = series.slice(-7);

    let body;
    if (!latest) {
      body = `<div class="wrap"><div class="empty">
        <div class="empty__i">📊</div>
        <h2>No data yet</h2>
        <p class="muted">Head to <strong>Enter</strong> and save today's counts. The dashboard fills in as you log each day.</p>
      </div></div>`;
      $("#app").innerHTML = shell("dash", body);
      wireShell();
      return;
    }

    // per-product cards
    const cards = P.map((p) => {
      const stock  = num(latest.counts[p.id]);
      const low    = stock <= p.low;
      const weekly = last7.reduce((s, d) => s + (d.sold[p.id] || 0), 0);
      const soldToday = series.length ? series[series.length - 1].sold[p.id] : 0;
      const spark = sparkline(series.map((d) => d.sold[p.id]), p.color);
      return `
        <div class="card" style="--pc:${p.color}">
          <div class="card__top">
            <span class="dot"></span>
            <span class="card__name">${p.name}</span>
            ${low ? `<span class="badge">Low</span>` : ""}
          </div>
          <div class="card__stock"><b>${stock}</b> ${p.unit} left</div>
          <div class="card__row">
            <div><span class="k">Sold today</span><span class="v">${soldToday}</span></div>
            <div><span class="k">Sold this week</span><span class="v">${weekly}</span></div>
          </div>
          <div class="spark">${spark}</div>
        </div>`;
    }).join("");

    // weather vs sales scatter
    const scatterData = series.filter((d) => d.weather).map((d) => ({
      temp: d.weather.tempF,
      sold: P.reduce((acc, p) => { acc[p.id] = d.sold[p.id]; return acc; }, {}),
    }));
    const scatter = scatterData.length >= 2
      ? weatherScatter(scatterData)
      : `<div class="note">Log a few more days (with weather) and this chart will show how each product sells as the temperature changes.</div>`;

    body = `
      <div class="wrap">
        <div class="dash__head">
          <h2>Dashboard</h2>
          <span class="muted">as of ${nice(latest.date)}</span>
        </div>
        <div class="cards">${cards}</div>

        <section class="panel">
          <h3>Sales vs. temperature</h3>
          <p class="muted sm">Your hunch: conchas ↑ when it's cold, jarritos &amp; tortillas ↑ when it's hot. This chart tests it as data builds.</p>
          ${scatter}
          <div class="legend">${P.map((p)=>`<span><i style="background:${p.color}"></i>${p.name}</span>`).join("")}</div>
        </section>
      </div>`;

    $("#app").innerHTML = shell("dash", body);
    wireShell();
  }

  /* ---- tiny SVG sparkline of daily units sold ---- */
  function sparkline(vals, color) {
    if (!vals.length) return `<span class="muted sm">—</span>`;
    const w = 240, h = 46, pad = 3;
    const max = Math.max(1, ...vals);
    const step = vals.length > 1 ? (w - pad * 2) / (vals.length - 1) : 0;
    const pts = vals.map((v, i) => {
      const x = pad + i * step;
      const y = h - pad - (v / max) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const line = vals.length > 1
      ? `<polyline fill="none" stroke="${color}" stroke-width="2" points="${pts.join(" ")}"/>`
      : `<circle cx="${pts[0].split(",")[0]}" cy="${pts[0].split(",")[1]}" r="3" fill="${color}"/>`;
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" class="sparksvg">${line}</svg>`;
  }

  /* ---- weather scatter: x = temperature, y = units sold, color per product ---- */
  function weatherScatter(data) {
    const w = 320, h = 200, m = { l: 34, r: 8, t: 10, b: 26 };
    const temps = data.map((d) => d.temp);
    const allSold = data.flatMap((d) => P.map((p) => d.sold[p.id]));
    const tMin = Math.min(...temps) - 3, tMax = Math.max(...temps) + 3;
    const sMax = Math.max(3, ...allSold);
    const X = (t) => m.l + (t - tMin) / (tMax - tMin || 1) * (w - m.l - m.r);
    const Y = (s) => h - m.b - (s / sMax) * (h - m.t - m.b);

    let g = "";
    // y gridlines
    for (let i = 0; i <= 3; i++) {
      const val = Math.round(sMax * i / 3), y = Y(val);
      g += `<line x1="${m.l}" y1="${y}" x2="${w - m.r}" y2="${y}" stroke="#eceae4"/>`;
      g += `<text x="${m.l - 6}" y="${y + 3}" text-anchor="end" class="axt">${val}</text>`;
    }
    // x labels (min & max temp)
    g += `<text x="${m.l}" y="${h - 8}" class="axt">${Math.round(tMin)}°</text>`;
    g += `<text x="${w - m.r}" y="${h - 8}" text-anchor="end" class="axt">${Math.round(tMax)}°</text>`;
    // points
    data.forEach((d) => P.forEach((p) => {
      g += `<circle cx="${X(d.temp).toFixed(1)}" cy="${Y(d.sold[p.id]).toFixed(1)}" r="4" fill="${p.color}" fill-opacity="0.85"/>`;
    }));
    return `<svg viewBox="0 0 ${w} ${h}" class="scatter">${g}</svg>`;
  }

  /* ===========================================================================
     SETTINGS
     =========================================================================== */
  function renderSettings() {
    const s = Store.settings();
    const body = `
      <div class="wrap">
        <div class="field"><label>Store name</label>
          <input id="setName" class="input" value="${s.storeName}"></div>
        <div class="field"><label>Weather location — place name</label>
          <input id="setPlace" class="input" value="${s.place}"></div>
        <div class="row">
          <div class="field"><label>Latitude</label><input id="setLat" class="input" value="${s.lat}"></div>
          <div class="field"><label>Longitude</label><input id="setLon" class="input" value="${s.lon}"></div>
        </div>
        <p class="muted sm">Tip: search "my latitude longitude" to find your store's coordinates.</p>
        <button class="btn btn--primary btn--block" id="saveSet">Save settings</button>
        <p id="setMsg" class="savemsg"></p>
        <hr>
        <button class="btn btn--block" id="switchUser">Switch user (${Store.currentUser()})</button>
      </div>`;
    $("#app").innerHTML = shell("settings", body);
    wireShell();
    $("#saveSet").addEventListener("click", () => {
      Store.saveSettings({
        storeName: $("#setName").value.trim() || "Our Store",
        place: $("#setPlace").value.trim(),
        lat: num($("#setLat").value), lon: num($("#setLon").value),
      });
      const m = $("#setMsg"); m.textContent = "✓ Saved"; m.classList.add("show");
      setTimeout(() => m.classList.remove("show"), 2000);
    });
    $("#switchUser").addEventListener("click", () => { Store.signOut(); route("login"); });
  }

  /* ===========================================================================
     ROUTER
     =========================================================================== */
  function route(view) {
    if (view !== "login" && !Store.currentUser()) view = "login";
    if (view === "login")    return renderLogin();
    if (view === "entry")    return renderEntry();
    if (view === "dash")     return renderDashboard();
    if (view === "settings") return renderSettings();
  }

  // start
  route(Store.currentUser() ? "entry" : "login");
})();
