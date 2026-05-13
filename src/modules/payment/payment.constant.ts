const paymentSortableFields = ["amount", "createdAt", "paidAt"];

const paymentMadeFilterableFields = ["method", "status"];
const paymentReceivedFilterableFields = ["method"];

const paymentSelectFieldsOwner = {
  id: true,
  transactionId: true,
  amount: true,
  method: true,
  status: true,
  cashStatus: true,
  paidAt: true,
  failedAt: true,
  refundedAt: true,
  posterConfirmedAt: true,
  createdAt: true,
};

const paymentSelectFieldsApplicant = {
  id: true,
  transactionId: true,
  taskId: true,
  amount: true,
  method: true,
  status: true,
  cashStatus: true,
  paidAt: true,
  failedAt: true,
  refundedAt: true,
  payeeConfirmedAt: true,
  createdAt: true,
};

export {
  paymentMadeFilterableFields,
  paymentReceivedFilterableFields,
  paymentSelectFieldsApplicant,
  paymentSelectFieldsOwner,
  paymentSortableFields,
};
