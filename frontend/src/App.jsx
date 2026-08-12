import { useEffect, useMemo, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import QRCode from "qrcode";
import "./App.css";

const API =
  import.meta.env.VITE_API_URL ||
  `http://${window.location.hostname}:5000/api`;

const getToken = () => localStorage.getItem("token") || "";

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
};

const apiRequest = async (path, options = {}) => {
  const token = getToken();

  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${API}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();

  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    throw new Error(
      data.message || `Request failed (${response.status})`
    );
  }

  return data;
};

const getId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;

  return (
    value._id ||
    value.id ||
    value.sessionId ||
    ""
  );
};

const getCourseName = (session) =>
  session?.courseId?.name ||
  session?.courseName ||
  session?.course?.name ||
  "Course";

const getCourseCode = (session) =>
  session?.courseId?.code ||
  session?.courseCode ||
  session?.course?.code ||
  "";

const formatDate = (value) => {
  if (!value) return "—";

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return value;
  }

  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (value) => {
  if (!value) return "";

  const [h, m] = value.split(":").map(Number);

  if (Number.isNaN(h) || Number.isNaN(m)) {
    return value;
  }

  const d = new Date();

  d.setHours(h, m, 0, 0);

  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

/* =====================================================
   QR IMAGE NORMALIZER
===================================================== */

const normalizeQrSource = (data) => {
  const candidates = [
    data?.qrImage,
    data?.qrCode,
    data?.image,
    data?.imageData,
    data?.dataUrl,

    data?.qr?.image,
    data?.qr?.qrImage,
    data?.qr?.dataUrl,

    data?.session?.qrImage,
    data?.session?.qrCode,

    data?.attendanceSession?.qrImage,
    data?.attendanceSession?.qrCode,
  ];

  const value = candidates.find(
    (x) =>
      typeof x === "string" &&
      x.trim().length > 0
  );

  if (!value) {
    return "";
  }

  const raw = value.trim();

  if (raw.startsWith("data:image")) {
    return raw;
  }

  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://")
  ) {
    return raw;
  }

  return `data:image/png;base64,${raw.replace(
    /^data:image\/png;base64,/,
    ""
  )}`;
};

function App() {
  /* =====================================================
     AUTH
  ===================================================== */

  const [isRegister, setIsRegister] = useState(false);

  const [isLoggedIn, setIsLoggedIn] = useState(
    Boolean(
      getToken() &&
      localStorage.getItem("user")
    )
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [role, setRole] = useState("student");

  const [showPassword, setShowPassword] =
    useState(false);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  /* =====================================================
     TRAINER
  ===================================================== */

  const [trainerPage, setTrainerPage] =
    useState("dashboard");

  const [courses, setCourses] = useState([]);
  
  const [trainerSessions, setTrainerSessions] =
    useState([]);

  const [selectedCourseSession, setSelectedCourseSession] =
    useState("");

  const [trainerStatus, setTrainerStatus] =
    useState("available");

  const [currentSession, setCurrentSession] =
    useState(null);

  const [trainerLoading, setTrainerLoading] =
    useState(false);

  const [trainerError, setTrainerError] =
    useState("");

  const [qrImage, setQrImage] = useState("");
  const [qrToken, setQrToken] = useState("");

  const [locationLoading, setLocationLoading] =
    useState(false);

  /* =====================================================
     SCHEDULE
  ===================================================== */

  const [showScheduleForm, setShowScheduleForm] =
    useState(false);

  const [sessionCourse, setSessionCourse] =
    useState("");

  const [sessionTitle, setSessionTitle] =
    useState("");

  const [sessionDate, setSessionDate] =
    useState("");

  const [sessionStartTime, setSessionStartTime] =
    useState("");

  const [sessionEndTime, setSessionEndTime] =
    useState("");

  const [scheduleLoading, setScheduleLoading] =
    useState(false);

  const [scheduleMessage, setScheduleMessage] =
    useState("");


    const sessionTitleRef = useRef(null);

    const sessionDateRef = useRef(null);

    const sessionStartTimeRef = useRef(null);

    const sessionEndTimeRef = useRef(null);

  /* =====================================================
     STUDENT
  ===================================================== */

  const [studentPage, setStudentPage] =
    useState("dashboard");

  const [scannerOpen, setScannerOpen] =
    useState(false);

  const [scannerError, setScannerError] =
    useState("");

  const [scanStatus, setScanStatus] =
    useState("");

  const scannerRef = useRef(null); 

  const getDeviceId = () => {
  let deviceId = localStorage.getItem("smartAttendDeviceId");

  if (!deviceId) {
    deviceId =
      "device-" +
      Date.now() +
      "-" +
      Math.random().toString(36).substring(2, 10);

    localStorage.setItem(
      "smartAttendDeviceId",
      deviceId
    );
  }

  return deviceId;
};

  /* =====================================================
     ADMIN
  ===================================================== */

  const [adminPage, setAdminPage] =
    useState("dashboard");

  const [adminUsers, setAdminUsers] = useState([]);
  const [adminAttendance, setAdminAttendance] = useState([]);
  const [adminCourses, setAdminCourses] =
    useState([]);

  const [adminSessions, setAdminSessions] =
    useState([]);

  const [adminLoading, setAdminLoading] =
    useState(false);

  const [adminError, setAdminError] =
    useState("");

  const [adminStats, setAdminStats] =
    useState({
      users: 0,
      trainers: 0,
      students: 0,
      courses: 0,
      sessions: 0,
    });

  const user = getStoredUser();

  /* =====================================================
     LOGIN / REGISTER
  ===================================================== */

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      const endpoint = isRegister
        ? "/auth/register"
        : "/auth/login";

      const body = isRegister
        ? {
            name,
            email,
            password,
            role,
          }
        : {
            email,
            password,
          };

      const data = await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (isRegister) {
        setMessage(
          "Registration successful. Please login."
        );

        setName("");
        setEmail("");
        setPassword("");

        setTimeout(() => {
          setIsRegister(false);
          setMessage("");
        }, 1200);
      } else {
        const token =
          data.token ||
          data.accessToken ||
          data.jwt;

        if (!token) {
          throw new Error(
            "Login successful but token was not returned."
          );
        }

        localStorage.setItem("token", token);

        localStorage.setItem(
          "user",
          JSON.stringify(data.user || {})
        );

        setIsLoggedIn(true);
      }
    } catch (error) {
      setMessage(
        error.message ||
          "Unable to connect to backend."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     LOGOUT
  ===================================================== */

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setIsLoggedIn(false);

    setTrainerPage("dashboard");
    setStudentPage("dashboard");
    setAdminPage("dashboard");

    setCourses([]);
    setTrainerSessions([]);

    setCurrentSession(null);

    setQrImage("");
    setQrToken("");
  };

  /* =====================================================
     TRAINER DATA
  ===================================================== */

  const fetchCourses = async () => {
    try {
      const data =
        await apiRequest(
          "/courses/my-courses"
        );

      setCourses(
        data.courses || []
      );
    } catch (error) {
      console.error(
        "Courses:",
        error
      );

      setTrainerError(
        error.message
      );
    }
  };

  const fetchTrainerSessions = async () => {
    try {
      const data =
        await apiRequest(
          "/course-sessions/my-sessions"
        );

      setTrainerSessions(
        data.sessions || []
      );
    } catch (error) {
      console.error(
        "Sessions:",
        error
      );
    }
  };

  const fetchTrainerStatus = async () => {
    try {
      const data =
        await apiRequest(
          "/course-sessions/trainer-status"
        );

      setTrainerStatus(
        data.status || "available"
      );

      setCurrentSession(
        data.currentSession || null
      );
    } catch (error) {
      console.error(
        "Trainer status:",
        error
      );
    }
  };

  const loadTrainerData = async () => {
    await Promise.all([
      fetchCourses(),
      fetchTrainerSessions(),
      fetchTrainerStatus(),
    ]);
  };

  /* =====================================================
     LOGIN DATA LOAD
  ===================================================== */

  useEffect(() => {
  if (!isLoggedIn) {
    return;
  }

  const currentUser = getStoredUser();

  if (currentUser.role === "trainer") {
    loadTrainerData();
  }

  if (currentUser.role === "admin") {
    loadAdminData();
  }
}, [isLoggedIn, adminPage]);

  /* =====================================================
     LOCATION
  ===================================================== */

  const getCurrentLocation = () =>
    new Promise(
      (resolve, reject) => {
        if (!navigator.geolocation) {
          reject(
            new Error(
              "Geolocation is not supported by this browser."
            )
          );

          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude:
                position.coords.latitude,

              longitude:
                position.coords.longitude,
            });
          },

          () => {
            reject(
              new Error(
                "Please allow location permission to start attendance."
              )
            );
          },

          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0,
          }
        );
      }
    );

  /* =====================================================
     FRONTEND QR FALLBACK
  ===================================================== */

  const makeQrFromToken = async (token) => {
    if (!token) {
      return "";
    }

    try {
      return await QRCode.toDataURL(
        token,
        {
          width: 420,
          margin: 2,
          errorCorrectionLevel: "M",
        }
      );
    } catch (error) {
      console.error(
        "Frontend QR generation:",
        error
      );

      return "";
    }
  };

  /* =====================================================
     CREATE COURSE SESSION
  ===================================================== */

 const createCourseSession = async (e) => {
  e.preventDefault();

  setScheduleLoading(true);
  setScheduleMessage("");

  try {
    const title =
      sessionTitleRef.current?.value.trim() || "";

    const date =
      sessionDateRef.current?.value || "";

    const startTime =
      sessionStartTimeRef.current?.value || "";

    const endTime =
      sessionEndTimeRef.current?.value || "";

    if (
      !sessionCourse ||
      !title ||
      !date ||
      !startTime ||
      !endTime
    ) {
      throw new Error(
        "Please fill all session fields."
      );
    }

    await apiRequest(
      "/course-sessions",
      {
        method: "POST",

        body: JSON.stringify({
          courseId: sessionCourse,
          title: title,
          date: date,
          startTime: startTime,
          endTime: endTime,
        }),
      }
    );

    setScheduleMessage(
      "Session scheduled successfully."
    );

    if (sessionTitleRef.current) {
      sessionTitleRef.current.value = "";
    }

    if (sessionDateRef.current) {
      sessionDateRef.current.value = "";
    }

    if (sessionStartTimeRef.current) {
      sessionStartTimeRef.current.value = "";
    }

    if (sessionEndTimeRef.current) {
      sessionEndTimeRef.current.value = "";
    }

    setSessionTitle("");
    setSessionDate("");
    setSessionStartTime("");
    setSessionEndTime("");

    await fetchTrainerSessions();

    setTimeout(() => {
      setShowScheduleForm(false);
      setScheduleMessage("");
    }, 900);

  } catch (error) {
    setScheduleMessage(
      error.message
    );
  } finally {
    setScheduleLoading(false);
  }
};

  /* =====================================================
     START ATTENDANCE
  ===================================================== */

  const startAttendanceSession =
    async () => {
      if (!selectedCourseSession) {
        setTrainerError(
          "Please select a scheduled session."
        );

        return;
      }

      setTrainerLoading(true);
      setTrainerError("");
      setLocationLoading(true);

      try {
        const location =
          await getCurrentLocation();

        setLocationLoading(false);

        const data =
          await apiRequest(
            "/attendance/session/start",
            {
              method: "POST",

              body: JSON.stringify({
                courseSessionId:
                  selectedCourseSession,

                latitude:
                  location.latitude,

                longitude:
                  location.longitude,

                radius: 50,
              }),
            }
          );

        const session =
          data.session ||
          data.attendanceSession ||
          data;

        const token =
          data.qrToken ||
          data.session?.qrToken ||
          data.attendanceSession?.qrToken ||
          "";

        let image =
          normalizeQrSource(data);

        /*
          IMPORTANT:
          If backend sends qrToken but no image,
          generate QR in frontend.
        */

        if (!image && token) {
          image =
            await makeQrFromToken(
              token
            );
        }

        setCurrentSession(
          session
        );

        setQrToken(token);
        setQrImage(image);

        setTrainerStatus(
          "busy"
        );

        if (!image) {
          throw new Error(
            "Attendance started, but QR data was not returned by backend."
          );
        }

        setTrainerPage(
          "attendance"
        );
      } catch (error) {
        console.error(
          "Start attendance:",
          error
        );

        setTrainerError(
          error.message ||
            "Unable to start attendance."
        );
      } finally {
        setLocationLoading(false);
        setTrainerLoading(false);
      }
    };

  /* =====================================================
     REFRESH QR
  ===================================================== */

  const refreshQr = async () => {
    setTrainerLoading(true);
    setTrainerError("");

    try {
      const sessionId =
        getId(
          currentSession
        );

      if (!sessionId) {
        throw new Error(
          "Attendance session ID not found."
        );
      }

      const data =
        await apiRequest(
          `/attendance/session/${sessionId}/refresh-qr`,
          {
            method: "POST",
          }
        );

      const token =
        data.qrToken ||
        data.session?.qrToken ||
        "";

      let image =
        normalizeQrSource(data);

      if (!image && token) {
        image =
          await makeQrFromToken(
            token
          );
      }

      if (!image) {
        throw new Error(
          "QR refreshed but no QR data was returned."
        );
      }

      setQrToken(token);
      setQrImage(image);
    } catch (error) {
      setTrainerError(
        error.message
      );
    } finally {
      setTrainerLoading(false);
    }
  };


  /* =====================================================
   END ATTENDANCE SESSION
===================================================== */

const endAttendanceSession = async () => {

  const sessionId = getId(currentSession);

  if (!sessionId) {
    setTrainerError(
      "Attendance session ID not found."
    );
    return;
  }

  const confirmEnd = window.confirm(
    "Are you sure you want to end this attendance session?"
  );

  if (!confirmEnd) {
    return;
  }

  setTrainerLoading(true);
  setTrainerError("");

  try {

    await apiRequest(
      `/attendance/session/${sessionId}/end`,
      {
        method: "POST",
      }
    );

    // Clear active QR
    setQrImage("");
    setQrToken("");

    // Clear current attendance session
    setCurrentSession(null);

    // Return to trainer dashboard
    setTrainerPage("dashboard");

  } catch (error) {

    console.error(
      "End attendance session:",
      error
    );

    setTrainerError(
      error.message ||
      "Unable to end attendance session."
    );

  } finally {

    setTrainerLoading(false);

  }
};

  /* =====================================================
     STUDENT QR SCANNER
  ===================================================== */

  const stopScanner = async () => {
    if (!scannerRef.current) {
      return;
    }

    try {
      if (
        scannerRef.current.isScanning
      ) {
        await scannerRef.current.stop();
      }

      scannerRef.current.clear();
    } catch (error) {
      console.warn(
        "Scanner stop:",
        error
      );
    }

    scannerRef.current = null;
  };

  const submitAttendance = async (qrText) => {
  const location = await getCurrentLocation();

  const deviceId = getDeviceId();

  console.log("SmartAttend Device ID:", deviceId);

  // Register / verify device first
  await apiRequest(
    "/attendance/device/register",
    {
      method: "POST",
      body: JSON.stringify({
        deviceId: deviceId,
      }),
    }
  );

  // Mark attendance
  return apiRequest(
    "/attendance/check-in",
    {
      method: "POST",
      body: JSON.stringify({
        qrToken: qrText,
        latitude: location.latitude,
        longitude: location.longitude,
        deviceId: deviceId,
      }),
    }
  );
};

  const startQrScanner = async () => {
    setScannerOpen(true);
    setScannerError("");
    setScanStatus("");

    setTimeout(
      async () => {
        try {
          await stopScanner();

          const scanner =
            new Html5Qrcode(
              "qr-reader"
            );

          scannerRef.current =
            scanner;

          await scanner.start(
            {
              facingMode:
                "environment",
            },

            {
              fps: 10,

              qrbox: {
                width: 250,
                height: 250,
              },
            },

            async (
              decodedText
            ) => {
              setScanStatus(
                "QR detected. Verifying attendance..."
              );

              try {
                await stopScanner();

                await submitAttendance(
                  decodedText
                );

                setScanStatus(
                  "Attendance marked successfully."
                );

                setTimeout(
                  () => {
                    setScannerOpen(
                      false
                    );
                  },
                  1000
                );
              } catch (error) {
                setScanStatus("");

                setScannerError(
                  error.message ||
                    "Attendance could not be marked."
                );
              }
            },

            () => {}
          );
        } catch (error) {
          console.error(
            "Scanner:",
            error
          );

          setScannerError(
            "Unable to access camera. Allow camera permission and try again."
          );
        }
      },
      250
    );
  };

  const closeScanner =
    async () => {
      await stopScanner();

      setScannerOpen(false);
      setScannerError("");
      setScanStatus("");
    };

  /* =====================================================
     ADMIN
  ===================================================== */

     
  async function loadAdminData() {
  setAdminLoading(true);
  setAdminError("");

  try {
    const data = await apiRequest(
      "/users/admin-dashboard"
    );

    const statistics =
      data.statistics || {};

    setAdminStats({
      users:
        statistics.totalUsers || 0,

      trainers:
        statistics.totalTrainers || 0,

      students:
        statistics.totalStudents || 0,

      courses:
        statistics.totalCourses || 0,

      sessions:
        statistics.totalSessions || 0,

      attendance:
        statistics.totalAttendance || 0,

      presentAttendance:
        statistics.presentAttendance || 0,

      rejectedAttendance:
        statistics.rejectedAttendance || 0,

      flaggedAttendance:
        statistics.flaggedAttendance || 0,
    });

    /*
      Users / Courses / Sessions
      are loaded separately for
      the Admin list pages.
    */

    const results =
      await Promise.allSettled([
        apiRequest("/users"),
        apiRequest("/courses"),
        apiRequest("/course-sessions"),
        apiRequest("/attendance/admin"),
      ]);

      console.log("ADMIN API RESULTS:", results);

    const usersData =
      results[0].status === "fulfilled"
        ? results[0].value
        : {};

    const coursesData =
      results[1].status === "fulfilled"
        ? results[1].value
        : {};

    const sessionsData =
      results[2].status === "fulfilled"
        ? results[2].value
        : {};

    const attendanceData =
      results[3].status === "fulfilled"
        ? results[3].value
        : {};

    const users =
      usersData.users ||
      usersData.data ||
      [];

    const courses =
      coursesData.courses ||
      coursesData.data ||
      [];

    const sessions =
      sessionsData.sessions ||
      sessionsData.data ||
      [];

    const attendance =
     attendanceData.attendance ||
     attendanceData.data ||
     [];

    setAdminUsers(
      Array.isArray(users)
        ? users
        : []
    );

    setAdminCourses(
      Array.isArray(courses)
        ? courses
        : []
    );

    setAdminSessions(
      Array.isArray(sessions)
        ? sessions
        : []
    );

    setAdminAttendance(
       Array.isArray(attendance)
        ? attendance
        : []
   );

  } catch (error) {

    console.error(
      "Admin Dashboard Error:",
      error
    );

    setAdminError(
      error.message ||
      "Failed to load admin dashboard"
    );

  } finally {

    setAdminLoading(false);

  }
}

  /* =====================================================
     TRAINER STATS
  ===================================================== */

  const trainerToday =
    useMemo(() => {
      const today =
        new Date()
          .toISOString()
          .slice(0, 10);

      return trainerSessions.filter(
        (session) => {
          if (!session.date) {
            return false;
          }

          return (
            new Date(
              session.date
            )
              .toISOString()
              .slice(0, 10) ===
            today
          );
        }
      ).length;
    }, [trainerSessions]);

  /* =====================================================
     LOGIN PAGE
  ===================================================== */

  if (!isLoggedIn) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="brand-mark">
            SA
          </div>

          <div className="auth-brand">
            SmartAttend
          </div>

          <p className="auth-subtitle">
            Smart Training &
            Attendance Management
          </p>

          <div className="auth-heading">
            <h1>
              {isRegister
                ? "Create your account"
                : "Welcome back"}
            </h1>

            <p>
              {isRegister
                ? "Set up your SmartAttend profile."
                : "Sign in to continue to your portal."}
            </p>
          </div>

          <form
            onSubmit={
              handleSubmit
            }
            className="auth-form"
          >
            {isRegister && (
              <label>
                Full name

                <input
                  value={name}
                  onChange={(e) =>
                    setName(
                      e.target.value
                    )
                  }
                  placeholder="Enter your name"
                  required
                />
              </label>
            )}

            <label>
              Email

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(
                    e.target.value
                  )
                }
                placeholder="you@example.com"
                required
              />
            </label>

            <label>
              Password

              <div className="password-box">
                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(e) =>
                    setPassword(
                      e.target.value
                    )
                  }
                  placeholder="Enter password"
                  required
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (value) =>
                        !value
                    )
                  }
                >
                  {showPassword
                    ? "Hide"
                    : "Show"}
                </button>
              </div>
            </label>

            {isRegister && (
              <label>
                Account type

                <select
                  value={role}
                  onChange={(e) =>
                    setRole(
                      e.target.value
                    )
                  }
                >
                  <option value="student">
                    Student
                  </option>

                  <option value="trainer">
                    Trainer
                  </option>

                  <option value="admin">
                    Admin
                  </option>

                </select>
              </label>
            )}

            <button
              className="auth-submit"
              disabled={loading}
            >
              {loading
                ? "Please wait..."
                : isRegister
                ? "Create Account"
                : "Sign In"}
            </button>
          </form>

          {message && (
            <div className="auth-message">
              {message}
            </div>
          )}

          <p className="auth-switch">
            {isRegister
              ? "Already have an account?"
              : "New to SmartAttend?"}

            <button
              onClick={() => {
                setIsRegister(
                  (value) => !value
                );

                setMessage("");
              }}
            >
              {isRegister
                ? " Sign in"
                : " Create account"}
            </button>
          </p>
        </div>
      </div>
    );
  }

  /* =====================================================
     SHARED SIDEBAR
  ===================================================== */

  const Sidebar = ({
    type,
  }) => {
    const items =
      type === "trainer"
        ? [
            [
              "dashboard",
              "▦",
              "Dashboard",
            ],
            [
              "courses",
              "▤",
              "My Courses",
            ],
            [
              "sessions",
              "◷",
              "Sessions",
            ],
            [
              "attendance",
              "✓",
              "Attendance",
            ],
            [
              "profile",
              "◯",
              "My Profile",
            ],
          ]
        : type === "student"
        ? [
            [
              "dashboard",
              "▦",
              "Dashboard",
            ],
            [
              "attendance",
              "⌁",
              "Mark Attendance",
            ],
            [
              "history",
              "◷",
              "Attendance History",
            ],
            [
              "profile",
              "◯",
              "My Profile",
            ],
          ]
       : type === "admin"
       ? [
    [
      "dashboard",
      "▦",
      "Dashboard",
    ],
    [
      "users",
      "♙",
      "Users",
    ],
    [
      "courses",
      "▤",
      "Courses",
    ],
    [
      "sessions",
      "◷",
      "Sessions",
    ],
    [
      "attendance",
      "✓",
      "Attendance",
    ],
    [
      "profile",
      "◯",
      "My Profile",
    ],
  ]
      : [];

    const page =
      type === "trainer"
        ? trainerPage
        : type === "student"
        ? studentPage
        : adminPage;

    const setPage =
      type === "trainer"
        ? setTrainerPage
        : type === "student"
        ? setStudentPage
        : setAdminPage;

    return (
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-mark">
            SA
          </div>

          <div>
            <strong>
              SmartAttend
            </strong>

            <span>
              {type
                .charAt(0)
                .toUpperCase() +
                type.slice(1)}{" "}
              Portal
            </span>
          </div>
        </div>

        <div className="nav-caption">
          MAIN MENU
        </div>

        <nav className="sidebar-nav">
          {items.map(
            ([
              key,
              icon,
              label,
            ]) => (
              <button
                key={key}
                className={`nav-item ${
                  page === key
                    ? "active"
                    : ""
                }`}
                onClick={() => {
                  setPage(key);

                  if (
                    type ===
                      "student" &&
                    key ===
                      "attendance"
                  ) {
                    startQrScanner();
                  }
                }}
              >
                <span>
                  {icon}
                </span>

                {label}
              </button>
            )
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="mini-user">
            <div className="avatar">
              {(
                user.name ||
                type[0]
              )
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <strong>
                {user.name ||
                  type}
              </strong>

              <span>
                {type}
              </span>
            </div>
          </div>

          <button
            className="logout-btn"
            onClick={
              handleLogout
            }
          >
            ↪{" "}
            <span>
              Logout
            </span>
          </button>
        </div>
      </aside>
    );
  };

  /* =====================================================
     TOPBAR
  ===================================================== */

  const Topbar = ({
    type,
  }) => (
    <header className="topbar">
      <div>
        <h1>
          {type ===
          "trainer"
            ? "Trainer Dashboard"
            : type ===
              "student"
            ? "Student Dashboard"
            : "Admin Dashboard"}
        </h1>

        <p>
          {type ===
          "trainer"
            ? "Manage training, schedules and live attendance."
            : type ===
              "student"
            ? "Track your learning and attendance."
            : "Manage the SmartAttend platform."}
        </p>
      </div>

      <div className="top-user">
        <div className="avatar">
          {(
            user.name ||
            "U"
          )
            .charAt(0)
            .toUpperCase()}
        </div>

        <div>
          <strong>
            {user.name ||
              "User"}
          </strong>

          <span>
            {type}
          </span>
        </div>
      </div>
    </header>
  );

  /* =====================================================
     SMALL COMPONENTS
  ===================================================== */

  const Stat = ({
    icon,
    label,
    value,
    tone = "blue",
  }) => (
    <div className="stat-card">
      <div
        className={`stat-icon ${tone}`}
      >
        {icon}
      </div>

      <div>
        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>
      </div>
    </div>
  );

  const Empty = ({
    icon,
    title,
    text,
  }) => (
    <div className="empty-state">
      <div className="empty-icon">
        {icon}
      </div>

      <h3>
        {title}
      </h3>

      <p>
        {text}
      </p>
    </div>
  );

  /* =====================================================
     TRAINER COURSES
  ===================================================== */

  const TrainerCourses =
    () => (
      <section className="page">
        <div className="page-title">
          <div>
            <span className="eyebrow">
              TRAINING PROGRAMS
            </span>

            <h2>
              My Courses
            </h2>

            <p>
              View assigned programs
              and schedule sessions.
            </p>
          </div>

          <button
            className="primary-btn"
            onClick={() => {
              setShowScheduleForm(
                true
              );

              setSessionCourse(
                courses[0]?._id ||
                  ""
              );
            }}
          >
            + Add Session
          </button>
        </div>

        {showScheduleForm && (
          <div className="form-panel">
            <div className="panel-head">
              <h2>
                Schedule Training
                Session
              </h2>

              <button
                className="icon-btn"
                onClick={() =>
                  setShowScheduleForm(
                    false
                  )
                }
              >
                ×
              </button>
            </div>

            <form
              onSubmit={
                createCourseSession
              }
              className="form-grid"
            >
              <label>
                Course

                <select
                  value={
                    sessionCourse
                  }
                  onChange={(e) =>
                    setSessionCourse(
                      e.target.value
                    )
                  }
                  required
                >
                  <option value="">
                    Select course
                  </option>

                  {courses.map(
                    (course) => (
                      <option
                        key={
                          course._id
                        }
                        value={
                          course._id
                        }
                      >
                        {
                          course.name
                        }{" "}
                        (
                        {course.code ||
                          "—"}
                        )
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                Session title

                <input
                    ref={sessionTitleRef}
                    placeholder="Example: Java Collections"
                    required
                />
              </label>

              <label>
                Date

                <input
  ref={sessionDateRef}
  type="date"
  required
/>
                
              </label>

              <label>
                Start time

               <input
  ref={sessionStartTimeRef}
  type="time"
  required
/>
              </label>

              <label>
                End time

                <input
  ref={sessionEndTimeRef}
  type="time"
  required
/>
              </label>

              <div className="form-actions">
                <button
                  className="primary-btn"
                  disabled={
                    scheduleLoading
                  }
                >
                  {scheduleLoading
                    ? "Scheduling..."
                    : "Schedule Session"}
                </button>
              </div>
            </form>

            {scheduleMessage && (
              <div className="inline-message">
                {scheduleMessage}
              </div>
            )}
          </div>
        )}

        {courses.length ? (
          <div className="course-grid">
            {courses.map(
              (course) => (
                <div
                  className="course-card"
                  key={
                    course._id
                  }
                >
                  <div className="course-top">
                    <div className="course-icon">
                      ▤
                    </div>

                    <span className="active-tag">
                      ACTIVE
                    </span>
                  </div>

                  <h3>
                    {course.name}
                  </h3>

                  <b>
                    {course.code ||
                      "TRAINING PROGRAM"}
                  </b>

                  <p>
                    {course.description ||
                      "Training and development program."}
                  </p>

                  <div className="course-bottom">
                    <span>
                      {
                        trainerSessions.filter(
                          (session) =>
                            getId(
                              session.courseId
                            ) ===
                              course._id ||
                            session.courseId ===
                              course._id
                        ).length
                      }{" "}
                      sessions
                    </span>

                    <button
                      onClick={() => {
                        setSessionCourse(
                          course._id
                        );

                        setShowScheduleForm(
                          true
                        );
                      }}
                    >
                      + Schedule
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        ) : (
          <Empty
            icon="▤"
            title="No courses assigned"
            text="Assigned training programs will appear here."
          />
        )}
      </section>
    );

  /* =====================================================
     TRAINER SESSIONS
  ===================================================== */

  const TrainerSessions =
    () => 
      <section className="page">
        <div className="page-title">
          <div>
            <span className="eyebrow">
              SCHEDULE
            </span>

            <h2>
              Scheduled Sessions
            </h2>

            <p>
              Manage your upcoming
              training sessions.
            </p>
          </div>

          <button
            className="primary-btn"
            onClick={() =>
              setTrainerPage(
                "courses"
              )
    }
          >
            + Add Session
          </button>
        </div>

        {trainerSessions.length ? (
          <div className="scheduled-list">
            {trainerSessions.map(
              (session) => (
                <div
                  className="scheduled-card"
                  key={
                    session._id
                  }
                >
                  <div className="date-big">
                    <strong>
                      {formatTime(
                        session.startTime
                      )}
                    </strong>

                    <span>
                      {formatDate(
                        session.date
                      )}
                    </span>
                  </div>

                  <div className="scheduled-info">
                    <span>
                      {getCourseName(
                        session
                      )}

                      {getCourseCode(
                        session
                      )
                        ? ` · ${getCourseCode(
                            session
                          )}`
                        : ""}
                    </span>

                    <h3>
                      {
                        session.title
                      }
                    </h3>

                    <p>
                      {formatTime(
                        session.startTime
                      )}{" "}
                      –{" "}
                      {formatTime(
                        session.endTime
                      )}
                    </p>
                  </div>

                  <div className="scheduled-actions">
                    <span className="status-pill">
                      {session.status ||
                        "Scheduled"}
                    </span>

                    <button
                      className="secondary-btn"
                      onClick={() => {
                        setSelectedCourseSession(
                          session._id
                        );

                        setTrainerPage(
                          "dashboard"
                        );
                      }}
                    >
                      Select
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
           ) : (
          <Empty
            icon="◷"
            title="No sessions scheduled"
            text="Create your first training session."
          />
        )}
      </section>
    ;

  /* =====================================================
     TRAINER ATTENDANCE
  ===================================================== */

  const TrainerAttendance =
    () => (
      <section className="page attendance-page">
        <div className="page-title center">
          <div>
            <span className="eyebrow">
              LIVE ATTENDANCE
            </span>

            <h2>
              Attendance QR
            </h2>

            <p>
              Students scan this
              temporary QR code to
              mark attendance.
            </p>
          </div>
        </div>

        {qrImage ? (
          <div className="qr-panel">
            <div className="live-badge">
              <span>●</span>
              Attendance Session
              Active
            </div>

            <h2>
              Scan to Mark
              Attendance
            </h2>

            <p>
              QR can be refreshed
              whenever you need a new
              code.
            </p>

            <div className="qr-box">
              <img
                src={qrImage}
                alt="Attendance QR"
                onError={() =>
                  setTrainerError(
                    "QR image could not be displayed."
                  )
                }
              />
            </div>

            <div className="qr-meta">
              <span>
                Session:{" "}
                {currentSession?.title ||
                  "Live session"}
              </span>

              {qrToken && (
                <span>
                  Dynamic token active
                </span>
              )}
            </div>

            <div className="qr-actions">

  <button
    className="primary-btn"
    onClick={refreshQr}
    disabled={trainerLoading}
  >
    {trainerLoading
      ? "Refreshing..."
      : "↻ Refresh QR"}
  </button>

  <button
    className="secondary-btn"
    onClick={endAttendanceSession}
    disabled={trainerLoading}
  >
    {trainerLoading
      ? "Ending..."
      : "⏹ End Session"}
  </button>

</div>

            {trainerError && (
              <div className="inline-error">
                {trainerError}
              </div>
            )}
          </div>
        ) : (
          <div className="empty-live">
            <div>⌁</div>

            <h2>
              No active attendance
              session
            </h2>

            <p>
              Select a scheduled
              session from Dashboard
              and start attendance.
            </p>

            <button
              className="primary-btn"
              onClick={() =>
                setTrainerPage(
                  "dashboard"
                )
              }
            >
              Start Attendance
            </button>
          </div>
        )}
      </section>
    );

  /* =====================================================
     PROFILE
  ===================================================== */

  const Profile = ({
    type,
  }) => (
    <section className="page">
      <div className="profile-card">
        <div className="profile-avatar">
          {(
            user.name ||
            "U"
          )
            .charAt(0)
            .toUpperCase()}
        </div>

        <h2>
          {user.name ||
            type}
        </h2>

        <p>
          {user.email ||
            "—"}
        </p>

        <span className="role-badge">
          {type.toUpperCase()}
        </span>
      </div>
    </section>
  );

  /* =====================================================
     TRAINER DASHBOARD
  ===================================================== */

  const Trainer = () => (
    <div className="app-shell">
      <Sidebar type="trainer" />

      <div className="main-area">
        <Topbar type="trainer" />

        <main className="content">
          {trainerPage ===
            "dashboard" && (
            <>
              <section className="hero-card">
                <div>
                  <span className="eyebrow light">
                    WELCOME BACK
                  </span>

                  <h2>
                    Hello,{" "}
                    {user.name ||
                      "Trainer"}{" "}
                    👋
                  </h2>

                  <p>
                    Run your sessions
                    and manage student
                    attendance from one
                    place.
                  </p>
                </div>

                <div className="hero-symbol">
                  ✓
                </div>
              </section>

              <section className="stats-grid">
                <Stat
                  icon="▤"
                  label="My Courses"
                  value={
                    courses.length
                  }
                />

                <Stat
                  icon="◷"
                  label="Total Sessions"
                  value={
                    trainerSessions.length
                  }
                />

                <Stat
                  icon="●"
                  label="Trainer Status"
                  value={
                    trainerStatus ===
                    "busy"
                      ? "Busy"
                      : "Available"
                  }
                  tone={
                    trainerStatus ===
                    "busy"
                      ? "orange"
                      : "green"
                  }
                />

                <Stat
                  icon="✓"
                  label="Today's Sessions"
                  value={
                    trainerToday
                  }
                />
              </section>

              <section className="live-start-card">
                <div className="live-icon">
                  ⌁
                </div>

                <div className="live-copy">
                  <span className="eyebrow">
                    LIVE ATTENDANCE
                  </span>

                  <h2>
                    Start a live
                    attendance session
                  </h2>

                  <p>
                    Select a scheduled
                    session and generate
                    a temporary QR code.
                  </p>

                  <div className="live-controls">
                    <select
                      value={
                        selectedCourseSession
                      }
                      onChange={(e) =>
                        setSelectedCourseSession(
                          e.target.value
                        )
                      }
                    >
                      <option value="">
                        Select scheduled
                        session
                      </option>

                      {trainerSessions.map(
                        (session) => (
                          <option
                            key={
                              session._id
                            }
                            value={
                              session._id
                            }
                          >
                            {getCourseName(
                              session
                            )}

                            {getCourseCode(
                              session
                            )
                              ? ` (${getCourseCode(
                                  session
                                )})`
                              : ""}

                            {" · "}

                            {
                              session.title
                            }

                            {" · "}

                            {formatTime(
                              session.startTime
                            )}

                            {"–"}

                            {formatTime(
                              session.endTime
                            )}
                          </option>
                        )
                      )}
                    </select>

                    <button
                      className="primary-btn"
                      onClick={
                        startAttendanceSession
                      }
                      disabled={
                        trainerLoading ||
                        locationLoading ||
                        !selectedCourseSession
                      }
                    >
                      {locationLoading
                        ? "Getting location..."
                        : trainerLoading
                        ? "Starting..."
                        : "▶ Start Attendance"}
                    </button>
                  </div>

                  {trainerError && (
                    <div className="inline-error">
                      {trainerError}
                    </div>
                  )}
                </div>
              </section>

              <section className="panel">
                <div className="panel-head">
                  <div>
                    <span className="eyebrow">
                      SCHEDULE
                    </span>

                    <h2>
                      Upcoming Sessions
                    </h2>
                  </div>

                  <button
                    className="ghost-btn"
                    onClick={() =>
                      setTrainerPage(
                        "sessions"
                      )
                    }
                  >
                    View all
                  </button>
                </div>

                {trainerSessions.length ? (
                  <div className="session-list">
                    {trainerSessions
                      .slice(0, 5)
                      .map(
                        (session) => (
                          <div
                            className="session-row"
                            key={
                              session._id
                            }
                          >
                            <div className="date-chip">
                              <strong>
                                {formatTime(
                                  session.startTime
                                )}
                              </strong>

                              <span>
                                {formatDate(
                                  session.date
                                )}
                              </span>
                            </div>

                            <div className="session-main">
                              <strong>
                                {
                                  session.title
                                }
                              </strong>

                              <span>
                                {getCourseName(
                                  session
                                )}

                                {getCourseCode(
                                  session
                                )
                                  ? ` · ${getCourseCode(
                                      session
                                    )}`
                                  : ""}
                              </span>
                            </div>

                            <span className="status-pill">
                              {session.status ||
                                "Scheduled"}
                            </span>
                          </div>
                        )
                      )}
                  </div>
                ) : (
                  <Empty
                    icon="◷"
                    title="No scheduled sessions"
                    text="Create a session from My Courses."
                  />
                )}
              </section>
            </>
          )}

         {trainerPage === "courses" && (
               TrainerCourses()
            )}

        {trainerPage === "sessions" && (
              TrainerSessions()
         )}

          {trainerPage === "attendance" && (
                TrainerAttendance()
             )}

          {trainerPage ===
            "profile" && (
            <Profile type="trainer" />
          )}
        </main>
      </div>
    </div>
  );

  /* =====================================================
     STUDENT DASHBOARD
  ===================================================== */

  const Student = () => (
    <div className="app-shell">
      <Sidebar type="student" />

      <div className="main-area">
        <Topbar type="student" />

        <main className="content">
          {studentPage ===
            "dashboard" && (
            <>
              <section className="hero-card student-hero">
                <div>
                  <span className="eyebrow light">
                    STUDENT PORTAL
                  </span>

                  <h2>
                    Hello,{" "}
                    {user.name ||
                      "Student"}{" "}
                    👋
                  </h2>

                  <p>
                    Scan the trainer's
                    live QR to securely
                    record your
                    attendance.
                  </p>
                </div>

                <div className="hero-symbol">
                  QR
                </div>
              </section>

              <div className="student-grid">
                <div className="panel quick-card">
                  <div className="card-icon">
                    ⌁
                  </div>

                  <span className="eyebrow">
                    QUICK ATTENDANCE
                  </span>

                  <h2>
                    Mark Attendance
                  </h2>

                  <p>
                    Use your camera to
                    scan the dynamic
                    session QR code.
                  </p>

                  <button
                    className="primary-btn"
                    onClick={
                      startQrScanner
                    }
                  >
                    Scan QR Code
                  </button>
                </div>

                <div className="panel security-card">
                  <div className="card-icon green">
                    ✓
                  </div>

                  <span className="eyebrow">
                    SECURITY
                  </span>

                  <h2>
                    Protected Check-in
                  </h2>

                  <p>
                    SmartAttend verifies
                    the QR, session,
                    device and location
                    before marking
                    attendance.
                  </p>

                  <div className="security-list">
                    <span>
                      ✓ Dynamic QR
                    </span>

                    <span>
                      ✓ Location check
                    </span>

                    <span>
                      ✓ Device verification
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {studentPage ===
            "attendance" && (
            <div className="page">
              <div className="page-title center">
                <span className="eyebrow">
                  ATTENDANCE
                </span>

                <h2>
                  Mark Attendance
                </h2>

                <p>
                  Scan a trainer's
                  active attendance QR.
                </p>

                <button
                  className="primary-btn"
                  onClick={
                    startQrScanner
                  }
                >
                  Open Scanner
                </button>
              </div>
            </div>
          )}

          {studentPage ===
            "history" && (
            <div className="page">
              <div className="page-title">
                <span className="eyebrow">
                  RECORDS
                </span>

                <h2>
                  Attendance History
                </h2>

                <p>
                  Your attendance
                  records will appear
                  here.
                </p>
              </div>

              <Empty
                icon="◷"
                title="History view ready"
                text="Connect your attendance history endpoint to show records here."
              />
            </div>
          )}

          {studentPage ===
            "profile" && (
            <Profile type="student" />
          )}

          {scannerOpen && (
            <div className="modal-backdrop">
              <div className="scanner-modal">
                <div className="modal-head">
                  <div>
                    <span className="eyebrow">
                      SMARTATTEND
                    </span>

                    <h2>
                      Scan Attendance QR
                    </h2>
                  </div>

                  <button
                    className="icon-btn"
                    onClick={
                      closeScanner
                    }
                  >
                    ×
                  </button>
                </div>

                <div
                  id="qr-reader"
                  className="qr-reader"
                />

                <p className="scanner-help">
                  Point your camera at
                  the trainer's
                  attendance QR code.
                </p>

                {scannerError && (
                  <div className="inline-error">
                    {scannerError}
                  </div>
                )}

                {scanStatus && (
                  <div className="inline-message">
                    {scanStatus}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );

  /* =====================================================
     ADMIN
  ===================================================== */

  const AdminList = ({
    title,
    caption,
    data,
    empty,
    render,
  }) => (
    <section className="page">
      <div className="page-title">
        <div>
          <span className="eyebrow">
            {caption}
          </span>

          <h2>
            {title}
          </h2>

          <p>
            Manage and review
            SmartAttend data.
          </p>
        </div>
      </div>

      <div className="panel">
        {data.length ? (
          <div className="admin-list">
            {data.map(
              (
                item,
                index
              ) => (
                <div
                  className="admin-row"
                  key={
                    item._id ||
                    item.id ||
                    index
                  }
                >
                  {render(item)}
                </div>
              )
            )}
          </div>
        ) : (
          <Empty
            icon="▦"
            title="Nothing to show"
            text={empty}
          />
        )}
      </div>
    </section>
  );

  const Admin = () => (
    <div className="app-shell">
      <Sidebar type="admin" />

      <div className="main-area">
        <Topbar type="admin" />

        <main className="content">
          {adminPage ===
            "dashboard" && (
            <>
              <section className="hero-card admin-hero">
                <div>
                  <span className="eyebrow light">
                    ADMIN CONTROL CENTER
                  </span>

                  <h2>
                    SmartAttend
                    Overview
                  </h2>

                  <p>
                    Monitor users,
                    courses and training
                    activity.
                  </p>
                </div>

                <div className="hero-symbol">
                  SA
                </div>
              </section>

              <section className="stats-grid">
                <Stat
                  icon="♙"
                  label="Total Users"
                  value={
                    adminStats.users
                  }
                />

                <Stat
                  icon="T"
                  label="Trainers"
                  value={
                    adminStats.trainers
                  }
                />

                <Stat
                  icon="S"
                  label="Students"
                  value={
                    adminStats.students
                  }
                />

                <Stat
                  icon="▤"
                  label="Courses"
                  value={
                    adminStats.courses
                  }
                />
              </section>

              <section className="panel">
                <div className="panel-head">
                  <div>
                    <span className="eyebrow">
                      PLATFORM
                    </span>

                    <h2>
                      System Summary
                    </h2>
                  </div>

                  <button
                    className="ghost-btn"
                    onClick={
                      loadAdminData
                    }
                  >
                    {adminLoading
                      ? "Refreshing..."
                      : "↻ Refresh"}
                  </button>
                </div>

                {adminError && (
                  <div className="inline-error">
                    {adminError}
                  </div>
                )}

                <div className="admin-summary">
                  <div>
                    <strong>
                      Users
                    </strong>

                    <span>
                      {
                        adminStats.users
                      }{" "}
                      accounts
                    </span>
                  </div>

                  <div>
                    <strong>
                      Training Programs
                    </strong>

                    <span>
                      {
                        adminStats.courses
                      }{" "}
                      courses
                    </span>
                  </div>

                  <div>
                    <strong>
                      Scheduled Activity
                    </strong>

                    <span>
                      {
                        adminStats.sessions
                      }{" "}
                      sessions
                    </span>
                  </div>
                </div>
              </section>
            </>
          )}

          {adminPage ===
            "users" && (
            <AdminList
              title="Users"
              caption="USER MANAGEMENT"
              data={
                adminUsers
              }
              empty="No user data returned by the backend."
              render={(item) => (
                <>
                  <div className="list-avatar">
                    {(
                      item.name ||
                      "U"
                    )
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="list-main">
                    <strong>
                      {item.name ||
                        "Unnamed user"}
                    </strong>

                    <span>
                      {item.email ||
                        "—"}
                    </span>
                  </div>

                  <span className="role-badge">
                    {item.role ||
                      "user"}
                  </span>
                </>
              )}
            />
          )}

          {adminPage ===
            "courses" && (
            <AdminList
              title="Courses"
              caption="TRAINING PROGRAMS"
              data={
                adminCourses
              }
              empty="No course data returned by the backend."
              render={(item) => (
                <>
                  <div className="list-icon">
                    ▤
                  </div>

                  <div className="list-main">
                    <strong>
                      {item.name ||
                        "Course"}
                    </strong>

                    <span>
                      {item.code ||
                        "—"}
                    </span>
                  </div>

                  <span className="status-pill">
                    Active
                  </span>
                </>
              )}
            />
          )}

          {adminPage ===
            "sessions" && (
            <AdminList
              title="Sessions"
              caption="SCHEDULE"
              data={
                adminSessions
              }
              empty="No session data returned by the backend."
              render={(item) => (
                <>
                  <div className="date-big">
                    <strong>
                      {formatTime(
                        item.startTime
                      )}
                    </strong>

                    <span>
                      {formatDate(
                        item.date
                      )}
                    </span>
                  </div>

                  <div className="list-main">
                    <strong>
                      {item.title ||
                        "Session"}
                    </strong>

                    <span>
                      {getCourseName(
                        item
                      )}
                    </span>
                  </div>

                  <span className="status-pill">
                    {item.status ||
                      "Scheduled"}
                  </span>
                </>
              )}
            />
          )}

          {adminPage === "attendance" && (
  <AdminList
    title="Attendance"
    caption="ATTENDANCE RECORDS"
    data={adminAttendance}
    empty="No attendance records found."
    render={(item) => (
  <>
    <div className="list-icon">
      ✓
    </div>

    <div className="list-main">
      <strong>
        {item.studentId?.name ||
          "Student"}
      </strong>

      <span>
        {item.sessionId?.courseSessionId?.courseId?.name ||
          "Course"}

        {item.sessionId?.courseSessionId?.courseId?.code
          ? ` · ${item.sessionId.courseSessionId.courseId.code}`
          : ""}

        {" · "}

        {item.sessionId?.courseSessionId?.title ||
          "Attendance Session"}
      </span>

      <span>
        {item.studentId?.email || "—"}
      </span>
    </div>

    <span className="status-pill">
      {item.status || "Present"}
    </span>
  </>
)}
  />
)}

          {adminPage ===
            "profile" && (
            <Profile type="admin" />
          )}
        </main>
      </div>
    </div>
  );

  /* =====================================================
     ROLE ROUTING
  ===================================================== */

  if (user.role === "trainer") {
    return <Trainer />;
  }

  if (user.role === "admin") {
    return <Admin />;
  }

  return <Student />;
}

export default App;