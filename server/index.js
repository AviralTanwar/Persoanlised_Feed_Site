const express = require('express');
const cors = require('cors');
require('dotenv').config();

const weatherRouter = require('./routes/weather');
const newsRouter = require('./routes/news');
const hnRouter = require('./routes/hn');
const staticRouter = require('./routes/staticData');
const improvementsRouter    = require('./routes/improvements');
const newsInteractionsRouter = require('./routes/newsInteractions');
const webNotesRouter         = require('./routes/webNotes');
const quotesRouter           = require('./routes/quotes');
const weatherCitiesRouter    = require('./routes/weatherCities');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/weather', weatherRouter);
app.use('/api/news', newsRouter);
app.use('/api/hn', hnRouter);
app.use('/api/static', staticRouter);
app.use('/api/improvements', improvementsRouter);
app.use('/api/reactions',   newsInteractionsRouter);
app.use('/api/web-notes',   webNotesRouter);
app.use('/api/quotes',      quotesRouter);
app.use('/api/weather-cities', weatherCitiesRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
