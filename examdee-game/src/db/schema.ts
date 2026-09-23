import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createId } from "@/lib/id";

export const roleEnum = pgEnum("role", ["STUDENT", "TEACHER"]);
// MCQ = Trắc nghiệm A/B/C/D · TRUE_FALSE = Đúng / Sai
export const questionTypeEnum = pgEnum("question_type", ["MCQ", "TRUE_FALSE"]);

const id = () => text("id").primaryKey().$defaultFn(createId);

export const classRooms = pgTable("class_rooms", {
  id: id(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: id(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  role: roleEnum("role").notNull().default("STUDENT"),
  avatar: integer("avatar").notNull().default(0), // màu áo nhân vật
  classId: text("class_id").references(() => classRooms.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const worlds = pgTable("worlds", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  subtitle: text("subtitle").notNull(),
  color: text("color").notNull(),
  order: integer("order").notNull(),
});

export const levels = pgTable(
  "levels",
  {
    id: id(),
    worldId: text("world_id")
      .notNull()
      .references(() => worlds.id, { onDelete: "cascade" }),
    number: integer("number").notNull(), // 1..5, càng cao càng khó
    title: text("title").notNull(),
  },
  (t) => [uniqueIndex("levels_world_number").on(t.worldId, t.number)],
);

export const questions = pgTable(
  "questions",
  {
    id: id(),
    levelId: text("level_id")
      .notNull()
      .references(() => levels.id, { onDelete: "cascade" }),
    type: questionTypeEnum("type").notNull(),
    prompt: text("prompt").notNull(),
    options: jsonb("options").$type<string[]>().notNull(),
    correctIndex: integer("correct_index").notNull(),
    explanation: text("explanation").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("questions_level").on(t.levelId)],
);

export const attempts = pgTable(
  "attempts",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    levelId: text("level_id")
      .notNull()
      .references(() => levels.id, { onDelete: "cascade" }),
    questionIds: jsonb("question_ids").$type<string[]>().notNull(),
    correctCount: integer("correct_count").notNull().default(0),
    stars: integer("stars").notNull().default(0),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    finishedAt: timestamp("finished_at"),
  },
  (t) => [index("attempts_user_level").on(t.userId, t.levelId)],
);

export const attemptAnswers = pgTable(
  "attempt_answers",
  {
    id: id(),
    attemptId: text("attempt_id")
      .notNull()
      .references(() => attempts.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    chosenIndex: integer("chosen_index").notNull(),
    isCorrect: boolean("is_correct").notNull(),
    answeredAt: timestamp("answered_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("answers_attempt_question").on(t.attemptId, t.questionId)],
);

export const levelProgress = pgTable(
  "level_progress",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    levelId: text("level_id")
      .notNull()
      .references(() => levels.id, { onDelete: "cascade" }),
    bestCorrect: integer("best_correct").notNull().default(0),
    bestStars: integer("best_stars").notNull().default(0),
    passed: boolean("passed").notNull().default(false),
    plays: integer("plays").notNull().default(0),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.levelId] })],
);

export const usersRelations = relations(users, ({ one }) => ({
  classRoom: one(classRooms, { fields: [users.classId], references: [classRooms.id] }),
}));
export const levelsRelations = relations(levels, ({ one, many }) => ({
  world: one(worlds, { fields: [levels.worldId], references: [worlds.id] }),
  questions: many(questions),
}));
export const worldsRelations = relations(worlds, ({ many }) => ({ levels: many(levels) }));
export const questionsRelations = relations(questions, ({ one }) => ({
  level: one(levels, { fields: [questions.levelId], references: [levels.id] }),
}));

export type User = typeof users.$inferSelect;
export type Question = typeof questions.$inferSelect;
