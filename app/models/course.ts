import { CourseSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Video from '#models/video'

export default class Course extends CourseSchema {
  @belongsTo(() => User, { foreignKey: 'userId' })
  declare responsavel: BelongsTo<typeof User>

  @hasMany(() => Video, { foreignKey: 'courseId' })
  declare videos: HasMany<typeof Video>
}
