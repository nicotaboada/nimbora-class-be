/**
 * Script para configurar certificado de desarrollo de AFIP
 *
 * Ejecutar con: npm run afip:setup
 *
 * Este script:
 * 1. Crea un certificado de desarrollo en AFIP
 * 2. Autoriza el web service de facturación electrónica (wsfe)
 * 3. Guarda el certificado y key en la carpeta certs/
 */

import Afip from "@afipsdk/afip.js";
import * as fs from "fs";
import * as path from "path";

// ============================================
// CONFIGURAR ESTOS VALORES ANTES DE EJECUTAR
// ============================================

const ACCESS_TOKEN = "JTihOgUQEb7HoaGhS2ArZ3HXDpl8ZTQElcjbUTtP6ZWPqK9Ek64Bg9kvatCu3Zk5"; // Obtener en https://app.afipsdk.com/
const CUIT = "20373757455"; // CUIT de la academia
const USERNAME = "20373757455"; // Usuario ARCA (puede ser otro CUIT si sos admin)
const PASSWORD = "Riquelmeroman93 "; // Contraseña ARCA
const ALIAS = "nimboradev"; // Nombre del certificado

// ============================================

async function createCertificate(afip: Afip): Promise<{ cert: string; key: string }> {
  console.log("📜 Creando certificado de desarrollo...");
  console.log("   (Esto puede tomar varios segundos)");

  const response = await afip.CreateAutomation(
    "create-cert-dev",
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

  console.log("✅ Certificado creado exitosamente!");
  return {
    cert: response.data.cert,
    key: response.data.key,
  };
}

async function authorizeWebService(afip: Afip): Promise<void> {
  console.log("\n🔐 Autorizando web service wsfe (facturación electrónica)...");

  const response = await afip.CreateAutomation(
    "auth-web-service-dev",
    {
      cuit: CUIT,
      username: USERNAME,
      password: PASSWORD,
      alias: ALIAS,
      service: "wsfe",
    },
    true,
  );

  if (response.status !== "complete") {
    throw new Error(`Error autorizando wsfe: ${JSON.stringify(response)}`);
  }

  console.log("✅ Web service wsfe autorizado!");
  console.log("   Estado:", response.data.status);
}

function saveCertificates(cert: string, key: string): void {
  const certsDir = path.join(process.cwd(), "certs");

  if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir, { recursive: true });
  }

  fs.writeFileSync(path.join(certsDir, "dev.cert"), cert);
  fs.writeFileSync(path.join(certsDir, "dev.key"), key);

  console.log("\n📁 Archivos guardados en:");
  console.log("   - certs/dev.cert");
  console.log("   - certs/dev.key");
}

function printNextSteps(cert: string, key: string): void {
  console.log("\n" + "=".repeat(60));
  console.log("📋 PRÓXIMOS PASOS:");
  console.log("=".repeat(60));
  console.log("\n1. Copiar el contenido de los archivos a afip.config.ts:");
  console.log("   - cert: contenido de certs/dev.cert");
  console.log("   - key: contenido de certs/dev.key");
  console.log("\n2. O usar directamente los archivos leyéndolos en runtime");
  console.log("\n" + "=".repeat(60));
  console.log("CERT (primeros 100 chars):");
  console.log(cert.substring(0, 100) + "...");
  console.log("\nKEY (primeros 100 chars):");
  console.log(key.substring(0, 100) + "...");
  console.log("=".repeat(60));
}

async function main(): Promise<void> {
  console.log("🚀 Iniciando configuración de AFIP SDK\n");

  const afip = new Afip({ access_token: ACCESS_TOKEN });

  try {
    // 1. Crear certificado
    const { cert, key } = await createCertificate(afip);

    // 2. Guardar archivos
    saveCertificates(cert, key);

    // 3. Autorizar web service
    await authorizeWebService(afip);

    // 4. Mostrar próximos pasos
    printNextSteps(cert, key);

    console.log("\n✅ Configuración completada exitosamente!");
  } catch (error: any) {
    console.error("\n❌ Error durante la configuración:");
    console.error(error);
    
    // Mostrar más detalles si es un error de Axios
    if (error.data) {
      console.error("\n📋 Detalles del error:");
      console.error(JSON.stringify(error.data, null, 2));
    }
    
    process.exit(1);
  }
}

main();
