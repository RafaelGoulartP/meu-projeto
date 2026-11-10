import Course from '#models/course'
import type { HttpContext } from '@adonisjs/core/http'
import { randomUUID } from 'node:crypto'
import { unlink } from 'node:fs/promises'
import app from '@adonisjs/core/services/app'
import { criarCursoValidator } from '#validators/curso'

export default class CursosController {
  async index({ auth, view }: HttpContext) {
    const usuario = auth.getUserOrFail()

    const cursos = await Course.query()
      .select('id', 'name', 'caminho_capa', 'descricao')
      .where('user_id', usuario.id)
      .orderBy('created_at', 'desc')
      .orderBy('id', 'desc')

    return view.render('pages/meusCursos', { cursos })
  }

  async detalhar({ auth, params, view }: HttpContext) {
    const usuario = auth.getUserOrFail()
    const curso = await Course.query()
      .select('id', 'name', 'descricao', 'caminho_capa', 'user_id')
      .where('id', params.id)
      .where('user_id', usuario.id)
      .preload('responsavel', (consulta) => consulta.select('id', 'full_name'))
      .preload('videos', (consulta) => {
        consulta.select('id', 'name', 'descricao', 'course_id').orderBy('id', 'asc')
      })
      .firstOrFail()

    return view.render('pages/cursos/detalhes', {
      curso, responsavel: curso.userId === usuario.id, podeAssistir: true,
    })
  }

  async store({ auth, request, response }: HttpContext) {
    const usuario = auth.getUserOrFail()
    const { nome, descricao, capa } = await request.validateUsing(criarCursoValidator)
    const nomeArquivo = `${randomUUID()}.${capa.extname}`
    const caminhoArquivo = app.publicPath(`imagens/cursos/${nomeArquivo}`)

    await capa.move(app.publicPath('imagens/cursos'), {
      name: nomeArquivo,
      overwrite: false,
    })

    try {
      await Course.create({
        name: nome,
        descricao,
        caminhoCapa: `/imagens/cursos/${nomeArquivo}`,
        userId: usuario.id,
      })
    } catch (erro) {
      // O arquivo não deve permanecer sem um curso se a gravação no banco falhar.
      await unlink(caminhoArquivo).catch(() => {})
      throw erro
    }

    return response.redirect().toRoute('meusCursos')
  }
}
