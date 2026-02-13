import { Resolver, Query, Mutation, Args, ID } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { AfipSalesPointService } from "./afip-sales-point.service";
import { AfipSalesPoint } from "./entities/afip-sales-point.entity";
import { CreateAfipSalesPointInput } from "./dto/create-afip-sales-point.input";
import { UpdateAfipSalesPointInput } from "./dto/update-afip-sales-point.input";
import { SupabaseAuthGuard } from "../auth/guards/supabase-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "../users/entities/user.entity";

@Resolver(() => AfipSalesPoint)
@UseGuards(SupabaseAuthGuard)
export class AfipSalesPointResolver {
  constructor(private readonly afipSalesPointService: AfipSalesPointService) {}

  /**
   * Lista todos los puntos de venta de la academy del usuario.
   */
  @Query(() => [AfipSalesPoint], {
    name: "afipSalesPoints",
    description: "Lista todos los puntos de venta AFIP de la academy",
  })
  async listSalesPoints(@CurrentUser() user: User): Promise<AfipSalesPoint[]> {
    return this.afipSalesPointService.listByAcademy(user.academyId);
  }

  /**
   * Crea un punto de venta. Se crea con isActive = false, isEnabledForArca = false.
   * Usar validateAfipSalesPoint para validar contra ARCA y activarlo después.
   */
  @Mutation(() => AfipSalesPoint, {
    description:
      "Crea un punto de venta AFIP (sin validar contra ARCA, usar validateAfipSalesPoint después)",
  })
  async createAfipSalesPoint(
    @Args("input") input: CreateAfipSalesPointInput,
    @CurrentUser() user: User,
  ): Promise<AfipSalesPoint> {
    return this.afipSalesPointService.create(user.academyId, input);
  }

  /**
   * Edita el nombre de un punto de venta.
   */
  @Mutation(() => AfipSalesPoint, {
    description: "Edita el nombre de un punto de venta AFIP",
  })
  async updateAfipSalesPoint(
    @Args("id", { description: "ID del punto de venta" }) id: string,
    @Args("input") input: UpdateAfipSalesPointInput,
    @CurrentUser() user: User,
  ): Promise<AfipSalesPoint> {
    return this.afipSalesPointService.update(user.academyId, id, input);
  }

  /**
   * Alterna el estado activo/inactivo de un punto de venta.
   * Solo se puede activar si ya fue validado en ARCA.
   * Al activar uno, desactiva automáticamente todos los demás.
   */
  @Mutation(() => AfipSalesPoint, {
    description:
      "Alterna el estado activo/inactivo de un punto de venta AFIP. Solo uno puede estar activo a la vez.",
  })
  async toggleAfipSalesPointActive(
    @Args("id", { description: "ID del punto de venta" }) id: string,
    @CurrentUser() user: User,
  ): Promise<AfipSalesPoint> {
    return this.afipSalesPointService.toggleActive(user.academyId, id);
  }

  /**
   * Valida un punto de venta contra ARCA.
   * Si el número existe y no está bloqueado, lo valida, lo activa y desactiva todos los demás.
   */
  @Mutation(() => AfipSalesPoint, {
    description:
      "Valida un punto de venta contra ARCA, lo activa y desactiva todos los demás puntos de venta",
  })
  async validateAfipSalesPoint(
    @Args("id", { description: "ID del punto de venta a validar" }) id: string,
    @CurrentUser() user: User,
  ): Promise<AfipSalesPoint> {
    return this.afipSalesPointService.validateAgainstArca(user.academyId, id);
  }

  /**
   * Elimina un punto de venta.
   * No se puede eliminar un punto de venta que esté activo.
   */
  @Mutation(() => Boolean, {
    description:
      "Elimina un punto de venta AFIP (no se puede eliminar si está activo)",
  })
  async deleteAfipSalesPoint(
    @Args("id", {
      type: () => ID,
      description: "ID del punto de venta a eliminar",
    })
    id: string,
    @CurrentUser() user: User,
  ): Promise<boolean> {
    return this.afipSalesPointService.delete(user.academyId, id);
  }
}
