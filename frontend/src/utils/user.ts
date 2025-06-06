export const getFullname = (user: UserModel) => {
  return `${user.firstname} ${user.lastname}`;
};
