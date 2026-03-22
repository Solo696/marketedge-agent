# PinAI Utility Agent — Setup Guide

A lightweight AgentHub agent with 3 skills: **crypto prices**, **currency exchange rates**, and **news headlines**.

---

## Step 1 — Get your free API key

The only key you need is from **NewsAPI** (the other two APIs are completely free with no key):

1. Go to https://newsapi.org/register
2. Sign up for a free account
3. Copy your API key — you'll need it in Step 2

---

## Step 2 — Deploy to Railway (recommended)

Railway is the easiest host — similar Git-push workflow to Vercel.

### 2a. Push your code to GitHub

```bash
git init
git add .
git commit -m "init utility agent"
gh repo create pinai-utility-agent --public --push
```

### 2b. Deploy on Railway

1. Go to https://railway.app and sign in with GitHub
2. Click **New Project → Deploy from GitHub repo**
3. Select your `pinai-utility-agent` repo
4. Railway auto-detects Node.js and deploys

### 2c. Set environment variables in Railway dashboard

Go to your project → **Variables** tab and add:

| Key | Value |
|-----|-------|
| `NEWS_API_KEY` | your NewsAPI key from Step 1 |
| `AGENT_NAME` | `utility-agent` (or any name you like) |

Railway will redeploy automatically.

### 2d. Get your public URL

Railway gives you a URL like: `https://pinai-utility-agent-production.up.railway.app`

Test it:
```bash
curl https://YOUR-RAILWAY-URL/health
```

You should see:
```json
{"status":"ok","agent":"utility-agent","skills":["crypto-price","exchange-rate","news-headlines"],"uptime_seconds":12}
```

---

## Step 3 — Register on AgentHub (CLI)

Run this one-liner on any machine that has Node.js (your PC is fine for this step):

```bash
curl -fsSL https://agents.pinai.tech/terminal.sh | sh -s -- \
  --agent-name "utility-agent" \
  --description "Utility agent: real-time crypto prices, currency exchange rates, and news headlines" \
  --tags "crypto,finance,news,utility" \
  --skill-name "crypto-price" \
  --skill-description "Get current price of any crypto coin. Parameter: coin (string, e.g. bitcoin)"
```

After registration you'll get an `api_key` — **save it immediately**, it's only shown once.

---

## Step 4 — Update registration with all 3 skills

The CLI one-liner only registers one skill. Add the other two via the HTTP API:

```bash
curl -X PUT https://agents.pinai.tech/api/agents/YOUR_AGENT_ID \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "https://YOUR-RAILWAY-URL/agent",
    "skills": [
      {
        "name": "crypto-price",
        "description": "Get the current USD price of any cryptocurrency",
        "parameters": {
          "coin": {"type": "string", "required": true, "description": "Coin id, e.g. bitcoin, ethereum, solana"}
        }
      },
      {
        "name": "exchange-rate",
        "description": "Convert between any two currencies using live exchange rates",
        "parameters": {
          "from":   {"type": "string", "required": true,  "description": "Source currency code, e.g. USD"},
          "to":     {"type": "string", "required": true,  "description": "Target currency code, e.g. EUR"},
          "amount": {"type": "number", "required": false, "description": "Amount to convert (default 1)"}
        }
      },
      {
        "name": "news-headlines",
        "description": "Fetch the latest news headlines for any topic",
        "parameters": {
          "topic": {"type": "string", "required": true,  "description": "Topic to search, e.g. crypto, AI, finance"},
          "count": {"type": "number", "required": false, "description": "Number of headlines (default 5, max 10)"}
        }
      }
    ]
  }'
```

---

## Step 5 — Start the persistent runtime

On the machine where you installed the CLI (Step 3):

```bash
pinai-agenthub runtime start
```

Or for a one-shot heartbeat check:
```bash
pinai-agenthub runtime start --once
```

Verify everything is working:
```bash
pinai-agenthub auth status      # registered OK?
pinai-agenthub runtime status   # online?
pinai-agenthub doctor           # full readiness check
```

---

## Testing your skills manually

```bash
# Crypto price
curl -X POST https://YOUR-RAILWAY-URL/agent \
  -H "Content-Type: application/json" \
  -d '{"skill": "crypto-price", "parameters": {"coin": "solana"}}'

# Exchange rate
curl -X POST https://YOUR-RAILWAY-URL/agent \
  -H "Content-Type: application/json" \
  -d '{"skill": "exchange-rate", "parameters": {"from": "USD", "to": "JPY", "amount": 100}}'

# News headlines
curl -X POST https://YOUR-RAILWAY-URL/agent \
  -H "Content-Type: application/json" \
  -d '{"skill": "news-headlines", "parameters": {"topic": "bitcoin", "count": 3}}'
```

---

## Free API sources used

| Skill | API | Key required |
|-------|-----|-------------|
| `crypto-price` | CoinGecko (free tier) | No |
| `exchange-rate` | Frankfurter.app | No |
| `news-headlines` | NewsAPI.org (free tier) | Yes (free) |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Agent name already taken | Run `pinai-agenthub recover --agent-name <name>` |
| Heartbeat timeout / goes offline | Run `pinai-agenthub runtime start` again, or set up a cron job |
| `coin not found` error | Use CoinGecko IDs — check https://api.coingecko.com/api/v3/coins/list |
| NewsAPI 401 error | Double-check `NEWS_API_KEY` is set in Railway variables |
