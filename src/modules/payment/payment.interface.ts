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

export interface IpnQuery {
  amount: number;
  bank_tran_id: string;
  status: string;
  card_brand?: string;
  card_issuer?: string;
  card_issuer_country?: string;
  card_issuer_country_code?: string;
  card_no?: string;
  card_type?: string;
  currency?: string;
  store_amount?: string;
  store_id?: string;
  tran_date?: string;
  tran_id?: string;
  val_id: string;
  verify_sign?: string;
  verify_key?: string;
}
