const SESSION_KEY = "teacherTimetableSessionV1";
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD_HASH = "9521c097456ee274881515f2536a109a4a6b95c83325a55f71c551edfdcb70c4";

export function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

export function saveSession(user) {
  if (!user) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }

  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export async function loginUser({ username, password, teachers, onPasswordUpgrade }) {
  const passwordHash = await hashPassword(password);

  if (username === ADMIN_USERNAME && passwordHash === ADMIN_PASSWORD_HASH) {
    return { ok: true, user: { role: "admin" } };
  }

  const teacher = teachers.find(
    item => item.username === username && (item.passwordHash === passwordHash || item.password === password)
  );

  if (!teacher) {
    return { ok: false, message: "Invalid username or password." };
  }

  if (!teacher.passwordHash) {
    teacher.passwordHash = passwordHash;
    delete teacher.password;
    onPasswordUpgrade();
  }

  return { ok: true, user: { role: "teacher", teacherId: teacher.id } };
}

export async function createTeacherAccount({ name, subject, username, password, teachers, createId }) {
  if (!name || !subject || !username || !password) {
    return { ok: false, message: "Please fill every teacher account field." };
  }

  if (username === ADMIN_USERNAME || teachers.some(item => item.username === username)) {
    return { ok: false, message: "This username is already used." };
  }

  return {
    ok: true,
    teacher: {
      id: createId(),
      name,
      subject,
      username,
      passwordHash: await hashPassword(password)
    }
  };
}

export async function migratePlainTeacherPasswords(teachers, onMigrated) {
  const teachersWithPlainPasswords = teachers.filter(teacher => teacher.password && !teacher.passwordHash);
  if (!teachersWithPlainPasswords.length) return;

  for (const teacher of teachersWithPlainPasswords) {
    teacher.passwordHash = await hashPassword(teacher.password);
    delete teacher.password;
  }

  onMigrated();
}

export async function hashPassword(password) {
  const bytes = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}
