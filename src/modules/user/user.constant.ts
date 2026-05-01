const userSenitiveFields = {
  password: true,
  isDeleted: true,
  deletedAt: true,
  deletedBy: true,
};

const updateableUserFields = [
  "name",
  "dateOfBirth",
  "gender",
  "address",
  "phone",
  "bio",
];

export const PUBLIC_PROFILE_VISIBLE_TASK_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "COMPLETED",
] as const;

export const PUBLIC_PROFILE_REVIEWS_LIMIT = 10;
export const PUBLIC_PROFILE_TASKS_LIMIT = 10;

export { updateableUserFields, userSenitiveFields };
