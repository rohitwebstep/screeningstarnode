const crypto = require("crypto");
const Branch = require("../../../models/customer/branch/branchModel");
const AdminCommon = require("../../../models/admin/commonModel");

const generatePassword = (companyName) => {
  const firstName = companyName.split(" ")[0];
  return `${firstName}@123`;
};

// Controller to list all branches
exports.isEmailUsed = (req, res) => {
  const { email, admin_id, _token } = req.query;

  let missingFields = [];
  if (!email || email === "") missingFields.push("Email");
  if (!admin_id || admin_id === "") missingFields.push("Admin ID");
  if (!_token || _token === "") missingFields.push("Token");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  // Verify admin token
  AdminCommon.isAdminTokenValid(_token, admin_id, (err, result) => {
    if (err) {
      console.error("Error checking token validity:", err);
      return res.status(500).json({ status: false, message: err.message });
    }

    if (!result.status) {
      return res.status(401).json({ status: false, message: result.message });
    }

    const newToken = result.newToken;

    Branch.isEmailUsed(email, (err, isUsed) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({
          status: false,
          message: err.message,
          token: newToken,
        });
      }

      if (isUsed) {
        return res.json({
          status: false,
          message: "Email is already in use",
          token: newToken,
        });
      } else {
        return res.json({
          status: true,
          message: "Email is available",
          token: newToken,
        });
      }
    });
  });
};

// Controller to list all branches
exports.list = (req, res) => {
  const { admin_id, _token } = req.query;

  let missingFields = [];
  if (!admin_id || admin_id === "") missingFields.push("Admin ID");
  if (!_token || _token === "") missingFields.push("Token");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  const action = JSON.stringify({ branch: "view" });
  AdminCommon.isAdminAuthorizedForAction(admin_id, action, (result) => {
    if (!result.status) {
      return res.status(403).json({
        status: false,
        message: result.message, // Return the message from the authorization function
      });
    }

    // Verify admin token
    AdminCommon.isAdminTokenValid(_token, admin_id, (err, result) => {
      if (err) {
        console.error("Error checking token validity:", err);
        return res.status(500).json({ status: false, message: err.message });
      }

      if (!result.status) {
        return res.status(401).json({ status: false, message: result.message });
      }

      const newToken = result.newToken;

      Branch.list((err, result) => {
        if (err) {
          console.error("Database error:", err);
          return res
            .status(500)
            .json({ status: false, message: err.message, token: newToken });
        }

        res.json({
          status: true,
          message: "branches fetched successfully",
          branches: result,
          totalResults: result.length,
          token: newToken,
        });
      });
    });
  });
};

// Controller to list perticular customer branches
exports.listByCustomerID = (req, res) => {
  const { admin_id, customer_id, _token } = req.query;

  let missingFields = [];
  if (!admin_id || admin_id === "") missingFields.push("Admin ID");
  if (!customer_id || customer_id === "") missingFields.push("Customer ID");
  if (!_token || _token === "") missingFields.push("Token");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  const action = JSON.stringify({ branch: "view" });
  AdminCommon.isAdminAuthorizedForAction(admin_id, action, (authResult) => {
    if (!authResult.status) {
      return res.status(403).json({
        status: false,
        message: authResult.message, // Return the message from the authorization function
      });
    }

    // Verify admin token
    AdminCommon.isAdminTokenValid(_token, admin_id, (err, tokenResult) => {
      if (err) {
        console.error("Error checking token validity:", err);
        return res.status(500).json({ status: false, message: err.message });
      }

      if (!tokenResult.status) {
        return res
          .status(401)
          .json({ status: false, message: tokenResult.message });
      }

      const newToken = tokenResult.newToken;

      // Call the model method with customer_id
      Branch.listByCustomerID(customer_id, (err, branches) => {
        if (err) {
          console.error("Database error:", err);
          return res
            .status(500)
            .json({ status: false, message: err.message, token: newToken });
        }

        res.json({
          status: true,
          message: "Branches fetched successfully",
          branches: branches,
          totalResults: branches.length,
          token: newToken,
        });
      });
    });
  });
};

// Controller to update a branch
exports.update = (req, res) => {
  const { id, name, email, admin_id, _token } = req.body;

  // Validate required fields
  const missingFields = [];
  if (!id || id === "") missingFields.push("Branch ID");
  if (!name || name === "") missingFields.push("Name");
  if (!email || email === "") missingFields.push("Email");
  if (!admin_id || admin_id === "") missingFields.push("Admin ID");
  if (!_token || _token === "") missingFields.push("Token");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  const action = JSON.stringify({ branch: "update" });

  // Check admin authorization
  AdminCommon.isAdminAuthorizedForAction(admin_id, action, (result) => {
    if (!result.status) {
      // Check the status returned by the authorization function
      return res.status(403).json({
        status: false,
        message: result.message, // Return the message from the authorization function
      });
    }

    // Validate admin token
    AdminCommon.isAdminTokenValid(
      _token,
      admin_id,
      (err, tokenValidationResult) => {
        if (err) {
          console.error("Token validation error:", err);
          return res.status(500).json({
            status: false,
            message: err.message,
          });
        }

        if (!tokenValidationResult.status) {
          return res.status(401).json({
            status: false,
            message: tokenValidationResult.message,
          });
        }

        const newToken = tokenValidationResult.newToken;
        const password = generatePassword(name);

        // Fetch the current branch
        Branch.getBranchById(id, (err, currentBranch) => {
          if (err) {
            console.error("Database error during branch retrieval:", err);
            return res.status(500).json({
              status: false,
              message: "Failed to retrieve Branch. Please try again.",
              token: newToken,
            });
          }

          if (!currentBranch) {
            return res.status(404).json({
              status: false,
              message: "Branch not found.",
              token: newToken,
            });
          }

          // Check if the branch is the head branch
          if (currentBranch.is_head == 1) {
            return res.status(403).json({
              status: false,
              message: "Cannot update the head branch.",
              token: newToken,
            });
          }

          const changes = {};
          if (currentBranch.name !== name) {
            changes.name = { old: currentBranch.name, new: name };
          }
          if (currentBranch.email !== email) {
            changes.email = {
              old: currentBranch.email,
              new: email,
            };
          }

          // Update the branch
          Branch.update(id, name, email, password, (err, result) => {
            if (err) {
              console.error("Database error during branch update:", err);
              AdminCommon.adminActivityLog(
                admin_id,
                "Branch",
                "Update",
                "0",
                JSON.stringify({ id, ...changes }),
                err.message,
                () => { }
              );
              return res.status(500).json({
                status: false,
                message: "Failed to update Branch. Please try again.",
                token: newToken,
              });
            }

            AdminCommon.adminActivityLog(
              admin_id,
              "Branch",
              "Update",
              "1",
              JSON.stringify({ id, ...changes }),
              null,
              () => { }
            );

            res.status(200).json({
              status: true,
              message: "Branch updated successfully.",
              branch: result,
              token: newToken,
            });
          });
        });
      }
    );
  });
};

exports.inactive = (req, res) => {
  const { id, admin_id, _token } = req.body;

  // Validate required fields
  const missingFields = [];
  if (!id || id === "") missingFields.push("Branch ID");
  if (!admin_id || admin_id === "") missingFields.push("Admin ID");
  if (!_token || _token === "") missingFields.push("Token");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  const action = JSON.stringify({ branch: "status" });

  // Check admin authorization
  AdminCommon.isAdminAuthorizedForAction(admin_id, action, (result) => {
    if (!result.status) {
      // Check the status returned by the authorization function
      return res.status(403).json({
        status: false,
        message: result.message, // Return the message from the authorization function
      });
    }

    // Validate admin token
    AdminCommon.isAdminTokenValid(
      _token,
      admin_id,
      (err, tokenValidationResult) => {
        if (err) {
          console.error("Token validation error:", err);
          return res.status(500).json({
            status: false,
            message: err.message,
          });
        }

        if (!tokenValidationResult.status) {
          return res.status(401).json({
            status: false,
            message: tokenValidationResult.message,
          });
        }

        const newToken = tokenValidationResult.newToken;

        // Fetch the current branch
        Branch.getBranchById(id, (err, currentBranch) => {
          if (err) {
            console.error("Database error during branch retrieval:", err);
            return res.status(500).json({
              status: false,
              message: "Failed to retrieve Branch. Please try again.",
              token: newToken,
            });
          }

          if (!currentBranch) {
            return res.status(404).json({
              status: false,
              message: "Branch not found.",
              token: newToken,
            });
          }

          // Check if the branch is the head branch
          if (currentBranch.is_head == 1) {
            return res.status(403).json({
              status: false,
              message: "Cannot update the head branch.",
              token: newToken,
            });
          }

          const changes = {};
          if (currentBranch.status !== 0) {
            changes.status = { old: currentBranch.status, new: 0 };
          }

          // Update the branch
          Branch.inactive(id, (err, result) => {
            if (err) {
              console.error("Database error during branch status update:", err);
              AdminCommon.adminActivityLog(
                admin_id,
                "Branch",
                "status",
                "0",
                JSON.stringify({ id, ...changes }),
                err.message,
                () => { }
              );
              return res.status(500).json({
                status: false,
                message: "Failed to update Branch status. Please try again.",
                token: newToken,
              });
            }

            AdminCommon.adminActivityLog(
              admin_id,
              "Branch",
              "status",
              "1",
              JSON.stringify({ id, ...changes }),
              null,
              () => { }
            );

            res.status(200).json({
              status: true,
              message: "Branch status updated successfully.",
              branch: result,
              token: newToken,
            });
          });
        });
      }
    );
  });
};

exports.delete = (req, res) => {
  const { id, admin_id, _token } = req.query;

  // Validate required fields
  const missingFields = [];
  if (!id || id === "") missingFields.push("Branch ID");
  if (!admin_id || admin_id === "") missingFields.push("Admin ID");
  if (!_token || _token === "") missingFields.push("Token");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  const action = JSON.stringify({ branch: "delete" });

  // Check admin authorization
  AdminCommon.isAdminAuthorizedForAction(admin_id, action, (result) => {
    if (!result.status) {
      return res.status(403).json({
        status: false,
        message: result.message,
      });
    }

    // Validate admin token
    AdminCommon.isAdminTokenValid(
      _token,
      admin_id,
      (err, tokenValidationResult) => {
        if (err) {
          console.error("Token validation error:", err);
          return res.status(500).json({
            status: false,
            message: err.message,
          });
        }

        if (!tokenValidationResult.status) {
          return res.status(401).json({
            status: false,
            message: tokenValidationResult.message,
          });
        }

        const newToken = tokenValidationResult.newToken;

        // Fetch the current branch
        Branch.getBranchById(id, (err, currentBranch) => {
          if (err) {
            console.error("Database error during branch retrieval:", err);
            return res.status(500).json({
              status: false,
              message: "Failed to retrieve branch. Please try again.",
              token: newToken,
            });
          }

          if (!currentBranch) {
            return res.status(404).json({
              status: false,
              message: "Branch not found.",
              token: newToken,
            });
          }

          // Check if the branch is the head branch
          if (currentBranch.is_head == 1) {
            return res.status(403).json({
              status: false,
              message: "Cannot delete the head branch.",
              token: newToken,
            });
          }

          // Delete the branch
          Branch.delete(id, (err, result) => {
            if (err) {
              console.error("Database error during branch deletion:", err);
              AdminCommon.adminActivityLog(
                admin_id,
                "Branch",
                "Delete",
                "0",
                JSON.stringify({ id }),
                err.message,
                () => { }
              );
              return res.status(500).json({
                status: false,
                message: "Failed to delete branch. Please try again.",
                token: newToken,
              });
            }

            AdminCommon.adminActivityLog(
              admin_id,
              "Branch",
              "Delete",
              "1",
              JSON.stringify({ id }),
              null,
              () => { }
            );

            res.status(200).json({
              status: true,
              message: "Branch deleted successfully.",
              result,
              token: newToken,
            });
          });
        });
      }
    );
  });
};
