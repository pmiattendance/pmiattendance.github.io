import { createTeacherAccount, loadSession, loginUser, migratePlainTeacherPasswords, saveSession } from "./auth.js?v=20260504-working-tabs";
import { createId, initCloud, saveState, state } from "./db.js?v=20260504-working-tabs";
import {
  closeConfirm,
  dom,
  fillTeacherSubject,
  hasTimeConflict,
  openConfirm,
  render,
  showScreen,
  showToast,
  updateSyncStatus,
  wireAdminTabs
} from "./ui.js?v=20260504-working-tabs";

let currentUser = loadSession();

initCloud({
  onCloudChange: () => {
    restoreSession();
    renderCurrentView();
    migratePlainTeacherPasswords(state.teachers, () => {
      saveState();
      renderCurrentView();
    });
  },
  onStatus: updateSyncStatus,
  onToast: showToast
});

wireEvents();
wireAdminTabs(() => renderCurrentView());
restoreSession();
renderCurrentView();
migratePlainTeacherPasswords(state.teachers, () => {
  saveState();
  renderCurrentView();
});

function wireEvents() {
  dom.loginForm?.addEventListener("submit", handleLogin);
  dom.teacherForm?.addEventListener("submit", handleTeacherCreate);
  dom.lectureForm?.addEventListener("submit", handleLectureCreate);
  dom.lectureTeacher?.addEventListener("change", () => fillTeacherSubject(state));
  dom.lectureSearch?.addEventListener("input", () => renderCurrentView());
  dom.deleteAllBtn?.addEventListener("click", deleteAllTimetables);
  dom.logoutBtn?.addEventListener("click", logout);
  dom.confirmNo?.addEventListener("click", closeConfirm);

  document.addEventListener("click", event => {
    const teacherButton = event.target.closest("[data-delete-teacher]");
    if (teacherButton) {
      deleteTeacher(teacherButton.dataset.deleteTeacher);
      return;
    }

    const lectureButton = event.target.closest("[data-delete-lecture]");
    if (lectureButton) {
      deleteLecture(lectureButton.dataset.deleteLecture);
    }
  });
}

function renderCurrentView() {
  render(state, currentUser);
}

async function handleLogin(event) {
  event.preventDefault();
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;
  const notice = document.getElementById("loginNotice");
  notice.style.color = "var(--red)";

  const result = await loginUser({
    username,
    password,
    teachers: state.teachers,
    onPasswordUpgrade: saveState
  });

  if (!result.ok) {
    notice.textContent = result.message;
    return;
  }

  currentUser = result.user;
  saveSession(currentUser);
  notice.textContent = "";
  restoreSession();
  showToast("Logged in", "success");
}

async function handleTeacherCreate(event) {
  event.preventDefault();
  const notice = document.getElementById("teacherNotice");
  notice.style.color = "var(--red)";

  const result = await createTeacherAccount({
    name: document.getElementById("teacherName").value.trim(),
    subject: document.getElementById("teacherSubject").value.trim(),
    username: document.getElementById("teacherUsername").value.trim(),
    password: document.getElementById("teacherPassword").value,
    teachers: state.teachers,
    createId
  });

  if (!result.ok) {
    notice.textContent = result.message;
    return;
  }

  state.teachers.push(result.teacher);
  saveState();
  event.target.reset();
  notice.style.color = "var(--green)";
  notice.textContent = "Teacher account created.";
  showToast("Teacher account created", "success");
  renderCurrentView();
}

function handleLectureCreate(event) {
  event.preventDefault();
  const teacherId = document.getElementById("lectureTeacher").value;
  const day = document.getElementById("lectureDay").value;
  const startTime = document.getElementById("lectureStartTime").value;
  const endTime = document.getElementById("lectureEndTime").value;
  const subject = document.getElementById("lectureSubject").value.trim();
  const school = document.getElementById("lectureSchool").value.trim();
  const grade = document.getElementById("lectureGrade").value.trim();
  const notice = document.getElementById("lectureNotice");
  notice.style.color = "var(--red)";

  if (!teacherId) {
    notice.textContent = "Create a teacher first.";
    return;
  }

  if (endTime <= startTime) {
    notice.textContent = "Ending time should be after starting time.";
    return;
  }

  if (hasTimeConflict(state.lectures, teacherId, day, startTime, endTime)) {
    notice.textContent = "This teacher already has a lecture at that time.";
    showToast("Time conflict found", "error");
    return;
  }

  state.lectures.push({
    id: createId(),
    teacherId,
    day,
    startTime,
    endTime,
    subject,
    school,
    grade
  });

  saveState();
  event.target.reset();
  notice.style.color = "var(--green)";
  notice.textContent = "Lecture added.";
  showToast("Lecture added", "success");
  renderCurrentView();
}

function deleteAllTimetables() {
  openConfirm("Delete Timetables", "All timetable entries will be deleted. Teacher accounts will stay saved.", () => {
    state.lectures = [];
    currentUser = { role: "admin" };
    saveSession(currentUser);
    saveState();
    showToast("All timetables deleted", "success");
    renderCurrentView();
  });
}

function deleteTeacher(teacherId) {
  const teacher = state.teachers.find(item => item.id === teacherId);
  if (!teacher) return;

  openConfirm("Delete Teacher", `${teacher.name} and their lectures will be deleted.`, () => {
    state.teachers = state.teachers.filter(item => item.id !== teacherId);
    state.lectures = state.lectures.filter(item => item.teacherId !== teacherId);

    if (currentUser?.teacherId === teacherId) {
      currentUser = null;
      saveSession(null);
      showScreen("login");
    }

    saveState();
    showToast("Teacher deleted", "success");
    renderCurrentView();
  });
}

function deleteLecture(lectureId) {
  openConfirm("Delete Lecture", "This lecture will be removed from the timetable.", () => {
    state.lectures = state.lectures.filter(item => item.id !== lectureId);
    saveState();
    showToast("Lecture deleted", "success");
    renderCurrentView();
  });
}

function restoreSession() {
  if (!currentUser) {
    showScreen("login");
    return;
  }

  if (currentUser.role === "admin") {
    showScreen("admin");
    return;
  }

  if (currentUser.role === "teacher" && state.teachers.some(teacher => teacher.id === currentUser.teacherId)) {
    showScreen("teacher");
    return;
  }

  currentUser = null;
  saveSession(null);
  showScreen("login");
}

function logout() {
  currentUser = null;
  saveSession(null);
  dom.loginForm.reset();
  showScreen("login");
}
