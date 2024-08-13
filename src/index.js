const express = require('express');
const bodyParser = require('body-parser');
const adminRoutes = require('./routes/adminRoutes');
const batchRoutes = require('./routes/batchRoutes');
require('dotenv').config();  // Ensure you load environment variables

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use('/admin', adminRoutes);
app.use('/batch', batchRoutes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
