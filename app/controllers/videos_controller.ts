import type { HttpContext } from '@adonisjs/core/http'
import Course from '#models/course'
import Video from '#models/video'
import app from '@adonisjs/core/services/app'
import { randomUUID } from 'node:crypto'
import { unlink } from 'node:fs/promises'
import { criarVideoValidator } from '#validators/video'

export default class VideosController {
  async store({ auth, params, request, response }: HttpContext) {
    const usuario = auth.getUserOrFail()
    const curso = await Course.query()
      .select('id')
      .where('id', params.cursoId)
      .where('user_id', usuario.id)
      .firstOrFail()

    const { nome, descricao, video } = await request.validateUsing(criarVideoValidator)
    const nomeArquivo = `${randomUUID()}.${video.extname}`
    const caminhoArquivo = app.publicPath(`videos/cursos/${nomeArquivo}`)

    await video.move(app.publicPath('videos/cursos'), { name: nomeArquivo, overwrite: false })

    let videoCriado
    try {
      videoCriado = await Video.create({
        name: nome,
        descricao,
        caminhoVideo: `/videos/cursos/${nomeArquivo}`,
        courseId: curso.id,
        userId: usuario.id,
      })
    } catch (erro) {
      await unlink(caminhoArquivo).catch(() => {})
      throw erro
    }

    return response.redirect().toRoute('videos.detalhar', { cursoId: curso.id, id: videoCriado.id })
  }

  async criar({ auth, params, view }: HttpContext) {
    const usuario = auth.getUserOrFail()
    const curso = await Course.query()
      .select('id', 'name', 'caminho_capa')
      .where('id', params.cursoId)
      .where('user_id', usuario.id)
      .firstOrFail()

    return view.render('pages/videos/criar', { curso })
  }

  async detalhar({ auth, params, view }: HttpContext) {
    const usuario = auth.getUserOrFail()
    const curso = await Course.acessiveisPara(usuario.id)
      .select('id', 'name', 'caminho_capa')
      .where('id', params.cursoId)
      .firstOrFail()

    const video = await curso.related('videos').query()
      .select('id', 'name', 'descricao', 'caminho_video')
      .where('id', params.id)
      .firstOrFail()

    return view.render('pages/videos/detalhes', { curso, video })
  }
}
