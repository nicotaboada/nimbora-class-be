import { Injectable } from "@nestjs/common";
import {
  createClient,
  SupabaseClient,
  User as SupabaseUser,
} from "@supabase/supabase-js";
import * as jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

/**
 * Payload del JWT de Supabase Auth
 */
interface SupabaseJwtPayload {
  sub: string; // User ID
  email?: string;
  phone?: string;
  aud: string; // "authenticated"
  role: string; // "authenticated"
  exp: number;
  iat: number;
  app_metadata?: {
    provider?: string;
    providers?: string[];
  };
  user_metadata?: Record<string, unknown>;
}

@Injectable()
export class SupabaseService {
  private readonly client: SupabaseClient<any, any>;
  private readonly jwksClient: jwksClient.JwksClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        "Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables",
      );
    }

    this.client = createClient(supabaseUrl, supabaseKey);

    // Configurar cliente JWKS para obtener claves públicas de Supabase
    // Las claves se cachean automáticamente para mejor performance
    const jwksUri = `${supabaseUrl}/auth/v1/.well-known/jwks.json`;
    this.jwksClient = jwksClient({
      jwksUri,
      cache: true, // Cachear claves (default: true)
      cacheMaxAge: 600_000, // Cache por 10 minutos
      rateLimit: true, // Limitar requests al JWKS endpoint
      jwksRequestsPerMinute: 10, // Max 10 requests por minuto
    });
  }

  /**
   * Obtiene la clave pública del JWKS usando el kid del token
   */
  private getSigningKey(kid: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.jwksClient.getSigningKey(kid, (err, key) => {
        if (err) {
          reject(err);
          return;
        }
        const signingKey = key?.getPublicKey();
        if (!signingKey) {
          reject(new Error("No signing key found"));
          return;
        }
        resolve(signingKey);
      });
    });
  }

  /**
   * Guarda de tipo para validar el payload del JWT de Supabase
   */
  private isSupabaseJwtPayload(
    payload: unknown,
  ): payload is SupabaseJwtPayload {
    if (payload && typeof payload === "object") {
      const p = payload as Record<string, unknown>;
      return (
        typeof p.sub === "string" &&
        typeof p.aud === "string" &&
        typeof p.role === "string"
      );
    }
    return false;
  }

  /**
   * Valida un JWT de Supabase usando JWKS (claves públicas cacheadas).
   * Verifica la firma del token y que no haya expirado.
   */
  async validateToken(token: string): Promise<SupabaseUser | null> {
    try {
      // Decodificar el header para obtener el kid (key id)
      const decodedToken = jwt.decode(token, { complete: true });

      if (!decodedToken || !decodedToken.header.kid) {
        return null;
      }

      const kid = decodedToken.header.kid;

      // Obtener la clave pública del JWKS (cacheada)
      const signingKey = await this.getSigningKey(kid);

      // Verificar el token con la clave pública
      const decoded = jwt.verify(token, signingKey, {
        algorithms: ["ES256", "RS256"],
      });

      if (typeof decoded === "string" || !this.isSupabaseJwtPayload(decoded)) {
        return null;
      }

      // Verificar que sea un token de usuario autenticado
      if (decoded.aud !== "authenticated" || decoded.role !== "authenticated") {
        return null;
      }

      // Mapear al formato de SupabaseUser sin usar 'as'
      const user: SupabaseUser = {
        id: decoded.sub,
        email: decoded.email,
        phone: decoded.phone,
        app_metadata: decoded.app_metadata ?? {},
        user_metadata: decoded.user_metadata ?? {},
        aud: decoded.aud,
        created_at: new Date().toISOString(),
      };

      return user;
    } catch {
      return null;
    }
  }

  /**
   * Obtiene el cliente de Supabase para operaciones adicionales si es necesario.
   */
  getClient(): SupabaseClient<any, any> {
    return this.client;
  }
}
