const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const adminRoutes = require("./routes/admin/indexRoutes");
const clientMasterTracker = require("./routes/admin/clientMasterTrackerRoutes");
const externalLoginCredentials = require("./routes/admin/externalLoginCredentialsRoutes");
const customerRoutes = require("./routes/customer/indexRoutes");
const branchRoutes = require("./routes/customer/branch/indexRoutes");
const packageRoutes = require("./routes/admin/packageRoutes");
const serviceRoutes = require("./routes/admin/serviceRoutes");
require("dotenv").config(); // Ensure you load environment variables

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

app.use(bodyParser.json());
app.use("/admin", adminRoutes);
app.use("/client-master-tracker", clientMasterTracker);
app.use("/external-login-credentials", externalLoginCredentials);
app.use("/customer", customerRoutes);
app.use("/branch", branchRoutes);
app.use("/package", packageRoutes);
app.use("/service", serviceRoutes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
