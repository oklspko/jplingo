export interface JpToken {
  text: string;
  kana: string;
}

export interface JpStatement {
  id: string;
  chinese: string;
  japanese: string;
  kana: string;
  romaji: string;
  tokens: JpToken[];
}

export interface JpCourse {
  id: string;
  coursePackId: string;
  title: string;
  order: number;
  statements: JpStatement[];
}

export interface JpCoursePack {
  id: string;
  title: string;
  language: string;
  level: string;
  description: string;
  courses: string[];
}

/**
 * 中日对照的例句。
 *
 * 语法条（app/data/jp-grammar-points.ts）与敬语（app/data/jp-keigo.ts）原先各自声明了一份
 * 形状完全相同的 `GrammarExample` / `KeigoExample`（步骤 11 合并到这里，避免重复定义）。
 */
export interface JpBilingualExample {
  jp: string;
  zh: string;
}
