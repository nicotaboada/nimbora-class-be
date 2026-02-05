import { NotFoundException } from "@nestjs/common";

/**
 * Valida que una entidad existe. Lanza NotFoundException si es null.
 *
 * @param entity - La entidad a validar
 * @param name - Nombre de la entidad para el mensaje de error
 * @returns La entidad validada (nunca null)
 * @throws NotFoundException si la entidad es null
 *
 * @example
 * const charge = await prisma.charge.findUnique({ where: { id } });
 * assertFound(charge, "Charge");
 */
export function assertFound<T>(entity: T | null, name: string): T {
  if (!entity) {
    throw new NotFoundException(`${name} not found`);
  }
  return entity;
}

/**
 * Valida que una entidad existe Y pertenece a la academia especificada.
 * Lanza NotFoundException si no existe o no pertenece (sin filtrar existencia).
 *
 * @param entity - La entidad a validar (debe tener academyId)
 * @param academyId - El ID de la academia del usuario autenticado
 * @param name - Nombre de la entidad para el mensaje de error
 * @returns La entidad validada (nunca null, siempre pertenece a la academia)
 * @throws NotFoundException si la entidad no existe o no pertenece a la academia
 *
 * @example
 * const invoice = await prisma.invoice.findUnique({ where: { id } });
 * assertOwnership(invoice, user.academyId, "Invoice");
 */
export function assertOwnership<T extends { academyId: string }>(
  entity: T | null,
  academyId: string,
  name: string,
): T {
  if (!entity || entity.academyId !== academyId) {
    throw new NotFoundException(`${name} not found`);
  }
  return entity;
}
