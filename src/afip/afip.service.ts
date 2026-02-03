import { Injectable, OnModuleInit } from "@nestjs/common";
import Afip from "@afipsdk/afip.js";
import { AFIP_CONFIG } from "./afip.config";

/**
 * Servicio para interactuar con AFIP/ARCA
 *
 * Encapsula toda la lógica de facturación electrónica.
 * Por ahora usa configuración hardcodeada para pruebas.
 */
@Injectable()
export class AfipService implements OnModuleInit {
  private afip: Afip | null = null;

  onModuleInit(): void {
    this.initializeAfip();
  }

  private initializeAfip(): void {
    if (!AFIP_CONFIG.cert || !AFIP_CONFIG.key) {
      console.warn(
        "[AfipService] Certificado no configurado. Ejecutar: npm run afip:setup",
      );
      return;
    }

    this.afip = new Afip({
      CUIT: AFIP_CONFIG.cuit,
      access_token: AFIP_CONFIG.accessToken,
      cert: AFIP_CONFIG.cert,
      key: AFIP_CONFIG.key,
    });
  }

  /**
   * Verifica si el servicio está configurado correctamente
   */
  isConfigured(): boolean {
    return this.afip !== null;
  }

  /**
   * Obtiene la instancia de Afip SDK
   * @throws Error si no está configurado
   */
  getAfipInstance(): Afip {
    if (!this.afip) {
      throw new Error(
        "AfipService no configurado. Ejecutar: npm run afip:setup",
      );
    }
    return this.afip;
  }

  // TODO: Agregar métodos de facturación
  // - createInvoice()
  // - getLastInvoiceNumber()
  // - etc.
}
