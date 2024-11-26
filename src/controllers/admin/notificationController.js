const Notification = require("../../models/admin/notificationModel");
const ClientApplication = require("../../models/customer/branch/clientApplicationModel");
const Common = require("../../models/admin/commonModel");

// Controller to list all tatDelays
exports.index = (req, res) => {
  try {
    const { YWRtaW5faWQ } = req.query;

    // Validate if the admin_id query parameter is provided
    if (!YWRtaW5faWQ) {
      return res.status(400).json({
        status: false,
        message: "Missing required field: admin_id",
      });
    }

    // Decode the Base64 encoded admin ID and parse it
    const decodedAdminId = Buffer.from(YWRtaW5faWQ, "base64").toString("utf8");
    const adminIdNumber = parseFloat(decodedAdminId);
    const adminId = adminIdNumber / 1.5;

    // Check if adminId is valid
    if (isNaN(adminId) || !adminId) {
      return res.status(400).json({
        status: false,
        message: "Invalid admin ID provided.",
      });
    }

    // Authorization action
    const action = JSON.stringify({ tat_delay: "view" });

    Common.isAdminAuthorizedForAction(adminId, action, (authResult) => {
      if (!authResult.status) {
        return res.status(403).json({
          status: false,
          message: authResult.message, // Authorization failure message
        });
      }

      // Fetch TAT delay list
      Notification.tatDelaylist((tatDelayErr, tatDelayResult) => {
        if (tatDelayErr) {
          console.error("TAT Delay List Error:", tatDelayErr);
          return res.status(500).json({
            status: false,
            message: "Error fetching TAT delay list.",
          });
        }

        return res.status(200).json({
          status: true,
          message: "Data fetched successfully.",
          data: tatDelayResult,
          totalTatDelays: tatDelayResult.length,
        });

        // Fetch new applications list
        Notification.newApplicationsList((newAppErr, newAppResult) => {
          if (newAppErr) {
            console.error("New Applications List Error:", newAppErr);
            return res.status(500).json({
              status: false,
              message: "Error fetching new applications list.",
            });
          }

          // Success response
          res.status(200).json({
            status: true,
            message: "Data fetched successfully.",
            tatDelays: tatDelayResult,
            newApplications: newAppResult,
            totalTatDelays: tatDelayResult.length,
            totalNewApplications: newAppResult.length,
          });
        });
      });
    });
  } catch (error) {
    console.error("Unexpected Error:", error);
    res.status(500).json({
      status: false,
      message: "An unexpected error occurred.",
    });
  }
};
