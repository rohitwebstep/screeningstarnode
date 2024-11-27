const Admin = require("../../models/admin/adminModel");
const Common = require("../../models/admin/commonModel");
const EscalationManager = require("../../models/admin/escalationManagerModel");
const AuthorizedDetail = require("../../models/admin/authorizedDetailModel");
const BillingEscalation = require("../../models/admin/billingEscalationModel");
const BillingSpoc = require("../../models/admin/billingSpocModel");
const ClientSpoc = require("../../models/admin/clientSpocModel");
const Service = require("../../models/admin/serviceModel");
const Package = require("../../models/admin/packageModel");

const { createMail } = require("../../mailer/admin/createMail");

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

exports.addClientListings = (req, res) => {
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
          Admin.list((err, result) => {
            if (err) return resolve([]);
            resolve(result);
          })
        ),
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
        new Promise((resolve) =>
          Service.servicesWithGroup((err, result) => {
            if (err) return resolve([]);
            resolve(result);
          })
        ),
        new Promise((resolve) =>
          Package.list((err, result) => {
            if (err) return resolve([]);
            resolve(result);
          })
        ),
      ];

      Promise.all(dataPromises).then(
        ([
          admins,
          authorizedDetails,
          billingEscalations,
          billingSpocs,
          clientSpocs,
          escalationManagers,
          servicesWithGroup,
          packages,
        ]) => {
          res.json({
            status: true,
            message: "Billing SPOCs fetched successfully",
            data: {
              admins,
              authorized_details: authorizedDetails,
              billing_escalations: billingEscalations,
              billing_spocs: billingSpocs,
              client_spocs: clientSpocs,
              escalation_managers: escalationManagers,
              services_with_Group: servicesWithGroup,
              packages,
            },
            totalResults: {
              admins: admins.length,
              billing_escalations: billingEscalations.length,
              billing_spocs: billingSpocs.length,
              client_spocs: clientSpocs.length,
              escalation_managers: escalationManagers.length,
              services_with_Group: servicesWithGroup.length,
              packages: packages.length,
            },
            token: newToken,
          });
        }
      );
    });
  });
};

exports.create = (req, res) => {
  const {
    admin_id,
    _token,
    role,
    name,
    email,
    mobile,
    password,
    designation,
    employee_id,
    date_of_joining,
    send_mail,
  } = req.body;

  // Define required fields for creating a new admin
  const requiredFields = {
    admin_id,
    _token,
    role,
    name,
    email,
    mobile,
    password,
    designation,
    employee_id,
    date_of_joining,
  };

  // Check for missing fields
  const missingFields = Object.keys(requiredFields)
    .filter((field) => !requiredFields[field] || requiredFields[field] === "")
    .map((field) => field.replace(/_/g, " "));

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }
  // Define the action for admin authorization check
  const action = JSON.stringify({ admin: "create" });
  // Check if the admin is authorized to perform the action
  Common.isAdminAuthorizedForAction(admin_id, action, (authResult) => {
    if (!authResult.status) {
      return res.status(403).json({
        status: false,
        message: authResult.message, // Return the message from the authorization check
      });
    }

    // Validate the admin's token
    Common.isAdminTokenValid(_token, admin_id, (err, tokenResult) => {
      if (err) {
        console.error("Error checking token validity:", err);
        return res
          .status(500)
          .json({ status: false, message: "Internal server error" });
      }

      if (!tokenResult.status) {
        return res
          .status(401)
          .json({ status: false, message: tokenResult.message });
      }

      const newToken = tokenResult.newToken;

      Admin.create(
        {
          name,
          email,
          employee_id,
          mobile,
          date_of_joining,
          role: role.toLowerCase(),
          password,
          designation,
        },
        (err, result) => {
          if (err) {
            console.error("Database error during admin creation:", err);
            Common.adminActivityLog(
              admin_id,
              "Admin",
              "Create",
              "0",
              null,
              err,
              () => {}
            );
            return res.status(500).json({
              status: false,
              message: "Failed to create Admin. Please try again later.",
              token: newToken,
              error: err,
            });
          }

          // Log the successful creation of the Admin
          Common.adminActivityLog(
            admin_id,
            "Admin",
            "Create",
            "1",
            `{id: ${result.insertId}}`,
            null,
            () => {}
          );

          // If email sending is not required
          if (send_mail == 0) {
            return res.status(201).json({
              status: true,
              message: "Admin created successfully.",
              token: newToken,
            });
          }

          const newAttachedDocsString = "";
          // Prepare the recipient and CC list for the email
          const toArr = [{ name, email }];

          // Send an email notification
          createMail(
            "Admin",
            "create",
            name,
            mobile,
            email,
            date_of_joining,
            role.toUpperCase(),
            newAttachedDocsString,
            designation,
            password,
            toArr
          )
            .then(() => {
              return res.status(201).json({
                status: true,
                message: "Admin created successfully and email sent.",
                token: newToken,
              });
            })
            .catch((emailError) => {
              console.error("Error sending email:", emailError);
              return res.status(201).json({
                status: true,
                message:
                  "Admin created successfully, but failed to send email.",
                client: result,
                token: newToken,
              });
            });
        }
      );
    });
  });
};
