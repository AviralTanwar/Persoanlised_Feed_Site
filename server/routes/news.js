const express = require('express');
const router = express.Router();

const MOCK = [
  { id: 'n1', title: "India's GDP Growth Hits 7.8% in Q4, Beats Forecasts", src: 'The Hindu', desc: "India's economy expanded 7.8% in Q4, surpassing analyst estimates. Strong manufacturing, construction, and financial services led the growth.", time: '2h ago', url: '#' },
  { id: 'n2', title: 'Supreme Court: Algorithmic Profiling Without Consent Violates Article 21', src: 'Indian Express', desc: 'Landmark verdict rules that algorithmic profiling without explicit consent violates the right to privacy. Platforms must overhaul consent mechanisms within 90 days.', time: '4h ago', url: '#' },
  { id: 'n3', title: 'ISRO Confirms Chandrayaan-4 Launch Window: August 2026', src: 'NDTV', desc: 'ISRO has confirmed a 14-day launch window beginning August 2026 for Chandrayaan-4, targeting the first Indian lunar sample-return mission.', time: '6h ago', url: '#' },
  { id: 'n4', title: 'IMD Orange Alert: Heat Wave to Continue Across North India', src: 'Times of India', desc: 'Temperatures in Delhi and NCR running 4–6°C above seasonal norms. IMD advises residents to avoid outdoor exposure between noon and 4 PM.', time: '8h ago', url: '#' },
  { id: 'n5', title: 'RBI Holds Repo Rate at 6.0%, Signals Possible August Cut', src: 'Mint', desc: "RBI's MPC kept the benchmark repo rate at 6.0% while striking a dovish tone. CPI inflation cooled to 3.8%, a possible rate cut expected in August.", time: '10h ago', url: '#' },
  { id: 'n6', title: 'Parliament Passes Digital Public Infrastructure Bill', src: 'Business Standard', desc: 'Unified regulatory framework for Aadhaar, UPI, and civic tech platforms. Includes privacy-by-design principles and an independent grievance-redressal body.', time: '12h ago', url: '#' },
];

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

router.get('/', async (req, res) => {
  const key = process.env.NEWS_API_KEY;
  const country = req.query.country || 'in';
  const pageSize = Number(req.query.pageSize) || 6;

  if (!key) return res.json(MOCK);

  try {
    const url = `https://newsapi.org/v2/top-headlines?country=${country}&pageSize=${pageSize}&apiKey=${key}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || data.status !== 'ok' || !data.articles?.length) {
      return res.json(MOCK);
    }

    const articles = data.articles
      .map((a, i) => ({
        id: a.url || `n${i}`,
        title: a.title?.replace(/ - [^-]+$/, '') || '',
        src: a.source?.name || 'Unknown',
        desc: a.description || a.content?.slice(0, 200) || '',
        time: timeAgo(a.publishedAt),
        url: a.url || '#',
      }))
      .filter(a => a.title);

    res.json(articles);
  } catch {
    res.json(MOCK);
  }
});

module.exports = router;
