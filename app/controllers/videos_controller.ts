import type { HttpContext } from '@adonisjs/core/http'
import Course from '#models/course'
import Video from '#models/video'
import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
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
      .select('id', 'name', 'descricao', 'caminho_video', 'views', 'likes')
      .where('id', params.id)
      .firstOrFail()

    
    await Video.query().where('id', video.id).increment('views', 1)
    video.views++

    const curtiu = await db
      .from('video_likes')
      .where('user_id', usuario.id)
      .where('video_id', video.id)
      .first()

    return view.render('pages/videos/detalhes', { curso, video, curtiu: Boolean(curtiu) })
  }

  async curtir({ auth, params, response }: HttpContext) {
    const usuario = auth.getUserOrFail()
    const curso = await Course.acessiveisPara(usuario.id)
      .select('id')
      .where('id', params.cursoId)
      .firstOrFail()

    const video = await curso.related('videos').query()
      .select('id')
      .where('id', params.id)
      .firstOrFail()

   
    await db.transaction(async (trx) => {
      const removidas = await trx
        .from('video_likes')
        .where('user_id', usuario.id)
        .where('video_id', video.id)
        .delete()

      if (Number(removidas) === 0) {
        await trx
          .table('video_likes')
          .insert({ user_id: usuario.id, video_id: video.id, created_at: new Date() })
          .onConflict(['user_id', 'video_id'])
          .ignore()
      }

      
      const [{ total }] = await trx
        .from('video_likes')
        .where('video_id', video.id)
        .count('* as total')
      await trx.from('videos').where('id', video.id).update({ likes: Number(total) })
    })

    return response.redirect().back()
  }
}
