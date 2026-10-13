# DevSphere Real Estate

A website for a real estate agent who sells and rents flats, villas, plots, shops and rooms in India.
Customers browse properties and contact the owner on WhatsApp or through an enquiry form.
The owner logs in to an admin panel to manage properties, photos and leads.

- **Frontend:** React (Vite) + React Router, plain CSS. No UI framework.
- **Backend:** Python, FastAPI, SQLAlchemy 2, Alembic, Pydantic.
- **Database:** PostgreSQL/Neon for hosting. XAMPP MySQL/MariaDB and SQLite also work locally by changing only `DATABASE_URL` in `backend/.env`.
- **Auth:** JWT for the admin, passwords hashed with argon2.

```
real_estate/
├── backend/      FastAPI app, models, migrations (alembic/), scripts/, tests/
├── frontend/     React app (src/pages, src/admin, src/config/site.js, public/)
├── DEPLOYMENT.md How to put it online
└── README.md
```

## 1. Backend setup (Windows)

You need Python 3.11+. For Neon hosting, create a free Neon Postgres database and paste its connection string into `backend/.env`. For local XAMPP development, start **MySQL** in the XAMPP control panel and create an empty database
named `real_estate` (phpMyAdmin → Databases → Create). Apache is not needed.

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env          # then open .env and set JWT_SECRET (instructions are inside the file)
alembic upgrade head            # creates the tables
python -m scripts.create_admin  # asks for your admin email and password (min. 10 characters)
python -m scripts.seed          # optional: 8 sample properties
uvicorn app.main:app --reload   # API on http://127.0.0.1:8000, docs on /docs
```

### Settings (`backend/.env`)

| Variable | What it does |
|---|---|
| `DATABASE_URL` | Database. Neon/PostgreSQL: paste Neon's URL directly, or use `postgresql+psycopg://user:pass@host:5432/dbname?sslmode=require`. XAMPP: `mysql+pymysql://root:@localhost:3306/real_estate?charset=utf8mb4`. SQLite: `sqlite:///./devsphere.db` |
| `JWT_SECRET` | Long random secret that signs login tokens. Never share or commit it. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | How long an admin login lasts (default 480 = 8 hours) |
| `CORS_ORIGINS` | Website addresses allowed to call the API, comma separated |
| `UPLOAD_DIR`, `MAX_UPLOAD_MB` | Where photos are saved and the size limit (default 8 MB) |
| `LEAD_RATE_LIMIT`, `LEAD_RATE_WINDOW_SECONDS` | Enquiries allowed per visitor address (default 5 per 10 minutes) |
| `TRUST_PROXY_HEADERS` | Set `true` only behind a reverse proxy you control |
| `DOCS_ENABLED` | Show `/docs`. Set `false` in production |
| `SITE_URL` | Public website address, used by the sitemap script |
| `TIMEZONE` | Time zone used to decide which day an enquiry belongs to in the dashboard charts (default `Asia/Kolkata`) |

### Migrations

```powershell
alembic upgrade head                                    # apply
alembic revision --autogenerate -m "describe change"    # after changing app/models.py
alembic downgrade -1                                    # undo the last one
```

### Tests

```powershell
cd backend
python -m pytest -q
```
80+ tests cover login, listing create/edit/delete, filters and sorting, enquiries and phone validation,
rate limiting, photo upload checks (fake and oversized files), security headers, the sitemap and the dashboard month statistics.
They use a temporary SQLite database and never touch your MySQL data.

## 2. Frontend setup

You need Node.js 20+. Keep the backend running.

```powershell
cd frontend
npm install
copy .env.example .env      # VITE_API_URL=http://127.0.0.1:8000
npm run dev                 # website on http://localhost:5173
npm run build               # production files in frontend/dist
```

### Change your business details

Everything shown in the header, footer, contact page and WhatsApp/call buttons comes from one file:
**`frontend/src/config/site.js`**: phone, WhatsApp number, email, RERA number, office address, working
hours, map link and website address. The current values are **placeholders. Replace them before going live.**

The logo files are in `frontend/public/` (`logo-mark.png`, `logo-full.png`, `favicon.png`,
`apple-touch-icon.png`, `og-image.png` for link previews). Replace them to change the logo.

## 3. Using the website

- **Public site:** home, `/properties` (filters, sort, pages), `/properties/DS-101` (details, photos, enquiry
  form, WhatsApp), `/contact`. Works in light and dark mode and is built mobile first.
- **Admin panel:** open `/admin` and log in.
  - **Dashboard:** a **This month** section (see below), then counts of available, sold, rented and hidden properties and new leads.
  - **Listings:** search, filter by status, add, edit, delete (with confirmation), quick Sold / Rented / Hide buttons.
  - **Add / edit property:** all fields, live price preview, photo upload with previews, drag to reorder, set cover, remove.
  - **Leads:** filter by status or "new only", search by name or phone, change status, private notes,
    one-click WhatsApp reply and call.
- **Prices** are stored in rupees and shown as `₹68 Lakh`, `₹1.35 Cr`, `₹14,000/month`.
- When a customer sends an enquiry, it is saved in **Leads** and the thank-you screen also offers a
  WhatsApp button with the same details, so you get it in two places.

### Dashboard charts (current month)

The top of the admin dashboard shows the current month only:

- **Leads per day:** one column for every day of the month; days that have not happened yet stay empty, days with
  no enquiry show a small grey stub, and today is marked. Hover (or use the arrow keys) to see a day's number.
- **How this month's leads turned out:** one bar split into **Won** (status *Closed*), **Open** (*New*, *Contacted*,
  *Visit scheduled*) and **Lost**, with the numbers underneath.
- Numbers for **leads this month** (compared with last month up to the same day), win rate, how many leads are
  **not contacted yet**, days with no leads, and properties added.
- Every chart has a **View as table** option.

"Won" and "Lost" come from the status you set on each lead in the Leads page, so keep statuses up to date.
The site does not record money (commission, price paid or expenses), so these charts show deals won and lost, not rupees.

### Sitemap for Google

```powershell
cd backend
python -m scripts.generate_sitemap     # writes frontend/public/sitemap.xml using SITE_URL
```
Run it before each production build. Also put your real domain in `frontend/public/robots.txt`.

## API overview

Interactive docs are at `/docs` while `DOCS_ENABLED=true`.

| Public | |
|---|---|
| `GET /api/listings` | filters `kind`, `property_type`, `q`, `min_price`, `max_price`, `bedrooms`, `featured`; `sort` = newest / price_asc / price_desc; `page`, `page_size` |
| `GET /api/listings/{ref_code}` | full details with photos |
| `POST /api/leads` | customer enquiry (valid 10-digit Indian mobile required, rate limited per IP) |

Admin (JWT): `POST /api/admin/login`, `GET /api/admin/me`, `/api/admin/listings` (GET, POST, PUT, PATCH, DELETE),
`/api/admin/listings/{id}/photos` (upload, `PUT /order`, `PATCH /{photo_id}/cover`, `DELETE /{photo_id}`),
`/api/admin/leads` (GET, PATCH, DELETE), `GET /api/admin/stats`.

Photo storage lives in one module, `backend/app/services/storage.py`, so it can be swapped for cloud storage.

## Security notes

- No secrets in code. `JWT_SECRET` and `DATABASE_URL` come from `.env`, which is git-ignored.
- No default password: the first admin is created with `scripts/create_admin.py`.
- Passwords are hashed with argon2. Login errors never reveal whether an email exists.
- Every input is validated with Pydantic; the ORM uses parameterised queries only. HTML tags are stripped
  from text fields, and React escapes everything it displays.
- Uploaded photos are checked by their real content, not the filename or browser-reported type. Only
  jpg, png and webp up to 8 MB are accepted.
- CORS only allows the origins in `CORS_ORIGINS`. Responses carry `X-Content-Type-Options`, `X-Frame-Options`
  and `Referrer-Policy` headers. Unexpected errors return a clean message and are logged, never shown.
- The admin token is kept in `sessionStorage` (gone when the tab closes) and the panel is excluded from search engines.

## Troubleshooting

- **`python` is not recognised on Windows:** use `py` instead (`py -m venv .venv`).
- **Backend cannot connect to the database:** check `DATABASE_URL`. For Neon, include `?sslmode=require`; for XAMPP, start MySQL and check the database name.
- **Website shows "Cannot reach the server":** the backend is not running, or `VITE_API_URL` in `frontend/.env`
  is wrong. Restart `npm run dev` after changing `.env`.
- **Browser blocks requests (CORS):** add the website address to `CORS_ORIGINS` in `backend/.env` and restart the API.
- **"Too many enquiries" while testing:** the limit is 5 per 10 minutes per visitor; restart the API to reset it.

See **[DEPLOYMENT.md](DEPLOYMENT.md)** to put the site online.
