import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const STORAGE_KEY = "teacherTimetableDataV1";
const CLOUD_SYNC_ENABLED = false;

const firebaseConfig = {
  apiKey: "AIzaSyAgTwRN7JcVKnCd7HmcnQS0RxNmQ91ZXjg",
  authDomain: "teachertimetable-9a90d.firebaseapp.com",
  projectId: "teachertimetable-9a90d",
  storageBucket: "teachertimetable-9a90d.firebasestorage.app",
  messagingSenderId: "968665767069",
  appId: "1:968665767069:web:0d92dde0edc725fc284874"
};

export const state = loadLocalState();

let cloudDoc = null;
let savingCloud = false;
let handlers = {
  onCloudChange: () => {},
  onStatus: () => {},
  onToast: () => {}
};

export function initCloud(nextHandlers = {}) {
  handlers = { ...handlers, ...nextHandlers };

  if (!CLOUD_SYNC_ENABLED) {
    handlers.onStatus("Local save");
    return;
  }

  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    cloudDoc = doc(db, "teacherTimetable", "main");
    handlers.onStatus("Connecting...");

    onSnapshot(
      cloudDoc,
      snapshot => {
        if (!snapshot.exists()) {
          saveState();
          handlers.onStatus("Synced");
          return;
        }

        const data = snapshot.data();
        state.teachers = Array.isArray(data.teachers) ? data.teachers.map(normalizeTeacher) : [];
        state.lectures = Array.isArray(data.lectures) ? data.lectures.map(normalizeLecture) : [];
        saveLocalState();
        handlers.onStatus("Synced");
        handlers.onCloudChange();
      },
      () => {
        handlers.onStatus("Offline");
        handlers.onToast("Firebase is not reachable. Using local data.", "error");
      }
    );
  } catch {
    handlers.onStatus("Offline");
  }
}

export function saveState() {
  saveLocalState();
  if (!cloudDoc || savingCloud) return;

  savingCloud = true;
  handlers.onStatus("Saving...");

  setDoc(cloudDoc, {
    teachers: state.teachers.map(({ password, ...teacher }) => teacher),
    lectures: state.lectures,
    updatedAt: new Date().toISOString()
  })
    .then(() => handlers.onStatus("Synced"))
    .catch(() => {
      handlers.onStatus("Offline");
      handlers.onToast("Saved on this device. Firebase sync failed.", "error");
    })
    .finally(() => {
      savingCloud = false;
    });
}

export function createId() {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function normalizeTeacher(teacher) {
  return {
    id: teacher.id || createId(),
    name: teacher.name || "",
    subject: teacher.subject || "",
    username: teacher.username || "",
    password: teacher.password || "",
    passwordHash: teacher.passwordHash || ""
  };
}

export function normalizeLecture(lecture) {
  return {
    ...lecture,
    id: lecture.id || createId(),
    teacherId: lecture.teacherId || "",
    day: lecture.day || "",
    startTime: lecture.startTime || lecture.time || "",
    endTime: lecture.endTime || lecture.time || "",
    subject: lecture.subject || "",
    school: lecture.school || "",
    grade: lecture.grade || ""
  };
}

function loadLocalState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return { teachers: [], lectures: [] };
  }

  try {
    const parsed = JSON.parse(saved);
    return {
      teachers: Array.isArray(parsed.teachers) ? parsed.teachers.map(normalizeTeacher) : [],
      lectures: Array.isArray(parsed.lectures) ? parsed.lectures.map(normalizeLecture) : []
    };
  } catch {
    return { teachers: [], lectures: [] };
  }
}

function saveLocalState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
