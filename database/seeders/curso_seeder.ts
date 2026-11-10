import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Course from '#models/course'
import User from '#models/user'

export default class extends BaseSeeder {
  async run() {
    const administrador = await User.query().where('is_admin', true).orderBy('id', 'asc').first()

    if (!administrador) {
      throw new Error('Crie um administrador antes de executar o seeder de cursos.')
    }

    const cursos = [
      {
        name: 'HTML e CSS do zero',
        caminhoCapa: '/imagens/cursos/html-css.svg',
        descricao: 'Aprenda a estruturar páginas com HTML e criar layouts responsivos com CSS, Flexbox e Grid.',
      },
      {
        name: 'JavaScript na prática',
        caminhoCapa: '/imagens/cursos/javascript.svg',
        descricao: 'Conheça variáveis, funções, eventos e manipulação do DOM para criar páginas interativas.',
      },
      {
        name: 'Introdução ao AdonisJS',
        caminhoCapa: '/imagens/cursos/adonisjs.svg',
        descricao: 'Construa uma aplicação web com rotas, controllers, templates Edge e banco de dados usando Lucid.',
      },
    ]

    for (const curso of cursos) {
      await Course.updateOrCreate(
        { name: curso.name, userId: administrador.id },
        { caminhoCapa: curso.caminhoCapa, descricao: curso.descricao }
      )
    }
  }
}
