const Package = require("../../models/admin/packageModel");
const Common = require("../../models/admin/commonModel");

// Function to validate admin and token
const validateAdminAndToken = async (admin_id, _token) => {
  if (!admin_id || !_token) {
    return {
      success: false,
      status: 400,
      message: `Missing required fields: ${!admin_id ? "Admin ID" : ""} ${
        !_token ? "Token" : ""
      }`,
    };
  }

  try {
    const result = await Common.isAdminTokenValid(_token, admin_id);
    if (!result.status) {
      return { success: false, status: 401, message: result.message };
    }
    return { success: true, newToken: result.newToken };
  } catch (err) {
    console.error("Error checking token validity:", err);
    return { success: false, status: 500, message: err.message };
  }
};

// Function to authorize admin actions
const authorizeAdminAction = async (admin_id, action) => {
  if (!admin_id) {
    return {
      success: false,
      status: 400,
      message: "Admin ID is required",
    };
  }

  try {
    const isAuthorized = await Common.isAdminAuthorizedForAction(
      admin_id,
      JSON.stringify({ package: action })
    );
    if (!isAuthorized) {
      return {
        success: false,
        status: 401,
        message: "Admin isn't authorized for the action.",
      };
    }
    return { success: true };
  } catch (err) {
    console.error(`Error authorizing admin for action ${action}:`, err);
    return { success: false, status: 500, message: err.message };
  }
};

// Controller to create a new package
exports.create = async (req, res) => {
  const { title, description, admin_id, _token } = req.body;
  if (!title || !description || !admin_id || !_token) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${!title ? "Title" : ""} ${
        !description ? "Description" : ""
      } ${!admin_id ? "Admin ID" : ""} ${!_token ? "Token" : ""}`,
    });
  }

  const tokenValidation = await validateAdminAndToken(admin_id, _token);
  if (!tokenValidation.success) {
    return res.status(tokenValidation.status).json({
      status: false,
      message: tokenValidation.message,
    });
  }

  const authorizationResult = await authorizeAdminAction(admin_id, "create");
  if (!authorizationResult.success) {
    return res.status(authorizationResult.status).json({
      status: false,
      message: authorizationResult.message,
    });
  }

  try {
    const result = await Package.create(title, description, admin_id);
    await Common.adminActivityLog(
      admin_id,
      "Package",
      "Create",
      "1",
      `{id: ${result.insertId}}`,
      null
    );
    res.json({
      status: true,
      message: "Package created successfully",
      package: result,
      token: tokenValidation.newToken,
    });
  } catch (err) {
    console.error("Database error:", err);
    await Common.adminActivityLog(
      admin_id,
      "Package",
      "Create",
      "0",
      null,
      err.message
    );
    res.status(500).json({ status: false, message: err.message });
  }
};

// Controller to list all packages
exports.list = async (req, res) => {
  const { admin_id, _token } = req.query;
  const tokenValidation = await validateAdminAndToken(admin_id, _token);
  if (!tokenValidation.success) {
    return res.status(tokenValidation.status).json({
      status: false,
      message: tokenValidation.message,
    });
  }

  try {
    const result = await Package.list();
    res.json({
      status: true,
      message: "Packages fetched successfully",
      packages: result,
      totalResults: result.length,
      token: tokenValidation.newToken,
    });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ status: false, message: err.message });
  }
};

// Controller to get a package by ID
exports.getPackageById = async (req, res) => {
  const { id, admin_id, _token } = req.query;
  const tokenValidation = await validateAdminAndToken(admin_id, _token);
  if (!tokenValidation.success) {
    return res.status(tokenValidation.status).json({
      status: false,
      message: tokenValidation.message,
    });
  }

  if (!id) {
    return res
      .status(400)
      .json({ status: false, message: "Missing Package ID" });
  }

  try {
    const currentPackage = await Package.getPackageById(id);
    if (!currentPackage) {
      return res
        .status(404)
        .json({ status: false, message: "Package not found" });
    }
    res.json({
      status: true,
      message: "Package retrieved successfully",
      package: currentPackage,
      token: tokenValidation.newToken,
    });
  } catch (err) {
    console.error("Error fetching package data:", err);
    res.status(500).json({ status: false, message: err.message });
  }
};

// Controller to update a package
exports.update = async (req, res) => {
  const { id, title, description, admin_id, _token } = req.body;
  const tokenValidation = await validateAdminAndToken(admin_id, _token);
  if (!tokenValidation.success) {
    return res.status(tokenValidation.status).json({
      status: false,
      message: tokenValidation.message,
    });
  }

  if (!id || !title || !description || !admin_id) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${!id ? "Package ID" : ""} ${
        !title ? "Title" : ""
      } ${!description ? "Description" : ""} ${!admin_id ? "Admin ID" : ""}`,
    });
  }

  const authorizationResult = await authorizeAdminAction(admin_id, "update");
  if (!authorizationResult.success) {
    return res.status(authorizationResult.status).json({
      status: false,
      message: authorizationResult.message,
    });
  }

  try {
    const currentPackage = await Package.getPackageById(id);
    const changes = {};
    if (currentPackage.title !== title) {
      changes.title = { old: currentPackage.title, new: title };
    }
    if (currentPackage.description !== description) {
      changes.description = {
        old: currentPackage.description,
        new: description,
      };
    }

    await Package.update(id, title, description);
    await Common.adminActivityLog(
      admin_id,
      "Package",
      "Update",
      "1",
      JSON.stringify({ id, ...changes }),
      null
    );
    res.json({
      status: true,
      message: "Package updated successfully",
      package: await Package.getPackageById(id),
      token: tokenValidation.newToken,
    });
  } catch (err) {
    console.error("Database error:", err);
    await Common.adminActivityLog(
      admin_id,
      "Package",
      "Update",
      "0",
      JSON.stringify({ id, ...changes }),
      err.message
    );
    res.status(500).json({ status: false, message: err.message });
  }
};

// Controller to delete a package
exports.delete = async (req, res) => {
  const { id, admin_id, _token } = req.query;
  const tokenValidation = await validateAdminAndToken(admin_id, _token);
  if (!tokenValidation.success) {
    return res.status(tokenValidation.status).json({
      status: false,
      message: tokenValidation.message,
    });
  }

  if (!id || !admin_id) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${!id ? "Package ID" : ""} ${
        !admin_id ? "Admin ID" : ""
      }`,
    });
  }

  const authorizationResult = await authorizeAdminAction(admin_id, "delete");
  if (!authorizationResult.success) {
    return res.status(authorizationResult.status).json({
      status: false,
      message: authorizationResult.message,
    });
  }

  try {
    const currentPackage = await Package.getPackageById(id);
    if (!currentPackage) {
      return res
        .status(404)
        .json({ status: false, message: "Package not found" });
    }

    await Package.delete(id);
    await Common.adminActivityLog(
      admin_id,
      "Package",
      "Delete",
      "1",
      null,
      JSON.stringify(currentPackage)
    );
    res.json({
      status: true,
      message: "Package deleted successfully",
      token: tokenValidation.newToken,
    });
  } catch (err) {
    console.error("Database error:", err);
    await Common.adminActivityLog(
      admin_id,
      "Package",
      "Delete",
      "0",
      JSON.stringify({ id, ...currentPackage }),
      err.message
    );
    res.status(500).json({ status: false, message: err.message });
  }
};
