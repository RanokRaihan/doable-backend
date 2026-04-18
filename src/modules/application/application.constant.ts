const applicationSensitiveFields = {
  // Add any sensitive fields that should be omitted if needed in the future
};

const ApplicationSearchFields = [
  "message",
  "task.title",
  "task.description",
  "applicant.name",
];
const applicationFilterableFields = ["status"];
// Fields that support multiple values (comma-separated)
const applicationMultiValueFilterFields = ["status"];
const applicationSortableFields = [
  "createdAt",
  "updatedAt",
  "proposedCompensation",
  "status",
];

export {
  applicationFilterableFields,
  applicationMultiValueFilterFields,
  ApplicationSearchFields,
  applicationSensitiveFields,
  applicationSortableFields,
};
