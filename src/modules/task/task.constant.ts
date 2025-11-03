const taskSensitiveFieldsPublic = {
  isDeleted: true,
  deletedAt: true,
  deletedBy: true,
  postedById: true,
  approvedApplicationId: true,
  agreedCompensation: true,
};

const taskSensitiveFieldsOwner = {
  isDeleted: true,
  deletedAt: true,
  deletedBy: true,
};

const taskSensitiveFieldsApplicant = {
  isDeleted: true,
  deletedAt: true,
  deletedBy: true,
  approvedApplicationId: true,
  agreedCompensation: true,
};

export {
  taskSensitiveFieldsApplicant,
  taskSensitiveFieldsOwner,
  taskSensitiveFieldsPublic,
};
