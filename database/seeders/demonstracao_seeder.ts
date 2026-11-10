import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { access } from 'node:fs/promises'
import app from '@adonisjs/core/services/app'
import User from '#models/user'
import Course from '#models/course'
import Video from '#models/video'

export default class DemonstracaoSeeder extends BaseSeeder {
  static environment = ['development', 'test']

  async run() {
    const caminhoVideo = '/videos/cursos/demonstracao.mp4'
    const senha = 'Aprender123!'
    const criadores = [
      {
        nome: 'Ana Martins', email: 'ana.demo@example.com', capa: '/imagens/cursos/html-css.svg',
        cursos: [
          { nome: 'Fundamentos de HTML e CSS', descricao: 'Aprenda a organizar o conteúdo de páginas com HTML e a definir cores, fontes e espaçamentos com CSS.' },
          { nome: 'Layouts responsivos na prática', descricao: 'Construa interfaces que se adaptam a celulares e computadores usando Flexbox, Grid e media queries.' },
        ],
      },
      {
        nome: 'Bruno Souza', email: 'bruno.demo@example.com', capa: '/imagens/cursos/javascript.svg',
        cursos: [
          { nome: 'JavaScript para iniciantes', descricao: 'Explore variáveis, condições, laços e funções com exemplos para quem está começando a programar.' },
          { nome: 'DOM e eventos com JavaScript', descricao: 'Aprenda a selecionar elementos, responder a cliques e atualizar o conteúdo de páginas no navegador.' },
        ],
      },
      {
        nome: 'Carla Oliveira', email: 'carla.demo@example.com', capa: '/imagens/cursos/adonisjs.svg',
        cursos: [
          { nome: 'AdonisJS: primeiros passos', descricao: 'Conheça a organização de uma aplicação AdonisJS e crie rotas, controllers e páginas com Edge.' },
          { nome: 'Banco de dados com Lucid', descricao: 'Trabalhe com migrations, models, relacionamentos e consultas para persistir os dados da sua aplicação.' },
        ],
      },
    ]
    const aulas = [
      { nome: 'Apresentação do curso', descricao: 'Conheça os objetivos, a organização das aulas e os assuntos que serão abordados.' },
      { nome: 'Conceitos fundamentais', descricao: 'Explore os conceitos iniciais que servirão de base para acompanhar o curso.' },
      { nome: 'Exercício prático', descricao: 'Aplique os conceitos em um exercício e revise o que foi apresentado nas aulas.' },
    ]

    await Promise.all([
      access(app.publicPath(caminhoVideo.slice(1))),
      ...criadores.map((criador) => access(app.publicPath(criador.capa.slice(1)))),
    ])

    for (const criador of criadores) {
      const usuario = await User.updateOrCreate(
        { email: criador.email },
        { fullName: criador.nome, password: senha, isAdmin: false }
      )

      for (const dados of criador.cursos) {
        const curso = await Course.updateOrCreate(
          { name: dados.nome, userId: usuario.id },
          { descricao: dados.descricao, caminhoCapa: criador.capa }
        )

        for (const aula of aulas) {
          await Video.updateOrCreate(
            { courseId: curso.id, name: aula.nome },
            {
              userId: usuario.id,
              descricao: `${aula.descricao} Curso: ${curso.name}. Este arquivo é apenas um vídeo demonstrativo, sem conteúdo didático.`,
              caminhoVideo,
            }
          )
        }
      }
    }
  }
}
