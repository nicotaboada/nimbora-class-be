/**
 * Configuración de AFIP SDK
 *
 * NOTA: Por ahora hardcodeado para pruebas.
 * En producción multi-tenant, estos valores vendrán de la entidad Academy en la DB.
 */
export const AFIP_CONFIG = {
  // Access token obtenido en https://app.afipsdk.com/
  accessToken: "TU_ACCESS_TOKEN_AQUI",

  // CUIT de la academia que emitirá las facturas
  cuit: "20XXXXXXXXX",

  // Usuario para ingresar a ARCA (normalmente el mismo CUIT, o el del administrador)
  username: "20XXXXXXXXX",

  // Contraseña de ARCA
  password: "TU_CONTRASEÑA_ARCA",

  // Alias del certificado (nombre para identificarlo en AFIP)
  certAlias: "nimbora-dev",

  // Certificado y key generados por el script afip:setup
  // Después de ejecutar el script, copiar los valores aquí
  cert: "",
  key: "",
};
