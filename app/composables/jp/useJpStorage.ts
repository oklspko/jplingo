import { ref, onMounted, watch } from "vue";
import { useJpSupabaseClient, getCurrentUserId, currentUser } from "~/composables/jp/useJpAuth";

const STORAGE_KEY = "jp-lingo-study-record";

export interface StudyRecord {
  courseCount: number;
  statementCount: number;
  masteredCount: number;
  totalSeconds: number;
  todaySeconds: number;
  todayStatements: number;
  days: string[];
  lastActiveDate: string;
  studiedCourses: string[];
  studiedStatements: string[];
  masteredStatements: string[];
  completedCourses: string[];
}

const defaultRecord = (): StudyRecord => ({
  courseCount: 0,
  statementCount: 0,
  masteredCount: 0,
  totalSeconds: 0,
  todaySeconds: 0,
  todayStatements: 0,
  days: [],
  lastActiveDate: "",
  studiedCourses: [],
  studiedStatements: [],
  masteredStatements: [],
  completedCourses: [],
});

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function loadRecord(): StudyRecord {
  if (typeof window === "undefined") return defaultRecord();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultRecord();
    const data = JSON.parse(raw);
    const today = todayStr();
    if (data.lastActiveDate !== today) {
      data.todaySeconds = 0;
      data.todayStatements = 0;
    }
    return { ...defaultRecord(), ...data };
  } catch {
    return defaultRecord();
  }
}

let cloudSaveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleCloudSave(userId: string, record: StudyRecord) {
  if (cloudSaveTimer) clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(async () => {
    try {
      await useJpSupabaseClient().from("study_records").upsert({
        user_id: userId,
        data: record,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error("学习记录云同步失败：", err);
    }
  }, 1500);
}

function saveRecord(record: StudyRecord) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  const userId = getCurrentUserId();
  if (userId) scheduleCloudSave(userId, record);
}

async function loadCloudRecord(userId: string): Promise<StudyRecord | null> {
  const { data, error } = await useJpSupabaseClient()
    .from("study_records")
    .select("data")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data?.data as StudyRecord) ?? null;
}

function union<T>(a: T[], b: T[]): T[] {
  return Array.from(new Set([...a, ...b]));
}

// 合并「本地离线记录」与「云端记录」：数组取并集，计数据此重算，
// 总时长取较大值，避免离线进度被云端覆盖或时长重复累加。
function mergeRecords(local: StudyRecord, cloud: StudyRecord): StudyRecord {
  const studiedCourses = union(local.studiedCourses, cloud.studiedCourses);
  const studiedStatements = union(local.studiedStatements, cloud.studiedStatements);
  const masteredStatements = union(local.masteredStatements, cloud.masteredStatements);
  const completedCourses = union(local.completedCourses, cloud.completedCourses);
  return {
    ...defaultRecord(),
    ...cloud,
    ...local,
    days: union(local.days, cloud.days),
    studiedCourses,
    studiedStatements,
    masteredStatements,
    completedCourses,
    courseCount: studiedCourses.length,
    statementCount: studiedStatements.length,
    masteredCount: masteredStatements.length,
    totalSeconds: Math.max(local.totalSeconds, cloud.totalSeconds),
  };
}

export function useJpStorage() {
  const record = ref<StudyRecord>(defaultRecord());

  // 登录后从云端拉取记录并与本地合并（本地离线进度不丢失），再回写云端
  async function syncFromCloud(userId: string) {
    try {
      const cloud = await loadCloudRecord(userId);
      if (cloud) {
        record.value = mergeRecords(record.value, cloud);
      }
      saveRecord(record.value);
    } catch (err) {
      console.error("加载云端学习记录失败：", err);
    }
  }

  onMounted(() => {
    record.value = loadRecord();

    // 已登录（会话恢复）则立即同步
    const userId = getCurrentUserId();
    if (userId) syncFromCloud(userId);

    // 监听登录状态：登录 → 同步云端；退出 → 继续纯本地
    watch(currentUser, (u) => {
      const id = u?.id ?? null;
      if (id) syncFromCloud(id);
    });
  });

  function recordStatement(courseId: string, statementId: string) {
    const today = todayStr();
    const r = record.value;
    if (r.lastActiveDate !== today) {
      r.todaySeconds = 0;
      r.todayStatements = 0;
      r.lastActiveDate = today;
    }
    if (!r.days.includes(today)) r.days.push(today);
    if (!r.studiedCourses.includes(courseId)) {
      r.studiedCourses.push(courseId);
      r.courseCount = r.studiedCourses.length;
    }
    const key = `${courseId}/${statementId}`;
    if (!r.studiedStatements.includes(key)) {
      r.studiedStatements.push(key);
      r.statementCount = r.studiedStatements.length;
      r.todayStatements++;
    }
    saveRecord(r);
  }

  function recordCourseCompleted(courseId: string) {
    const r = record.value;
    if (!r.completedCourses.includes(courseId)) {
      r.completedCourses.push(courseId);
      saveRecord(r);
    }
  }

  function recordMastered(courseId: string, statementId: string) {
    const key = `${courseId}/${statementId}`;
    const r = record.value;
    if (!r.masteredStatements.includes(key)) {
      r.masteredStatements.push(key);
      r.masteredCount = r.masteredStatements.length;
      saveRecord(r);
    }
  }

  function addStudyTime(seconds: number) {
    const today = todayStr();
    const r = record.value;
    if (r.lastActiveDate !== today) {
      r.todaySeconds = 0;
      r.lastActiveDate = today;
    }
    r.totalSeconds += seconds;
    r.todaySeconds += seconds;
    saveRecord(r);
  }

  function resetRecord() {
    record.value = defaultRecord();
    saveRecord(record.value);
  }

  // 主动同步：登录用户手动把本地记录与云端双向合并（拉取云端 → 合并 → 回写云端）
  async function syncNow(): Promise<"synced" | "noop" | "error"> {
    const userId = getCurrentUserId();
    if (!userId) return "noop";
    try {
      const cloud = await loadCloudRecord(userId);
      if (cloud) {
        record.value = mergeRecords(record.value, cloud);
      }
      await useJpSupabaseClient()
        .from("study_records")
        .upsert({ user_id: userId, data: record.value, updated_at: new Date().toISOString() });
      saveRecord(record.value);
      return "synced";
    } catch (err) {
      console.error("手动同步失败：", err);
      return "error";
    }
  }

  return { record, recordStatement, recordMastered, recordCourseCompleted, addStudyTime, resetRecord, syncNow };
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} 秒`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h} 小时 ${m} 分`;
  return `${m} 分钟`;
}

export function calcStreak(days: string[]): number {
  if (days.length === 0) return 0;
  const sorted = [...days].sort().reverse();
  const today = todayStr();
  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;

  let streak = 0;
  let current = sorted[0];
  for (const day of sorted) {
    if (day === current) {
      streak++;
      const d = new Date(current);
      d.setDate(d.getDate() - 1);
      current = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    } else break;
  }
  return streak;
}
