type WithdrawalMethodType = "BANK" | "MOBILE_BANKING";

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
  isDefault?: boolean;
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
  IUpdateWithdrawalMethodPayload,
};
