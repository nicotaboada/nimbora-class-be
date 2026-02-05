import { Resolver, Query, Mutation, Args } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { AcademiesService } from "./academies.service";
import { Academy } from "./entities/academy.entity";
import { CreateAcademyInput } from "./dto/create-academy.input";
import { UpdateAcademyInput } from "./dto/update-academy.input";
import { SupabaseAuthGuard } from "../auth/guards/supabase-auth.guard";

@Resolver(() => Academy)
@UseGuards(SupabaseAuthGuard)
export class AcademiesResolver {
  constructor(private readonly academiesService: AcademiesService) {}

  @Mutation(() => Academy)
  createAcademy(@Args("input") input: CreateAcademyInput): Promise<Academy> {
    return this.academiesService.create(input);
  }

  @Query(() => [Academy], { name: "academies" })
  findAll(): Promise<Academy[]> {
    return this.academiesService.findAll();
  }

  @Query(() => Academy, { name: "academy", nullable: true })
  findOne(@Args("id") id: string): Promise<Academy | null> {
    return this.academiesService.findOne(id);
  }

  @Query(() => Academy, { name: "academyBySlug", nullable: true })
  findBySlug(@Args("slug") slug: string): Promise<Academy | null> {
    return this.academiesService.findBySlug(slug);
  }

  @Mutation(() => Academy)
  updateAcademy(@Args("input") input: UpdateAcademyInput): Promise<Academy> {
    return this.academiesService.update(input);
  }

  @Mutation(() => Academy)
  removeAcademy(@Args("id") id: string): Promise<Academy> {
    return this.academiesService.remove(id);
  }
}
