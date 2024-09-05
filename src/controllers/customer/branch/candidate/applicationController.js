const Candidate = require("../../../../models/customer/branch/candidateApplicationModel");
const BranchCommon = require("../../../../models/customer/branch/commonModel");

exports.create = (req, res) => {
  const {
    branch_id,
    _token,
    name,
    employee_id,
    mobile_number,
    email,
    services,
    package,
  } = req.body;

  // Define required fields
  const requiredFields = {
    branch_id,
    _token,
    name,
    employee_id,
    mobile_number,
    email,
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

  const action = JSON.stringify({ candidate_application: "create" });
  Candidate.isEmailUsedBefore(email, (err, emailUsed) => {
    if (err) {
      return res.status(500).json({
        status: false,
        message: "Internal Server Error: Unable to check email.",
        error: err.message,
      });
    }

    if (emailUsed) {
      return res.status(409).json({
        status: false,
        message: "Conflict: The email address has already been used.",
      });
    }
    BranchCommon.isBranchAuthorizedForAction(branch_id, action, (result) => {
      if (!result.status) {
        return res.status(403).json({
          status: false,
          message: result.message,
        });
      }

      BranchCommon.isBranchTokenValid(_token, branch_id, (err, result) => {
        if (err) {
          console.error("Error checking token validity:", err);
          return res.status(500).json({ status: false, message: err.message });
        }

        if (!result.status) {
          return res
            .status(401)
            .json({ status: false, message: result.message });
        }

        const newToken = result.newToken;

        Candidate.checkUniqueEmpId(employee_id, (err, exists) => {
          if (err) {
            console.error("Error checking unique ID:", err);
            return res
              .status(500)
              .json({ status: false, message: err.message, token: newToken });
          }

          if (exists) {
            return res.status(400).json({
              status: false,
              message: `Candidate Employee ID '${employee_id}' already exists.`,
              token: newToken,
            });
          }

          Candidate.create(
            {
              branch_id,
              name,
              employee_id,
              mobile_number,
              email,
              services,
              package,
            },
            (err, result) => {
              if (err) {
                console.error(
                  "Database error during candidate application creation:",
                  err
                );
                BranchCommon.branchActivityLog(
                  branch_id,
                  "Candidate Application",
                  "Create",
                  "0",
                  null,
                  err.message,
                  () => {}
                );
                return res.status(500).json({
                  status: false,
                  message: err.message,
                  token: newToken,
                });
              }

              BranchCommon.branchActivityLog(
                branch_id,
                "Candidate Application",
                "Create",
                "1",
                `{id: ${result.insertId}}`,
                null,
                () => {}
              );

              res.status(201).json({
                status: true,
                message: "Candidate application created successfully.",
                package: result,
                token: newToken,
              });
            }
          );
        });
      });
    });
  });
};

// Controller to list all candidateApplications
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

  const action = JSON.stringify({ candidate_application: "view" });
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

      Candidate.list(branch_id, (err, result) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({
            status: false,
            message: "An error occurred while fetching candidate applications.",
            token: newToken,
          });
        }

        res.json({
          status: true,
          message: "Candidate applications fetched successfully.",
          candidateApplications: result,
          totalResults: result.length,
          token: newToken,
        });
      });
    });
  });
};

exports.update = (req, res) => {
  const {
    branch_id,
    candidate_application_id,
    _token,
    name,
    employee_id,
    mobile_number,
    email,
    services,
    package,
  } = req.body;

  // Define required fields
  const requiredFields = {
    branch_id,
    candidate_application_id,
    _token,
    name,
    employee_id,
    mobile_number,
    email,
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

  const action = JSON.stringify({ candidate_application: "update" });
  BranchCommon.isBranchAuthorizedForAction(branch_id, action, (result) => {
    if (!result.status) {
      return res.status(403).json({
        status: false,
        message: result.message,
      });
    }

    BranchCommon.isBranchTokenValid(_token, branch_id, (err, result) => {
      if (err) {
        console.error("Error checking token validity:", err);
        return res.status(500).json({ status: false, message: err.message });
      }

      if (!result.status) {
        return res.status(401).json({ status: false, message: result.message });
      }

      const newToken = result.newToken;
      // Fetch the current candidateApplication
      Candidate.getCandidateApplicationById(
        candidate_application_id,
        (err, currentCandidateApplication) => {
          if (err) {
            console.error(
              "Database error during candidateApplication retrieval:",
              err
            );
            return res.status(500).json({
              status: false,
              message: "Failed to retrieve Candidate. Please try again.",
              token: newToken,
            });
          }

          if (!currentCandidateApplication) {
            return res.status(404).json({
              status: false,
              message: "Candidate Aplication not found.",
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
          if (currentBranch.employee_id !== employee_id) {
            changes.employee_id = {
              old: currentBranch.employee_id,
              new: employee_id,
            };
          }
          if (currentBranch.mobile_number !== mobile_number) {
            changes.mobile_number = {
              old: currentBranch.mobile_number,
              new: mobile_number,
            };
          }
          if (currentBranch.services !== services) {
            changes.services = {
              old: currentBranch.services,
              new: services,
            };
          }
          if (currentBranch.package !== package) {
            changes.package = {
              old: currentBranch.package,
              new: package,
            };
          }

          Candidate.checkUniqueEmpIdByCandidateApplicationID(
            employee_id,
            candidate_application_id,
            (err, exists) => {
              if (err) {
                console.error("Error checking unique ID:", err);
                return res.status(500).json({
                  status: false,
                  message: err.message,
                  token: newToken,
                });
              }

              if (
                exists &&
                exists.candidate_application_id !== candidate_application_id
              ) {
                return res.status(400).json({
                  status: false,
                  message: `Candidate Employee ID '${employee_id}' already exists.`,
                  token: newToken,
                });
              }

              Candidate.update(
                {
                  name,
                  employee_id,
                  mobile_number,
                  email,
                  services,
                  package,
                },
                candidate_application_id,
                (err, result) => {
                  if (err) {
                    console.error(
                      "Database error during candidate application update:",
                      err
                    );
                    BranchCommon.branchActivityLog(
                      branch_id,
                      "Candidate Application",
                      "Update",
                      "0",
                      JSON.stringify({ id, ...changes }),
                      err.message,
                      () => {}
                    );
                    return res.status(500).json({
                      status: false,
                      message: err.message,
                      token: newToken,
                    });
                  }

                  BranchCommon.branchActivityLog(
                    branch_id,
                    "Candidate Application",
                    "Update",
                    "1",
                    JSON.stringify({ candidate_application_id, ...changes }),
                    null,
                    () => {}
                  );

                  res.status(200).json({
                    status: true,
                    message: "Candidate application updated successfully.",
                    package: result,
                    token: newToken,
                  });
                }
              );
            }
          );
        }
      );
    });
  });
};

exports.delete = (req, res) => {
  const { id, branch_id, _token } = req.query;

  // Validate required fields
  const missingFields = [];
  if (!id) missingFields.push("Candidate Application ID");
  if (!branch_id) missingFields.push("Branch ID");
  if (!_token) missingFields.push("Token");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  const action = JSON.stringify({ candidate_application: "delete" });

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

        // Fetch the current candidateApplication
        Candidate.getCandidateApplicationById(
          id,
          (err, currentCandidateApplication) => {
            if (err) {
              console.error(
                "Database error during candidateApplication retrieval:",
                err
              );
              return res.status(500).json({
                status: false,
                message: "Failed to retrieve Candidate. Please try again.",
                token: newToken,
              });
            }

            if (!currentCandidateApplication) {
              return res.status(404).json({
                status: false,
                message: "Candidate Aplication not found.",
                token: newToken,
              });
            }

            // Delete the candidateApplication
            Candidate.delete(id, (err, result) => {
              if (err) {
                console.error(
                  "Database error during candidateApplication deletion:",
                  err
                );
                BranchCommon.branchActivityLog(
                  branch_id,
                  "Candidate Application",
                  "Delete",
                  "0",
                  JSON.stringify({ id }),
                  err.message,
                  () => {}
                );
                return res.status(500).json({
                  status: false,
                  message: "Failed to delete Candidate. Please try again.",
                  token: newToken,
                });
              }

              BranchCommon.branchActivityLog(
                branch_id,
                "Candidate Application",
                "Delete",
                "1",
                JSON.stringify({ id }),
                null,
                () => {}
              );

              res.status(200).json({
                status: true,
                message: "Candidate Application deleted successfully.",
                result,
                token: newToken,
              });
            });
          }
        );
      }
    );
  });
};
