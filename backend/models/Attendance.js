const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
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

        status: {
            type: String,
            enum: ["present", "flagged", "rejected"],
            default: "present"
        },

        checkInTime: {
            type: Date,
            default: Date.now
        },

        location: {
            latitude: {
                type: Number,
                required: true
            },

            longitude: {
                type: Number,
                required: true
            }
        },
           
        riskScore: {
               type: Number,
               default: 0
        },
        riskLevel: {
            type: String,
            enum: ["low", "medium", "high"],
            default: "low"
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Attendance", attendanceSchema);