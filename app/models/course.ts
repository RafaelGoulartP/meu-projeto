import { CourseSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

export default class Course extends CourseSchema {
  @belongsTo(() => User, { foreignKey: 'userId' })
  declare responsavel: BelongsTo<typeof User>
}
