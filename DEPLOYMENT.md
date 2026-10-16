# Deployment guide

The site has two parts that you host separately:

1. **Backend** (FastAPI): needs a host that runs Python, and a PostgreSQL database.
2. **Frontend** (React): becomes plain static files that any web host can serve.

Use HTTPS for both. The admin login token travels in every admin request.

> Hosted deployment should use PostgreSQL/Neon. Local development can still use XAMPP MySQL by changing only `DATABASE_URL`.
> The migration uses no database-specific features and the tests run on SQLite, but this project has
> **not been run against PostgreSQL here**, so do a quick check after deploying (steps 4 and 5 below).

---

## A. Backend

### 1. Create a Neon PostgreSQL database
Create a free Neon project and copy the pooled or direct connection string. The app accepts Neon URLs like:
```
postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require
```
It also accepts SQLAlchemy's explicit driver form:
```
postgresql+psycopg://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require
```

### 2. Set environment variables on the host
| Variable | Production value |
|---|---|
| `DATABASE_URL` | your Neon PostgreSQL URL, including `sslmode=require` |
| `JWT_SECRET` | a new long random value: `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `CORS_ORIGINS` | your website address exactly, e.g. `https://www.yourdomain.com` |
| `DOCS_ENABLED` | `false` |
| `TRUST_PROXY_HEADERS` | `true` if the host puts a proxy in front of the app (most do), otherwise `false` |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | from your Cloudinary dashboard (see "Photos: Cloudinary" below) |
| `SITE_URL` | `https://www.yourdomain.com` |

Never reuse your local `.env` or `JWT_SECRET` in production.

### 3. Build and start commands
```bash
pip install -r requirements.txt
alembic upgrade head
gunicorn -k uvicorn.workers.UvicornWorker -w 1 app.main:app --bind 0.0.0.0:$PORT
```
(Root/working directory must be `backend/`.) Use `-w 1`: the enquiry rate limit is kept in memory per worker.
If you need more workers, move the limiter to Redis first.

### 4. Create the admin user (once)
Open the host's shell and run:
```bash
python -m scripts.create_admin
```
Check `https://YOUR-API/api/health` returns `{"status":"ok"}`.

### 5. Check it works
Log in at your website's `/admin`, add a property with a photo, then send a test enquiry from the public
site and confirm it appears under Leads.

### Photos: Cloudinary
Hosts such as Vercel have **temporary disks that are wiped on every deploy**, so photos must not be stored on the
server. The backend can store them on **Cloudinary** (free plan available) instead:

1. Create an account at cloudinary.com. In the **Dashboard** copy your **Cloud name**, **API Key** and **API Secret**.
2. Add these to the backend's environment variables on your host (never put the secret in the frontend):
   ```
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ```
   (or the single line `CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME`). Optional:
   `CLOUDINARY_FOLDER=real-estate/properties`. `STORAGE_BACKEND` can stay at `auto`, which uses Cloudinary whenever the
   keys are present. Set it to `cloudinary` if you want the app to refuse to start when the keys are missing.
3. Redeploy, log in to `/admin` and add a photo to a property. It should appear in the Cloudinary **Media Library**
   under `real-estate/properties`, and the photo address on the website starts with `https://res.cloudinary.com/`.
   You can also test from the backend folder with `python -m scripts.check_cloudinary`.
4. Photos you uploaded **before** switching on Cloudinary still live on the old server disk. Move them with
   `python -m scripts.migrate_photos_to_cloudinary --dry-run` and then without `--dry-run`, run on the machine that
   has those files (pointing `DATABASE_URL` at the live database). The old files are kept unless you add `--delete-local`.

Only `backend/app/services/storage.py` knows where photos are kept, so the Add Property form and the rest of the
admin panel are unchanged.

### Backups
Back up the PostgreSQL database (most hosts offer automatic backups) and the photo storage.

---

## B. Frontend (static build)

### 1. Fill in your details
Edit `frontend/src/config/site.js` with your real phone, WhatsApp number, RERA number, address, hours and
website address. Put your domain in the `Sitemap:` line of `frontend/public/robots.txt`.

### 2. Generate the sitemap
```bash
cd backend && python -m scripts.generate_sitemap      # uses SITE_URL
```

### 3. Build
```bash
cd frontend
npm install
VITE_API_URL=https://YOUR-API-ADDRESS npm run build   # Windows PowerShell: $env:VITE_API_URL="https://..."; npm run build
```
This creates `frontend/dist/`.

### 4. Upload `dist/` to a static host
- **Netlify / Cloudflare Pages / Vercel:** drag the `dist` folder or connect the repository (build command
  `npm run build`, publish folder `dist`). Set `VITE_API_URL` in the host's environment settings.
  `_redirects` (Netlify, Cloudflare) and `vercel.json` already make every page address work on refresh.
- **cPanel / Apache hosting:** upload the contents of `dist/` to `public_html`. The included `.htaccess`
  handles page addresses.
- **Nginx:** serve `dist/` with `try_files $uri /index.html;`.

### 5. After going live
- Open a property page, then refresh the browser. It must still load (confirms the redirect rule works).
- Submit your site to Google Search Console and add `https://yourdomain/sitemap.xml`.
- Re-run the sitemap script and rebuild whenever you add or remove many properties.

---

## Checklist before announcing the site

- [ ] `site.js` has real phone, WhatsApp, RERA number, address and hours
- [ ] Sample properties (DS-101 to DS-108, "Jaipur") deleted or replaced with real ones
- [ ] New `JWT_SECRET`, `DOCS_ENABLED=false`, `CORS_ORIGINS` set to the real website
- [ ] Admin created with a strong password; can log in at `/admin`
- [ ] Cloudinary keys set; a test photo uploads and shows on the website
- [ ] Test enquiry received, and the WhatsApp button opens with the right message
- [ ] Database backups switched on
