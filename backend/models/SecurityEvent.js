const mongoose = require("mongoose");

const securityEventSchema = new mongoose.Schema(
    {
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        sessionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AttendanceSession",
            required: true
        },

        eventType: {
            type: String,
            enum: [
                "unregistered_device",
                "blocked_device",
                "location_violation",
                "invalid_qr",
                "expired_qr",
                "duplicate_attendance"
            ],
            required: true
        },

        deviceId: {
            type: String,
            default: null
        },

        location: {
            latitude: {
                type: Number,
                default: null
            },
            longitude: {
                type: Number,
                default: null
            }
        },

        riskLevel: {
            type: String,
            enum: ["low", "medium", "high"],
            default: "high"
        },

        message: {
            type: String,
            required: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "SecurityEvent",
    securityEventSchema
);