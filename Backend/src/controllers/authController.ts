// src/controllers/authController.ts
import { Request, Response, NextFunction } from "express";
import { loginCounselor, loginWithGoogle } from "../services/authService";

export const loginHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "email and password required" });
    }

    const result = await loginCounselor(email, password);
    return res.json({
      success: true,
      token: result.token,
      counselor: result.counselor,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Google sign-in handler
 * Expects body: { id_token: string } (the Google ID token from client)
 *
 * NOTE: If Google email is not present in counselors table (or has wrong role),
 * this endpoint now returns 403 and DOES NOT create a new counselor row.
 */
export const googleLoginHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id_token } = req.body;
    if (!id_token) {
      return res
        .status(400)
        .json({ success: false, message: "id_token required" });
    }

    const result = await loginWithGoogle(String(id_token));
    return res.json({
      success: true,
      token: result.token,
      counselor: result.counselor,
    });
  } catch (err: any) {
    console.error("googleLoginHandler error:", err);
    const status = err?.status || 500;
    const message =
      err?.message ||
      (status === 403
        ? "Not authorized to access counselor dashboard"
        : "Server error during Google login");
    return res.status(status).json({ success: false, message });
  }
};

export default { loginHandler, googleLoginHandler };
