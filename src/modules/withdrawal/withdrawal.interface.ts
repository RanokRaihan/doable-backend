import { WithdrawalMethodType } from "../../generated/prisma/enums";

interface IGetWithdrawalMethodsQuery {
  methodType?: WithdrawalMethodType;
  sortBy?: "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

interface ICreateWithdrawalMethodPayload {
  methodType: WithdrawalMethodType;
  accountNumber: string;
  accountName: string;
  bankName?: string;
  branchName?: string;
  routingNumber?: string;
  isDefault?: boolean;
}

interface IUpdateWithdrawalMethodPayload {
  methodType?: WithdrawalMethodType;
  accountNumber?: string;
  accountName?: string;
  bankName?: string;
  branchName?: string;
  routingNumber?: string;
}

interface ICreateWithdrawalRequestPayload {
  withdrawalMethodId: string;
  amount: number;
  note?: string;
}

interface IEditWithdrawalRequestPayload {
  amount?: number;
  note?: string;
}

export type {
  ICreateWithdrawalMethodPayload,
  ICreateWithdrawalRequestPayload,
  IEditWithdrawalRequestPayload,
  IGetWithdrawalMethodsQuery,
  IUpdateWithdrawalMethodPayload,
};
