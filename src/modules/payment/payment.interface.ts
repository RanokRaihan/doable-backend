import { CashStatus, PaymentMethod } from "../../generated/prisma/enums";

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
  tran_id: string;
  val_id: string;
  amount: number;
  card_type?: string;
  store_amount?: number;
  card_no?: string;
  bank_tran_id?: string;
  status?: string;
  tran_date?: string;
  error?: string;
  currency?: string;
  card_issuer?: string;
  card_brand?: string;
  card_sub_brand?: string;
  card_issuer_country?: string;
  card_issuer_country_code?: string;
  store_id?: string;
  verify_sign?: string;
  verify_key?: string;
  verify_sign_sha2?: string;
  currency_type?: string;
  currency_amount?: string;
  currency_rate?: string;
  base_fair?: string;
  value_a?: string;
  value_b?: string;
  value_c?: string;
  value_d?: string;
  subscription_id?: string;
  risk_level?: string;
  risk_title?: string;
}
