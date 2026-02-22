const taskSensitiveFieldsPublic = {
  isDeleted: true,
  deletedAt: true,
  deletedBy: true,
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

const TaskSearchFields = ["title", "description", "location"];
const taskFilterableFields = ["category", "status", "priority"];
const taskSortableFields = ["createdAt", "updatedAt", "title"];

export {
  taskFilterableFields,
  TaskSearchFields,
  taskSensitiveFieldsApplicant,
  taskSensitiveFieldsOwner,
  taskSensitiveFieldsPublic,
  taskSortableFields,
};
