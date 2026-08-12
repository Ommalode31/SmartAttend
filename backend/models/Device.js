const mongoose = require("mongoose");

const deviceSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        deviceId: {
            type: String,
            required: true
        },

        status: {
            type: String,
            enum: ["trusted", "blocked"],
            default: "trusted"
        },

        firstSeen: {
            type: Date,
            default: Date.now
        },

        lastSeen: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

// Same device cannot be registered twice for same user
deviceSchema.index(
    { userId: 1, deviceId: 1 },
    { unique: true }
);

module.exports = mongoose.model("Device", deviceSchema);