// Frontserver.ts (front-end server, now in Backend folder)
import express from "express";
import https from "https";
import path from "path";
import fs from "fs";
import { config } from "dotenv";

config();

// In CommonJS builds (__dirname exists), so use that instead of import.meta.url
const app = express();

// Load SSL certificates
const sslOptions = {
  cert: fs.readFileSync("/opt/View/sslcertificates/council_certificate.crt"),
  ca: fs.readFileSync("/opt/View/sslcertificates/council_bundle.crt"),
  key: fs.readFileSync("/opt/View/sslcertificates/council.key"),
};

// Find the client build directory (adjusted for sibling Frontend folder)
// Using __dirname (this file's folder) to compute path relative to the Backend folder
const frontendDir = path.join(__dirname, "..", "Frontend");
const buildCandidates: string[] = [
  path.join(frontendDir, "dist"), // Vite monorepo client/dist
  path.join(frontendDir, "build"), // CRA convention
  path.join(frontendDir, "dist"), // simple root dist (duplicate for safety)
  path.join(frontendDir, "public"), // fallback public
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

const PORT = process.env.FRONTEND_PORT || 7070;
https.createServer(sslOptions, app).listen(PORT, () => {
  console.log(
    `Frontend server listening on https://flamestudentcouncil.in:${PORT}`
  );
});
