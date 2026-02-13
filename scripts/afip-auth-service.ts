/**
 * Script para autorizar un web service en AFIP sin recrear el certificado.
 *
 * Uso:
 *   npx ts-node scripts/afip-auth-service.ts                  # Autoriza ws_sr_padron_a5 en HOMO
 *   npx ts-node scripts/afip-auth-service.ts --prod            # Autoriza en PROD
 *   npx ts-node scripts/afip-auth-service.ts --service wsfe    # Otro servicio
 */

import Afip from "@afipsdk/afip.js";
import * as dotenv from "dotenv";

dotenv.config();

const ACCESS_TOKEN = process.env.SAAS_AFIP_ACCESS_TOKEN ?? "";
const CUIT = process.env.SAAS_AFIP_CUIT ?? "";
const USERNAME = process.env.ARCA_USERNAME ?? "";
const PASSWORD = process.env.ARCA_PASSWORD ?? "";
const ALIAS = process.env.ARCA_CERT_ALIAS ?? "nimborasaas";

const isProduction = process.argv.includes("--prod");
const envLabel = isProduction ? "PRODUCCION" : "HOMOLOGACION";

const serviceArgIndex = process.argv.indexOf("--service");
const serviceName =
  serviceArgIndex !== -1 && process.argv[serviceArgIndex + 1]
    ? process.argv[serviceArgIndex + 1]
    : "ws_sr_padron_a5";

async function main(): Promise<void> {
  console.log("=".repeat(70));
  console.log(`  AFIP - Autorizar web service (${envLabel})`);
  console.log(`  Servicio: ${serviceName}`);
  console.log(`  Alias:    ${ALIAS}`);
  console.log(`  CUIT:     ${CUIT}`);
  console.log("=".repeat(70));

  if (!ACCESS_TOKEN || !CUIT || !USERNAME || !PASSWORD) {
    console.error(
      "\nError: Configurar ACCESS_TOKEN, CUIT, USERNAME y PASSWORD en el .env",
    );
    process.exit(1);
  }

  const afip = new Afip({ access_token: ACCESS_TOKEN });
  const automationType = isProduction
    ? "auth-web-service-prod"
    : "auth-web-service-dev";

  try {
    console.log(`\nAutorizando ${serviceName}...`);

    const response = await afip.CreateAutomation(
      automationType,
      {
        cuit: CUIT,
        username: USERNAME,
        password: PASSWORD,
        alias: ALIAS,
        service: serviceName,
      },
      true,
    );

    console.log("\nRespuesta completa:", JSON.stringify(response, null, 2));

    if (response.status === "complete") {
      console.log(`\n✓ ${serviceName} autorizado! Estado: ${response.data?.status}`);
    } else {
      console.error(`\n✗ Error: status = ${response.status}`);
    }
  } catch (error: any) {
    console.error("\nError durante la autorizacion:");
    console.error(error.message);
    if (error.data) {
      console.error("Detalles:", JSON.stringify(error.data, null, 2));
    }
    process.exit(1);
  }
}

main();
