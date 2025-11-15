// server.ts
import app from "./app";
import dotenv from "dotenv";
import https from "https";
import fs from "fs";
dotenv.config();

// Load SSL certificates
const sslOptions = {
  cert: fs.readFileSync("/opt/View/sslcertificates/council_certificate.crt"),
  ca: fs.readFileSync("/opt/View/sslcertificates/council_bundle.crt"),
  key: fs.readFileSync("/opt/View/sslcertificates/council.key"),
};

const PORT = process.env.PORT || 5050;
https.createServer(sslOptions, app).listen(PORT, () => {
  console.log(`Server listening on https://flamestudentcouncil.in:${PORT}`);
});
