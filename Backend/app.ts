// Backend/app.ts
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config();

const app = express();

let authRouter: any = null;
let bookingRoutes: any = null;
let counselorsRouter: any = null;
let adminUsersRoutes: any = null;
let sessionNotesRoutes: any = null;
let studentsRoutes: any = null;
let adminUsersRouter: any = null;
let adminAnalyticsRouter: any = null;
let googleCalendarRoutes: any = null;
let studentProxy: any = null;

function tryRequire(p: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(p);
    // support both default export and module.exports
    return mod && mod.default ? mod.default : mod;
  } catch (err) {
    console.warn(
      `[app] Could not load route: ${p} — ${String(
        (err as any).message || err
      )}`
    );
    return null;
  }
}

// note: paths are relative to this file's location. If you move this file, update the paths.
authRouter = tryRequire("./routes/auth");
bookingRoutes = tryRequire("./routes/booking");
counselorsRouter = tryRequire("./routes/counselor");
adminUsersRoutes = tryRequire("./routes/users");
sessionNotesRoutes = tryRequire("./routes/sessionNotes");
studentsRoutes = tryRequire("./routes/students");
adminUsersRouter = tryRequire("./routes/adminUsers");
adminAnalyticsRouter = tryRequire("./routes/adminAnalytics");
googleCalendarRoutes = tryRequire("./routes/googleCalendarRoutes");
studentProxy = tryRequire("./routes/studentProxy");

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

// Only mount a router if it loaded successfully, otherwise warn and skip.
if (authRouter) app.use("/api/auth", authRouter);
if (bookingRoutes) app.use("/api/bookings", bookingRoutes);
if (counselorsRouter) app.use("/api/counselors", counselorsRouter);

if (adminUsersRouter) app.use("/api/admin", adminUsersRouter);
if (adminUsersRoutes) app.use("/api/admin/users", adminUsersRoutes);

if (sessionNotesRoutes) app.use("/api/session-notes", sessionNotesRoutes);
if (studentsRoutes) app.use("/api/students", studentsRoutes);
if (adminAnalyticsRouter) app.use("/api/admin/analytics", adminAnalyticsRouter);

// Google calendar routes (mounted on two endpoints historically for compatibility)
if (googleCalendarRoutes) {
  app.use("/api/google-calendar", googleCalendarRoutes);
  app.use("/api/counselors/google", googleCalendarRoutes);
}

if (studentProxy) app.use("/api", studentProxy);

// Compatibility shim used previously by frontend; keep it to avoid breaking older clients
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

// Static client serving: candidates are evaluated relative to this file's directory
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
    const status = err?.status || 500;
    // ensure message is present and stringifiable
    const message =
      err?.message ?? (typeof err === "string" ? err : "Server error");
    res.status(status).json({ success: false, message });
  }
);

export default app;
