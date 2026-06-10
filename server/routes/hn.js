const express = require('express');
const router = express.Router();

const MOCK = [
  { id: 'm1', title: 'OpenAI Releases GPT-5 with Improved Reasoning', src: 'TechCrunch', desc: 'OpenAI announces GPT-5, featuring significantly improved reasoning capabilities and reduced hallucinations.', time: '1h ago', url: '#', domain: 'techcrunch.com' },
  { id: 'm2', title: 'Apple WWDC 2026: iOS 20 Unveiled with AI-First Design', src: 'The Verge', desc: 'Apple introduces iOS 20 at WWDC, placing on-device AI at the centre of the new operating system experience.', time: '3h ago', url: '#', domain: 'theverge.com' },
  { id: 'm3', title: 'Google DeepMind Achieves Breakthrough in Protein Folding', src: 'Wired', desc: 'DeepMind\'s latest model predicts protein interactions with near-perfect accuracy, opening new drug discovery pathways.', time: '5h ago', url: '#', domain: 'wired.com' },
  { id: 'm4', title: 'Microsoft Azure Outage Disrupts Services Across Europe', src: 'Reuters', desc: 'A major Azure outage lasting six hours affected cloud services for thousands of businesses across European regions.', time: '7h ago', url: '#', domain: 'reuters.com' },
  { id: 'm5', title: 'Rust Overtakes Go as Second Most-Used Systems Language', src: 'InfoQ', desc: 'Latest Stack Overflow survey shows Rust has overtaken Go in adoption for systems and backend development.', time: '9h ago', url: '#', domain: 'infoq.com' },
  { id: 'm6', title: 'Meta Open-Sources Llama 4 Model Weights', src: 'VentureBeat', desc: 'Meta releases the full weights for Llama 4 under a permissive licence, intensifying the open-source LLM race.', time: '11h ago', url: '#', domain: 'venturebeat.com' },
];

function getDomain(url) {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return ''; }
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

router.get('/', async (req, res) => {
  const key      = process.env.NEWS_API_KEY;
  const pageSize = Math.min(Number(req.query.count) || 12, 20);

  if (!key) return res.json(MOCK);

  try {
    const url = `https://newsapi.org/v2/top-headlines?category=technology&language=en&pageSize=${pageSize}&apiKey=${key}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || data.status !== 'ok' || !data.articles?.length) {
      return res.json(MOCK);
    }

    const articles = data.articles
      .map(a => ({
        id:     a.url,
        title:  a.title?.replace(/ - [^-]+$/, '') || '',
        src:    a.source?.name || 'Unknown',
        desc:   a.description || '',
        time:   timeAgo(a.publishedAt),
        url:    a.url || '#',
        domain: getDomain(a.url),
      }))
      .filter(a => a.title);

    res.json(articles);
  } catch {
    res.json(MOCK);
  }
});

module.exports = router;
