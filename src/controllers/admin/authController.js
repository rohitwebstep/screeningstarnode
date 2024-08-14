const crypto = require('crypto');
const Admin = require('../../models/adminModel');
const Common = require('../../models/commonModel');

const isEmail = (username) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username);

const generateToken = () => crypto.randomBytes(32).toString('hex');
const getTokenExpiry = () => new Date(Date.now() + 3600000).toISOString();

exports.login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ status: false, message: "Username and password are required" });
  }

  if (!isEmail(username)) {
    return res.status(400).json({ status: false, message: "Invalid username format" });
  }

  try {
    const result = await Admin.findByEmailOrMobile(username);
    console.log("STEP 1");
    if (result.length === 0) {
      return res.status(404).json({ status: false, message: "User not registered" });
    }
    console.log("User Found.");

    const user = result[0];
    
    const passwordResult = await Admin.validatePassword(username, password);

    if (passwordResult.length === 0) {
      await Common.adminLoginLog(user.id, 'login', 'login', '0', 'Incorrect password');
      return res.status(401).json({ status: false, message: "Incorrect password" });
    }
    console.log("Password Matched 1");


    const token = generateToken();
    const tokenExpiry = getTokenExpiry();

    await Admin.updateToken(user.id, token, tokenExpiry);

    await Common.adminLoginLog(user.id, 'login', 'login', '1', null);
    res.json({ status: true, message: "Login successful", adminData: user, token });

  } catch (err) {
    console.error("Database error:", err);
    await Common.adminLoginLog(user.id, 'login', 'login', '0', 'Database error: '+err);
    res.status(500).json({ status: false, message: "Database error" });
  }
};
