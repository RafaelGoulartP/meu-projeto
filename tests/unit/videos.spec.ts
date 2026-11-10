import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import type { HttpContext } from '@adonisjs/core/http'
import VideosController from '#controllers/videos_controller'
import CursosController from '#controllers/cursos_controller'
import Course from '#models/course'
import User from '#models/user'
import Video from '#models/video'

test.group('Consulta de vídeos', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('responsável consulta o vídeo com os campos necessários para reprodução', async ({ assert }) => {
    const usuario = await User.create({ email: 'video-dono@example.com', password: 'senha-de-teste' })
    const curso = await Course.create({ name: 'Curso com vídeos', userId: usuario.id })
    const video = await Video.create({
      name: 'Aula de exemplo', courseId: curso.id, userId: usuario.id,
      descricao: 'Descrição da aula.', caminhoVideo: '/videos/cursos/demonstracao.mp4',
    })
    const contexto = {
      auth: { getUserOrFail: () => usuario }, params: { cursoId: curso.id, id: video.id },
      view: {
        render: (template: string, dados: { curso: Course; video: Video }) => {
          assert.equal(template, 'pages/videos/detalhes')
          assert.equal(dados.curso.id, curso.id)
          assert.equal(dados.video.id, video.id)
          assert.equal(dados.video.name, video.name)
          assert.equal(dados.video.descricao, video.descricao)
          assert.equal(dados.video.caminhoVideo, video.caminhoVideo)
          assert.isUndefined(dados.video.userId)
          assert.isUndefined(dados.video.likes)
          return 'ok'
        },
      },
    } as unknown as HttpContext
    assert.equal(await new VideosController().detalhar(contexto), 'ok')
  })

  test('bloqueia vídeos de outro curso, cursos de outro usuário e IDs inexistentes', async ({ assert }) => {
    const dono = await User.create({ email: 'video-responsavel@example.com', password: 'senha-de-teste' })
    const outro = await User.create({ email: 'video-outro@example.com', password: 'senha-de-teste' })
    const admin = await User.create({ email: 'video-admin@example.com', password: 'senha-de-teste', isAdmin: true })
    const curso = await Course.create({ name: 'Curso privado', userId: dono.id })
    const segundoCurso = await Course.create({ name: 'Outro curso do mesmo dono', userId: dono.id })
    const video = await Video.create({ name: 'Aula privada', courseId: curso.id, userId: dono.id })
    for (const [usuario, cursoId, id] of [
      [outro, curso.id, video.id], [admin, curso.id, video.id],
      [dono, segundoCurso.id, video.id], [dono, curso.id, -1], [dono, -1, video.id],
    ] as const) {
      const contexto = {
        auth: { getUserOrFail: () => usuario }, params: { cursoId, id },
        view: { render: () => assert.fail('Não deve renderizar o vídeo.') },
      } as unknown as HttpContext
      try {
        await new VideosController().detalhar(contexto)
        assert.fail('Era esperado um erro 404.')
      } catch (erro) {
        assert.propertyVal(erro, 'status', 404)
      }
    }
  })

  test('curso sem vídeos recebe lista vazia e vídeo sem arquivo permanece consultável', async ({ assert }) => {
    const usuario = await User.create({ email: 'video-vazio@example.com', password: 'senha-de-teste' })
    const curso = await Course.create({ name: 'Curso vazio', userId: usuario.id })
    const contextoCurso = {
      auth: { getUserOrFail: () => usuario }, params: { id: curso.id },
      view: { render: (_template: string, dados: { curso: Course }) => {
        assert.isEmpty(dados.curso.videos)
        return 'ok'
      } },
    } as unknown as HttpContext
    assert.equal(await new CursosController().detalhar(contextoCurso), 'ok')

    const video = await Video.create({ name: 'Vídeo sem arquivo', userId: usuario.id, courseId: curso.id })
    const contextoVideo = {
      auth: { getUserOrFail: () => usuario }, params: { cursoId: curso.id, id: video.id },
      view: { render: (_template: string, dados: { video: Video }) => {
        assert.isNull(dados.video.caminhoVideo)
        assert.isNull(dados.video.descricao)
        return 'ok'
      } },
    } as unknown as HttpContext
    assert.equal(await new VideosController().detalhar(contextoVideo), 'ok')
  })
})
