import { Express, Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
    aud?: string;
  };
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export function requireSupabaseAuth(app: Express) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.slice(7);
    try {
      const verified = jwt.decode(token);
      if (!verified || typeof verified !== 'object') {
        return res.status(401).json({ error: 'Invalid token' });
      }

      req.user = {
        id: verified.sub as string,
        email: verified.email as string | undefined,
        aud: verified.aud as string | undefined,
      };
      next();
    } catch (error) {
      res.status(401).json({ error: 'Token verification failed' });
    }
  };
}
