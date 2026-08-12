const mongoose = require("mongoose");

const attendanceSessionSchema = new mongoose.Schema(
    {
        // Course session linked to this attendance session
        courseSessionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CourseSession",
            required: true
        },

        // Trainer who created the session
        trainerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        // Attendance mode
        mode: {
            type: String,
            enum: ["offline", "online"],
            required: true
        },

        // Session status
        status: {
            type: String,
            enum: ["active", "ended"],
            default: "active"
        },

        // Dynamic QR token
        qrToken: {
            type: String,
            default: null
        },

        // QR token expiry
        qrExpiresAt: {
            type: Date,
            default: null
        },

        // Offline classroom location
        location: {
            latitude: {
                type: Number,
                default: null
            },

            longitude: {
                type: Number,
                default: null
            },

            radius: {
                type: Number,
                default: 50
            }
        },

        // Session start and end
        startTime: {
            type: Date,
            default: Date.now
        },

        endTime: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "AttendanceSession",
    attendanceSessionSchema
);