import Afip from "@afipsdk/afip.js";
import { AfipEnvironment } from "@prisma/client";

interface AfipSettings {
  cuit: string;
  environment: AfipEnvironment;
}

/**
 * Decodes a value that may be base64-encoded or raw PEM.
 */
function decodeBase64(value: string): string {
  const decoded = value.startsWith("-----BEGIN")
    ? value
    : Buffer.from(value, "base64").toString("utf8");
  return decoded.replaceAll("\r\n", "\n");
}

/**
 * Creates a standalone AFIP SDK instance for an academy.
 * Useful in contexts outside NestJS DI (e.g., Trigger.dev tasks).
 *
 * Uses SaaS-level credentials (env vars) with the academy's CUIT (delegation model).
 */
export function createAfipInstance(settings: AfipSettings): Afip {
  const production = settings.environment === AfipEnvironment.PROD;

  const accessToken = process.env.SAAS_AFIP_ACCESS_TOKEN;
  const cuit = process.env.SAAS_AFIP_CUIT;

  if (!accessToken || !cuit) {
    throw new Error(
      "AFIP SDK no configurado. Faltan SAAS_AFIP_ACCESS_TOKEN o SAAS_AFIP_CUIT",
    );
  }

  const certRaw = production
    ? process.env.SAAS_AFIP_CERT_PROD
    : process.env.SAAS_AFIP_CERT_HOMO;
  const keyRaw = production
    ? process.env.SAAS_AFIP_KEY_PROD
    : process.env.SAAS_AFIP_KEY_HOMO;

  if (!certRaw || !keyRaw) {
    const env = production ? "PROD" : "HOMO";
    throw new Error(
      `Faltan certificados AFIP para entorno ${env}. Configurar SAAS_AFIP_CERT_${env} y SAAS_AFIP_KEY_${env}`,
    );
  }

  return new Afip({
    CUIT: settings.cuit,
    cert: decodeBase64(certRaw),
    key: decodeBase64(keyRaw),
    access_token: accessToken,
    production,
  });
}
