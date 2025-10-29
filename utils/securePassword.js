const bcrypt = require("bcrypt");

const securePassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};
module.exports = { securePassword };
