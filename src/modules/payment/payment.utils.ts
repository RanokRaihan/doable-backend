import { WalletTransactionCategory } from "@prisma/client";

// Helper: Generate default description from category
export function getDefaultDescription(
  category: WalletTransactionCategory
): string {
  const descriptions: Record<WalletTransactionCategory, string> = {
    TASK_PAYMENT: "Payment received for completing a task",
    DIRECT_COMMISSION_DEDUCTION: "Platform commission deducted",
    DUE_COMMISSION_DEDUCTION: "Pending commission paid",
    BONUS: "Bonus received",
    REFUND: "Refund processed",
    WITHDRAWAL: "Withdrawal to bank account",
  };

  return descriptions[category];
}

// Helper: Get human-readable title from category
export function getTransactionTitle(
  category: WalletTransactionCategory
): string {
  return category
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}
