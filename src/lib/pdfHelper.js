// This is a plain CommonJS helper that wraps the pdf-parse CJS bundle.
// It is intentionally a .js file (not .ts) so Node.js CJS resolution
// loads it without Webpack/Turbopack touching it at all.
const { PDFParse } = require("pdf-parse/dist/pdf-parse/cjs/index.cjs");
module.exports = { PDFParse };
