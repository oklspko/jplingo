import { nextTick, reactive, ref } from "vue";
import type { Ref } from "vue";
import type { CourseOption } from "~/composables/jp/useJpEditorPicker";
import type { JpCourse } from "~/types/jp";

/**
 * 课程编辑器（jp-editor）的「新建课程」（从 app/pages/jp-editor/index.vue 抽出，逻辑逐字搬移）。
 *
 * 单一数据源：弹窗表单 `newCourse` 只在本 composable 里持有（模板直接 `v-model="newCourse.id"`，
 * 所以页面必须把返回的 reactive 对象解构出来，不能包一层）。
 *
 * 依赖注入：`course` / `courseOptions` / `selectedKey` 归 `useJpEditorPicker` 所有，
 * `addStatement` 归 `useJpEditorStatements` 所有；页面把它们的返回值原样传进来（不重复建状态）。
 */
export function useJpEditorCreate(deps: {
  course: Ref<JpCourse | null>;
  courseOptions: Ref<CourseOption[]>;
  selectedKey: Ref<string>;
  addStatement: () => void;
}) {
  // 新建弹窗
  const showCreateModal = ref(false);
  const newCourse = reactive({
    id: "",
    title: "",
    coursePackId: "my-pack",
  });

  function closeCreateModal() {
    showCreateModal.value = false;
  }

  function createCourse() {
    if (!newCourse.id || !newCourse.title) {
      alert("请填写课程 ID 和标题");
      return;
    }

    const packId = newCourse.coursePackId || "my-pack";
    deps.course.value = {
      id: newCourse.id,
      coursePackId: packId,
      title: newCourse.title,
      order: 1,
      statements: [],
    };

    // 同步到选择器
    const key = `${packId}/${newCourse.id}`;
    if (!deps.courseOptions.value.some((o) => o.key === key)) {
      deps.courseOptions.value.push({
        key,
        packId,
        label: newCourse.id,
      });
    }
    deps.selectedKey.value = key;

    // 自动加一条空句子
    deps.addStatement();

    // 关闭弹窗，重置表单
    showCreateModal.value = false;
    newCourse.id = "";
    newCourse.title = "";
    newCourse.coursePackId = "my-pack";

    nextTick(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  return { showCreateModal, newCourse, closeCreateModal, createCourse };
}
