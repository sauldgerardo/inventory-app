/* ============================================================================
   store.js — the DATA LAYER
   ----------------------------------------------------------------------------
   Everything that reads or writes data goes through this file. Right now it
   saves to the browser's localStorage (on THIS device only). Later, to make
   two phones share data, we swap the inside of these functions to call
   Supabase — and nothing else in the app has to change. That's the point of
   keeping all storage in one place.
   ============================================================================ */

const Store = (function () {
  "use strict";

  // ---- Product catalog. Edit here to add/rename products. ----
  //  unit  = what you count (boxes, pieces, cases)
  //  low   = flag as "low stock" when the ending count is at or below this
  //  color = used in the dashboard charts
  const PRODUCTS = [
    { id: "tortillas", name: "El Milagro Tortillas", unit: "boxes",  low: 5,  color: "#c2703d" },
    { id: "conchas",   name: "Pan Dulce Conchas",    unit: "pieces", low: 12, color: "#b5893a" },
    { id: "jarritos",  name: "Jarritos",             unit: "cases",  low: 4,  color: "#3f8f6b" },
  ];

  // localStorage keys
  const K = {
    users:   "inv.users",
    current: "inv.currentUser",
    entries: "inv.entries",     // object keyed by date "YYYY-MM-DD"
    settings:"inv.settings",
  };

  const read  = (k, fallback) => {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  };
  const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  // ---- Users (lightweight — just "who is entering", not real security yet) ----
  function users() {
    const u = read(K.users, null);
    if (u && u.length) return u;
    const seed = ["Saul", "Dad"];       // starting names; editable in Settings
    write(K.users, seed);
    return seed;
  }
  function addUser(name) {
    name = (name || "").trim();
    if (!name) return;
    const u = users();
    if (!u.includes(name)) { u.push(name); write(K.users, u); }
  }
  function currentUser()      { return read(K.current, null); }
  function setUser(name)      { write(K.current, name); }
  function signOut()          { localStorage.removeItem(K.current); }

  // ---- Settings (store name + weather location) ----
  function settings() {
    return read(K.settings, {
      storeName: "Our Store",
      // Default location: Quad Cities area. Change in Settings.
      lat: 41.51, lon: -90.42, place: "Quad Cities, IL",
    });
  }
  function saveSettings(s) { write(K.settings, { ...settings(), ...s }); }

  // ---- Entries. One record per date. ----
  // Shape:
  // { date, user, counts:{tortillas,conchas,jarritos},
  //   received:{...}, weather:{tempF,code,desc,emoji}|null, ts }
  function entriesMap() { return read(K.entries, {}); }

  function getEntries() {
    const m = entriesMap();
    return Object.values(m).sort((a, b) => a.date.localeCompare(b.date));
  }
  function getEntry(date) { return entriesMap()[date] || null; }

  function saveEntry(entry) {
    const m = entriesMap();
    m[entry.date] = { ...entry, ts: Date.now() };
    write(K.entries, m);
  }
  function deleteEntry(date) {
    const m = entriesMap();
    delete m[date];
    write(K.entries, m);
  }

  return {
    PRODUCTS,
    users, addUser, currentUser, setUser, signOut,
    settings, saveSettings,
    getEntries, getEntry, saveEntry, deleteEntry,
  };
})();
