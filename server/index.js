const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/weather',        require('./routes/weather'));
app.use('/api/weather-cities', require('./routes/weatherCities'));
app.use('/api/news',           require('./routes/news'));
app.use('/api/news-kpis',      require('./routes/newsKpis'));
app.use('/api/reactions',      require('./routes/newsInteractions'));
app.use('/api/static',         require('./routes/staticData'));
app.use('/api/quotes',         require('./routes/quotes'));
app.use('/api/improvements',   require('./routes/improvements'));
app.use('/api/user-info',      require('./routes/userInfo'));
app.use('/api/credentials',    require('./routes/credentials'));
app.use('/api/todo-summaries', require('./routes/todoSummaries'));
app.use('/api/todos',          require('./routes/todos'));
app.use('/api/notes',          require('./routes/notes'));

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
