import { Injectable, BadRequestException } from "@nestjs/common";
import Afip from "@afipsdk/afip.js";
import { AfipEnvironment } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  type AfipTaxpayerDetails,
  type AfipRawSalesPoint,
  type AfipSdkError,
  AFIP_BLOQUEADO_SI,
} from "./types/afip-sdk.types";
import {
  extractRazonSocial,
  mapPersoneria,
  mapCondicionIva,
  formatDomicilio,
  extractActividadPrincipal,
} from "./utils/taxpayer-parser";
import type {
  ArcaSalesPointData,
  TaxpayerData,
} from "./types/afip-service.types";
export type {
  ArcaSalesPointData,
  TaxpayerData,
} from "./types/afip-service.types";

/**
 * Servicio para interactuar con AFIP/ARCA.
 *
 * Usa credenciales globales del SaaS (env vars) y crea instancias
 * del SDK por tenant usando delegación de web services.
 */
@Injectable()
export class AfipService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene las credenciales del SaaS desde env vars
   */
  private getSaasCredentials(production: boolean): {
    accessToken: string;
    cuit: string;
    cert: string;
    key: string;
  } {
    const accessToken = process.env.SAAS_AFIP_ACCESS_TOKEN;
    const cuit = process.env.SAAS_AFIP_CUIT;

    if (!accessToken || !cuit) {
      throw new BadRequestException(
        "AFIP SDK no configurado. Faltan variables de entorno SAAS_AFIP_ACCESS_TOKEN o SAAS_AFIP_CUIT",
      );
    }

    const certRaw = production
      ? process.env.SAAS_AFIP_CERT_PROD
      : process.env.SAAS_AFIP_CERT_HOMO;
    const keyRaw = production
      ? process.env.SAAS_AFIP_KEY_PROD
      : process.env.SAAS_AFIP_KEY_HOMO;

    if (!certRaw || !keyRaw) {
      const env = production ? AfipEnvironment.PROD : AfipEnvironment.HOMO;
      throw new BadRequestException(
        `Faltan certificados AFIP para entorno ${env}. Configurar SAAS_AFIP_CERT_${env} y SAAS_AFIP_KEY_${env}`,
      );
    }

    // Los certificados se guardan en base64 en el .env
    const cert = this.decodeBase64(certRaw);
    const key = this.decodeBase64(keyRaw);

    return { accessToken, cuit, cert, key };
  }

  /**
   * Crea una instancia del SDK de AFIP para operar en nombre de una academy.
   * Usa el cert/key del SaaS + el CUIT de la academy (delegación).
   */
  async getAfipInstanceForAcademy(academyId: string): Promise<Afip> {
    const settings = await this.prisma.academyAfipSettings.findUnique({
      where: { academyId },
    });

    if (!settings) {
      throw new BadRequestException(
        "La academia no tiene configuración de AFIP. Completar el setup primero.",
      );
    }

    const production = settings.environment === AfipEnvironment.PROD;
    const saas = this.getSaasCredentials(production);

    return new Afip({
      CUIT: settings.cuit,
      cert: saas.cert,
      key: saas.key,
      access_token: saas.accessToken,
      production,
    });
  }

  /**
   * Crea una instancia del SDK con el CUIT del SaaS (para operaciones genéricas
   * como consultar el padrón, no asociadas a ninguna academy).
   */
  private getSaasAfipInstance(production: boolean = false): Afip {
    const saas = this.getSaasCredentials(production);
    return new Afip({
      CUIT: saas.cuit,
      cert: saas.cert,
      key: saas.key,
      access_token: saas.accessToken,
      production,
    });
  }

  /**
   * Consulta datos del contribuyente en el padrón de ARCA.
   * Devuelve razón social, condición IVA, domicilio, etc.
   */
  async lookupTaxpayer(cuit: string): Promise<TaxpayerData> {
    const cleanCuit = cuit.replaceAll("-", "");

    const AFIP_SDK_TEST_CUIT = "20409378472";
    if (cleanCuit === AFIP_SDK_TEST_CUIT) {
      return {
        cuit: AFIP_SDK_TEST_CUIT,
        razonSocial: "[DEV] AFIP SDK Testing",
        personeria: "Física",
        condicionIva: "RESPONSABLE_INSCRIPTO",
        domicilioFiscal: "Av. Testing 123, CABA",
        actividadPrincipal: "Servicios de testing (mock)",
        street: "Av. Testing 123",
        city: "CABA",
        province: "Buenos Aires",
        zipCode: "1000",
      };
    }

    const afip = this.getSaasAfipInstance();
    const cuitNumber = Number(cleanCuit);

    try {
      const taxpayer = (await afip.RegisterInscriptionProof.getTaxpayerDetails(
        cuitNumber,
      )) as AfipTaxpayerDetails | null;

      if (!taxpayer) {
        throw new BadRequestException(
          `No se encontraron datos para el CUIT ${cuit}`,
        );
      }

      const persona = taxpayer.datosGenerales;
      const domicilio = persona?.domicilioFiscal;

      return {
        cuit: cleanCuit,
        razonSocial: extractRazonSocial(persona),
        personeria: mapPersoneria(persona),
        condicionIva: mapCondicionIva(taxpayer),
        domicilioFiscal: formatDomicilio(domicilio),
        actividadPrincipal: extractActividadPrincipal(taxpayer),
        street: domicilio?.direccion ?? null,
        city: domicilio?.localidad ?? null,
        province: domicilio?.descripcionProvincia ?? null,
        zipCode: domicilio?.codPostal ?? null,
      };
    } catch (error: unknown) {
      if (error instanceof BadRequestException) throw error;
      // El SDK de afipsdk.com envuelve "No existe persona" en un 500
      const sdkError = error as AfipSdkError;
      const errorMsg =
        sdkError.data?.message ?? sdkError.message ?? "Error desconocido";
      if (errorMsg.includes("No existe persona")) {
        throw new BadRequestException(
          `No se encontraron datos para el CUIT ${cuit} en ARCA. Verificá que el CUIT sea correcto.`,
        );
      }
      throw new BadRequestException(
        `Error consultando CUIT ${cuit} en ARCA: ${errorMsg}`,
      );
    }
  }

  /**
   * Verifica que la delegación WSFE esté activa para una academy.
   * En HOMO: siempre retorna válido (skip de verificación para desarrollo).
   * En PROD: intenta obtener el último comprobante; si funciona, la delegación es válida.
   */
  async verifyDelegation(
    academyId: string,
  ): Promise<{ isValid: boolean; error?: string }> {
    try {
      const settings = await this.prisma.academyAfipSettings.findUnique({
        where: { academyId },
      });

      if (!settings) {
        return { isValid: false, error: "Settings no encontrados" };
      }

      // En HOMO, skipear la verificación real (no requiere delegación de AFIP)
      if (settings.environment === AfipEnvironment.HOMO) {
        return { isValid: true };
      }

      // En PROD, verificar delegación real contra AFIP
      const afip = await this.getAfipInstanceForAcademy(academyId);

      // Intentar una operación simple de WSFE para validar la delegación
      // FECompUltimoAutorizado es la operación más liviana
      const cbteTipo = 11; // Factura C (la más simple para verificar)
      await afip.ElectronicBilling.getLastVoucher(
        settings.defaultPtoVta,
        cbteTipo,
      );

      return { isValid: true };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error verificando delegación";
      return { isValid: false, error: message };
    }
  }

  /**
   * Consulta los puntos de venta habilitados en ARCA para una academy.
   * Usa el WSFE (FEParamGetPtosVenta) a través del SDK.
   * En HOMO, retorna puntos de venta mockeados (1-10) para evitar problemas de delegación.
   */
  async getArcaSalesPoints(academyId: string): Promise<ArcaSalesPointData[]> {
    const settings = await this.prisma.academyAfipSettings.findUnique({
      where: { academyId },
    });

    if (!settings) {
      throw new BadRequestException(
        "La academia no tiene configuración de AFIP. Completar el setup primero.",
      );
    }

    // En HOMO, retornar solo el punto de venta 1 (típico de CUITs de prueba)
    if (settings.environment === AfipEnvironment.HOMO) {
      const homoMock: ArcaSalesPointData = {
        number: 1,
        emissionType: "CAE",
        isBlocked: false,
        deactivatedAt: null,
      };
      return [homoMock];
    }

    // En PROD, consultar ARCA real
    const afip = await this.getAfipInstanceForAcademy(academyId);
    const points = (await afip.ElectronicBilling.getSalesPoints()) as
      | AfipRawSalesPoint[]
      | null;
    return (points ?? []).map((p) => ({
      number: p.Nro,
      emissionType: p.EmisionTipo,
      isBlocked: p.Bloqueado === AFIP_BLOQUEADO_SI,
      deactivatedAt: p.FchBaja ?? null,
    }));
  }

  /**
   * Decodifica un valor que puede estar en base64 o en PEM directo.
   */
  private decodeBase64(value: string): string {
    const decoded = value.startsWith("-----BEGIN")
      ? value
      : Buffer.from(value, "base64").toString("utf8");
    // Normalizar CRLF → LF (AFIP rechaza PEM con \r\n)
    return decoded.replaceAll("\r\n", "\n");
  }
}
