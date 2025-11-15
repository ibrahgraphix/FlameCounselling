// server.ts (front-end server, placed outside src folder)
import * as express from "express";
import * as https from "https";
import * as path from "path";
import * as fs from "fs";
import * as dotenv from "dotenv";

dotenv.config();

const app = express.default();

// Load SSL certificates
const sslOptions = {
  cert: fs.default.readFileSync(
    "/opt/View/sslcertificates/council_certificate.crt"
  ),
  ca: fs.default.readFileSync("/opt/View/sslcertificates/council_bundle.crt"),
  key: fs.default.readFileSync("/opt/View/sslcertificates/council.key"),
};

// Find the client build directory
const buildCandidates: string[] = [
  path.default.join(__dirname, "client", "dist"), // monorepo client/dist
  path.default.join(__dirname, "client", "build"), // CRA convention
  path.default.join(__dirname, "dist"), // simple root dist
  path.default.join(__dirname, "public"), // fallback public
];

const clientBuildPath = buildCandidates.find(
  (p) => fs.default.existsSync(p) && fs.default.statSync(p).isDirectory()
);

if (clientBuildPath) {
  // Serve static files
  app.default.use(express.default.static(clientBuildPath));
  // Fallback: serve index.html for any route (SPA routing)
  app.default.get("*", (req, res) => {
    const indexHtml = path.default.join(clientBuildPath, "index.html");
    if (fs.default.existsSync(indexHtml)) {
      res.sendFile(indexHtml);
    } else {
      res.status(404).send("Not Found");
    }
  });
  console.log(`[frontend] Serving client from: ${clientBuildPath}`);
} else {
  console.log("[frontend] No client build found; static serving disabled.");
}

// Health check
app.default.get("/health", (_req, res) => res.json({ ok: true }));

const PORT = process.env.FRONTEND_PORT || 3030;
https.default.createServer(sslOptions, app.default).listen(PORT, () => {
  console.log(
    `Frontend server listening on https://flamestudentcouncil.in:${PORT}`
  );
});
