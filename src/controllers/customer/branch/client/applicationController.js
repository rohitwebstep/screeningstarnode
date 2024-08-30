const Branch = require("../../../../models/clientApplication/branch/branchModel");
const Client = require("../../../../models/clientApplication/branch/clientApplicationModel");
const BranchCommon = require("../../../../models/clientApplication/branch/commonModel");
const Common = require("../../../../models/commonModel");
const { sendEmail } = require("../../../../mailer/clientApplicationMailer");

exports.create = (req, res) => {
  const {
    branch_id,
    _token,
    name,
    attach_documents,
    employee_id,
    spoc,
    location,
    batch_number,
    sub_client,
    photo,
  } = req.body;

  // Define required fields
  const requiredFields = {
    branch_id,
    _token,
    name,
    attach_documents,
    employee_id,
    spoc,
    location,
    batch_number,
    sub_client,
    photo,
  };

  // Check for missing fields
  const missingFields = Object.keys(requiredFields)
    .filter((field) => !requiredFields[field])
    .map((field) => field.replace(/_/g, " "));

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  const action = JSON.stringify({ client_application: "create" });
  BranchCommon.isBranchAuthorizedForAction(branch_id, action, (result) => {
    if (!result.status) {
      return res.status(403).json({
        status: false,
        message: result.message, // Return the message from the authorization function
      });
    }

    // Verify branch token
    BranchCommon.isBranchTokenValid(_token, branch_id, (err, result) => {
      if (err) {
        console.error("Error checking token validity:", err);
        return res.status(500).json({ status: false, message: err.message });
      }

      if (!result.status) {
        return res.status(401).json({ status: false, message: result.message });
      }

      const newToken = result.newToken;

      // Check if client_unique_id already exists
      Client.checkUniqueEmpId(employee_id, (err, exists) => {
        if (err) {
          console.error("Error checking unique ID:", err);
          return res
            .status(500)
            .json({ status: false, message: "Internal server error" });
        }

        if (exists) {
          return res.status(400).json({
            status: false,
            message: `Client Employee ID '${employee_id}' already exists.`,
          });
        }

        // Create Client Application
        Client.create(
          {
            name,
            attach_documents,
            employee_id,
            spoc,
            location,
            batch_number,
            sub_client,
            photo,
            branch_id,
          },
          (err, result) => {
            if (err) {
              console.error(
                "Database error during client application creation:",
                err
              );
              Common.branchActivityLog(
                branch_id,
                "Client Application",
                "Create",
                "0",
                null,
                err.message,
                () => {}
              );
              return res.status(500).json({
                status: false,
                message:
                  "Failed to create client application. Please try again.",
              });
            }

            Common.branchActivityLog(
              branch_id,
              "Client Application",
              "Create",
              "1",
              `{id: ${result.insertId}}`,
              null,
              () => {}
            );

            res.status(201).json({
              status: true,
              message: "Client application created successfully.",
              package: result,
              token: newToken,
            });
          }
        );
      });
    });
  });
};

// Controller to list all clientApplications
exports.list = (req, res) => {
  const { branch_id, _token } = req.query;

  let missingFields = [];
  if (!branch_id) missingFields.push("Branch ID");
  if (!_token) missingFields.push("Token");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  const action = JSON.stringify({ client_application: "view" });
  BranchCommon.isBranchAuthorizedForAction(branch_id, action, (result) => {
    if (!result.status) {
      return res.status(403).json({
        status: false,
        message: result.message, // Return the message from the authorization function
      });
    }

    // Verify branch token
    BranchCommon.isBranchTokenValid(_token, branch_id, (err, result) => {
      if (err) {
        console.error("Error checking token validity:", err);
        return res.status(500).json({ status: false, message: err.message });
      }

      if (!result.status) {
        return res.status(401).json({ status: false, message: result.message });
      }

      const newToken = result.newToken;

      Client.list((err, result) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ status: false, message: err.message });
        }

        res.json({
          status: true,
          message: "Branches fetched successfully",
          clientApplications: result,
          totalResults: result.length,
          token: newToken,
        });
      });
    });
  });
};

exports.delete = (req, res) => {
  const { id, branch_id, _token } = req.query;

  // Validate required fields
  const missingFields = [];
  if (!id) missingFields.push("Branch ID");
  if (!branch_id) missingFields.push("Branch ID");
  if (!_token) missingFields.push("Token");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  const action = JSON.stringify({ client_application: "delete" });

  // Check branch authorization
  BranchCommon.isBranchAuthorizedForAction(branch_id, action, (result) => {
    if (!result.status) {
      // Check the status returned by the authorization function
      return res.status(403).json({
        status: false,
        message: result.message, // Return the message from the authorization function
      });
    }

    // Validate branch token
    BranchCommon.isBranchTokenValid(
      _token,
      branch_id,
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

        // Fetch the current clientApplication
        Client.getClientApplicationById(id, (err, currentBranch) => {
          if (err) {
            console.error(
              "Database error during clientApplication retrieval:",
              err
            );
            return res.status(500).json({
              status: false,
              message: "Failed to retrieve Client. Please try again.",
            });
          }

          if (!currentBranch) {
            return res.status(404).json({
              status: false,
              message: "Branch not found.",
            });
          }

          // Delete the clientApplication
          Client.delete(id, (err, result) => {
            if (err) {
              console.error(
                "Database error during clientApplication deletion:",
                err
              );
              BranchCommon.branchActivityLog(
                branch_id,
                "Branch",
                "Delete",
                "0",
                JSON.stringify({ id }),
                err.message,
                () => {}
              );
              return res.status(500).json({
                status: false,
                message: "Failed to delete Client. Please try again.",
              });
            }

            BranchCommon.branchActivityLog(
              branch_id,
              "Branch",
              "Delete",
              "1",
              JSON.stringify({ id }),
              null,
              () => {}
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
