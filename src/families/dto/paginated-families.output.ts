import { ObjectType } from "@nestjs/graphql";
import { Paginated } from "../../common/dto/paginated.output";
import { Family } from "../entities/family.entity";

@ObjectType()
export class PaginatedFamilies extends Paginated(Family) {}
