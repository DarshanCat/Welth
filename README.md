# 💰 Welth — AI-Powered Personal Finance Platform

Welth is a full-stack personal finance management platform built with Next.js 15. It combines automated transaction tracking, AI-powered insights, receipt scanning, recurring billing, and an LSTM-based expense prediction model into a single cohesive app.

---

## ✨ Features

- **Dashboard** — Overview of all accounts, budgets, goals, and a live finance health score
- **Transaction Management** — Create, edit, and delete income/expense transactions with category tagging
- **Receipt Scanner** — Upload a photo of any receipt and have Gemini AI auto-fill the transaction form
- **Budget Alerts** — Set a monthly budget and receive email alerts when you hit 80% usage
- **Savings Goals** — Define a savings target with a timeline; get email alerts when you fall behind pace
- **Finance Score** — A custom scoring algorithm (0–100) rating savings rate, budget discipline, goal progress, and spending stability
- **LSTM Expense Prediction** — A Python/FastAPI microservice trained on your transaction history predicts next month's expenses
- **AI Chatbot** — Floating chat widget powered by Groq for conversational finance Q&A
- **Monthly Reports** — Automated AI-generated financial insights emailed on the 1st of each month
- **Recurring Transactions** — Schedule daily/weekly/monthly/yearly transactions processed automatically via Inngest
- **Multi-Account Support** — Manage multiple savings and current accounts
- **WhatsApp Alerts** — Goal alerts sent via Twilio WhatsApp integration

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack) |
| Auth | Clerk |
| Database | PostgreSQL via Supabase + Prisma ORM |
| Background Jobs | Inngest (cron + event-driven) |
| Rate Limiting | ArcJet |
| AI / LLM | Google Gemini 1.5 Flash, Groq |
| ML Service | Python · FastAPI · TensorFlow (LSTM) |
| Email | Resend + React Email |
| WhatsApp | Twilio |
| UI | Tailwind CSS · shadcn/ui · Radix UI · Recharts |
| Forms | React Hook Form + Zod |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Python 3.9+ (for the ML service)
- A PostgreSQL database (Supabase recommended)

### 1. Clone the repository

```bash
git clone https://github.com/DarshanCat/Welth.git
cd Welth
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env.local` file in the root directory:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Database (Supabase)
DATABASE_URL=your_supabase_pooled_connection_url
DIRECT_URL=your_supabase_direct_connection_url

# ArcJet (Rate Limiting)
ARCJET_KEY=your_arcjet_key

# Resend (Email)
RESEND_API_KEY=your_resend_api_key

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# ML Microservice
ML_SERVICE_URL=http://localhost:8000

# Twilio WhatsApp (optional)
TWILIO_SID=your_twilio_sid
TWILIO_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

### 4. Set up the database

```bash
npx prisma migrate deploy
npx prisma generate
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🤖 ML Service Setup (Expense Prediction)

The LSTM prediction feature runs as a separate Python microservice.

### Install dependencies

```bash
cd ml_service
pip install fastapi uvicorn psycopg2-binary pandas numpy scikit-learn tensorflow python-dotenv
```

### Create `.env` inside `ml_service/`

```env
DIRECT_URL=your_supabase_direct_connection_url
```

### Start the ML service

```bash
uvicorn app:app --reload --port 8000
```

The Next.js app will call `ML_SERVICE_URL/predict` to fetch predictions.

> **Deploying to production?** Host the ML service on [Railway](https://railway.app) or [Render](https://render.com) and set `ML_SERVICE_URL` in your Vercel environment variables accordingly.

---

## ⚙️ Background Jobs (Inngest)

Welth uses [Inngest](https://inngest.com) for three scheduled jobs:

| Job | Schedule | Description |
|---|---|---|
| `trigger-recurring-transactions` | Daily at midnight | Processes all due recurring transactions |
| `generate-monthly-reports` | 1st of each month | Emails AI-generated reports to all users |
| `check-budget-alerts` | Every 6 hours | Sends email alerts when budget hits 80% |

To run Inngest locally:

```bash
npx inngest-cli@latest dev
```

---

## 📁 Project Structure

```
├── actions/          # Next.js Server Actions (transaction, budget, goals, etc.)
├── app/
│   ├── (auth)/       # Sign-in / Sign-up pages (Clerk)
│   ├── (main)/       # Protected app routes (dashboard, account, transaction)
│   └── api/          # API routes (chat, inngest, ML prediction)
├── components/       # Shared UI components (ChatBot, Header, AccountDrawer)
├── emails/           # React Email templates
├── lib/
│   ├── inngest/      # Inngest client and job functions
│   ├── prisma.js     # Prisma client singleton
│   └── utils.js      # Shared utilities
├── ml/               # Standalone LSTM training scripts
├── ml_service/       # FastAPI microservice for predictions
├── prisma/           # Schema and migrations
└── public/           # Static assets
```

---

## 🔐 Security

- All routes are protected via Clerk middleware
- Server Actions verify `userId` on every request
- ArcJet rate limiting applied to transaction creation
- Environment variables are never committed (see `.gitignore`)

---

## 📄 License

MIT

---

## 🙏 Acknowledgements

Built with [Next.js](https://nextjs.org), [Prisma](https://prisma.io), [Clerk](https://clerk.com), [Inngest](https://inngest.com), [ArcJet](https://arcjet.com), [Resend](https://resend.com), and [Google Gemini](https://ai.google.dev).
