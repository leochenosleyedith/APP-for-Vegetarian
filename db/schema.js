import { sqliteTable, text, primaryKey, index } from 'drizzle-orm/sqlite-core';
export const profiles=sqliteTable('profiles',{
  userId:text('user_id').primaryKey(), settings:text('settings').notNull().default('{}'), updatedAt:text('updated_at').notNull()
});
export const meals=sqliteTable('meals',{
  userId:text('user_id').notNull(),id:text('id').notNull(),mealDate:text('meal_date').notNull(),payload:text('payload').notNull(),updatedAt:text('updated_at').notNull()
}, t=>[primaryKey({columns:[t.userId,t.id]}),index('meals_user_date_idx').on(t.userId,t.mealDate)]);
