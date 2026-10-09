import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
export const demoState = sqliteTable("demo_state", {
  id: text("id").primaryKey(),
  data: text("data").notNull(),
  version: integer("version").notNull(),
});
