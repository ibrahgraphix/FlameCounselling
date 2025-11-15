// server.ts (front-end server, placed outside src folder)
import express from "express";
import https from "https";
import path from "path";
import fs from "fs";
import { config } from "dotenv";
import { fileURLToPath } from "url";

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Load SSL certificates
const sslOptions = {
  cert: fs.readFileSync("/opt/View/sslcertificates/council_certificate.crt"),
  ca: fs.readFileSync("/opt/View/sslcertificates/council_bundle.crt"),
  key: fs.readFileSync("/opt/View/sslcertificates/council.key"),
};

// Find the client build directory
const buildCandidates: string[] = [
  path.join(__dirname, "client", "dist"), // monorepo client/dist
  path.join(__dirname, "client", "build"), // CRA convention
  path.join(__dirname, "dist"), // simple root dist
  path.join(__dirname, "public"), // fallback public
];

const clientBuildPath = buildCandidates.find(
  (p) => fs.existsSync(p) && fs.statSync(p).isDirectory()
);

if (clientBuildPath) {
  // Serve static files
  app.use(express.static(clientBuildPath));
  // Fallback: serve index.html for any route (SPA routing)
  app.get("*", (req, res) => {
    const indexHtml = path.join(clientBuildPath, "index.html");
    if (fs.existsSync(indexHtml)) {
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
app.get("/health", (_req, res) => res.json({ ok: true }));

const PORT = process.env.FRONTEND_PORT || 3030;
https.createServer(sslOptions, app).listen(PORT, () => {
  console.log(
    `Frontend server listening on https://flamestudentcouncil.in:${PORT}`
  );
});
