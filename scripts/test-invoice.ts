/**
 * Script de prueba para crear una factura electrónica en AFIP
 *
 * Ejecutar con: npm run afip:test-invoice
 *
 * Este script:
 * 1. Se conecta al ambiente de desarrollo de AFIP
 * 2. Obtiene el último número de comprobante
 * 3. Crea una factura de prueba simple (Factura B para consumidor final)
 * 4. Muestra el CAE asignado
 */

import Afip from "@afipsdk/afip.js";
import * as fs from "fs";
import * as path from "path";

// ============================================
// CONFIGURACIÓN
// ============================================

const ACCESS_TOKEN = "JTihOgUQEb7HoaGhS2ArZ3HXDpl8ZTQElcjbUTtP6ZWPqK9Ek64Bg9kvatCu3Zk5";
const CUIT = "20373757455";

// Leer certificado y key desde archivos
const CERT = fs.readFileSync(path.join(process.cwd(), "certs/dev.cert"), "utf-8");
const KEY = fs.readFileSync(path.join(process.cwd(), "certs/dev.key"), "utf-8");

// ============================================

async function getLastVoucherNumber(afip: Afip): Promise<number> {
  console.log("📊 Obteniendo último número de comprobante...");
  
  const puntoDeVenta = 1;
  const tipoDeComprobante = 6; // Factura B
  
  const lastVoucher = await afip.ElectronicBilling.getLastVoucher(
    puntoDeVenta,
    tipoDeComprobante,
  );
  
  console.log(`   Último comprobante: ${lastVoucher}`);
  return lastVoucher;
}

async function createTestInvoice(afip: Afip, voucherNumber: number): Promise<any> {
  console.log(`\n🧾 Creando factura de prueba #${voucherNumber}...`);
  
  // Fecha actual en formato yyyymmdd
  const fecha = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0]
    .replace(/-/g, "");
  
  const data = {
    CantReg: 1, // Una sola factura
    PtoVta: 1, // Punto de venta 1
    CbteTipo: 6, // Factura B
    Concepto: 1, // Productos (para prueba simple)
    DocTipo: 99, // Consumidor final
    DocNro: 0, // Sin DNI (consumidor final)
    CbteDesde: voucherNumber,
    CbteHasta: voucherNumber,
    CbteFch: parseInt(fecha),
    ImpTotal: 121, // $121 total
    ImpTotConc: 0, // No hay importe no gravado
    ImpNeto: 100, // $100 base
    ImpOpEx: 0, // No exento
    ImpIVA: 21, // $21 de IVA (21%)
    ImpTrib: 0, // Sin tributos
    MonId: "PES", // Pesos argentinos
    MonCotiz: 1, // Cotización 1:1
    CondicionIVAReceptorId: 5, // Consumidor Final
    Iva: [
      {
        Id: 5, // IVA 21%
        BaseImp: 100, // Sobre $100
        Importe: 21, // $21
      },
    ],
  };
  
  console.log("   Datos de la factura:");
  console.log(`   - Tipo: Factura B`);
  console.log(`   - Número: ${voucherNumber}`);
  console.log(`   - Fecha: ${fecha}`);
  console.log(`   - Total: $${data.ImpTotal}`);
  console.log(`   - Neto: $${data.ImpNeto} + IVA: $${data.ImpIVA}`);
  
  const result = await afip.ElectronicBilling.createVoucher(data);
  
  return result;
}

async function main(): Promise<void> {
  console.log("🚀 Iniciando prueba de facturación electrónica\n");
  
  // Validar que existan los certificados
  if (!CERT || !KEY) {
    console.error("❌ Error: No se encontraron los archivos de certificado");
    console.error("   Ejecutar primero: npm run afip:setup");
    process.exit(1);
  }
  
  // Inicializar Afip SDK
  const afip = new Afip({
    CUIT: CUIT,
    access_token: ACCESS_TOKEN,
    cert: CERT,
    key: KEY,
  });
  
  try {
    // 1. Obtener último número de comprobante
    const lastVoucher = await getLastVoucherNumber(afip);
    const nextVoucher = lastVoucher + 1;
    
    // 2. Crear factura de prueba
    const result = await createTestInvoice(afip, nextVoucher);
    
    // 3. Mostrar resultado
    console.log("\n✅ ¡Factura creada exitosamente!");
    console.log("=".repeat(60));
    console.log("📋 RESULTADO:");
    console.log("=".repeat(60));
    console.log(`CAE: ${result.CAE}`);
    console.log(`Vencimiento CAE: ${result.CAEFchVto}`);
    console.log(`Número de comprobante: ${nextVoucher}`);
    console.log("=".repeat(60));
    console.log("\n💡 Este CAE es válido y puede ser usado en la factura impresa/digital");
    
  } catch (error: any) {
    console.error("\n❌ Error durante la facturación:");
    console.error(error);
    
    if (error.data) {
      console.error("\n📋 Detalles del error:");
      console.error(JSON.stringify(error.data, null, 2));
    }
    
    process.exit(1);
  }
}

main();
