/**
 * Script para crear certificado del SaaS en AFIP (HOMO o PROD)
 *
 * Ejecutar con:
 *   npx ts-node scripts/afip-create-cert.ts          # HOMO por defecto
 *   npx ts-node scripts/afip-create-cert.ts --prod    # PROD
 *
 * Este script:
 * 1. Crea un certificado de desarrollo/producción en AFIP
 * 2. Autoriza el web service de facturación electrónica (wsfe)
 * 3. Imprime cert y key para copiar al .env
 *
 * IMPORTANTE: Configurar las variables abajo antes de ejecutar.
 */

import Afip from "@afipsdk/afip.js";
import * as dotenv from "dotenv";

dotenv.config();

// ============================================
// Se leen del .env:
//   SAAS_AFIP_ACCESS_TOKEN
//   SAAS_AFIP_CUIT
//   ARCA_USERNAME
//   ARCA_PASSWORD
//   ARCA_CERT_ALIAS  (opcional, default "nimbora-saas")
// ============================================

const ACCESS_TOKEN = process.env.SAAS_AFIP_ACCESS_TOKEN ?? "";
const CUIT = process.env.SAAS_AFIP_CUIT ?? "";
const USERNAME = process.env.ARCA_USERNAME ?? "";
const PASSWORD = process.env.ARCA_PASSWORD ?? "";
const ALIAS = process.env.ARCA_CERT_ALIAS ?? "nimborasaas";

// ============================================

const isProduction = process.argv.includes("--prod");
const envLabel = isProduction ? "PRODUCCION" : "HOMOLOGACION";

async function createCertificate(
  afip: Afip,
): Promise<{ cert: string; key: string }> {
  console.log(`\nCreando certificado de ${envLabel}...`);
  console.log("   (Esto puede tomar varios segundos)\n");

  const automationType = isProduction
    ? "create-cert-prod"
    : "create-cert-dev";

  const response = await afip.CreateAutomation(
    automationType,
    {
      cuit: CUIT,
      username: USERNAME,
      password: PASSWORD,
      alias: ALIAS,
    },
    true,
  );

  if (response.status !== "complete") {
    throw new Error(`Error creando certificado: ${JSON.stringify(response)}`);
  }

  console.log("Certificado creado exitosamente!\n");
  return {
    cert: response.data.cert,
    key: response.data.key,
  };
}

async function authorizeWebServices(afip: Afip): Promise<void> {
  console.log("\nAutorizando web services necesarios...");

  const automationType = isProduction
    ? "auth-web-service-prod"
    : "auth-web-service-dev";

  // 1. Autorizar WSFE (facturación electrónica)
  console.log("1) Autorizando wsfe (facturación electrónica)...");
  const wsfeResponse = await afip.CreateAutomation(
    automationType,
    {
      cuit: CUIT,
      username: USERNAME,
      password: PASSWORD,
      alias: ALIAS,
      service: "wsfe",
    },
    true,
  );

  if (wsfeResponse.status !== "complete") {
    throw new Error(`Error autorizando wsfe: ${JSON.stringify(wsfeResponse)}`);
  }

  console.log("   ✓ wsfe autorizado! Estado:", wsfeResponse.data.status);

  // 2. Autorizar ws_sr_constancia_inscripcion (consulta de padrón / WSAA service ID)
  console.log(
    "2) Autorizando ws_sr_constancia_inscripcion (consulta de padrón)...",
  );
  const padronResponse = await afip.CreateAutomation(
    automationType,
    {
      cuit: CUIT,
      username: USERNAME,
      password: PASSWORD,
      alias: ALIAS,
      service: "ws_sr_constancia_inscripcion",
    },
    true,
  );

  if (padronResponse.status !== "complete") {
    throw new Error(
      `Error autorizando ws_sr_constancia_inscripcion: ${JSON.stringify(padronResponse)}`,
    );
  }

  console.log(
    "   ✓ ws_sr_constancia_inscripcion autorizado! Estado:",
    padronResponse.data.status,
  );
}

function toBase64(content: string): string {
  return Buffer.from(content).toString("base64");
}

function printEnvVars(cert: string, key: string): void {
  const suffix = isProduction ? "PROD" : "HOMO";

  console.log("\n" + "=".repeat(70));
  console.log(`COPIAR ESTO AL .env (entorno ${envLabel}):`);
  console.log("=".repeat(70));
  console.log(`\nSAAS_AFIP_CERT_${suffix}=${toBase64(cert)}`);
  console.log(`\nSAAS_AFIP_KEY_${suffix}=${toBase64(key)}`);
  console.log("\n" + "=".repeat(70));

  console.log("\n--- Cert PEM (para verificar) ---");
  console.log(cert.substring(0, 80) + "...");
  console.log("\n--- Key PEM (para verificar) ---");
  console.log(key.substring(0, 80) + "...");
  console.log("=".repeat(70));
}

async function main(): Promise<void> {
  console.log("=".repeat(70));
  console.log(`  AFIP - Crear certificado SaaS (${envLabel})`);
  console.log("=".repeat(70));

  if (!ACCESS_TOKEN || !CUIT || !USERNAME || !PASSWORD) {
    console.error(
      "\nError: Configurar ACCESS_TOKEN, CUIT, USERNAME y PASSWORD en el script antes de ejecutar.",
    );
    process.exit(1);
  }

  const afip = new Afip({ access_token: ACCESS_TOKEN });

  try {
    // 1. Crear certificado
    const { cert, key } = await createCertificate(afip);

    // 2. Autorizar web services
    await authorizeWebServices(afip);

    // 3. Imprimir para copiar al .env
    printEnvVars(cert, key);

    console.log("\nListo! Copia las lineas SAAS_AFIP_CERT/KEY al .env");
  } catch (error: any) {
    console.error("\nError durante la configuracion:");
    console.error(error);

    if (error.data) {
      console.error("\nDetalles del error:");
      console.error(JSON.stringify(error.data, null, 2));
    }

    process.exit(1);
  }
}

main();
