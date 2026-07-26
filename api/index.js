// Vercel serverless entry. The Express app is exported (no listen) from
// server/app.js; Vercel invokes it as a Node request handler. The vercel.json
// rewrite sends every /api/* request here.
module.exports = require('../server/app');
