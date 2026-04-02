import { ObjectType } from "@nestjs/graphql";
import { Paginated } from "../../common/dto/paginated.output";
import { ClassEntity } from "../entities/class.entity";

@ObjectType()
export class PaginatedClasses extends Paginated(ClassEntity) {}
