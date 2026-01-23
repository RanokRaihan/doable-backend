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

export { updateableUserFields, userSenitiveFields };
