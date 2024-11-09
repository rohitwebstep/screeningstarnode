const BillingEscalation = require("../../models/admin/billingEscalationModel");
const Common = require("../../models/admin/commonModel");

// Controller to create a new billing escalation
exports.create = (req, res) => {
  const { name, designation, phone, email, admin_id, _token } = req.body;

  let missingFields = [];
  if (!name || name === "") missingFields.push("Name");
  if (!designation || designation === "") missingFields.push("Designation");
  if (!admin_id || admin_id === "") missingFields.push("Admin ID");
  if (!_token || _token === "") missingFields.push("Token");
  if (!phone || phone === "") missingFields.push("Phone");
  if (!email || email === "") missingFields.push("Email");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  const action = JSON.stringify({ billing_escalation: "create" });
  Common.isAdminAuthorizedForAction(admin_id, action, (result) => {
    if (!result.status) {
      // Check the status returned by the authorization function
      return res.status(403).json({
        status: false,
        message: result.message, // Return the message from the authorization function
      });
    }

    Common.isAdminTokenValid(_token, admin_id, (err, result) => {
      if (err) {
        console.error("Error checking token validity:", err);
        return res.status(500).json(err);
      }

      if (!result.status) {
        return res.status(401).json({ status: false, message: result.message });
      }

      BillingEscalation.checkEmailExists(email, (err, emailExists) => {
        if (err) {
          console.error("Error checking email existence:", err);
          return res
            .status(500)
            .json({ status: false, message: "Internal server error" });
        }

        if (emailExists) {
          return res.status(401).json({
            status: false,
            message: "Email already used for another billing escalation",
          });
        }

        const newToken = result.newToken;

        BillingEscalation.create(
          name,
          designation,
          phone,
          email,
          admin_id,
          (err, result) => {
            if (err) {
              console.error("Database error:", err);
              Common.adminActivityLog(
                admin_id,
                "Billing escalation",
                "Create",
                "0",
                null,
                err,
                () => {}
              );
              return res
                .status(500)
                .json({ status: false, message: err.message, token: newToken });
            }

            Common.adminActivityLog(
              admin_id,
              "Billing escalation",
              "Create",
              "1",
              `{id: ${result.insertId}}`,
              null,
              () => {}
            );

            res.json({
              status: true,
              message: "Billing escalation created successfully",
              billing_escalation: result,
              token: newToken,
            });
          }
        );
      });
    });
  });
};

// Controller to list all Billing Escalations
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
  const action = JSON.stringify({ billing_escalation: "view" });
  Common.isAdminAuthorizedForAction(admin_id, action, (result) => {
    if (!result.status) {
      return res.status(403).json({
        status: false,
        message: result.message, // Return the message from the authorization function
      });
    }
    Common.isAdminTokenValid(_token, admin_id, (err, result) => {
      if (err) {
        console.error("Error checking token validity:", err);
        return res.status(500).json(err);
      }

      if (!result.status) {
        return res.status(401).json({ status: false, message: result.message });
      }

      const newToken = result.newToken;

      BillingEscalation.list((err, result) => {
        if (err) {
          console.error("Database error:", err);
          return res
            .status(500)
            .json({ status: false, message: err.message, token: newToken });
        }

        res.json({
          status: true,
          message: "Billing Escalations fetched successfully",
          billing_escalations: result,
          totalResults: result.length,
          token: newToken,
        });
      });
    });
  });
};

exports.getBillingEscalationById = (req, res) => {
  const { id, admin_id, _token } = req.query;
  let missingFields = [];
  if (!id || id === "") missingFields.push("Billing escalation ID");
  if (!admin_id || admin_id === "") missingFields.push("Admin ID");
  if (!_token || _token === "") missingFields.push("Token");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }
  const action = JSON.stringify({ billing_escalation: "view" });
  Common.isAdminAuthorizedForAction(admin_id, action, (result) => {
    if (!result.status) {
      return res.status(403).json({
        status: false,
        message: result.message, // Return the message from the authorization function
      });
    }
    Common.isAdminTokenValid(_token, admin_id, (err, result) => {
      if (err) {
        console.error("Error checking token validity:", err);
        return res.status(500).json(err);
      }

      if (!result.status) {
        return res.status(401).json({ status: false, message: result.message });
      }

      const newToken = result.newToken;

      BillingEscalation.getBillingEscalationById(
        id,
        (err, currentBillingEscalation) => {
          if (err) {
            console.error("Error fetching billing escalation data:", err);
            return res.status(500).json({
              status: false,
              message: err.message,
              token: newToken,
            });
          }

          if (!currentBillingEscalation) {
            return res.status(404).json({
              status: false,
              message: "Billing escalation not found",
              token: newToken,
            });
          }

          res.json({
            status: true,
            message: "Billing escalation retrieved successfully",
            billing_escalation: currentBillingEscalation,
            token: newToken,
          });
        }
      );
    });
  });
};

exports.delete = (req, res) => {
  const { id, admin_id, _token } = req.query;

  // Validate required fields
  const missingFields = [];
  if (!id || id === "") missingFields.push("Billing escalation ID");
  if (!admin_id || admin_id === "") missingFields.push("Admin ID");
  if (!_token || _token === "") missingFields.push("Token");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  const action = JSON.stringify({ billing_escalation: "delete" });

  // Check admin authorization
  Common.isAdminAuthorizedForAction(admin_id, action, (result) => {
    if (!result.status) {
      // Check the status returned by the authorization function
      return res.status(403).json({
        status: false,
        message: result.message, // Return the message from the authorization function
      });
    }

    // Validate admin token
    Common.isAdminTokenValid(_token, admin_id, (err, tokenValidationResult) => {
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

      // Fetch the current package
      BillingEscalation.getBillingEscalationById(
        id,
        (err, currentBillingEscalationSpoc) => {
          if (err) {
            console.error(
              "Database error during Billing Escalation retrieval:",
              err
            );
            return res.status(500).json({
              status: false,
              message:
                "Failed to retrieve Billing Escalation. Please try again.",
              token: newToken,
            });
          }

          if (!currentBillingEscalationSpoc) {
            return res.status(404).json({
              status: false,
              message: "Billing Escalation not found.",
              token: newToken,
            });
          }

          // Delete the package
          BillingSpoc.delete(id, (err, result) => {
            if (err) {
              console.error(
                "Database error during Billing Escalation deletion:",
                err
              );
              Common.adminActivityLog(
                admin_id,
                "Billing Escalation",
                "Delete",
                "0",
                JSON.stringify({ id }),
                err,
                () => {}
              );
              return res.status(500).json({
                status: false,
                message:
                  "Failed to delete Billing Escalation. Please try again.",
                token: newToken,
              });
            }

            Common.adminActivityLog(
              admin_id,
              "Billing Escalation",
              "Delete",
              "1",
              JSON.stringify({ id }),
              null,
              () => {}
            );

            res.status(200).json({
              status: true,
              message: "Billing Escalation deleted successfully.",
              result,
              token: newToken,
            });
          });
        }
      );
    });
  });
};

// Controller to delete a billing escalation
exports.delete = (req, res) => {
  const { id, admin_id, _token } = req.query;

  let missingFields = [];
  if (!id || id === "") missingFields.push("Billing escalation ID");
  if (!admin_id || admin_id === "") missingFields.push("Admin ID");
  if (!_token || _token === "") missingFields.push("Token");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }
  const action = JSON.stringify({ billing_escalation: "delete" });
  Common.isAdminAuthorizedForAction(admin_id, action, (result) => {
    if (!result.status) {
      // Check the status returned by the authorization function
      return res.status(403).json({
        status: false,
        message: result.message, // Return the message from the authorization function
      });
    }
    Common.isAdminTokenValid(_token, admin_id, (err, result) => {
      if (err) {
        console.error("Error checking token validity:", err);
        return res.status(500).json(err);
      }

      if (!result.status) {
        return res.status(401).json({ status: false, message: result.message });
      }

      const newToken = result.newToken;

      BillingEscalation.getBillingEscalationById(
        id,
        (err, currentBillingEscalation) => {
          if (err) {
            console.error("Error fetching billing escalation data:", err);
            return res.status(500).json({
              status: false,
              message: err.message,
              token: newToken,
            });
          }

          BillingEscalation.delete(id, (err, result) => {
            if (err) {
              console.error("Database error:", err);
              Common.adminActivityLog(
                admin_id,
                "Billing escalation",
                "Delete",
                "0",
                JSON.stringify({ id, ...currentBillingEscalation }),
                err,
                () => {}
              );
              return res
                .status(500)
                .json({ status: false, message: err.message, token: newToken });
            }

            Common.adminActivityLog(
              admin_id,
              "Billing escalation",
              "Delete",
              "1",
              JSON.stringify(currentBillingEscalation),
              null,
              () => {}
            );

            res.json({
              status: true,
              message: "Billing escalation deleted successfully",
              token: newToken,
            });
          });
        }
      );
    });
  });
};
