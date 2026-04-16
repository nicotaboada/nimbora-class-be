import { InputType, Field } from "@nestjs/graphql";
import {
  IsUUID,
  ArrayMinSize,
  ValidateNested,
  IsDate,
  IsBoolean,
  IsOptional,
} from "class-validator";
import { Type } from "class-transformer";
import {
  BulkFamilyInvoiceItem,
  BulkInvoiceItem,
} from "../types/bulk-invoice.types";

@InputType()
export class FamilyInvoiceStudentItemInput implements BulkInvoiceItem {
  @Field()
  @IsUUID("4")
  studentId: string;

  @Field(() => [String])
  @IsUUID("4", { each: true })
  @ArrayMinSize(1)
  chargeIds: string[];
}

@InputType()
export class BulkFamilyInvoiceItemInput implements BulkFamilyInvoiceItem {
  @Field()
  @IsUUID("4")
  familyId: string;

  @Field(() => [FamilyInvoiceStudentItemInput])
  @ValidateNested({ each: true })
  @Type(() => FamilyInvoiceStudentItemInput)
  @ArrayMinSize(1)
  students: FamilyInvoiceStudentItemInput[];
}

@InputType()
export class BulkCreateFamilyInvoicesInput {
  @Field(() => [BulkFamilyInvoiceItemInput])
  @ValidateNested({ each: true })
  @Type(() => BulkFamilyInvoiceItemInput)
  @ArrayMinSize(1)
  items: BulkFamilyInvoiceItemInput[];

  @Field()
  @IsDate()
  @Type(() => Date)
  dueDate: Date;

  @Field()
  @IsBoolean()
  @IsOptional()
  notify: boolean = false;
}
