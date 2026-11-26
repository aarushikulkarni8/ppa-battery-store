# Prashant and Prashant Associates: Battery Store

[![Security](https://github.com/aarushikulkarni8/ppa-battery-store/actions/workflows/security.yml/badge.svg?branch=main)](https://github.com/aarushikulkarni8/ppa-battery-store/actions/workflows/security.yml)
[![Dependency audit](https://github.com/aarushikulkarni8/ppa-battery-store/actions/workflows/dependencies.yml/badge.svg?branch=main)](https://github.com/aarushikulkarni8/ppa-battery-store/actions/workflows/dependencies.yml)
[![Server build](https://github.com/aarushikulkarni8/ppa-battery-store/actions/workflows/server.yml/badge.svg?branch=main)](https://github.com/aarushikulkarni8/ppa-battery-store/actions/workflows/server.yml)
[![Website build](https://github.com/aarushikulkarni8/ppa-battery-store/actions/workflows/website.yml/badge.svg?branch=main)](https://github.com/aarushikulkarni8/ppa-battery-store/actions/workflows/website.yml)
[![End-to-end tests](https://github.com/aarushikulkarni8/ppa-battery-store/actions/workflows/e2e.yml/badge.svg?branch=main)](https://github.com/aarushikulkarni8/ppa-battery-store/actions/workflows/e2e.yml)
[![Deployment](https://github.com/aarushikulkarni8/ppa-battery-store/actions/workflows/deployment.yml/badge.svg?branch=main)](https://github.com/aarushikulkarni8/ppa-battery-store/actions/workflows/deployment.yml)
[![Docs](https://github.com/aarushikulkarni8/ppa-battery-store/actions/workflows/docs.yml/badge.svg?branch=main)](https://github.com/aarushikulkarni8/ppa-battery-store/actions/workflows/docs.yml)

*Your Trusted Multi-Brand Battery Partner* · Hubballi

A full-stack web app for a multi-brand battery shop, with a customer website and an admin console.

## Features

**Customer website**
- Search by battery type, brand, model or capacity
- Login with mobile number and password, with password reset by email
- Warranty tracking and a customer account area
- Enquiry form that emails the shop owner, and PCB orders
- Catalogue mode by default. Set `ONLINE_SHOP=true` to show prices and allow online ordering (cash on delivery or pay at store)

**Admin console** (`/admin`)
- Sales dashboard and customer records
- Orders, shop sales and enquiries
- Product, brand and photo management, with spreadsheet import
- Half-yearly battery servicing reminder emails

## Tech stack

| Part | Tech |
|---|---|
| Client | React, TypeScript, Vite, Tailwind CSS, React Router |
| Server | Node.js, Express, TypeScript, Mongoose, Zod |
| Database | MongoDB Atlas |
| Email | Nodemailer over SMTP |
| Images | Cloudinary, or local storage during development |
| Delivery | Vercel, Docker, Render Blueprint, GitHub Actions |

## Getting started

You need Node.js 20.19 or newer and a MongoDB Atlas cluster.

```bash
cp server/.env.example server/.env   # then fill in your own values
npm run install:all
npm run seed
npm run dev:server                   # terminal 1: http://localhost:5000
npm run dev:client                   # terminal 2: http://localhost:5173
```

In `server/.env`, set at least `MONGODB_URI`, `JWT_SECRET`, `ADMIN_EMAIL` and `ADMIN_PASSWORD`. Never commit this file.

See the [setup and deployment guide](docs/setup-guide.md) for database, email, photo, testing and hosting steps.

## Project structure

```
client/              customer website and admin console
server/              API, database models, seed data and end-to-end test
docs/                setup and deployment guide
data/                battery product data
scripts/             repository checks
.github/workflows/   GitHub Actions checks
Dockerfile           production image
render.yaml          Render hosting setup
vercel.json          Vercel hosting setup
api/                 Vercel server function
```

## Commit checklists

Each change below was committed by **CI Checklist** only after its selected checks passed. The badges above show the latest result of each check; this table records what was selected for each commit.

| Commit | Security | Dependency audit | Server build | Website build | End-to-end tests | Deployment | Docs | Run |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|---|
| Reorganize repository into client, server, docs and data folders | ✅ | – | ✅ | ✅ | ✅ | – | – | [view](https://github.com/aarushikulkarni8/ppa-battery-store/actions/runs/45840232984) |
| Remove unused vehicle finder and SMS login code | ✅ | – | ✅ | ✅ | ✅ | – | – | [view](https://github.com/aarushikulkarni8/ppa-battery-store/actions/runs/45840575428) |
| Upgrade vulnerable packages and extend end-to-end tests | ✅ | ✅ | ✅ | ✅ | ✅ | – | – | [view](https://github.com/aarushikulkarni8/ppa-battery-store/actions/runs/45840992717) |
| Add Docker and Render deployment setup | ✅ | – | ✅ | ✅ | ✅ | ✅ | – | [view](https://github.com/aarushikulkarni8/ppa-battery-store/actions/runs/45841366018) |
| Update documentation and fix shop closing time | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | [view](https://github.com/aarushikulkarni8/ppa-battery-store/actions/runs/45841741800) |
| Add Exide and Bosch products and update the shop phone number | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | [view](https://github.com/aarushikulkarni8/ppa-battery-store/actions/runs/45847578087) |
| Add Vercel deployment support | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | [view](https://github.com/aarushikulkarni8/ppa-battery-store/actions/workflows/ci-checklist.yml) |

✅ passed before the commit · – not selected for that commit
