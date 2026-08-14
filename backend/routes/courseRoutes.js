const express = require("express");
const Course = require("../models/Course");
const User = require("../models/User");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();


// ==========================================
// CREATE COURSE
// ==========================================

router.post(
    "/",
    authMiddleware,
    roleMiddleware("trainer"),
    async (req, res) => {
        try {

            const {
                name,
                code,
                description
            } = req.body;

            // Required fields
            if (!name || !code) {
                return res.status(400).json({
                    message: "Course name and code are required"
                });
            }

            const courseCode = code.toUpperCase();

            // Check duplicate course code
            const existingCourse = await Course.findOne({
                code: courseCode
            });

            if (existingCourse) {

                // If course already exists,
                // assign current trainer to it
                const alreadyAssigned =
                    existingCourse.trainers &&
                    existingCourse.trainers.some(
                        trainerId =>
                            trainerId.toString() === req.user.id.toString()
                    );

                if (!alreadyAssigned) {

                    existingCourse.trainers =
                        existingCourse.trainers || [];

                    existingCourse.trainers.push(req.user.id);

                    await existingCourse.save();
                }

                return res.status(200).json({
                    message: "Existing course assigned to trainer",
                    course: existingCourse
                });
            }

            // Create new course
            const course = await Course.create({
                name,
                code: courseCode,
                description: description || "",

                trainers: [req.user.id],

                // Keep old field for compatibility
                trainerId: req.user.id,

                status: "active"
            });

            res.status(201).json({
                message: "Course created successfully",
                course
            });

        } catch (error) {

            console.error("Create Course Error:", error);

            res.status(500).json({
                message: "Failed to create course"
            });
        }
    }
);


// ==========================================
// GET TRAINER'S COURSES
// ==========================================

router.get(
    "/my-courses",
    authMiddleware,
    roleMiddleware("trainer"),
    async (req, res) => {

        try {

            const courses = await Course.find({
                status: "active"
            }).sort({
               createdAt: -1
          });
            res.status(200).json({
                courses
            });

        } catch (error) {

            console.error("Get Courses Error:", error);

            res.status(500).json({
                message: "Failed to fetch courses"
            });
        }
    }
);


// ==========================================
// ASSIGN TRAINER TO EXISTING COURSE
// ==========================================

router.post(
    "/:courseId/assign-trainer",
    authMiddleware,
    roleMiddleware("trainer"),
    async (req, res) => {

        try {

            const { courseId } = req.params;

            const course = await Course.findById(courseId);

            if (!course) {
                return res.status(404).json({
                    message: "Course not found"
                });
            }

            course.trainers = course.trainers || [];

            const alreadyAssigned =
                course.trainers.some(
                    trainerId =>
                        trainerId.toString() === req.user.id.toString()
                );

            if (!alreadyAssigned) {

                course.trainers.push(req.user.id);

                await course.save();
            }

            res.status(200).json({
                message: "Trainer assigned successfully",
                course
            });

        } catch (error) {

            console.error("Assign Trainer Error:", error);

            res.status(500).json({
                message: "Failed to assign trainer"
            });
        }
    }
);

// ==========================================
// ADMIN - ASSIGN TRAINER TO COURSE
// ==========================================

router.post(
    "/admin/:courseId/assign-trainer",
    authMiddleware,
    roleMiddleware("admin"),
    async (req, res) => {

        try {

            const { courseId } = req.params;
            const { trainerId } = req.body;

            if (!trainerId) {
                return res.status(400).json({
                    message: "Trainer ID is required"
                });
            }

            const course = await Course.findById(courseId);

            if (!course) {
                return res.status(404).json({
                    message: "Course not found"
                });
            }

            course.trainers = course.trainers || [];

            const alreadyAssigned = course.trainers.some(
                id => id.toString() === trainerId.toString()
            );

            if (!alreadyAssigned) {
                course.trainers.push(trainerId);
            }

            // Keep old trainerId field compatible
            course.trainerId = trainerId;

            await course.save();

            return res.status(200).json({
                message: "Trainer assigned successfully",
                course
            });

        } catch (error) {

            console.error(
                "Admin Assign Trainer Error:",
                error
            );

            return res.status(500).json({
                message: "Failed to assign trainer"
            });
        }
    }
);


// ==========================================
// ADMIN - GET ALL COURSES
// ==========================================

router.get(
    "/",
    authMiddleware,
    roleMiddleware("admin"),
    async (req, res) => {

        try {

            const courses = await Course.find()
                .sort({
                    createdAt: -1
                });

            res.status(200).json({
                courses
            });

        } catch (error) {

            console.error(
                "Admin Get Courses Error:",
                error
            );

            res.status(500).json({
                message: "Failed to load courses"
            });
        }
    }
);




module.exports = router;