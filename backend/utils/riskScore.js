const calculateRiskScore = ({
    qrValid,
    sessionValid,
    deviceTrusted,
    locationValid,
    duplicate,
    distance = 0
}) => {

    let score = 0;
    const reasons = [];

    // Invalid QR
    if (!qrValid) {
        score += 30;
        reasons.push("Invalid or expired QR");
    }

    // Invalid session
    if (!sessionValid) {
        score += 25;
        reasons.push("Invalid attendance session");
    }

    // Untrusted / unregistered device
    if (!deviceTrusted) {
        score += 70;
        reasons.push("Untrusted or unregistered device");
    }

    // Location violation
    if (!locationValid) {
        score += 20;
        reasons.push("Student outside classroom radius");
    }

    // Duplicate attendance
    if (duplicate) {
        score += 30;
        reasons.push("Duplicate attendance attempt");
    }

    // Near classroom boundary
    if (distance > 30 && distance <= 50) {
        score += 20;
        reasons.push("Student is near the edge of attendance radius");
    }

    // Maximum score
    score = Math.min(score, 100);

    let riskLevel;

    if (score <= 20) {
        riskLevel = "low";
    } else if (score <= 60) {
        riskLevel = "medium";
    } else {
        riskLevel = "high";
    }

    return {
        score,
        riskLevel,
        reasons
    };
};

module.exports = calculateRiskScore;