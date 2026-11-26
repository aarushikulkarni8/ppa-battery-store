# Prashant and Prashant Associates — battery store

*Your Trusted Multi-Brand Battery Partner* · Near Raghavendra Math, CBT Road, Hubballi

A full-stack store for Amaron, Exide and Bosch batteries. It has two sides:

- **Customer site:**
  - Mobile OTP login and smart search ("activa", "maruti swift", "35Ah", "bike", "Exide").
  - Find My Battery (vehicle type → brand → model → variant), product pages with a compatibility checker, cart and checkout.
  - Warranty tracking and a customer dashboard.
  - An enquiry form that emails the owner.
- **Admin console at `/admin`:**
  - Sales dashboard and customer search with complete purchase and warranty history.
  - Orders, enquiries, and product, brand and vehicle management.

| Part | Tech |
|---|---|
| Client | React 18, TypeScript, Vite, Tailwind CSS, React Router, Recharts, Lucide |
| Server | Node.js, Express, TypeScript, Mongoose, Zod |
| Data | MongoDB Atlas |
| Auth | Mobile OTP (MSG91 or Twilio) → JWT in an httpOnly cookie; separate admin login |
| Email | Nodemailer over SMTP |
| Images | Cloudinary (or plain image URLs) |

---

## 1. Run it on your computer

You need **Node.js 20 or newer** and a free **MongoDB Atlas** cluster.

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
- `JWT_SECRET` and `OTP_SECRET`: two different long random strings. `openssl rand -hex 32` works.
- `ADMIN_EMAIL` and `ADMIN_PASSWORD`: the owner's admin login.

Leave `SMS_PROVIDER=console` for now. OTPs are printed in the server terminal, and in development the login screen shows them too.

### 1.3 Install, seed, start

From the project root:

```bash
npm run install:all   # installs server and client
npm run seed          # brands, Amaron products, vehicles, compatibility, admin user
npm run dev:server    # terminal 1 → API on http://localhost:5000
npm run dev:client    # terminal 2 → site on http://localhost:5173
```

- **Customer site:** <http://localhost:5173>. Log in with any 10-digit mobile number; the OTP appears in terminal 1.
- **Admin:** <http://localhost:5173/admin>, using `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`.

The seed is safe to run again. It updates seeded records by slug/SKU, never deletes customers, orders or anything the owner added, and does not overwrite prices, stock or images changed in the admin.

### 1.4 Automated check

With the server running on a seeded database, run:

```bash
cd server
ADMIN_PASSWORD=your-admin-password npm run smoke
```

This runs 38 end-to-end checks:

- **Customer flows:**
  - Login and search.
  - Find My Battery.
  - Cart, buy-now and stock limits.
  - Warranty records and enquiries.
- **Admin flows:**
  - Stats and customer search.
  - Order confirm and cancel, including stock return.
  - Prices, images and brands.

It needs `NODE_ENV=development` and `SMS_PROVIDER=console`, because it reads the OTP from the API response.

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

### 2.1 Customer login (no SMS needed)

Customers log in with their **mobile number and a password**:

- **New customers** enter their mobile number, then their name, email and a new password.
- **Forgot password:** customers can reset it through a link emailed to them.
- **Shop customers without a password yet:** if their email is on file, the set-password link is emailed to that address. If not, they set up the account themselves on their first visit.
- **Owner help:** the owner can email a customer a reset link from their profile in the admin.

Password emails use the same Gmail setup as enquiries (2.2), so set that up first. There is no SMS or DLT registration, and the `SMS_*` / `MSG91_*` / `TWILIO_*` settings are no longer used.

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

The server serves the built React app itself, so the whole site is **one web service**.

Example with **Render** (<https://render.com>), a Web Service connected to your GitHub repo:

| Setting | Value |
|---|---|
| Build command | `npm run install:all && npm run build` |
| Start command | `npm start` |
| Environment | everything from `server/.env`, with `NODE_ENV=production` |

After the first deploy, run the seed once from the Render **Shell**:

```bash
cd server && npm run seed:prod
```

Notes:

- **HTTPS is required.** In production, login cookies are marked `Secure`, so the site must be served over HTTPS. Render, Railway and similar hosts do this automatically.
- **Custom domain:** point it at the service. `CLIENT_ORIGIN` only matters if you host the client separately.
- **Do not commit `.env`.** It is already in `.gitignore`.

---

## 4. What the owner needs to fill in

This project only contains product data that could be checked against official Amaron sources. Nothing was invented. Before launch:

1. **Shop phone, WhatsApp and hours:** edit `client/src/config/store.ts`, then rebuild.
2. **Product photos:** upload the real photo for each product in **Admin → Products**.
3. **Prices and stock:**
   - Several Amaron two-wheeler models are listed as *Price on request*, because no official price was found. Customers can raise an enquiry for these.
   - Set a selling price and stock in **Admin → Products** to make a product orderable online.
   - Seeded stock is a placeholder (`SEED_DEFAULT_STOCK`), so set the real quantities.
4. **Exide and Bosch products:**
   - Both brands exist but have no products yet.
   - Add them in **Admin → Products → Add product** using the manufacturers' official spec sheets and warranty cards.
   - Then link vehicles in the *Vehicle compatibility* section of each product.
5. **Vehicles:** add any missing models in **Admin → Vehicles** and link them to batteries.
6. **Warranty terms:** each product stores total, free-replacement and pro-rata months from the manufacturer's card. Where the free/pro-rata split was not published (e.g. Amaron PRO 50B20L), only the total is stored, with a note.

### Where the seeded data came from

- **Amaron product pages** for AP-BTZ5L, AP-BTZ9R, FLO BH40B20L, FLO 40B20L and PRO 50B20L: specs, dimensions, warranty and prices.
- **Amaron's official application chart (PDF):** two-wheeler Beta-series capacities and warranty, and vehicle compatibility.

Each seeded product keeps its source in the `sourceUrl` / `sourceNote` fields, which are visible in the admin product form.

---

## 5. How it works

### Customer flow

- **Login:** Login → OTP (6 boxes) → first-time name/email → home.
- **Search:** the smart search reads vehicle-type words (bike, scooter, car, SUV, truck…), brand names, capacity (`45Ah`) and vehicle names.
  - It returns batteries grouped by brand.
  - If no battery has the exact Ah asked for, it shows the nearest capacity with a warning.
- **Checkout:**
  - Vehicle (saved, picked, typed or skipped).
  - Delivery with installation (cash on delivery) or pickup at the shop (pay at store).
  - There is no online payment gateway.
- **Warranty:**
  - Each purchased battery creates a warranty record with purchase date, free-replacement end date and warranty expiry.
  - Records appear under *My batteries* and *Warranty*, and in the admin's customer profile.
  - Cancelling an order voids its warranty records and returns the stock.

### Admin

| Page | What it does |
|---|---|
| Dashboard | Customers, orders, today's and this month's sales, active products, low stock, pending orders, open enquiries, 30-day sales chart, sales by brand |
| Customers | Search by name, mobile or email. Profile shows purchase history, orders, warranties, enquiries, total spent and last purchase; every order opens in full |
| Orders | Filter by status, update status (Placed → Confirmed → Ready → Delivered, or Cancelled), mark paid |
| Products | Inline price/stock editing, activate/deactivate, full edit form, images, vehicle compatibility, delete (blocked if the product has orders) |
| Brands, Vehicles | Add/edit; new brands appear across the site automatically |
| Enquiries | Status New / In Progress / Resolved / Closed with internal notes |

### Collections

`brands`, `products`, `inventories`, `vehicles`, `vehiclecompatibilities`, `customers`, `otps`, `orders`, `orderitems`, `purchasehistories`, `enquiries`, `admins`

### Folder layout

```
client/src
  api/          fetch wrapper and shared types
  components/   layout, search box, product card, vehicle picker, warranty badge…
  context/      auth, cart, toasts
  pages/        customer pages; pages/admin/ for the console
  config/store.ts   shop name, address, phone, hours
server/src
  config/       env + constants
  models/       Mongoose schemas
  routes/       auth, catalog, shop, enquiries, admin/*
  services/     search, orders, sms, mailer, images, ids
  seed/         seed data (with sources) and seed script
server/scripts/smoke-test.mjs   end-to-end API test
```

### Known limitations

- **No online payment:** payment is cash on delivery or pay at store. Adding Razorpay would be the natural next step.
- **Invoices:** no PDF invoices yet.
- **Admin accounts:** one admin role. Additional admins can be created by changing `ADMIN_EMAIL`/`ADMIN_PASSWORD` and running the seed again; each run adds one if that email is new.
