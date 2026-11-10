import { CourseSchema } from '#database/schema'
import { belongsTo, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import Video from '#models/video'
import User from '#models/user'

export default class Course extends CourseSchema {
  @belongsTo(() => User, { foreignKey: 'userId' })
  declare responsavel: BelongsTo<typeof User>

  @manyToMany(() => User, {
    pivotTable: 'enrollments',
    pivotForeignKey: 'course_id',
    pivotRelatedForeignKey: 'user_id',
  })
  declare inscritos: ManyToMany<typeof User>

  static acessiveisPara(usuarioId: number) {
    return this.query().where((acesso) => {
      acesso.where('user_id', usuarioId).orWhereHas('inscritos', (inscritos) => {
        inscritos.where('users.id', usuarioId)
      })
    })
  }

  @hasMany(() => Video, { foreignKey: 'courseId' })
  declare videos: HasMany<typeof Video>
}
