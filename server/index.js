const express = require('express');
const cors = require('cors');
require('dotenv').config();

const weatherRouter = require('./routes/weather');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/weather', weatherRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
