# FinGuard 💰

> ML-driven finance dashboard for smarter spending and saving.

![Next.js](https://img.shields.io/badge/Next.js-black?logo=next.js)
![Python](https://img.shields.io/badge/Python-3776AB?logo=python&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)

---

Video Demo Link - (To be uploaded soon!)

Landing Page -
![alt text](image.png)

Upload Page -
![alt text](image-1.png)

Dashboard -
![alt text](image-2.png)

Forecast Page -
![alt text](image-3.png)

Monte-Carlo Simulation Page -
![alt text](image-4.png)

---

## What is FinGuard?

Most people don't know where their money actually goes. FinGuard lets you upload your bank transaction history and understand your finances.

Upload 3-12 months of transactions, and FinGuard gives you:

- Automatic spending categories via ML clustering
- Rule-based advice on where to cut back
- A 3–6 month forecast of your finances
- What-if simulations to see how decisions affect your future

---

## Features

- **CSV + PDF Upload** — Direct CSV import or PDF extraction for banks that don't offer CSV (SBI and other public sector banks)
- **Dashboard** — Visual breakdown of spending via ML clustering
- **Advisory** — Rule-based spending and budgeting advice derived from your transaction patterns
- **Forecast** — 3–6 month financial projection using Facebook Prophet
- **What-If Simulation** — Monte Carlo simulation to model financial decisions before making them

---

## How It Works

```
Upload CSV / PDF
      ↓
Parse + Clean Transactions (date, description, amount, type)
      ↓
ML Clustering → Spending Categories
      ↓
Rule Engine → Personalised Advice
      ↓
Prophet Model → 3-6 Month Forecast
      ↓
Monte Carlo → What-If Simulation
```

> Income is derived directly from transaction data — no manual input required.
> All models are trained on your own data, not external datasets.

---

## File Format

FinGuard expects the following fields from your transaction file:

| Field         | Description                   |
| ------------- | ----------------------------- |
| `date`        | Transaction date              |
| `description` | Merchant or transaction label |
| `amount`      | Transaction value             |
| `type`        | Credit or Debit               |

**CSV** — Upload directly if your bank provides it (most private sector and international banks).

**PDF** — Supported for banks like SBI that only export PDFs. Text is extracted and parsed automatically.

---

## Pages

| Page               | Description                              |
| ------------------ | ---------------------------------------- |
| Home               | Landing and onboarding                   |
| Upload             | CSV or PDF upload and parsing            |
| Dashboard          | Spending clusters and category breakdown |
| Advisory           | Personalised rule-based recommendations  |
| Forecast           | 3–6 month projection with Prophet        |
| What-If Simulation | Monte Carlo scenario modelling           |
| Profile / Insights | Patterns and long-term trends            |

---

## Tech Stack

| Layer               | Tool                             |
| ------------------- | -------------------------------- |
| Frontend            | Next.js, Tailwind CSS            |
| AI / ML             | Gemini API, Prophet, Monte Carlo |
| PDF Parsing         | pdf-parse                        |
| Document Generation | LaTeX                            |
| Database            | PostgreSQL + Prisma (multi-user) |

---

## Local Setup

```bash
git clone https://github.com/BlazeGaming456/SkillSlate
cd finguard
npm install
cp .env.example .env
npm run dev
cd ml
uvicorn forecast_api:app --reload
```

---

## Commit Convention

```
feat     → new feature
fix      → bug fix
docs     → documentation changes
style    → formatting, no logic change
refactor → code restructure, no feature or fix
test     → adding or fixing tests
```

Example: `fix(api): resolve null pointer exception in user profile`