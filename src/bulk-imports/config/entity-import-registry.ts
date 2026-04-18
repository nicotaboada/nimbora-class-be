import { ImportEntityType } from "../enums/import-entity-type.enum";
import { STUDENT_IMPORT_CONFIG } from "./student-import.config";
import { TEACHER_IMPORT_CONFIG } from "./teacher-import.config";
import { FAMILY_IMPORT_CONFIG } from "./family-import.config";
import type { EntityImportConfig } from "./entity-import-config";

/**
 * Single source of truth mapping an importable entity to the metadata the
 * orchestrator needs (columns, sheet, Trigger.dev task id, BulkOperation type,
 * filename). Validators are registered separately as providers in the module
 * and looked up by `entityType` at runtime.
 *
 * Adding a new entity: extend ImportEntityType, create its config, and add
 * an entry here.
 */
export const ENTITY_IMPORT_REGISTRY: Record<
  ImportEntityType,
  EntityImportConfig
> = {
  [ImportEntityType.STUDENT]: STUDENT_IMPORT_CONFIG,
  [ImportEntityType.TEACHER]: TEACHER_IMPORT_CONFIG,
  [ImportEntityType.FAMILY]: FAMILY_IMPORT_CONFIG,
};

export function getEntityImportConfig(
  entityType: ImportEntityType,
): EntityImportConfig {
  const config = ENTITY_IMPORT_REGISTRY[entityType];
  if (!config) {
    throw new Error(`No import config registered for entity ${entityType}`);
  }
  return config;
}
