import type { HttpContext } from '@adonisjs/core/http'
import Course from '#models/course'

export default class VideosController {
  async detalhar({ auth, params, view }: HttpContext) {
    const usuario = auth.getUserOrFail()
    const curso = await Course.query()
      .select('id', 'name', 'caminho_capa')
      .where('id', params.cursoId)
      .where('user_id', usuario.id)
      .firstOrFail()

    const video = await curso.related('videos').query()
      .select('id', 'name', 'descricao', 'caminho_video')
      .where('id', params.id)
      .firstOrFail()

    return view.render('pages/videos/detalhes', { curso, video })
  }
}
