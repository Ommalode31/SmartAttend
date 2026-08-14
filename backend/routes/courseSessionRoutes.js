const express = require("express");

const Course = require("../models/Course");
const CourseSession = require("../models/CourseSession");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();


// ==========================================
// CREATE COURSE SESSION
// ==========================================

router.post(
    "/",
    authMiddleware,
    roleMiddleware("trainer"),
    async (req, res) => {

        try {

            const {
                courseId,
                title,
                date,
                startTime,
                endTime
            } = req.body;


            // ==========================================
            // REQUIRED FIELDS
            // ==========================================

            if (
                !courseId ||
                !title ||
                !date ||
                !startTime ||
                !endTime
            ) {
                return res.status(400).json({
                    message:
                        "Course, title, date, start time and end time are required"
                });
            }


            // ==========================================
            // CURRENT TRAINER
            // ==========================================

            const trainerId = req.user.id;


            // ==========================================
            // FIND COURSE + CHECK TRAINER
            // ==========================================

           const course = await Course.findOne({
               _id: courseId,
               status: "active"
             });


            if (!course) {
                return res.status(403).json({
                    message:
                         "Course not found or inactive"
                });
            }


            // ==========================================
            // CHECK TIME
            // ==========================================

            if (startTime >= endTime) {

                return res.status(400).json({
                    message:
                        "End time must be after start time"
                });
            }


            // ==========================================
            // CHECK OVERLAPPING SESSIONS
            // ==========================================

            const existingSessions = await CourseSession.find({

                trainerId: trainerId,

                date: new Date(date),

                status: {
                    $in: [
                        "scheduled",
                        "ongoing"
                    ]
                }

            });


            for (const existingSession of existingSessions) {

                const existingStart =
                    existingSession.startTime;

                const existingEnd =
                    existingSession.endTime;


                const isOverlapping =
                    startTime < existingEnd &&
                    endTime > existingStart;


                if (isOverlapping) {

                    return res.status(409).json({

                        message:
                            "Trainer is already busy during this time",

                        existingSession: {

                            id: existingSession._id,

                            title:
                                existingSession.title,

                            startTime:
                                existingStart,

                            endTime:
                                existingEnd
                        }

                    });
                }
            }


            // ==========================================
            // CREATE COURSE SESSION
            // ==========================================

            const session = await CourseSession.create({

                courseId: courseId,

                trainerId: trainerId,

                title: title,

                date: date,

                startTime: startTime,

                endTime: endTime,

                status: "scheduled"

            });


            // ==========================================
            // SUCCESS RESPONSE
            // ==========================================

            res.status(201).json({

                message:
                    "Course session scheduled successfully",

                session: session

            });


        } catch (error) {

            console.error(
                "Create Course Session Error:",
                error
            );

            res.status(500).json({

                message:
                    "Failed to schedule course session"

            });
        }
    }
);


// ==========================================
// GET TRAINER'S SESSIONS
// ==========================================

router.get(
    "/my-sessions",
    authMiddleware,
    roleMiddleware("trainer"),
    async (req, res) => {

        try {

            const sessions = await CourseSession.find({
                trainerId: req.user.id
            })
                .populate(
                    "courseId",
                    "name code"
                )
                .sort({
                    date: 1,
                    startTime: 1
                });


            // ==========================================
            // AUTOMATICALLY UPDATE SESSION STATUS
            // ==========================================

            const now = new Date();

            for (const session of sessions) {

                const sessionDate = new Date(session.date);

                const dateString =
                    sessionDate.toISOString().split("T")[0];


                const startDateTime = new Date(
                    `${dateString}T${session.startTime}:00`
                );

                const endDateTime = new Date(
                    `${dateString}T${session.endTime}:00`
                );


                let newStatus = "scheduled";


                // Session already finished
                if (now >= endDateTime) {

                    newStatus = "completed";

                }

                // Session currently running
                else if (
                    now >= startDateTime &&
                    now < endDateTime
                ) {

                    newStatus = "ongoing";

                }

                // Session hasn't started
                else {

                    newStatus = "scheduled";

                }


                // Update only if status changed
                if (session.status !== newStatus) {

                    session.status = newStatus;

                    await session.save();

                }

            }


            // ==========================================
            // SEND UPDATED SESSIONS
            // ==========================================

            const updatedSessions = await CourseSession.find({
                trainerId: req.user.id
            })
                .populate(
                    "courseId",
                    "name code"
                )
                .sort({
                    date: 1,
                    startTime: 1
                });


            res.status(200).json({

                sessions: updatedSessions

            });


        } catch (error) {

            console.error(
                "Get Course Sessions Error:",
                error
            );

            res.status(500).json({

                message:
                    "Failed to fetch course sessions"

            });

        }

    }
);

// ==========================================
// TRAINER AVAILABILITY STATUS
// ==========================================

router.get(
    "/trainer-status",
    authMiddleware,
    roleMiddleware("trainer"),
    async (req, res) => {

        try {

            const now = new Date();


            const sessions = await CourseSession.find({

                trainerId: req.user.id,

                status: {
                    $in: [
                        "scheduled",
                        "ongoing"
                    ]
                }

            })
                .populate(
                    "courseId",
                    "name code"
                )
                .sort({

                    date: 1,

                    startTime: 1

                });


            let currentSession = null;


            // ==========================================
            // FIND CURRENT SESSION
            // ==========================================

            for (const session of sessions) {

                const sessionDate =
                    new Date(session.date);


                const dateString =
                    sessionDate
                        .toISOString()
                        .split("T")[0];


                const startDateTime =
                    new Date(
                        `${dateString}T${session.startTime}:00`
                    );


                const endDateTime =
                    new Date(
                        `${dateString}T${session.endTime}:00`
                    );


                if (
                    now >= startDateTime &&
                    now < endDateTime
                ) {

                    currentSession = session;

                    break;
                }
            }


            // ==========================================
            // TRAINER BUSY
            // ==========================================

            if (currentSession) {

                return res.status(200).json({

                    status: "busy",

                    currentSession: {

                        id:
                            currentSession._id,

                        course:
                            currentSession.courseId.name,

                        courseCode:
                            currentSession.courseId.code,

                        title:
                            currentSession.title,

                        date:
                            currentSession.date,

                        startTime:
                            currentSession.startTime,

                        endTime:
                            currentSession.endTime
                    }
                });
            }


            // ==========================================
            // TRAINER AVAILABLE
            // ==========================================

            res.status(200).json({

                status: "available",

                currentSession: null

            });


        } catch (error) {

            console.error(
                "Trainer Status Error:",
                error
            );

            res.status(500).json({

                message:
                    "Failed to check trainer status"

            });
        }
    }
);


// ==========================================
// ADMIN - GET ALL COURSE SESSIONS
// ==========================================

router.get(
    "/",
    authMiddleware,
    roleMiddleware("admin"),
    async (req, res) => {

         console.log(" ADMIN SESSIONS ROUTE HIT");

        try {

            const sessions = await CourseSession.find()
                .populate(
                    "courseId",
                    "name code"
                )
                .populate(
                    "trainerId",
                    "name email"
                )
                .sort({
                    date: 1,
                    startTime: 1
                });

                console.log(
                "ADMIN SESSIONS:",
                sessions
            );

            res.status(200).json({
                sessions
            });

        } catch (error) {

            console.error(
                "Admin Get Sessions Error:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to load course sessions"
            });

        }

    }
);


module.exports = router;