# 开放课程包格式

jp-lingo 的课程以「开放课程包」形式组织。内置课程放在 `public/courses/` 下，外部课程包可用同样格式自行制作，并通过 App/网页的「导入课程包」入口导入（存本地，完全离线可用）。

## 两种结构

### 1. 目录结构（内置课程 / 静态托管）

```
courses/
├── course-packs.json          # 课程包索引
└── <packId>/
    └── <courseId>.json        # 每课一个文件
```

`course-packs.json`：

```json
{
  "coursePacks": [
    {
      "id": "jp-custom",
      "title": "自定义课程包",
      "language": "ja",
      "level": "N5",
      "description": "这是一个示例课程包",
      "courses": ["lesson-01", "lesson-02"]
    }
  ]
}
```

### 2. 单文件打包（导入 / 分发）

把所有课程内联进一个 JSON，便于单个文件分发或直接导入：

```json
{
  "coursePacks": [
    {
      "id": "jp-custom",
      "title": "自定义课程包",
      "language": "ja",
      "level": "N5",
      "description": "这是一个示例课程包",
      "courses": ["lesson-01"]
    }
  ],
  "courses": {
    "jp-custom/lesson-01": {
      "id": "lesson-01",
      "coursePackId": "jp-custom",
      "title": "第一课",
      "order": 1,
      "statements": [
        {
          "id": "s1",
          "chinese": "你好",
          "japanese": "こんにちは",
          "kana": "こんにちは",
          "romaji": "konnichiwa",
          "tokens": [
            { "text": "こんにちは", "kana": "こんにちは" }
          ]
        }
      ]
    }
  }
}
```

> 课程键 `courses` 里的 key 固定为 `"<packId>/<courseId>"`。

## 字段说明

### JpCoursePack（课程包）

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | 唯一 ID，建议用反向域名风格或短横线命名 |
| `title` | string | 课程包标题 |
| `language` | string | 语言代码，如 `ja` |
| `level` | string | 难度标签，如 `N5` / `N4` |
| `description` | string | 一句话描述 |
| `courses` | string[] | 课程 id 列表（顺序即显示顺序） |

### JpCourse（课程）

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | 课程 id |
| `coursePackId` | string | 所属课程包 id |
| `title` | string | 课程标题 |
| `order` | number | 排序号 |
| `statements` | JpStatement[] | 词句列表 |

### JpStatement（词句）

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | 词句 id（课程内唯一） |
| `chinese` | string | 中文释义 |
| `japanese` | string | 日文原文 |
| `kana` | string | 假名读音 |
| `romaji` | string | 罗马字 |
| `tokens` | JpToken[] | 分词意群，用于连词成句 |

### JpToken（意群）

| 字段 | 类型 | 说明 |
|---|---|---|
| `text` | string | 日文片段 |
| `kana` | string | 该片段读音 |

> `tokens` 缺省或为空时，App 会用内置分词器（kuromoji）在运行时自动切分；提供 `tokens` 可避免离线分词、并精确控制意群拆分。

## 导入方式

- **URL 导入**：粘贴指向「单文件打包 JSON」或「目录索引 course-packs.json」的 URL，App 会自动识别并拉取。
- **文件导入**：选择单个「单文件打包 JSON」。
- 导入的课程包可在首页删除，删除后从本地清除。
