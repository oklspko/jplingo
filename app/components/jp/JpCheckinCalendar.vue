<template>
  <div class="cal-card">
    <div class="cal-header">
      <button class="cal-nav" aria-label="上个月" @click="prevMonth">‹</button>
      <div class="cal-title">
        <span class="cal-month">{{ monthLabel }}</span>
        <button class="cal-today" @click="goToday">今天</button>
      </div>
      <button class="cal-nav" aria-label="下个月" @click="nextMonth">›</button>
    </div>

    <div class="cal-week">
      <span v-for="w in WEEK" :key="w" class="cal-weekday">{{ w }}</span>
    </div>

    <div class="cal-grid">
      <template v-for="(cell, i) in cells" :key="i">
        <div
          v-if="cell"
          class="cal-day"
          :class="{ checked: cell.isChecked, today: cell.isToday, future: cell.isFuture }"
        >
          <span class="cal-num">{{ cell.day }}</span>
          <span v-if="cell.isChecked" class="cal-check">✓</span>
        </div>
        <div v-else class="cal-day blank"></div>
      </template>
    </div>

    <div class="cal-legend">
      <span class="legend-item"><span class="dot checked" />已打卡</span>
      <span class="legend-item"><span class="dot today" />今天</span>
      <span class="legend-stat">本月打卡 {{ checkedThisMonth }} 天</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

const props = defineProps<{ days: string[] }>();

const WEEK = ["一", "二", "三", "四", "五", "六", "日"];

const pad = (n: number) => String(n).padStart(2, "0");
const toStr = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

const now = new Date();
const viewYear = ref(now.getFullYear());
const viewMonth = ref(now.getMonth()); // 0-based

const todayStr = toStr(now.getFullYear(), now.getMonth(), now.getDate());
const checkedSet = computed(() => new Set(props.days));

const monthLabel = computed(() => `${viewYear.value} 年 ${viewMonth.value + 1} 月`);

const cells = computed(() => {
  const first = new Date(viewYear.value, viewMonth.value, 1);
  const startOffset = (first.getDay() + 6) % 7; // 周一开头
  const daysInMonth = new Date(viewYear.value, viewMonth.value + 1, 0).getDate();
  const arr: Array<{ day: number; dateStr: string; isChecked: boolean; isToday: boolean; isFuture: boolean } | null> = [];
  for (let i = 0; i < startOffset; i++) arr.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = toStr(viewYear.value, viewMonth.value, d);
    arr.push({
      day: d,
      dateStr: ds,
      isChecked: checkedSet.value.has(ds),
      isToday: ds === todayStr,
      isFuture: ds > todayStr,
    });
  }
  return arr;
});

const checkedThisMonth = computed(
  () => cells.value.filter((c) => c && c.isChecked).length,
);

function prevMonth() {
  viewMonth.value--;
  if (viewMonth.value < 0) {
    viewMonth.value = 11;
    viewYear.value--;
  }
}
function nextMonth() {
  viewMonth.value++;
  if (viewMonth.value > 11) {
    viewMonth.value = 0;
    viewYear.value++;
  }
}
function goToday() {
  viewYear.value = now.getFullYear();
  viewMonth.value = now.getMonth();
}
</script>

<style scoped>
.cal-card {
  background: #ffffff;
  border: 1px solid #e8f6ff;
  border-radius: 16px;
  padding: 20px 20px 16px;
  box-shadow: 0 2px 12px rgba(186, 230, 253, 0.15);
}

.cal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.cal-nav {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid #e0f2fe;
  background: #f5fbff;
  color: #0369a1;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cal-nav:hover {
  background: #e0f2fe;
  border-color: #bae6fd;
}

.cal-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cal-month {
  font-size: 17px;
  font-weight: 600;
  color: #075985;
}

.cal-today {
  padding: 4px 12px;
  border-radius: 8px;
  border: 1px solid #bae6fd;
  background: #f0f9ff;
  color: #0284c7;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}
.cal-today:hover {
  background: #e0f2fe;
}

.cal-week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  margin-bottom: 6px;
}

.cal-weekday {
  text-align: center;
  font-size: 12px;
  color: #7dd3fc;
  font-weight: 600;
  padding: 4px 0;
}

.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}

.cal-day {
  aspect-ratio: 1;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  background: #fbfeff;
  border: 1px solid transparent;
  transition: all 0.15s;
}

.cal-day.blank {
  background: transparent;
}

.cal-day.future {
  color: #d4e6f0;
}

.cal-num {
  font-size: 14px;
  color: #5b7a8c;
  font-weight: 500;
}

.cal-day.today {
  border-color: #38bdf8;
  box-shadow: 0 0 0 1px #38bdf8 inset;
}
.cal-day.today .cal-num {
  color: #0284c7;
  font-weight: 700;
}

.cal-day.checked {
  background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
  box-shadow: 0 4px 10px rgba(16, 185, 129, 0.35);
}
.cal-day.checked .cal-num {
  color: #ffffff;
  font-weight: 700;
}
.cal-day.checked.today {
  border-color: #0284c7;
  box-shadow: 0 0 0 1px #0284c7 inset, 0 4px 10px rgba(16, 185, 129, 0.35);
}

.cal-check {
  position: absolute;
  top: 2px;
  right: 4px;
  font-size: 9px;
  color: #ffffff;
  font-weight: 700;
}

.cal-legend {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid #f0f9ff;
  font-size: 12px;
  color: #7dd3fc;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}
.dot.checked {
  background: #10b981;
}
.dot.today {
  background: #ffffff;
  border: 2px solid #38bdf8;
}

.legend-stat {
  margin-left: auto;
  color: #0284c7;
  font-weight: 600;
}

@media (max-width: 480px) {
  .cal-grid,
  .cal-week {
    gap: 4px;
  }
  .cal-num {
    font-size: 12px;
  }
}
</style>
