import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import type { Ref } from "vue";
import { fetchCourse, fetchCoursePacks } from "~/composables/jp/useJpCourses";
import type { JpCourse, JpCoursePack } from "~/types/jp";

export interface CourseOption {
  key: string;
  packId: string;
  label: string;
}

/**
 * 课程编辑器（jp-editor）的课程选择器（从 app/pages/jp-editor/index.vue 抽出，逻辑逐字搬移）。
 *
 * 单一数据源：`packs` / `courseOptions` / `selectedKey` / `groupOpen` 都只在本 composable 里持有；
 * 页面调用一次后把需要跨 composable 共享的 `courseOptions` / `selectedKey` / `loadCourse`
 * 作为参数注入其它 composable（导入、新建都只接收，不自己再 `fetchCoursePacks()`）。
 *
 * 参数 `course`：编辑器当前编辑的课程，新建/导入/加载三处都要改写它，所以由页面建一份 ref
 * 注入进来——**仍是同一份状态**，页面不新建第二份。
 *
 * 生命周期副作用（注册顺序与原页面一致）：`onMounted(loadCourseOptions)` 在本函数内注册，
 * 因此页面里「谁先调用本 composable」会决定它与其它 onMounted 的先后 —— 目前由页面在其它
 * onMounted 之后调用（见 index.vue 编排区）。
 */
export function useJpEditorPicker(course: Ref<JpCourse | null>) {
  // 课程选择器：列出「内置 + 已导入」的所有课程
  const packs = ref<JpCoursePack[]>([]);
  const selectedKey = ref("");
  const courseOptions = ref<CourseOption[]>([]);

  // 课程包 id → 标题（用于选择器分组标题，取不到时回退为 id）
  const packTitleById = computed(() => {
    const m = new Map<string, string>();
    for (const p of packs.value) m.set(p.id, p.title);
    return m;
  });

  // 按课程包分组的课程选项（编辑器下拉框用 optgroup 收纳，避免上百条平铺过密）
  const courseGroups = computed(() => {
    const groups: { packId: string; title: string; options: CourseOption[] }[] = [];
    const byId = new Map<string, { packId: string; title: string; options: CourseOption[] }>();
    for (const o of courseOptions.value) {
      let g = byId.get(o.packId);
      if (!g) {
        g = {
          packId: o.packId,
          title: packTitleById.value.get(o.packId) || o.packId,
          options: [],
        };
        byId.set(o.packId, g);
        groups.push(g);
      }
      g.options.push(o);
    }
    return groups;
  });

  // ===== 自定义课程选择器（可折叠文件夹，替代原生 optgroup） =====
  const pickerEl = ref<HTMLElement | null>(null);
  const pickerOpen = ref(false);
  // 哪些文件夹已展开
  const groupOpen = ref<Record<string, boolean>>({});

  // 当前选中课程的展示文字（带所属文件夹前缀）
  const selectedLabel = computed(() => {
    if (!selectedKey.value) return "";
    const opt = courseOptions.value.find((o) => o.key === selectedKey.value);
    if (!opt) return selectedKey.value;
    const title = packTitleById.value.get(opt.packId);
    return title ? `${title} · ${opt.label}` : opt.label;
  });

  function togglePicker() {
    pickerOpen.value = !pickerOpen.value;
  }

  function isGroupOpen(packId: string): boolean {
    return !!groupOpen.value[packId];
  }

  function toggleGroup(packId: string) {
    groupOpen.value[packId] = !groupOpen.value[packId];
  }

  function selectCourse(opt: CourseOption) {
    selectedKey.value = opt.key;
    pickerOpen.value = false;
    loadSelectedCourse();
  }

  // 点击面板外部时收起选择器
  function onDocumentClick(e: MouseEvent) {
    if (pickerEl.value && !pickerEl.value.contains(e.target as Node)) {
      pickerOpen.value = false;
    }
  }

  onMounted(() => document.addEventListener("click", onDocumentClick));
  onBeforeUnmount(() => document.removeEventListener("click", onDocumentClick));

  // 重新拉取「内置 + 导入」课程包并重建选择器选项（不含自动选中副作用）
  async function refreshCourseOptions() {
    packs.value = await fetchCoursePacks();
    const opts: CourseOption[] = [];
    for (const p of packs.value) {
      for (const cid of p.courses || []) {
        opts.push({ key: `${p.id}/${cid}`, packId: p.id, label: cid });
      }
    }
    courseOptions.value = opts;
  }

  async function loadCourseOptions() {
    try {
      await refreshCourseOptions();
      if (courseOptions.value.length && !selectedKey.value) {
        selectedKey.value = courseOptions.value[0].key;
        await loadSelectedCourse();
      }
    } catch (err) {
      console.error("加载课程列表失败：", err);
    }
  }

  function loadSelectedCourse() {
    if (!selectedKey.value) return;
    const idx = selectedKey.value.indexOf("/");
    const packId = selectedKey.value.slice(0, idx);
    const courseId = selectedKey.value.slice(idx + 1);
    loadCourse(packId, courseId);
  }

  async function loadCourse(packId: string, courseId: string) {
    try {
      course.value = await fetchCourse(packId, courseId);
    } catch (err) {
      alert("加载失败：" + (err as Error).message);
      course.value = null;
    }
  }

  // ===== 加载已有课程 =====
  onMounted(loadCourseOptions);

  return {
    packs,
    selectedKey,
    courseOptions,
    packTitleById,
    courseGroups,
    pickerEl,
    pickerOpen,
    groupOpen,
    selectedLabel,
    togglePicker,
    isGroupOpen,
    toggleGroup,
    selectCourse,
    onDocumentClick,
    refreshCourseOptions,
    loadCourseOptions,
    loadSelectedCourse,
    loadCourse,
  };
}
