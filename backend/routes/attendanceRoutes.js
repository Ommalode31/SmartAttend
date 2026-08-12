const express = require("express");
const jwt = require("jsonwebtoken");
const QRCode = require("qrcode");

const SecurityEvent = require("../models/SecurityEvent");
const AttendanceSession = require("../models/AttendanceSession");
const Attendance = require("../models/Attendance");
const CourseSession = require("../models/CourseSession");
const Device = require("../models/Device");



const calculateRiskScore = require("../utils/riskScore");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

function calculateDistance(lat1, lon1, lat2, lon2) {

    const R = 6371000; // Earth radius in meters

    const toRadians = (degree) => {
        return degree * Math.PI / 180;
    };

    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
    );

    return R * c;
}


// Start Offline Attendance Session
router.post(
    "/session/start",
    authMiddleware,
    roleMiddleware("trainer"),
    async (req, res) => {

        try {

            const {
                courseSessionId,
                latitude,
                longitude,
                radius
            } = req.body;


            // ==========================================
            // VALIDATE REQUIRED FIELDS
            // ==========================================

            if (!courseSessionId) {
                return res.status(400).json({
                    message: "Course session ID is required"
                });
            }

            if (
                latitude === undefined ||
                longitude === undefined
            ) {
                return res.status(400).json({
                    message: "Classroom location is required"
                });
            }


            // ==========================================
            // FIND COURSE SESSION
            // ==========================================

            const courseSession = await CourseSession.findById(
                courseSessionId
            );

            if (!courseSession) {
                return res.status(404).json({
                    message: "Course session not found"
                });
            }


            // ==========================================
            // CHECK TRAINER
            // ==========================================

            if (
                courseSession.trainerId.toString() !==
                req.user.id.toString()
            ) {
                return res.status(403).json({
                    message:
                        "You are not authorized to start attendance for this course session"
                });
            }


            // ==========================================
            // CHECK COURSE SESSION STATUS
            // ==========================================

            if (
                courseSession.status !== "scheduled" &&
                courseSession.status !== "ongoing"
            ) {
                return res.status(400).json({
                    message:
                        "Attendance cannot be started for this course session"
                });
            }


            // ==========================================
            // CREATE ATTENDANCE SESSION
            // ==========================================

            const session = await AttendanceSession.create({

                courseSessionId: courseSession._id,

                trainerId: req.user.id,

                mode: "offline",

                status: "active",

                location: {
                    latitude: Number(latitude),
                    longitude: Number(longitude),
                    radius: radius || 50
                }

            });


            // ==========================================
            // GENERATE DYNAMIC QR
            // ==========================================

            const qrToken = jwt.sign(
                {
                    sessionId: session._id.toString(),
                    courseSessionId:
                        courseSession._id.toString(),
                    type: "attendance"
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: "10s"
                }
            );


            // ==========================================
            // QR EXPIRY
            // ==========================================

            const qrExpiresAt = new Date(
                Date.now() + 10 * 1000
            );


            // ==========================================
            // SAVE QR
            // ==========================================

            session.qrToken = qrToken;

            session.qrExpiresAt = qrExpiresAt;

            await session.save();


            // ==========================================
            // UPDATE COURSE SESSION
            // ==========================================

            courseSession.status = "ongoing";

            await courseSession.save();


            // ==========================================
            // GENERATE QR IMAGE
            // ==========================================

            const qrCode = await QRCode.toDataURL(
                qrToken
            );


            // ==========================================
            // RESPONSE
            // ==========================================

            res.status(201).json({

                message:
                    "Attendance session started successfully",

                courseSession: {

                    id:
                        courseSession._id,

                    courseId:
                        courseSession.courseId,

                    title:
                        courseSession.title,

                    date:
                        courseSession.date,

                    startTime:
                        courseSession.startTime,

                    endTime:
                        courseSession.endTime,

                    status:
                        courseSession.status

                },

                session: {

                    id:
                        session._id,

                    courseSessionId:
                        session.courseSessionId,

                    trainerId:
                        session.trainerId,

                    mode:
                        session.mode,

                    status:
                        session.status,

                    startTime:
                        session.startTime,

                    location:
                        session.location

                },

                qr: {

                    token:
                        qrToken,

                    tokenExpiresAt:
                        qrExpiresAt,

                    image:
                        qrCode

                }

            });

        } catch (error) {

            console.error(
                "Start Attendance Error:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to start attendance session"
            });
        }
    }
);

// Student Check-in
router.post(
    "/check-in",
    authMiddleware,
    roleMiddleware("student"),
    async (req, res) => {

        try {

            const {
                qrToken,
                latitude,
                longitude,
                deviceId
            } = req.body;

            // Validate required fields
            if (
                !qrToken ||
                latitude === undefined ||
                longitude === undefined ||
                !deviceId
            ) {
                return res.status(400).json({
                    message: "QR token, location and device ID are required"
                });
            }

            // Verify QR token
            let decodedToken;

            try {
                decodedToken = jwt.verify(
                    qrToken,
                    process.env.JWT_SECRET
                );
            } catch (error) {
                return res.status(401).json({
                    message: "QR token is invalid or expired"
                });
            }

            // Check token type
            if (decodedToken.type !== "attendance") {
                return res.status(401).json({
                    message: "Invalid attendance token"
                });
            }

            // Find attendance session
            const session = await AttendanceSession.findById(
                decodedToken.sessionId
            );

            if (!session) {
                return res.status(404).json({
                    message: "Attendance session not found"
                });
            }

            // Check session status
            if (session.status !== "active") {
                return res.status(400).json({
                    message: "Attendance session has ended"
                });
            }

            // Check token belongs to current session
            if (session.qrToken !== qrToken) {
                return res.status(401).json({
                    message: "Old or invalid QR token"
                });
            }

            // // Check duplicate attendance
            // const existingAttendance = await Attendance.findOne({
            //     studentId: req.user.id,
            //     sessionId: session._id
            // });

            // if (existingAttendance) {
            //     return res.status(409).json({
            //         message: "Attendance already marked"
            //     });
            // }

            // Calculate distance from classroom
            const distance = calculateDistance(
                Number(latitude),
                Number(longitude),
                session.location.latitude,
                session.location.longitude
            );
              
            // Verify student device
const device = await Device.findOne({
    userId: req.user.id,
    deviceId: deviceId
});
    console.log("Logged-in Student ID:", req.user.id);
    console.log("Received Device ID:", deviceId);
    console.log("Found Device:", device); 


   if (!device) {

    const riskResult = calculateRiskScore({
        qrValid: true,
        sessionValid: true,
        deviceTrusted: false,
        locationValid: distance <= session.location.radius,
        duplicate: false,
        distance: distance
    });

    console.log("Unregistered Device Risk Score:", riskResult.score);
    console.log("Unregistered Device Risk Level:", riskResult.riskLevel);

    await SecurityEvent.create({
        studentId: req.user.id,
        sessionId: session._id,
        eventType: "unregistered_device",
        deviceId: deviceId,
        location: {
            latitude: Number(latitude),
            longitude: Number(longitude)
        },
        riskLevel: riskResult.riskLevel,
        message: `Attendance attempt from unregistered device. Risk Score: ${riskResult.score}`
    });

    return res.status(403).json({
        message: "Unregistered device",
        riskScore: riskResult.score,
        riskLevel: riskResult.riskLevel,
        reasons: riskResult.reasons
    });
}

if (device.status === "blocked") {
     
     const riskResult = calculateRiskScore({
        qrValid: true,
        sessionValid: true,
        deviceTrusted: false,
        locationValid: distance <= session.location.radius,
        duplicate: false,
        distance: distance
    });

    console.log("Blocked Device Risk Score:", riskResult.score);
    console.log("Blocked Device Risk Level:", riskResult.riskLevel);

    await SecurityEvent.create({
        studentId: req.user.id,
        sessionId: session._id,
        eventType: "blocked_device",
        deviceId: deviceId,
        location: {
            latitude: Number(latitude),
            longitude: Number(longitude)
        },
        riskLevel: "high",
        message: "Attendance attempt from blocked device"
    });

    return res.status(403).json({
        message: "This device is blocked",
        riskLevel: "high"
    });
}

// Update last seen
device.lastSeen = new Date();
await device.save();

// Check duplicate attendance
const existingAttendance = await Attendance.findOne({
    studentId: req.user.id,
    sessionId: session._id
});

const isDuplicate = !!existingAttendance;
// if (existingAttendance) {
//     return res.status(409).json({
//         message: "Attendance already marked"
//     });
// }


            // Check location
            if (distance > session.location.radius) {
                
                await SecurityEvent.create({
                studentId: req.user.id,
               sessionId: session._id,
               eventType: "location_violation",
              deviceId: deviceId,
              location: {
               latitude: Number(latitude),
               longitude: Number(longitude)
          },
              riskLevel: "high",
             message: `Student is outside attendance radius. Distance: ${Math.round(distance)} meters`
    });


                await Attendance.create({
                    studentId: req.user.id,
                    sessionId: session._id,
                    status: "rejected",
                    checkInTime: new Date(),
                    location: {
                        latitude: Number(latitude),
                        longitude: Number(longitude)
                    },
                    riskLevel: "high"
                });

                return res.status(403).json({
                    message: "Location verification failed",
                    distance: Math.round(distance),
                    allowedRadius: session.location.radius
                });
            }

            // Calculate risk score
const riskResult = calculateRiskScore({
    qrValid: true,
    sessionValid: true,
    deviceTrusted: true,
    locationValid: distance <= session.location.radius,
    duplicate: isDuplicate,
    distance: distance
});

console.log("Risk Score:", riskResult.score);
console.log("Risk Level:", riskResult.riskLevel);
console.log("Risk Reasons:", riskResult.reasons);

// Handle duplicate attendance
if (isDuplicate) {

    await SecurityEvent.create({
        studentId: req.user.id,
        sessionId: session._id,
        eventType: "duplicate_attendance",
        deviceId: deviceId,
        location: {
            latitude: Number(latitude),
            longitude: Number(longitude)
        },
        riskLevel: riskResult.riskLevel,
        message: `Duplicate attendance attempt. Risk Score: ${riskResult.score}`
    });

    console.log("Duplicate Attendance Risk Score:", riskResult.score);
    console.log("Duplicate Attendance Risk Level:", riskResult.riskLevel);

    return res.status(409).json({
        message: "Attendance already marked",
        riskScore: riskResult.score,
        riskLevel: riskResult.riskLevel,
        reasons: riskResult.reasons
    });
}

    
            // Mark attendance
            const attendance = await Attendance.create({
                studentId: req.user.id,
                sessionId: session._id,
                status: "present",
                checkInTime: new Date(),
                location: {
                    latitude: Number(latitude),
                    longitude: Number(longitude)
                },
                 riskScore: riskResult.score,
                 riskLevel: riskResult.riskLevel
            });

            res.status(201).json({
                message: "Attendance marked successfully",
                attendance: {
                    id: attendance._id,
                    studentId: attendance.studentId,
                    sessionId: attendance.sessionId,
                    status: attendance.status,
                    checkInTime: attendance.checkInTime,
                    riskScore: attendance.riskScore,
                    riskLevel: attendance.riskLevel,
                    distance: Math.round(distance)
                }
            });

        } catch (error) {

            console.error("Check-in Error:", error);

            res.status(500).json({
                message: "Failed to mark attendance"
            });
        }
    }
);


// // ==========================================
// // END ATTENDANCE SESSION
// // ==========================================

// router.post(
//     "/session/:sessionId/end",
//     authMiddleware,
//     roleMiddleware("trainer"),
//     async (req, res) => {

//         try {

//             const { sessionId } = req.params;

//             // Find attendance session
//             const session = await AttendanceSession.findById(
//                 sessionId
//             );

//             if (!session) {
//                 return res.status(404).json({
//                     message: "Attendance session not found"
//                 });
//             }

//             // Check trainer ownership
//             if (
//                 session.trainerId.toString() !==
//                 req.user.id.toString()
//             ) {
//                 return res.status(403).json({
//                     message:
//                         "You are not authorized to end this attendance session"
//                 });
//             }

//             // Check if already ended
//             if (session.status === "ended") {
//                 return res.status(400).json({
//                     message: "Attendance session is already ended"
//                 });
//             }

//             // End attendance session
//             session.status = "ended";
//             session.endTime = new Date();

//             // Invalidate current QR
//             session.qrToken = null;
//             session.qrExpiresAt = null;

//             await session.save();

//             // Find linked course session
//             const courseSession = await CourseSession.findById(
//                 session.courseSessionId
//             );

//             // Mark course session as completed
//             if (courseSession) {

//                 courseSession.status = "completed";

//                 await courseSession.save();
//             }

//             res.status(200).json({

//                 message:
//                     "Attendance session ended successfully",

//                 session: {
//                     id: session._id,
//                     courseSessionId: session.courseSessionId,
//                     status: session.status,
//                     startTime: session.startTime,
//                     endTime: session.endTime
//                 }

//             });

//         } catch (error) {

//             console.error(
//                 "End Attendance Session Error:",
//                 error
//             );

//             res.status(500).json({
//                 message:
//                     "Failed to end attendance session"
//             });
//         }
//     }
// );

// Refresh Dynamic QR
router.post(
    "/session/:sessionId/refresh-qr",
    authMiddleware,
    roleMiddleware("trainer"),
    async (req, res) => {

        try {

            const { sessionId } = req.params;

            // Find session
            const session = await AttendanceSession.findById(sessionId);

            if (!session) {
                return res.status(404).json({
                    message: "Attendance session not found"
                });
            }

            // Check trainer owns this session
            if (session.trainerId.toString() !== req.user.id) {
                return res.status(403).json({
                    message: "You are not authorized to refresh this QR"
                });
            }

            // Check session status
            if (session.status !== "active") {
                return res.status(400).json({
                    message: "Attendance session is not active"
                });
            }

            // Generate new QR token
            const qrToken = jwt.sign(
                {
                    sessionId: session._id.toString(),
                    type: "attendance"
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: "10s"
                }
            );

            // New expiry
            const qrExpiresAt = new Date(
                Date.now() + 10 * 1000
            );

            // Update session
            session.qrToken = qrToken;
            session.qrExpiresAt = qrExpiresAt;

            await session.save();

            // Generate QR image
            const qrCode = await QRCode.toDataURL(qrToken);

            res.status(200).json({
                message: "QR refreshed successfully",

                qr: {
                    token: qrToken,
                    tokenExpiresAt: qrExpiresAt,
                    image: qrCode
                }
            });

        } catch (error) {

            console.error("QR Refresh Error:", error);

            res.status(500).json({
                message: "Failed to refresh QR"
            });
        }
    }
);

// Register / Trust Student Device
router.post(
    "/device/register",
    authMiddleware,
    roleMiddleware("student"),
    async (req, res) => {

        try {

            const { deviceId } = req.body;

            if (!deviceId) {
                return res.status(400).json({
                    message: "Device ID is required"
                });
            }

            // Check if this device already exists
            const existingDevice = await Device.findOne({
                userId: req.user.id,
                deviceId: deviceId
            });

            if (existingDevice) {

                if (existingDevice.status === "blocked") {
                    return res.status(403).json({
                        message: "This device is blocked"
                    });
                }

                existingDevice.lastSeen = new Date();
                await existingDevice.save();

                return res.status(200).json({
                    message: "Device already trusted",
                    device: {
                        id: existingDevice._id,
                        deviceId: existingDevice.deviceId,
                        status: existingDevice.status
                    }
                });
            }

            // Count devices already registered
            const deviceCount = await Device.countDocuments({
                userId: req.user.id
            });

            // First device = trusted
            if (deviceCount === 0) {

                const device = await Device.create({
                    userId: req.user.id,
                    deviceId: deviceId,
                    status: "trusted"
                });

                return res.status(201).json({
                    message: "Device registered and trusted",
                    device: {
                        id: device._id,
                        deviceId: device.deviceId,
                        status: device.status
                    }
                });
            }

            // Additional device = suspicious
            const device = await Device.create({
                userId: req.user.id,
                deviceId: deviceId,
                status: "blocked"
            });

            return res.status(403).json({
                message: "New device detected. Device verification required.",
                riskLevel: "high",
                deviceStatus: "blocked"
            });

        } catch (error) {

            console.error("Device Registration Error:", error);

            res.status(500).json({
                message: "Failed to register device"
            });
        }
    }
);

// ==========================================
// END ATTENDANCE SESSION
// ==========================================

router.post(
    "/session/:sessionId/end",
    authMiddleware,
    roleMiddleware("trainer"),
    async (req, res) => {

        try {

            const { sessionId } = req.params;

            // Find attendance session
            const session = await AttendanceSession.findById(
                sessionId
            );

            if (!session) {
                return res.status(404).json({
                    message: "Attendance session not found"
                });
            }

            // Check trainer ownership
            if (
                session.trainerId.toString() !==
                req.user.id.toString()
            ) {
                return res.status(403).json({
                    message:
                        "You are not authorized to end this attendance session"
                });
            }

            // Check if already ended
            if (session.status === "ended") {
                return res.status(400).json({
                    message: "Attendance session is already ended"
                });
            }

            // End attendance session
            session.status = "ended";
            session.endTime = new Date();

            // Invalidate current QR
            session.qrToken = null;
            session.qrExpiresAt = null;

            await session.save();

            // Find linked course session
            const courseSession =
                await CourseSession.findById(
                    session.courseSessionId
                );

            if (courseSession) {

                // Only update if your CourseSession schema
                // supports "completed"
                courseSession.status = "completed";

                await courseSession.save();
            }

            return res.status(200).json({
                message:
                    "Attendance session ended successfully",

                session: {
                    id: session._id,
                    status: session.status,
                    endTime: session.endTime
                }
            });

        } catch (error) {

            console.error(
                "End Attendance Session Error:",
                error
            );

            return res.status(500).json({
                message:
                    "Failed to end attendance session"
            });
        }
    }
);

// ==========================================
// ADMIN - GET ALL ATTENDANCE RECORDS
// ==========================================

router.get(
    "/admin",
    authMiddleware,
    roleMiddleware("admin"),
    async (req, res) => {

        try {

            const attendanceRecords =
                await Attendance.find()
                    .populate(
                        "studentId",
                        "name email"
                    )
                    .populate({
                        path: "sessionId",
                        populate: [
                            {
                                path: "trainerId",
                                select: "name email"
                            },
                            {
                                path: "courseSessionId",
                                populate: {
                                    path: "courseId",
                                    select: "name code"
                                }
                            }
                        ]
                    })
                    .sort({
                        checkInTime: -1
                    });

            res.status(200).json({
                attendance: attendanceRecords
            });

        } catch (error) {

            console.error(
                "Admin Attendance Error:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to load attendance records"
            });
        }
    }
);
module.exports = router;