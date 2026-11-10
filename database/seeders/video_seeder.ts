import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { access } from 'node:fs/promises'
import app from '@adonisjs/core/services/app'
import Course from '#models/course'
import User from '#models/user'
import Video from '#models/video'

export default class extends BaseSeeder {
  async run() {
    await access(app.publicPath('videos/cursos/demonstracao.mp4'))

    const administrador = await User.query().where('is_admin', true).orderBy('id', 'asc').firstOrFail()
    const cursos = await Course.query()
      .where('user_id', administrador.id)
      .whereIn('name', ['HTML e CSS do zero', 'JavaScript na prática', 'Introdução ao AdonisJS'])
      .orderBy('id', 'asc')

    if (cursos.length === 0) {
      throw new Error('Execute o seeder de cursos antes do seeder de vídeos.')
    }

    const exemplos = [
      { name: 'Boas-vindas e apresentação', descricao: 'Conheça a proposta e os objetivos do curso.' },
      { name: 'Primeiros passos', descricao: 'Uma introdução aos conceitos e à organização das aulas.' },
      { name: 'Colocando em prática', descricao: 'Aplique os conhecimentos em um primeiro exercício.' },
    ]

    for (const curso of cursos) {
      for (const exemplo of exemplos) {
        await Video.updateOrCreate(
          { courseId: curso.id, name: exemplo.name },
          {
            userId: administrador.id,
            descricao: `${exemplo.descricao} Curso: ${curso.name}. Vídeo demonstrativo de exemplo, sem conteúdo didático.`,
            caminhoVideo: '/videos/cursos/demonstracao.mp4',
          }
        )
      }
    }
  }
}
