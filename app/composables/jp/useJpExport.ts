import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { fetchCoursePacks, fetchCourse } from "~/composables/jp/useJpCourses";
import type { JpCourse, JpCoursePack } from "~/types/jp";

// 跨平台保存/分享 JSON 文件：
// - 网页：用 <a download> 触发浏览器下载；
// - App（Capacitor）：写入缓存目录后用系统分享面板让用户保存/转发。
export async function saveOrShareJson(
  obj: unknown,
  filename: string,
): Promise<void> {
  const json = JSON.stringify(obj, null, 2);

  if (Capacitor.isNativePlatform()) {
    const result = await Filesystem.writeFile({
      path: filename,
      data: json,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Share.share({
      title: filename,
      url: result.uri,
      dialogTitle: "保存 / 分享课程包",
    });
    return;
  }

  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // 延迟释放，避免个别浏览器在下载开始前就回收 URL
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// 把当前单课包装成「单文件课程包」，可直接在首页「导入课程包」导入
export function buildSingleCoursePack(course: JpCourse): {
  coursePacks: JpCoursePack[];
  courses: Record<string, JpCourse>;
} {
  const packId = course.coursePackId || "my-pack";
  const courseId = course.id || "lesson-01";
  return {
    coursePacks: [
      {
        id: packId,
        title: course.title || packId,
        language: "ja",
        level: "N5",
        description: "",
        courses: [courseId],
      },
    ],
    courses: { [`${packId}/${courseId}`]: course },
  };
}

// 收集课程页上的「所有课程」（内置 + 已导入），打包成单文件课程包
export async function buildAllCoursesPack(): Promise<{
  coursePacks: JpCoursePack[];
  courses: Record<string, JpCourse>;
}> {
  const packs = await fetchCoursePacks();
  const courses: Record<string, JpCourse> = {};
  for (const p of packs) {
    for (const courseId of p.courses || []) {
      try {
        const course = await fetchCourse(p.id, courseId);
        courses[`${p.id}/${courseId}`] = course;
      } catch (err) {
        console.error(`收集课程失败：${p.id}/${courseId}`, err);
      }
    }
  }
  return { coursePacks: packs, courses };
}
