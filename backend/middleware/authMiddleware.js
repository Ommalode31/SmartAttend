const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
    try {
        // Get Authorization header
        const authHeader = req.headers.authorization;

        // Check if token exists
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Access denied. No token provided"
            });
        }

        // Extract token from "Bearer TOKEN"
        const token = authHeader.split(" ")[1];

        // Verify JWT token
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // Store decoded user information
        req.user = decoded;

        // Continue to the next function
        next();

     } 
     //catch (error) {
    //     return res.status(401).json({
    //         message: "Invalid or expired token"
    //     });
    catch (error) {
    console.error("JWT Verification Error:", error.message);

    return res.status(401).json({
        message: "Invalid or expired token"
    });
    }
};

module.exports = authMiddleware;