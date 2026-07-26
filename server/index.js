// Local development entry point only. On Vercel the app is served as a
// serverless function via api/index.js, which imports the same app.js.
const app = require('./app');
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
