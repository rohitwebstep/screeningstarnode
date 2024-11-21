const Admin = require("../../models/admin/adminModel");
const Common = require("../../models/admin/commonModel");
const EscalationManager = require("../../models/admin/escalationManagerModel");
const AuthorizedDetail = require("../../models/admin/authorizedDetailModel");
const BillingEscalation = require("../../models/admin/billingEscalationModel");
const BillingSpoc = require("../../models/admin/billingSpocModel");
const ClientSpoc = require("../../models/admin/clientSpocModel");

// Controller to list all Billing SPOCs
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
  const action = JSON.stringify({ client_spoc: "view" });
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

      Admin.list((err, result) => {
        if (err) {
          console.error("Database error:", err);
          return res
            .status(500)
            .json({ status: false, message: err.message, token: newToken });
        }

        res.json({
          status: true,
          message: "Billing SPOCs fetched successfully",
          client_spocs: result,
          totalResults: result.length,
          token: newToken,
        });
      });
    });
  });
};

exports.spocsList = (req, res) => {
  const { admin_id, _token } = req.query;

  // Check for missing fields
  let missingFields = [];
  if (!admin_id || admin_id === "") missingFields.push("Admin ID");
  if (!_token || _token === "") missingFields.push("Token");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  const action = JSON.stringify({ client_spoc: "view" });

  Common.isAdminAuthorizedForAction(admin_id, action, (authResult) => {
    if (!authResult || !authResult.status) {
      return res.status(403).json({
        status: false,
        message: authResult ? authResult.message : "Authorization failed",
      });
    }

    Common.isAdminTokenValid(_token, admin_id, (err, tokenResult) => {
      if (err) {
        console.error("Error checking token validity:", err);
        return res.status(500).json({
          status: false,
          message: "Token validation failed",
        });
      }

      if (!tokenResult || !tokenResult.status) {
        return res.status(401).json({
          status: false,
          message: tokenResult ? tokenResult.message : "Invalid token",
        });
      }

      const newToken = tokenResult.newToken;

      // Fetch all required data
      const dataPromises = [
        new Promise((resolve) =>
          AuthorizedDetail.list((err, result) => {
            if (err) return resolve([]);
            resolve(result);
          })
        ),
        new Promise((resolve) =>
          BillingEscalation.list((err, result) => {
            if (err) return resolve([]);
            resolve(result);
          })
        ),
        new Promise((resolve) =>
          BillingSpoc.list((err, result) => {
            if (err) return resolve([]);
            resolve(result);
          })
        ),
        new Promise((resolve) =>
          ClientSpoc.list((err, result) => {
            if (err) return resolve([]);
            resolve(result);
          })
        ),
        new Promise((resolve) =>
          EscalationManager.list((err, result) => {
            if (err) return resolve([]);
            resolve(result);
          })
        ),
      ];

      Promise.all(dataPromises).then(
        ([
          authorizedDetails,
          billingEscalations,
          billingSpocs,
          clientSpocs,
          escalationManagers,
        ]) => {
          res.json({
            status: true,
            message: "Billing SPOCs fetched successfully",
            data: {
              authorized_details: authorizedDetails,
              billing_escalations: billingEscalations,
              billing_spocs: billingSpocs,
              client_spocs: clientSpocs,
              escalation_managers: escalationManagers,
            },
            totalResults: {
              authorized_details: authorizedDetails.length,
              billing_escalations: billingEscalations.length,
              billing_spocs: billingSpocs.length,
              client_spocs: clientSpocs.length,
              escalation_managers: escalationManagers.length,
            },
            token: newToken,
          });
        }
      );
    });
  });
};
