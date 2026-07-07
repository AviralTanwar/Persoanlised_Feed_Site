const express = require('express');
const cors = require('cors');
require('dotenv').config();

const weatherRouter = require('./routes/weather');
const newsRouter = require('./routes/news');
const newsKpisRouter = require('./routes/newsKpis');
const staticRouter = require('./routes/staticData');
const improvementsRouter    = require('./routes/improvements');
const newsInteractionsRouter = require('./routes/newsInteractions');
const webNotesRouter         = require('./routes/webNotes');
const quotesRouter           = require('./routes/quotes');
const weatherCitiesRouter    = require('./routes/weatherCities');
const userInfoRouter         = require('./routes/userInfo');
const credentialsRouter      = require('./routes/credentials');
const todoSummariesRouter    = require('./routes/todoSummaries');
const todosRouter            = require('./routes/todos');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/weather', weatherRouter);
app.use('/api/news', newsRouter);
app.use('/api/news-kpis', newsKpisRouter);
app.use('/api/static', staticRouter);
app.use('/api/improvements', improvementsRouter);
app.use('/api/reactions',   newsInteractionsRouter);
app.use('/api/web-notes',   webNotesRouter);
app.use('/api/quotes',      quotesRouter);
app.use('/api/weather-cities', weatherCitiesRouter);
app.use('/api/user-info',      userInfoRouter);
app.use('/api/credentials',    credentialsRouter);
app.use('/api/todo-summaries', todoSummariesRouter);
app.use('/api/todos',          todosRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
