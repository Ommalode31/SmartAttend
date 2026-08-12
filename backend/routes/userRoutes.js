const express = require("express");

const User = require("../models/User");
const Course = require("../models/Course");
const CourseSession = require("../models/CourseSession");
const Attendance = require("../models/Attendance");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

// Protected Profile Route
router.get("/profile", authMiddleware, (req, res) => {
    res.status(200).json({
        message: "Profile accessed successfully",
        user: req.user
    });
});

// Student Only Route
router.get(
    "/student-dashboard",
    authMiddleware,
    roleMiddleware("student"),
    (req, res) => {
        res.status(200).json({
            message: "Welcome to Student Dashboard",
            user: req.user
        });
    }
);
router.get(
    "/trainer-dashboard",
    authMiddleware,
    roleMiddleware("trainer"),
    (req, res) => {

        res.status(200).json({
            message: "Welcome to Trainer Dashboard",
            user: req.user
        });

    }
);

router.get(
    "/admin-dashboard",
    authMiddleware,
    roleMiddleware("admin"),
    async (req, res) => {

        try {

            const totalStudents = await User.countDocuments({
                role: "student"
            });

            const totalTrainers = await User.countDocuments({
                role: "trainer"
            });

            const totalAdmins = await User.countDocuments({
                role: "admin"
            });

            const totalUsers = await User.countDocuments();

            const totalCourses = await Course.countDocuments();

            const totalSessions =
                await CourseSession.countDocuments();

            const totalAttendance =
                await Attendance.countDocuments();

            const presentAttendance =
                await Attendance.countDocuments({
                    status: "present"
                });

            const rejectedAttendance =
                await Attendance.countDocuments({
                    status: "rejected"
                });

            const flaggedAttendance =
                await Attendance.countDocuments({
                    status: "flagged"
                });

            res.status(200).json({

                message: "Welcome to Admin Dashboard",

                user: req.user,

                statistics: {

                    totalUsers,
                    totalStudents,
                    totalTrainers,
                    totalAdmins,

                    totalCourses,

                    totalSessions,

                    totalAttendance,

                    presentAttendance,

                    rejectedAttendance,

                    flaggedAttendance

                }

            });

        } catch (error) {

            console.error(
                "Admin Dashboard Error:",
                error
            );

            res.status(500).json({

                message:
                    "Failed to load admin dashboard"

            });

        }

    }
);

// ===============================
// ADMIN - GET ALL USERS
// ===============================

router.get(
    "/",
    authMiddleware,
    roleMiddleware("admin"),
    async (req, res) => {

        try {

            const users = await User.find()
                .select("-password")
                .sort({ createdAt: -1 });

            res.status(200).json({
                users
            });

        } catch (error) {

            console.error(
                "Get Users Error:",
                error
            );

            res.status(500).json({
                message: "Failed to load users"
            });

        }

    }
);

module.exports = router;