import { CashStatus, PaymentMethod } from "@prisma/client";

export interface PaymentPayload {
  transactionId: string;
  taskId: string;
  payerId: string;
  payeeId: string;
  amount: number;
  method: PaymentMethod;
  cashStatus: CashStatus;
  commissionRate: number;
  commissionAmount: number;
  posterConfirmedAt?: Date;
  paidAt?: Date;
}
