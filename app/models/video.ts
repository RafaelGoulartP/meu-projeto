import { VideoSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Course from '#models/course'
import User from '#models/user'

export default class Video extends VideoSchema {
  @belongsTo(() => Course, { foreignKey: 'courseId' })
  declare curso: BelongsTo<typeof Course>

  @belongsTo(() => User, { foreignKey: 'userId' })
  declare usuario: BelongsTo<typeof User>
}
