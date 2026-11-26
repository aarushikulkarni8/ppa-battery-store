# Prashant and Prashant Associates: Battery Store

*Your Trusted Multi-Brand Battery Partner* · Hubballi

A full-stack web app for a multi-brand battery shop, with a customer website and an admin console.

## Features

**Customer website**
- Search by vehicle type, brand or capacity
- Login with mobile number and password, with password reset by email
- Warranty tracking and a customer account area
- Enquiry form that emails the shop owner
- Catalogue mode by default. Set `ONLINE_SHOP=true` to show prices and allow online ordering (cash on delivery or pay at store)

**Admin console** (`/admin`)
- Sales dashboard and customer records
- Orders, enquiries and shop sales
- Product, brand and photo management
- Half-yearly battery servicing reminder emails

## Tech stack

| Part | Tech |
|---|---|
| Client | React, TypeScript, Vite, Tailwind CSS |
| Server | Node.js, Express, TypeScript, Mongoose, Zod |
| Database | MongoDB Atlas |
| Email | Nodemailer over SMTP |
| Images | Cloudinary, or local storage during development |

## Getting started

You need Node.js 20 or newer and a MongoDB Atlas cluster.

```bash
cd ppa
cp server/.env.example server/.env   # then fill in your own values
npm run install:all
npm run seed
npm run dev:server                   # terminal 1: http://localhost:5000
npm run dev:client                   # terminal 2: http://localhost:5173
```

In `server/.env`, set at least `MONGODB_URI`, `JWT_SECRET`, `OTP_SECRET`, `ADMIN_EMAIL` and `ADMIN_PASSWORD`. Never commit this file.

See the [setup and deployment guide](ppa/README.md) for database, email, photo and hosting steps.

## Project structure

```
.github/workflows/   CI Checklist workflow
ppa/client/          customer website and admin console
ppa/server/          API, database models and seed data
batteries.csv        battery product data
```
