import { registerEnumType } from "@nestjs/graphql";

export enum ChargeStartMonth {
  CURRENT_MONTH = "CURRENT_MONTH",
  NEXT_MONTH = "NEXT_MONTH",
  JANUARY = "JANUARY",
  FEBRUARY = "FEBRUARY",
  MARCH = "MARCH",
  APRIL = "APRIL",
  MAY = "MAY",
  JUNE = "JUNE",
  JULY = "JULY",
  AUGUST = "AUGUST",
  SEPTEMBER = "SEPTEMBER",
  OCTOBER = "OCTOBER",
  NOVEMBER = "NOVEMBER",
  DECEMBER = "DECEMBER",
}

registerEnumType(ChargeStartMonth, {
  name: "ChargeStartMonth",
  description: "Mes desde el cual empezar a cobrar",
});

/** Mapeo de ChargeStartMonth a número de mes (1-12) */
export const MONTH_MAPPING: Partial<Record<ChargeStartMonth, number>> = {
  [ChargeStartMonth.JANUARY]: 1,
  [ChargeStartMonth.FEBRUARY]: 2,
  [ChargeStartMonth.MARCH]: 3,
  [ChargeStartMonth.APRIL]: 4,
  [ChargeStartMonth.MAY]: 5,
  [ChargeStartMonth.JUNE]: 6,
  [ChargeStartMonth.JULY]: 7,
  [ChargeStartMonth.AUGUST]: 8,
  [ChargeStartMonth.SEPTEMBER]: 9,
  [ChargeStartMonth.OCTOBER]: 10,
  [ChargeStartMonth.NOVEMBER]: 11,
  [ChargeStartMonth.DECEMBER]: 12,
};
