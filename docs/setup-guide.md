# Prashant and Prashant Associates — battery store

*Your Trusted Multi-Brand Battery Partner* · Near Raghavendra Math, CBT Road, Hubballi

A full-stack store for a multi-brand battery shop. It has two sides:

- **Customer site:**
  - Login with mobile number and password, and smart search ("automotive", "two wheeler", "DIN65", "35Ah", "Exide").
  - Brand and product pages, an enquiry form that emails the owner, and PCB orders.
  - With online ordering switched on: prices, cart and checkout.
  - Warranty tracking and a customer account area.
- **Admin console at `/admin`:**
  - Sales dashboard and customer search with purchase and warranty history.
  - Orders, PCB orders, shop sales, enquiries and service reminders.
  - Product, brand and photo management, and spreadsheet import.

| Part | Tech |
|---|---|
| Client | React 18, TypeScript, Vite, Tailwind CSS, React Router 7, Recharts, Lucide |
| Server | Node.js, Express, TypeScript, Mongoose, Zod 4 |
| Data | MongoDB Atlas |
| Auth | Mobile number and password, JWT in an httpOnly cookie; separate admin login |
| Email | Nodemailer over SMTP |
| Images | Cloudinary (or local files while developing) |

---

## 1. Run it on your computer

You need **Node.js 20.19 or newer** (the GitHub checks use 22) and a free **MongoDB Atlas** cluster.

### 1.1 Create the database

1. Sign up at <https://www.mongodb.com/atlas> and create a free **M0** cluster (region: Mumbai).
2. Under **Database Access**, add a user with a password.
3. Under **Network Access**, add your IP. For hosting later, allow `0.0.0.0/0`.
4. Go to **Connect → Drivers** and copy the connection string. Put the database name `ppa` after `.net/`:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/ppa?retryWrites=true&w=majority`

### 1.2 Configure

```bash
cd server
cp .env.example .env
```

Fill in at least these values:

- `MONGODB_URI`
- `JWT_SECRET`: a long random string. `openssl rand -hex 32` works.
- `ADMIN_EMAIL` and `ADMIN_PASSWORD`: the owner's admin login.

### 1.3 Install, seed, start

From the project root:

```bash
npm run install:all   # installs server and client
npm run seed          # brands, Amaron, Exide and Bosch products, admin user
npm run dev:server    # terminal 1 → API on http://localhost:5000
npm run dev:client    # terminal 2 → site on http://localhost:5173
```

- **Customer site:** <http://localhost:5173>. Create an account with any 10-digit mobile number. Without email set up, password reset links are printed in terminal 1.
- **Admin:** <http://localhost:5173/admin>, using `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`.

The seed is safe to run again. It updates seeded records by slug/SKU, never deletes customers, orders or anything the owner added, and does not overwrite prices, stock or images changed in the admin.

### 1.4 Automated check

The end-to-end test places orders and creates records, so **run it only against a test database**, never your real one. Start the server with `NODE_ENV=development` and `ONLINE_SHOP=true` on a freshly seeded test database, then run:

```bash
cd server
ADMIN_PASSWORD=your-test-admin-password npm run smoke
```

It runs 50 checks:

- **Customer:** registration and login, search, cart, stock limits, warranty records, enquiries and PCB orders.
- **Admin:** stats, customer search, order status and stock return, prices, images, brands, product forms, spreadsheet import and shop sales.

GitHub Actions runs the same test against a temporary database (see [Checks in GitHub Actions](#4-checks-in-github-actions)).

---

### 1.5 Prices and online ordering

`ONLINE_SHOP` in `server/.env` decides what customers see:

- **Off (default).** The website is a catalogue. Customers don't see prices, a cart or Buy now; every battery has an **Ask for price** button, and Call/WhatsApp when the shop's number is set. Prices never leave the server, but the admin still sees and uses them, for example when recording shop sales.
- **`ONLINE_SHOP=true`.** Prices are shown and customers can add to cart and order online.

Restart the server after changing it.

### 1.6 Half-yearly servicing reminders

Customers who buy an **automotive** battery (car, three-wheeler, commercial, tractor) or anything under **Inverters & home UPS** get an email every 6 months after the purchase date, while the battery is under warranty. Two-wheeler batteries are not included.

- **Wording, interval, categories and sending hours:** in `server/src/config/reminders.ts`.
- **Who gets them:** only customers with an email address. The owner can add one on the customer's profile or when recording a shop sale, and customers can switch reminders off in My account → Profile.
- **When they go out:** the server checks every hour and sends between 9:00 and 20:00 India time. Nothing is ever sent twice, and if the server was off when a reminder was due, it goes out on the next check.
- **Admin → Service reminders:** shows what's due, what was sent, and which customers have no email. It also has *Send due reminders now* and *Send test email* buttons.
- **If your host sleeps when idle** (e.g. Render's free plan), set `CRON_SECRET` and have a free scheduler such as cron-job.org call `/api/cron/service-reminders?key=YOUR_SECRET` once a day.

## 2. Services to set up before going live

### 2.1 Customer login

Customers log in with their **mobile number and a password**:

- **New customers** enter their mobile number, then their name, email and a new password.
- **Forgot password:** customers can reset it through a link emailed to them.
- **Shop customers without a password yet:** if their email is on file, the set-password link is emailed to that address. If not, they set up the account themselves on their first visit.
- **Owner help:** the owner can email a customer a reset link from their profile in the admin.

Password emails use the same Gmail setup as enquiries (2.2), so set that up first.

### 2.2 Owner email (enquiries and new orders)

The owner receives a **NEW CUSTOMER ENQUIRY** email for each enquiry and a **NEW ORDER** email for each order. With Gmail:

1. Turn on 2-Step Verification for the Google account.
2. Create an **App password** at <https://myaccount.google.com/apppasswords>.
3. Set these in `.env`:

```
OWNER_EMAIL=owner@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=owner@gmail.com
SMTP_PASSWORD=the-16-character-app-password
```

The server log says `[mail] SMTP ready` on start if this works.

If email fails, the enquiry is still saved. The admin enquiry page shows whether the email was sent, failed, or SMTP is not configured.

### 2.3 Product photos (Cloudinary)

- **On your own computer:** photos work without any setup. They're saved in `server/uploads`.
- **On the live site:** create a free Cloudinary account and put its **Cloud name, API key and API secret** in `.env` (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`). Hosting servers lose locally saved files when they restart, so photos uploaded before Cloudinary was set up have to be uploaded again.

To add photos:

- **One product:** Admin → Products → a product → Images → Upload image. You can also paste an image link there.
- **Many at once:** Admin → **Bulk photos**. Name each photo after the model or part number (`DIN65.jpg`, `AR150TT54.jpg`), add the range if two ranges share a model (`FLO DIN65.jpg`), or name it after a whole range to use one photo for all of it (`Amaron Black.jpg`). Check the matches on screen, then upload. Big phone photos are resized automatically.

## 3. Deploy

The server also serves the built website, so the whole site is **one web service**.

### 3.1 Render, using this repository's Blueprint

1. On <https://render.com>, choose **New → Blueprint** and pick this repository. Render reads [`render.yaml`](../render.yaml).
2. Enter the values it asks for: the database address, the site's public address (`CLIENT_ORIGIN`), email, Cloudinary and the first admin login. `JWT_SECRET` is generated for you.
3. Deploy, then run the seed once from the Render **Shell**:

```bash
node dist/seed/seed.js
```

### 3.2 Docker, on any host

[`Dockerfile`](../Dockerfile) builds the website and server into one image:

```bash
docker build -t ppa-battery-store .
docker run -p 5000:5000 --env-file server/.env -e NODE_ENV=production ppa-battery-store
```

### 3.3 Without Docker

| Setting | Value |
|---|---|
| Build command | `npm run install:all && npm run build` |
| Start command | `npm start` |
| Environment | everything from `server/.env`, with `NODE_ENV=production` |

Run the seed once with `npm --prefix server run seed:prod`.

Notes:

- **HTTPS is required.** In production, login cookies are marked `Secure`. Render, Railway and similar hosts provide HTTPS automatically.
- **Set `CLIENT_ORIGIN` to the site's public address.** Password reset emails use it.
- **Use Cloudinary in production.** Photos can only be uploaded there on a live site.
- **Never commit `.env`.** It is listed in `.gitignore`.

---

## 4. Checks in GitHub Actions

| Check | What it does |
|---|---|
| Security | Looks for committed `.env` files and common secret patterns |
| Dependency audit | `npm audit` on the packages used in production |
| Server build | Type-checks and builds the server |
| Website build | Type-checks and builds the website |
| End-to-end tests | Seeds a temporary MongoDB and runs the 50-check test |
| Deployment | Builds the Docker image, starts it and calls its health check |
| Docs | Verifies that file links and `npm run` commands in the docs exist |

Changes reach `main` through **Actions → CI Checklist**:

1. Push your work to a temporary `upload-staging` branch that is based on the latest `main`.
2. Run **CI Checklist** with that branch, a commit message and the checks you want. The security check always runs.
3. If every selected check passes, the workflow commits the changes to `main` and refreshes the badges for those checks.
4. Delete the `upload-staging` branch.

Changes to files in `.github/workflows/` can't go through CI Checklist; commit those directly.

---

## 5. What the owner needs to fill in

The product data comes from the makers’ own publications (see below). Nothing was invented. Before launch:

1. **Shop phone, WhatsApp and hours:** check `client/src/config/store.ts` and `client/src/config/contact.ts`, then rebuild. The number in the reminder email is set separately in `server/src/config/reminders.ts`.
2. **Product photos:** upload the real photo for each product in **Admin → Products**.
3. **Prices and stock:**
   - Several Amaron two-wheeler models are listed as *Price on request*, because no official price was found. Customers can raise an enquiry for these.
   - Set a selling price and stock in **Admin → Products** to make a product orderable online.
   - Seeded stock is a placeholder (`SEED_DEFAULT_STOCK`), so set the real quantities.
4. **Exide and Bosch products:**
   - 61 Exide and 49 Bosch batteries are included, without prices or photos.
   - Keep only what the shop sells: deactivate the rest in **Admin → Products**.
   - The Bosch data is from the 2023 catalogue, so confirm each model is still sold and check its current warranty.
   - Bosch model codes are as printed in that catalogue (check `00D04R` and `50031R` against the label).
   - Exide’s page shows two different warranty periods for `IMTT3000`; confirm it on the warranty card.
5. **Warranty terms:** each product stores total, free-replacement and pro-rata months from the manufacturer's card. Where the free/pro-rata split was not published (e.g. Amaron PRO 50B20L), only the total is stored, with a note.

### Where the seeded data came from

- **Amaron product pages** for AP-BTZ5L, AP-BTZ9R, FLO BH40B20L, FLO 40B20L and PRO 50B20L: specs, dimensions, warranty and prices.
- **Exide:** the specification tables on the exidecare.com pages for Mileage, Matrix, EEZY, EPIQ, Xplore, InvaTubular and InvaMaster (read 26 Nov 2026).
- **Bosch:** the Technical Data table in Bosch India’s 2023 battery catalogue. Neither maker’s table prints voltage; 12 V is entered.
- **Amaron's official application chart (PDF):** two-wheeler Beta-series capacities and warranty.

Each seeded product keeps its source in the `sourceUrl` / `sourceNote` fields, which are visible in the admin product form.

---

## 6. How it works

### Customer flow

- **Login:** mobile number, then password. New customers add their name, email and a password.
- **Search:** the smart search reads battery type words (bike, scooter, car, truck, inverter…), brand names, model names and capacity (`45Ah`).
  - It returns batteries grouped by brand.
  - If no battery has the exact Ah asked for, it shows the nearest capacity with a warning.
- **Checkout:**
  - Vehicle name and registration number (optional).
  - Delivery with installation (cash on delivery) or pickup at the shop (pay at store).
  - There is no online payment gateway.
- **Warranty:**
  - Each purchased battery creates a warranty record with purchase date, free-replacement end date and warranty expiry.
  - Records appear under *My batteries* and *Warranty*, and in the admin's customer profile.
  - Cancelling an order voids its warranty records and returns the stock.

### Admin

| Page | What it does |
|---|---|
| Dashboard | Customers, orders, sales, active products, low stock, pending orders, open enquiries and sales charts |
| Record shop sale | Saves a sale made in the shop, with warranty records |
| Customers | Search by name, mobile or email. Profile shows purchases, orders, warranties and enquiries |
| Orders, PCB orders | Filter and update the status of orders |
| Products | Price and stock editing, activate/deactivate, full edit form, images, delete (blocked if the product has orders) |
| Brands | Add and edit; new brands appear across the site automatically |
| Bulk import, Bulk photos | Add or update many products from a spreadsheet, or upload many photos at once |
| Enquiries | Status New / In Progress / Resolved / Closed with internal notes |
| Service reminders | What is due, what was sent, and which customers have no email |

### Collections

`brands`, `products`, `inventories`, `vehicles`, `vehiclecompatibilities`, `customers`, `orders`, `orderitems`, `purchasehistories`, `enquiries`, `pcborders`, `admins`

### Folder layout

```
client/src
  api/          fetch wrapper and shared types
  components/   layout, search box, product card, warranty badge…
  context/      auth, cart, site settings, toasts
  pages/        customer pages; pages/admin/ for the console
  config/       shop and contact details
server/src
  config/       env, constants, reminder email text
  models/       Mongoose schemas
  routes/       auth, catalog, shop, pcb, enquiries, admin/*
  services/     search, orders, mailer, images, reminders, ids
  seed/         seed data (with sources) and seed script
server/scripts/smoke-test.mjs   end-to-end API test
data/batteries.csv              battery product data
```

### Known limitations

- **No online payment:** payment is cash on delivery or pay at store. Adding Razorpay would be the natural next step.
- **Invoices:** no PDF invoices yet.
- **Admin accounts:** one admin role. Additional admins can be created by changing `ADMIN_EMAIL`/`ADMIN_PASSWORD` and running the seed again; each run adds one if that email is new.
