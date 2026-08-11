# Inventory Tracker

A simple phone-friendly web app for the family store: enter what's left at the
end of each day, and see a sales dashboard. Built as a static web app (HTML /
CSS / JavaScript) — no build step.

## Products tracked (edit in `assets/js/store.js`)
- **El Milagro Tortillas** — counted in *boxes*
- **Pan Dulce Conchas** — counted in *pieces*
- **Jarritos** — counted in *cases*

## How it works
Each day someone counts how many of each product is **left at the end of the
day** and saves it. Units sold are calculated automatically:

```
sold = yesterday's leftover + anything received today − today's leftover
```

The "received today" field (tap *"Got a delivery today?"*) is what keeps a
restock day from looking like negative sales. The app also logs the day's
temperature (free, no API key) so the dashboard can show how sales move with
the weather over time.

## Run it locally
```powershell
cd "C:\Users\sauld\summer 2026\inventory-app"
python -m http.server 8001
```
Open http://localhost:8001

## File map
| File | What it does |
|---|---|
| `index.html` | Loads the app |
| `assets/js/store.js` | **Data layer** — products + all reads/writes (localStorage today) |
| `assets/js/weather.js` | Fetches temperature from Open-Meteo |
| `assets/js/app.js` | Screens: login, daily entry, dashboard, settings |
| `assets/css/styles.css` | Styling (mobile-first) |

## Current limitation (and the next step)
Right now data is saved **on one device only** (browser localStorage). That's
perfect for building and testing, but your phone and your dad's phone won't
share data yet.

**Next step — cloud sync:** swap the inside of `store.js` to use **Supabase**
(a free hosted database). Because every read/write already goes through
`store.js`, the rest of the app doesn't change. That step needs a free Supabase
account (a ~15-minute setup we'll do together).

## Later: put it "in the App Store" feel
This is already installable — on a phone, open the site, tap the share icon →
*Add to Home Screen*. It gets an icon and opens full-screen like a real app,
no App Store needed.
