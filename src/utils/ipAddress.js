/**
 * Utility function to extract the client's IP address
 * @param {object} req - The Express request object
 * @returns {string} - The client's IP address
 */
const getClientIpAddress = (req) => {
  let ipAddress =
    req.headers["x-forwarded-for"] || req.connection.remoteAddress || req.ip;

  // If there are multiple IPs in X-Forwarded-For, take the first one
  if (ipAddress && ipAddress.includes(",")) {
    ipAddress = ipAddress.split(",")[0].trim();
  }

  // If the IP address is IPv6-mapped IPv4 (::ffff:), extract the real IPv4 address
  if (ipAddress && ipAddress.startsWith("::ffff:")) {
    ipAddress = ipAddress.slice(7); // Remove "::ffff:"
  }

  return ipAddress ? ipAddress.trim() : "Unknown IP";
};

module.exports = {
  getClientIpAddress,
};
