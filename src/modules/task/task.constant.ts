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
const taskFilterableFields = ["category", "priority"];
// Fields that support multiple values (comma-separated)
const taskMultiValueFilterFields = ["category", "priority"];
const taskSortableFields = ["createdAt", "updatedAt", "title"];

export {
  taskFilterableFields,
  taskMultiValueFilterFields,
  TaskSearchFields,
  taskSensitiveFieldsApplicant,
  taskSensitiveFieldsOwner,
  taskSensitiveFieldsPublic,
  taskSortableFields,
};
