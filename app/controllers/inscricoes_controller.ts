import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import Course from '#models/course'

export default class InscricoesController {
  async index({ auth, request, view }: HttpContext) {
    const usuario = auth.getUserOrFail()
    const termo = request.input('busca', '')
    const busca = typeof termo === 'string' ? termo.trim().slice(0, 100) : ''

    const emAndamento = await Course.query()
      .select('id', 'name', 'descricao', 'caminho_capa', 'user_id')
      .whereNot('user_id', usuario.id)
      .whereHas('inscritos', (consulta) => consulta.where('users.id', usuario.id))
      .preload('responsavel', (consulta) => consulta.select('id', 'full_name'))
      .withCount('videos')
      .orderBy('name', 'asc')

    const explorar = await Course.query()
      .select('id', 'name', 'descricao', 'caminho_capa', 'user_id')
      .whereNot('user_id', usuario.id)
      .whereDoesntHave('inscritos', (consulta) => consulta.where('users.id', usuario.id))
      .if(busca.length > 0, (consulta) => consulta.where('name', 'like', `%${busca}%`))
      .preload('responsavel', (consulta) => consulta.select('id', 'full_name'))
      .withCount('videos')
      .orderBy('created_at', 'desc')
      .orderBy('id', 'desc')

    return view.render('pages/dashboard', { emAndamento, explorar, busca })
  }

  async detalhar({ auth, params, view, response }: HttpContext) {
    const usuario = auth.getUserOrFail()
    const curso = await Course.query()
      .select('id', 'name', 'descricao', 'caminho_capa', 'user_id')
      .where('id', params.cursoId)
      .whereNotNull('user_id')
      .preload('responsavel', (consulta) => consulta.select('id', 'full_name'))
      .preload('videos', (consulta) => {
        consulta.select('id', 'name', 'descricao', 'course_id').orderBy('id', 'asc')
      })
      .firstOrFail()

    if (curso.userId === usuario.id) {
      return response.redirect().toRoute('cursos.detalhar', { id: curso.id })
    }

    const inscricao = await db.from('enrollments')
      .where('course_id', curso.id).where('user_id', usuario.id).first()

    return view.render('pages/cursos/detalhes', {
      curso, responsavel: false, podeAssistir: Boolean(inscricao),
    })
  }

  async store({ auth, params, response }: HttpContext) {
    const usuario = auth.getUserOrFail()
    const curso = await Course.query()
      .select('id', 'user_id')
      .where('id', params.cursoId)
      .whereNotNull('user_id')
      .firstOrFail()

    if (curso.userId === usuario.id) {
      return response.forbidden('Você não pode se inscrever em um curso criado por você.')
    }

    const agora = DateTime.utc().toSQL({ includeOffset: false })
    await db.table('enrollments').insert({
      user_id: usuario.id, course_id: curso.id, created_at: agora, updated_at: agora,
    }).onConflict(['user_id', 'course_id']).ignore()

    return response.redirect().toRoute('cursos.detalhar', { id: curso.id })
  }
}
