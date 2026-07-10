import { type Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in production"
  );
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Middleware: Verify Supabase JWT token from Authorization header
 * Attaches user to req.user from JWT claims
 * Returns 401 if token is missing, invalid, or expired
 */
export async function requireSupabaseAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Missing or invalid authorization header" });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ message: "Invalid or expired token" });
      return;
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email || "",
      role: user.role || "authenticated",
    };

    next();
  } catch (err) {
    res.status(401).json({ message: "Token verification failed" });
  }
}
