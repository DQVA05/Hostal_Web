# Prompt v5 — Claude Code: corrections and new booking options — "Casita de Tercera"

Run in one session, phase by phase. **Stop at each CHECKPOINT**, report, and wait for the user to say "sigue".

## Context (do not re-explore beyond what is listed)
Hostel site, Costamar (Havana). Java 21 + Spring Boot + Thymeleaf. Whole house rented to ONE group per day: 2 or 3 rooms, max 6 guests, 24 h blocks 10:00–10:00. 100 USD (2 rooms) / 150 USD (3) per block. 50 % deposit, negotiable. USD/EUR; CUP occasionally at "tasa de cambio vigente". Extras billed apart: food, 7-seat transport with driver, day pass (pasadía).
Built so far (see `PROMPT-frontend.md`, v4): admin mock in `src/main/resources/static/admin/` (plain HTML/CSS/JS, data from `datos-ejemplo.js`, nothing persisted) and public booking page `templates/reserva.html` + `static/js/reserva.js` + `static/css/app.css`.

## Rules (same as v4, still binding)
- **Do not touch the backend**: no Java, `pom.xml`, `application*.yml/properties`, security or DB. The `/reserva` route already exists. Frontend only, mock data.
- Plain HTML, CSS, vanilla JS. No npm, CDN, external fonts or libraries.
- Spanish UI, "usted". Mobile first (360/390/430 px), body ≥ 18 px in admin, tap targets ≥ 48 px, every button = icon + word in admin, AA contrast, visible focus, keyboard, `prefers-reduced-motion`, light and dark.
- Admin user is the owner: not used to technology, works from his phone. Plain words, one help line per section.
- **Never invent business facts** (prices, hours, capacities, zones). Use `null` in data + `[PENDIENTE: …]` in UI, and list them in the summary.
- The working tree has uncommitted work and `static/admin/` is untracked: run `git status` / `git diff --stat` first, never revert or reformat unrelated code. No commit.
- Verify without starting Spring Boot: use the headless Firefox method saved in project memory (`prueba-visual-firefox-snap`). Delete test folders afterwards. `node --check` every JS you touch.

---

## Phase 1 — Fixes (points 1, 1.1, 2)

### 1. "Dinero" form has no scroll: the owner cannot reach all fields
Diagnosed cause (confirm, then fix):
- `admin.css` §9: `.dialogo` has `max-height: calc(100dvh - 1rem); overflow: hidden`; `.dialogo[open]` is `display:flex; flex-direction:column`; `.dialogo-cuerpo` relies on `flex:1 1 auto; min-height:0; overflow-y:auto`.
- In `dinero.html#dialogo-movimiento`, `reservas.html#dialogo-nueva` and `reservas.html#dialogo-pago` the header/body/footer live **inside a `<form>`**. The form is the dialog's only flex item and is `display:block`, so `.dialogo-cuerpo` never becomes the scroll container: the form grows, the dialog clips it, and the lower fields and "Guardar" are unreachable on a phone.
- Fix in CSS once for all dialogs (e.g. `.dialogo > form { display:flex; flex-direction:column; flex:1 1 auto; min-height:0; }`). Header and footer stay fixed; only the body scrolls.
- Phones use overlay scrollbars that are invisible until touched. Add a visible cue that more content exists (top/bottom fade or shadow on the scrolling body, `scrollbar-gutter: stable`), and on a validation error scroll the first invalid field into view and focus it.

**Accept when:** at 360×640, 390×844 and landscape 640×360 every field and both footer buttons of the three form dialogs can be reached by scrolling and by Tab; the dialogs without a form (detail, confirm) still work.

### 1.1 Other admin sections without scroll
Audit **every** admin page at 360×640, landscape 640×360 and 1280×800, both themes. Known candidates:
- `.menu-mas` (fixed, no `max-height`): clipped in landscape. Give it `max-height` + `overflow-y:auto`.
- Detail dialog in `reservas.html`, the confirm dialog built in `comun.js`, `informe.html` tables and charts (`.tabla-envoltorio` already has `overflow-x:auto`; check charts), calendar panel, desktop sidebar.
- No page may lock body scroll, and none may scroll horizontally at 360 px.
Report a table: section → problem found → fix (or "OK, nothing to do").

### 2. Selected days must change colour
- **Admin calendar** (`calendario.js` sets `aria-pressed="true"`; `admin.css` `.dia[aria-pressed="true"]` only adds a ring). The background never changes, and on pending/booked/disabled days the pattern hides the ring. Fix: fill the chosen days with a selection colour (new vars such as `--seleccion-fondo` / `--seleccion-texto` for light and dark, AA text contrast, ≥ 3:1 against neighbouring days). Keep the thick ring and add a check mark so the state does not depend on colour. The first tap already fills that day; the second tap fills the whole range. Update the legend ("Elegido") and keep the `forced-colors` rule.
- **Public calendar** (`app.css` `.dia.en-rango` uses `--rango` #E3E8EC / dark #2A3A48: almost invisible against the surface). Make the stay range clearly visible (≥ 3:1 non-text contrast, or fill plus edge), check that the check-in day fills right after the first tap, and update the legend swatches.

**Accept when:** screenshots (light and dark, 360 px) show check-in only, a full range, and a range crossing a month change in both calendars, all clearly coloured.

**CHECKPOINT 1:** report what changed, the screenshots' paths and the 1.1 table. Wait.

---

## Phase 2 — Shared availability data (base for 3, 4, 5)
The public page must reflect what the owner sets in the admin. There is no backend, so create one **public-safe** mock that both sides read. It mirrors the future API.
- New file, e.g. `static/js/disponibilidad-ejemplo.js` → `window.DISPONIBILIDAD_EJEMPLO`. **No personal data** (no names, emails, phones, amounts paid).
- Suggested shape (adapt if needed and document it at the top of the file):
  ```js
  {
    config: {
      habitacionesTotales: 3,
      precioPorBloque: { 1: null, 2: 100, 3: 150 },          // USD; null = [PENDIENTE], not offered
      pasadia: { activa: true, precio: null, horario: null, maxPersonas: null },
      transporte: { activo: true, plazas: 7, precioAeropuerto: null, preciosPorProvincia: { /* provincia: null */ } }
    },
    dias: { 'AAAA-MM-DD': { habitaciones: 0|1|2|3, ocupado: true|false, pasadia: true|false } } // only days that differ from default
  }
  ```
- **One source of truth for dates.** Current and future bookings and blocks must not be written twice. Recommended: generate their dates (relative to today in Havana, as `datos-ejemplo.js` does) in the shared file, and have `datos-ejemplo.js` attach clients/payments to them. All admin figures must stay consistent across pages.
- Admin loads it with `../js/disponibilidad-ejemplo.js` before `datos-ejemplo.js`; `reserva.html` loads it with `th:src`. Prices leave the HTML (`data-precio`) and come from `config`.
- Admin edits stay in memory ("Nada se guarda" banner still true). Do not add `localStorage` beyond the theme.
- **The public calendar today lets the guest pick any future day**. From now on, occupied or disabled days are disabled, with the reason in `aria-label`.

**CHECKPOINT 2:** show the final data shape and the planned endpoints, e.g. `GET /api/disponibilidad?desde=&hasta=` and `GET /api/servicios`. Wait.

---

## Phase 3 — Rooms chosen by the guest + total price (points 3, 3.1)
- **Admin, `calendario.html`:** in the "Días elegidos" panel add "Habitaciones disponibles: 1 / 2 / 3" for the selected days (0 = the existing "Desactivar" flow, with its reason). It cannot drop below the rooms an existing booking uses on any of those days: explain why next to it. The day shows a small badge (e.g. "2 hab.") plus text in the legend and the counters.
- **Public, `reserva.html`:** after choosing dates, a "Habitaciones" step lists options from 1 up to the **minimum** available across the stay's nights. Options whose price is `null` appear disabled, with "Consulte por WhatsApp" next to them; never show an invented price. Days with fewer rooms show a hint in the calendar ("Quedan 2 habitaciones") that does not depend on colour.
- **Total price (3.1):** replace the two-row price table with a live breakdown: alojamiento (N noches × price for the chosen rooms), transporte, pasadía, **total**, anticipo 50 % (negociable). Items without a price read "a confirmar" and are kept out of the total, with a note. The same figures appear in the rules dialog and in the confirmation screen (`textoPrecioTotal` today lists both options joined with "o": replace it).
- Admin `reservas.html` manual creation: limit the rooms to what is available for the dates.

## Phase 4 — Day pass (pasadía) controlled by the admin (point 5)
- **Admin:** a new page `static/admin/servicios.html`, linked from "Más" (keep the 5-item bottom bar), for prices per rooms, pasadía (accept yes/no, price, hours, max people) and transport (active yes/no, airport price, price per province). Every unknown value shows `[PENDIENTE]`. In `calendario.html` the day panel gets "Permitir pasadía este día" (free, future days only). A pasadía booking occupies its day. `reservas.html` shows the booking type (Estancia / Pasadía), and manual creation allows both.
- **Public:** if pasadía is active, the date step starts with "¿Qué desea reservar?": "Estancia (24 h, de 10:00 a 10:00)" / "Pasadía (un solo día)". In pasadía mode the calendar picks **one** day, only days the owner enabled, the rooms step is hidden, and hours and price come from config (`[PENDIENTE]` if `null`). If pasadía is inactive the choice does not appear at all.

## Phase 5 — Transport chosen by the guest (point 4)
Optional fieldset "Transporte (auto de 7 plazas con chofer)", collapsed until "Sí, lo necesito". It is progressive: show only what applies.
- Trip: "Llegada a la casa", "Regreso desde la casa" or "Ida y vuelta".
- Pick-up / drop-off for each leg:
  - "Aeropuerto José Martí (La Habana)", with an optional flight number.
  - "Dirección exacta": province select, municipality, street and number, "entre calles", reference point, and an optional pasted map link (http/https only; link out, no iframe or map scripts).
  - "Solo la provincia": province select (the 15 provinces + Isla de la Juventud), municipality optional; the exact address is agreed later by WhatsApp.
- Date defaults to check-in (arrival) / check-out (return), editable; time required; passengers 1–7.
- Price: from config by airport/province; `null` → "Precio a confirmar". It feeds the Phase 3 breakdown.
- Summary, rules dialog and confirmation list the transport request. Admin `reservas.html` detail shows it, and "transporte" income in `dinero.html` can be linked to that booking (already supported).
- Design freedom: you may add small touches that help the guest (e.g. a "Cómo llegar" link built from the address, a reminder to have the phone with WhatsApp on arrival). Do not add geolocation, external services or any new fact.

---

## Verify (supervision)
For each point, prove it, don't assume it:
- `node --check` each touched JS. `grep` that no `data-precio`, hard-coded 100/150 or invented price remains outside `config`.
- Screenshots at 360×640, 390×844, landscape 640×360 and 1280×800, light and dark, for: the three form dialogs (scrolled to the end), "Más" in landscape, both calendars with a selection, the rooms step on a day with 2 rooms, pasadía on/off, transport by address and by province, the price breakdown, and the confirmation screen.
- Logic: cannot book across an occupied/disabled day; rooms ≤ the minimum available; the owner cannot reduce rooms below an existing booking; pasadía only on enabled free days; totals match between summary, dialog and confirmation; admin totals still match across pages.
- Keyboard-only run of the public booking with transport; `prefers-reduced-motion`.
- At the end, review the whole diff with the code-review skill (medium) and fix confirmed findings.

## Deliver
1. Status table: point (1, 1.1, 2, 3, 3.1, 4, 5) → done / partial / pending → files → how to test in the browser.
2. `[PENDIENTE]` list (1-room price, pasadía price/hours/max people, transport prices, etc.).
3. Backend contract: endpoint → fields read/written, matching the shared data shape.
4. Screenshot paths (or say they were deleted after review). No commit.
