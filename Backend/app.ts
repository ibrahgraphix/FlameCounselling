// src/app.ts
import express from "express";
import cors from "cors";
import authRouter from "./routes/auth";
import bodyParser from "body-parser";
import bookingRoutes from "./routes/booking";
import counselorsRouter from "./routes/counselor";
import adminUsersRoutes from "./routes/users";
import sessionNotesRoutes from "./routes/sessionNotes";
import studentsRoutes from "./routes/students";
import adminUsersRouter from "./routes/adminUsers";
import adminAnalyticsRouter from "./routes/adminAnalytics";
import googleCalendarRoutes from "./routes/googleCalendarRoutes";
import studentProxy from "./routes/studentProxy";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
dotenv.config();
const app = express();
// allow cross-origin from your front-end with credentials
const CLIENT_ORIGIN =
  process.env.CLIENT_URL || "https://flamestudentcouncil.in:7070";
app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  })
);
app.use(bodyParser.json());
// ---------------------- API routes (register first) ----------------------
app.use("/api/auth", authRouter);
app.use("/api/bookings", bookingRoutes);
app.use("/api/counselors", counselorsRouter);
app.use("/api/admin", adminUsersRoutes);
app.use("/api/session-notes", sessionNotesRoutes);
app.use("/api/students", studentsRoutes);
app.use("/api/admin", adminUsersRouter);
app.use("/api/admin/analytics", adminAnalyticsRouter);
app.use("/api/google-calendar", googleCalendarRoutes);
app.use("/api/counselors/google", googleCalendarRoutes);
app.use("/api", studentProxy);
app.get("/api/counselors/google/calendar", async (_req, res) => {
  return res.json({
    success: true,
    source: "compat-shim",
    internalBookings: [],
    counselor: null,
  });
});
// health
app.get("/health", (_req, res) => res.json({ ok: true }));
const buildCandidates = [
  path.join(__dirname, "..", "client", "dist"), // monorepo client/dist
  path.join(__dirname, "..", "client", "build"), // CRA convention
  path.join(__dirname, "..", "dist"), // simple root dist
  path.join(__dirname, "..", "public"), // fallback public
];
const clientBuildPath = buildCandidates.find(
  (p) => fs.existsSync(p) && fs.statSync(p).isDirectory()
);
if (clientBuildPath) {
  // Serve static files
  app.use(express.static(clientBuildPath));
  // Fallback: for any route that doesn't start with /api serve index.html
  app.get("*", (req, res, next) => {
    // If it looks like an API route, pass through so 404s come from API handlers
    if (req.path.startsWith("/api")) return next();
    const indexHtml = path.join(clientBuildPath, "index.html");
    if (fs.existsSync(indexHtml)) {
      res.sendFile(indexHtml);
    } else {
      // If no index.html present for some reason, continue to next middleware
      next();
    }
  });
  console.log(`[app] Serving client from: ${clientBuildPath}`);
} else {
  console.log(
    "[app] No client build found; SPA fallback disabled. (This is fine during dev with Vite.)"
  );
}
// ---------------------- Error handler ----------------------
app.use(
  (err: any, _req: express.Request, res: express.Response, _next: any) => {
    console.error(err);
    const status = err.status || 500;
    res
      .status(status)
      .json({ success: false, message: err.message || "Server error" });
  }
);
export default app;
