const express = require('express');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ─── Skill: crypto-price ─────────────────────────────────────────────────────
async function getCryptoPrice(coin) {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd,btc,eth`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data[coin]) throw new Error(`Coin "${coin}" not found. Try: bitcoin, ethereum, solana, etc.`);
  return data[coin];
}

// ─── Skill: exchange-rate ────────────────────────────────────────────────────
async function getExchangeRate(from, to, amount = 1) {
  const url = `https://open.er-api.com/v6/latest/${from}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.result !== 'success') throw new Error(`Exchange error: ${data['error-type'] || 'Unknown error'}`);
  if (!data.rates[to]) throw new Error(`Currency "${to}" not supported.`);
  const rate = data.rates[to];
  const converted = (rate * amount).toFixed(2);
  return { from, to, amount, rate, converted, date: data.time_last_update_utc };
}

// ─── Skill: news-headlines ───────────────────────────────────────────────────
async function getNewsHeadlines(topic, count = 5) {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) throw new Error('NEWS_API_KEY environment variable is not set.');
  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(topic)}&pageSize=${count}&sortBy=publishedAt&language=en&apiKey=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== 'ok') throw new Error(data.message || 'NewsAPI error');
  return data.articles.slice(0, count).map(a => ({
    title: a.title,
    source: a.source.name,
    url: a.url,
    published: a.publishedAt,
  }));
}

// ─── Main skill router ───────────────────────────────────────────────────────
app.post('/agent', async (req, res) => {
  const { skill, parameters = {}, request_id } = req.body;
  console.log(`[${new Date().toISOString()}] skill=${skill} params=${JSON.stringify(parameters)}`);

  try {
    let result, data;

    if (skill === 'crypto-price') {
      const coin = (parameters.coin || 'bitcoin').toLowerCase().trim();
      data = await getCryptoPrice(coin);
      result = `${coin} — $${data.usd.toLocaleString()} USD | ${data.btc} BTC | ${data.eth} ETH`;

    } else if (skill === 'exchange-rate') {
      const from   = (parameters.from   || 'USD').toUpperCase();
      const to     = (parameters.to     || 'EUR').toUpperCase();
      const amount = parseFloat(parameters.amount) || 1;
      data = await getExchangeRate(from, to, amount);
      result = `${data.amount} ${data.from} = ${data.converted} ${data.to} (rate: ${data.rate}, as of ${data.date})`;

    } else if (skill === 'news-headlines') {
      const topic = parameters.topic || 'technology';
      const count = Math.min(parseInt(parameters.count) || 5, 10);
      data = await getNewsHeadlines(topic, count);
      const lines = data.map((a, i) => `${i + 1}. [${a.source}] ${a.title}`).join('\n');
      result = `Top ${data.length} headlines for "${topic}":\n${lines}`;

    } else {
      return res.status(400).json({ error: `Unknown skill: "${skill}"` });
    }

    res.json({ result, data, request_id });

  } catch (err) {
    console.error(`[ERROR] ${err.message}`);
    res.status(500).json({ error: err.message, request_id });
  }
});

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    agent: process.env.AGENT_NAME || 'utility-agent',
    skills: ['crypto-price', 'exchange-rate', 'news-headlines'],
    uptime_seconds: Math.floor(process.uptime()),
  });
});

app.listen(PORT, () => {
  console.log(`✅ Utility agent running on port ${PORT}`);
  console.log(`   Skills: crypto-price | exchange-rate | news-headlines`);
});
