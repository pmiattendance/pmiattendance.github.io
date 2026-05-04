const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

let toastTimer = null;
let activeAdminTab = "teachersPanel";

export const dom = {
  loginScreen: document.getElementById("loginScreen"),
  adminScreen: document.getElementById("adminScreen"),
  teacherScreen: document.getElementById("teacherScreen"),
  appHeader: document.getElementById("appHeader"),
  logoutBtn: document.getElementById("logoutBtn"),
  pageTitle: document.getElementById("pageTitle"),
  syncStatus: document.getElementById("syncStatus"),
  toast: document.getElementById("toast"),
  loginForm: document.getElementById("loginForm"),
  teacherForm: document.getElementById("teacherForm"),
  lectureForm: document.getElementById("lectureForm"),
  lectureTeacher: document.getElementById("lectureTeacher"),
  lectureSubject: document.getElementById("lectureSubject"),
  lectureSearch: document.getElementById("lectureSearch"),
  deleteAllBtn: document.getElementById("deleteAllBtn"),
  adminStats: document.getElementById("adminStats"),
  teacherList: document.getElementById("teacherList"),
  adminTable: document.getElementById("adminTable"),
  teacherWelcome: document.getElementById("teacherWelcome"),
  teacherMeta: document.getElementById("teacherMeta"),
  teacherTable: document.getElementById("teacherTable"),
  confirmModal: document.getElementById("confirmModal"),
  confirmTitle: document.getElementById("confirmTitle"),
  confirmMessage: document.getElementById("confirmMessage"),
  confirmYes: document.getElementById("confirmYes"),
  confirmNo: document.getElementById("confirmNo")
};

function setHtml(container, html) {
  if (!container) return;
  container.innerHTML = html;
}

function setText(container, text) {
  if (!container) return;
  container.textContent = text;
}

function setValue(container, value) {
  if (!container) return;
  container.value = value;
}

export function render(state, currentUser) {
  renderAdminStats(state);
  renderTeacherSelect(state);
  renderTeacherList(state);
  renderAdminLectures(state);
  renderTeacherDashboard(state, currentUser);
}

export function showScreen(screenName) {
  dom.loginScreen?.classList.toggle("active", screenName === "login");
  dom.adminScreen?.classList.toggle("active", screenName === "admin");
  dom.teacherScreen?.classList.toggle("active", screenName === "teacher");
  if (dom.appHeader) dom.appHeader.style.display = screenName === "login" ? "none" : "flex";
  if (dom.logoutBtn) dom.logoutBtn.style.display = screenName === "login" ? "none" : "inline-flex";

  if (screenName === "admin") {
    setText(dom.pageTitle, "Admin Dashboard");
  }

  if (screenName === "teacher") {
    setText(dom.pageTitle, "Teacher Dashboard");
  }
}

export function fillTeacherSubject(state) {
  if (!dom.lectureTeacher || !dom.lectureSubject) return;
  const teacher = state.teachers.find(item => item.id === dom.lectureTeacher.value);
  setValue(dom.lectureSubject, teacher ? teacher.subject : "");
}

export function showToast(message, type = "") {
  if (!dom.toast) return;
  clearTimeout(toastTimer);
  setText(dom.toast, message);
  dom.toast.className = `toast show ${type}`;
  toastTimer = setTimeout(() => {
    dom.toast.className = "toast";
  }, 2600);
}

export function updateSyncStatus(message) {
  setText(dom.syncStatus, message);
}

export function openConfirm(title, message, action) {
  setText(dom.confirmTitle, title);
  setText(dom.confirmMessage, message);
  dom.confirmModal?.classList.add("show");
  if (!dom.confirmYes) return;
  dom.confirmYes.onclick = () => {
    closeConfirm();
    action();
  };
}

export function closeConfirm() {
  dom.confirmModal?.classList.remove("show");
  if (dom.confirmYes) dom.confirmYes.onclick = null;
}

export function getActiveAdminTab() {
  return activeAdminTab;
}

export function wireAdminTabs(onTabChange = () => {}) {
  document.querySelectorAll("[data-mobile-tab]").forEach(button => {
    button.addEventListener("click", () => {
      activeAdminTab = button.dataset.mobileTab;

      document.querySelectorAll("[data-mobile-tab]").forEach(tab => {
        tab.classList.toggle("active", tab === button);
      });

      document.querySelectorAll(".mobile-tab-section").forEach(section => {
        section.classList.toggle("active", section.id === activeAdminTab);
      });

      onTabChange(activeAdminTab);
    });
  });
}

export function sortedLectures(lectures) {
  return [...lectures].sort((a, b) => {
    const dayCompare = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
    if (dayCompare !== 0) return dayCompare;
    return (a.startTime || "").localeCompare(b.startTime || "");
  });
}

function renderAdminStats(state) {
  const schools = new Set(state.lectures.map(lecture => lecture.school.trim()).filter(Boolean));

  setHtml(dom.adminStats, `
    <div class="mini-stat">
      <span>Teachers</span>
      <strong>${state.teachers.length}</strong>
    </div>
    <div class="mini-stat">
      <span>Lectures</span>
      <strong>${state.lectures.length}</strong>
    </div>
    <div class="mini-stat">
      <span>Schools</span>
      <strong>${schools.size}</strong>
    </div>
  `);
}

function renderTeacherSelect(state) {
  if (!dom.lectureTeacher || !dom.lectureSubject) return;

  if (!state.teachers.length) {
    setHtml(dom.lectureTeacher, `<option value="">No teachers added yet</option>`);
    setValue(dom.lectureSubject, "");
    return;
  }

  const currentValue = dom.lectureTeacher.value;
  setHtml(dom.lectureTeacher, state.teachers
    .map(teacher => `<option value="${escapeHtml(teacher.id)}">${escapeHtml(teacher.name)}</option>`)
    .join(""));

  if (currentValue && state.teachers.some(teacher => teacher.id === currentValue)) {
    dom.lectureTeacher.value = currentValue;
  }

  fillTeacherSubject(state);
}

function renderTeacherList(state) {
  if (!state.teachers.length) {
    setHtml(dom.teacherList, `<div class="empty">No teacher accounts yet.</div>`);
    return;
  }

  setHtml(dom.teacherList, state.teachers.map(teacher => {
    const lectureCount = state.lectures.filter(lecture => lecture.teacherId === teacher.id).length;
    return `
      <div class="item">
        <div>
          <strong>${escapeHtml(teacher.name)}</strong>
          <span>${escapeHtml(teacher.subject)} - Username: ${escapeHtml(teacher.username)}</span>
        </div>
        <div class="item-actions">
          <span class="pill">${lectureCount} classes</span>
          <button class="btn danger small" data-delete-teacher="${escapeHtml(teacher.id)}">Delete Teacher</button>
        </div>
      </div>
    `;
  }).join(""));
}

function renderAdminLectures(state) {
  if (!dom.lectureSearch || !dom.adminTable) return;

  const query = dom.lectureSearch.value.trim().toLowerCase();
  const lectures = filterLectures(state, state.lectures, query);

  if (!lectures.length) {
    const empty = `<div class="empty">${query ? "No lectures match your search." : "No lectures added yet."}</div>`;
    setHtml(dom.adminTable, empty);
    return;
  }

  setHtml(dom.adminTable, renderLectureTable(state, lectures, true));
}

function renderTeacherDashboard(state, currentUser) {
  if (!currentUser || currentUser.role !== "teacher") return;

  const teacher = state.teachers.find(item => item.id === currentUser.teacherId);
  if (!teacher) {
    setHtml(dom.teacherTable, `<div class="empty">Teacher account was not found.</div>`);
    return;
  }

  setText(dom.teacherWelcome, `${teacher.name}'s Timetable`);
  setText(dom.teacherMeta, `Subject: ${teacher.subject}`);

  const lectures = sortedLectures(state.lectures.filter(item => item.teacherId === teacher.id));
  if (!lectures.length) {
    setHtml(dom.teacherTable, `<div class="empty">No lectures assigned yet.</div>`);
    return;
  }

  setHtml(dom.teacherTable, renderLectureTable(state, lectures, false));
}

function filterLectures(state, lectures, query) {
  return sortedLectures(lectures).filter(lecture => {
    const teacher = state.teachers.find(item => item.id === lecture.teacherId);
    const searchable = [
      teacher ? teacher.name : "",
      lecture.day,
      lecture.startTime,
      lecture.endTime,
      lecture.subject,
      lecture.school,
      lecture.grade
    ].join(" ").toLowerCase();

    return searchable.includes(query);
  });
}

function renderLectureTable(state, lectures, adminMode) {
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            ${adminMode ? "<th>Teacher</th>" : ""}
            <th>Day</th>
            <th>Time</th>
            <th>Subject</th>
            <th>School</th>
            <th>Grade</th>
            ${adminMode ? "<th>Action</th>" : ""}
          </tr>
        </thead>
        <tbody>
          ${lectures.map(lecture => {
            const teacher = state.teachers.find(item => item.id === lecture.teacherId);
            return `
              <tr>
                ${adminMode ? `<td><strong>${escapeHtml(teacher ? teacher.name : "Unknown")}</strong></td>` : ""}
                <td>${escapeHtml(lecture.day)}</td>
                <td>${formatTimeRange(lecture)}</td>
                <td><strong>${escapeHtml(lecture.subject)}</strong></td>
                <td>${escapeHtml(lecture.school)}</td>
                <td><span class="pill">${escapeHtml(lecture.grade)}</span></td>
                ${adminMode ? `<td><button class="btn danger small" data-delete-lecture="${escapeHtml(lecture.id)}">Delete</button></td>` : ""}
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
    <div class="mobile-cards">
      ${lectures.map(lecture => renderLectureCard(state, lecture, adminMode)).join("")}
    </div>
  `;
}

function renderLectureCard(state, lecture, adminMode) {
  const teacher = state.teachers.find(item => item.id === lecture.teacherId);

  return `
    <article class="lecture-card">
      <div class="lecture-card-head">
        <div>
          <strong>${escapeHtml(lecture.subject)}</strong>
          <p class="subtle">${adminMode ? escapeHtml(teacher ? teacher.name : "Unknown teacher") : escapeHtml(lecture.day)}</p>
        </div>
        <span class="lecture-time">${formatTimeRange(lecture)}</span>
      </div>
      <div class="detail-grid">
        <div class="detail"><span>Day</span><strong>${escapeHtml(lecture.day)}</strong></div>
        <div class="detail"><span>School</span><strong>${escapeHtml(lecture.school)}</strong></div>
        <div class="detail"><span>Grade</span><strong>${escapeHtml(lecture.grade)}</strong></div>
        <div class="detail"><span>Teacher</span><strong>${escapeHtml(teacher ? teacher.name : "Unknown")}</strong></div>
      </div>
      ${adminMode ? `<button class="btn danger small" data-delete-lecture="${escapeHtml(lecture.id)}">Delete Lecture</button>` : ""}
    </article>
  `;
}

export function hasTimeConflict(lectures, teacherId, day, startTime, endTime, ignoredLectureId = "") {
  return lectures.some(lecture =>
    lecture.id !== ignoredLectureId &&
    lecture.teacherId === teacherId &&
    lecture.day === day &&
    !(endTime <= lecture.startTime || startTime >= lecture.endTime)
  );
}

export function formatTime(time) {
  if (!time) return "";
  const [hourValue, minute] = time.split(":");
  let hour = Number(hourValue);
  const suffix = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${suffix}`;
}

export function formatTimeRange(lecture) {
  const start = formatTime(lecture.startTime || lecture.time);
  const end = formatTime(lecture.endTime || lecture.time);
  if (start && end && start !== end) return `${start} - ${end}`;
  return start || end || "";
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
