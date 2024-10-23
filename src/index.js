const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config(); // Ensure you load environment variables

// Import routes
const adminRoutes = require("./routes/admin/indexRoutes");
const clientMasterTrackerRoutes = require("./routes/admin/clientMasterTrackerRoutes");
const generateInvoiceRoutes = require("./routes/admin/generateInvoiceRoutes");
const acknowledgementRoutes = require("./routes/admin/acknowledgementRoutes");
const externalLoginCredentials = require("./routes/admin/externalLoginCredentialsRoutes");
const customerRoutes = require("./routes/customer/indexRoutes");
const branchRoutes = require("./routes/customer/branch/indexRoutes");
const packageRoutes = require("./routes/admin/packageRoutes");
const serviceRoutes = require("./routes/admin/serviceRoutes");
const testRoutes = require("./routes/testRoutes");

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static('uploads'));

// Define routes
app.use("/admin", adminRoutes);
app.use("/client-master-tracker", clientMasterTrackerRoutes);
app.use("/generate-invoice", generateInvoiceRoutes);
app.use("/acknowledgement", acknowledgementRoutes);
app.use("/external-login-credentials", externalLoginCredentials);
app.use("/customer", customerRoutes);
app.use("/branch", branchRoutes);
app.use("/package", packageRoutes);
app.use("/service", serviceRoutes);
app.use("/test", testRoutes);

// Error handling middleware (optional)
app.use((err, req, res, next) => {
  console.error(err.stack); // Log error stack for debugging
  res.status(500).send('Something broke!'); // Send a generic error message
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
