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
