import {
  Resolver,
  Query,
  Mutation,
  Args,
  ResolveField,
  Parent,
} from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { UsersService } from "./users.service";
import { AcademiesService } from "../academies/academies.service";
import { User } from "./entities/user.entity";
import { Academy } from "../academies/entities/academy.entity";
import { CreateUserInput } from "./dto/create-user.input";
import { UpdateUserInput } from "./dto/update-user.input";
import { SupabaseAuthGuard } from "../auth/guards/supabase-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

@Resolver(() => User)
@UseGuards(SupabaseAuthGuard)
export class UsersResolver {
  constructor(
    private readonly usersService: UsersService,
    private readonly academiesService: AcademiesService,
  ) {}

  @Mutation(() => User)
  createUser(@Args("input") input: CreateUserInput): Promise<User> {
    return this.usersService.create(input);
  }

  @Query(() => User, {
    name: "me",
    description: "Obtiene el usuario actual autenticado",
  })
  getMe(@CurrentUser() user: User): User {
    return user;
  }

  @Query(() => [User], { name: "users" })
  findAll(@CurrentUser() user: User): Promise<User[]> {
    return this.usersService.findAll(user.academyId);
  }

  @Query(() => User, { name: "user", nullable: true })
  findOne(@Args("id") id: string): Promise<User | null> {
    return this.usersService.findOne(id);
  }

  @Query(() => User, { name: "userBySupabaseId", nullable: true })
  findBySupabaseId(
    @Args("supabaseUserId") supabaseUserId: string,
  ): Promise<User | null> {
    return this.usersService.findBySupabaseId(supabaseUserId);
  }

  @Mutation(() => User)
  updateUser(@Args("input") input: UpdateUserInput): Promise<User> {
    return this.usersService.update(input);
  }

  @Mutation(() => User)
  removeUser(@Args("id") id: string): Promise<User> {
    return this.usersService.remove(id);
  }

  @ResolveField(() => Academy)
  async academy(@Parent() user: User): Promise<Academy> {
    const academy = await this.academiesService.findOne(user.academyId);
    if (!academy) {
      throw new Error(`Academy with id ${user.academyId} not found`);
    }
    return academy;
  }
}
