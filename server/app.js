const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const app = express();

// CORS is only needed for local dev, where the Vite client (5173) and the API
// (3001) are different origins. On Vercel the client and API share one origin.
if (process.env.NODE_ENV !== 'production') {
  app.use(cors({ origin: 'http://localhost:5173' }));
}

app.use(express.json());

app.use('/api/weather',            require('./routes/weather'));
app.use('/api/weather-cities',     require('./routes/weatherCities'));
app.use('/api/news',               require('./routes/news'));
app.use('/api/news-kpis',          require('./routes/newsKpis'));
app.use('/api/reactions',          require('./routes/newsInteractions'));
app.use('/api/static',             require('./routes/staticData'));
app.use('/api/quotes',             require('./routes/quotes'));
app.use('/api/improvements',       require('./routes/improvements'));
app.use('/api/user-info',          require('./routes/userInfo'));
app.use('/api/credentials',        require('./routes/credentials'));
app.use('/api/todo-summaries',     require('./routes/todoSummaries'));
app.use('/api/todos',              require('./routes/todos'));
app.use('/api/notes',              require('./routes/notes'));
app.use('/api/onenote',            require('./routes/onenote'));
app.use('/api/view-kpis',          require('./routes/viewKpis'));
app.use('/api/proxy',              require('./routes/proxy'));
app.use('/api/web-page-downloads', require('./routes/webPageDownloads'));

module.exports = app;
