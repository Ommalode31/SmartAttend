require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const courseRoutes = require("./routes/courseRoutes");
const courseSessionRoutes = require("./routes/courseSessionRoutes");

const app = express();

const PORT = process.env.PORT || 5000;

// ===============================
// CORS
// ===============================

app.use(
    cors({
        origin: true,
        credentials: true
    })
);

// ===============================
// MIDDLEWARE
// ===============================

app.use(express.json());

// ===============================
// ROUTES
// ===============================

app.use("/api/auth", authRoutes);

app.use("/api/users", userRoutes);

app.use("/api/courses", courseRoutes);

app.use("/api/course-sessions", courseSessionRoutes);

app.use("/api/attendance", attendanceRoutes);

// ===============================
// TEST ROUTE
// ===============================

app.get("/", (req, res) => {
    res.status(200).json({
        message: "SmartAttend Backend is Running!"
    });
});

// ===============================
// MONGODB CONNECTION
// ===============================

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB Connected Successfully!");

        app.listen(PORT, "0.0.0.0", () => {
            console.log(
                `SmartAttend server running on port ${PORT}`
            );
        });
    })
    .catch((error) => {
        console.error(
            "MongoDB Connection Failed:",
            error.message
        );
    });

// require("dotenv").config();

// const express = require("express");
// const mongoose = require("mongoose");
// const cors = require("cors");

// const authRoutes = require("./routes/authRoutes");
// const userRoutes = require("./routes/userRoutes");
// const attendanceRoutes = require("./routes/attendanceRoutes");
// const courseRoutes = require("./routes/courseRoutes");
// const courseSessionRoutes = require("./routes/courseSessionRoutes");

// const app = express();

// const PORT = 5000;

// // ===============================
// // CORS
// // ===============================

// app.use(cors({
//     origin: true,
//     credentials: true
// }));

// // ===============================
// // MIDDLEWARE
// // ===============================

// app.use(express.json());

// // ===============================
// // ROUTES
// // ===============================

// app.use("/api/auth", authRoutes);

// app.use("/api/users", userRoutes);

// app.use("/api/courses", courseRoutes);

// app.use("/api/course-sessions", courseSessionRoutes);

// app.use("/api/attendance", attendanceRoutes);

// // ===============================
// // TEST ROUTE
// // ===============================

// app.get("/", (req, res) => {
//     res.send("SmartAttend Backend is Running!");
// });

// // ===============================
// // MONGODB CONNECTION
// // ===============================

// mongoose.connect(process.env.MONGO_URI)

//     .then(() => {

//         console.log("MongoDB Connected Successfully!");

//         app.listen(PORT, "0.0.0.0", () => {
//             console.log(`SmartAttend server running on port ${PORT}`);
//         });

//     })

//     .catch((error) => {

//         console.error(
//             "MongoDB Connection Failed:",
//             error.message
//         );

//     });