const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const STATIC_DIR = path.join(__dirname, '../../static');

const FILE_MAP = {
  config: 'config.json',
  youtube: 'youtube_videos.json',
  excuses: 'excuses.json',
  onenote: 'onenote_pages.json',
  webpages: 'web_pages.json',
};

router.get('/:key', (req, res) => {
  const filename = FILE_MAP[req.params.key];
  if (!filename) return res.status(404).json({ error: 'Unknown resource' });

  const filePath = path.join(STATIC_DIR, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Invalid JSON in static file' });
  }
});

module.exports = router;
