const db = require('../config/db');

const Admin = {
  findByEmailOrMobile: (username, callback) => {
    const sql = `
      SELECT * FROM \`admins\`
      WHERE \`email\` = ? OR \`mobile\` = ?
    `;
    db.query(sql, [username, username], callback);
  },

  validatePassword: (username, password, callback) => {
    const sql = `
      SELECT * FROM \`admins\`
      WHERE (\`email\` = ? OR \`mobile\` = ?)
      AND \`password\` = MD5(?)
    `;
    db.query(sql, [username, username, password], callback);
  },
};

module.exports = Admin;
