import { test } from '@japa/runner'
import { copyFile, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import { MultipartFileFactory } from '@adonisjs/bodyparser/factories'
import type { HttpContext } from '@adonisjs/core/http'
import VideosController from '#controllers/videos_controller'
import { criarVideoValidator } from '#validators/video'
import User from '#models/user'
import Course from '#models/course'
import Video from '#models/video'

async function prepararVideo() {
  const pasta = await mkdtemp(join(tmpdir(), 'upload-video-'))
  const caminho = join(pasta, 'original.mp4')
  await copyFile(app.publicPath('videos/cursos/demonstracao.mp4'), caminho)
  const video = new MultipartFileFactory().merge({
    fieldName: 'video', clientName: '../../minha-aula.mp4', extname: 'mp4',
    type: 'video', subtype: 'mp4', size: (await stat(caminho)).size,
  }).create()
  video.tmpPath = caminho
  return { pasta, video }
}

test.group('Upload de vídeos', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('salva o arquivo e usa somente o curso autorizado e o usuário da sessão', async ({ assert }) => {
    const usuario = await User.create({ email: 'upload-video@example.com', password: 'senha-de-teste' })
    const outro = await User.create({ email: 'upload-outro@example.com', password: 'senha-de-teste' })
    const curso = await Course.create({ name: 'Curso do upload', userId: usuario.id })
    const outroCurso = await Course.create({ name: 'Curso alheio', userId: outro.id })
    const { pasta, video } = await prepararVideo()
    try {
      const contexto = {
        auth: { getUserOrFail: () => usuario }, params: { cursoId: curso.id },
        request: { validateUsing: () => criarVideoValidator.validate({
          nome: '  Aula enviada  ', descricao: '  Conteúdo da aula enviada.  ', video,
          userId: outro.id, user_id: outro.id, courseId: outroCurso.id, course_id: outroCurso.id,
          views: 1000, likes: 1000,
        }) },
        response: { redirect: () => ({ toRoute: (rota: string, parametros: unknown) => ({ rota, parametros }) }) },
      } as unknown as HttpContext

      const resposta = await new VideosController().store(contexto)
      const criado = await Video.query().where('course_id', curso.id).firstOrFail()
      assert.equal(criado.name, 'Aula enviada')
      assert.equal(criado.descricao, 'Conteúdo da aula enviada.')
      assert.equal(criado.userId, usuario.id)
      assert.equal(criado.courseId, curso.id)
      assert.equal(criado.views, 0)
      assert.equal(criado.likes, 0)
      assert.match(video.fileName!, /^[a-f0-9-]+\.mp4$/)
      assert.equal(criado.caminhoVideo, `/videos/cursos/${video.fileName}`)
      assert.equal((await readFile(video.filePath!)).length, video.size)
      assert.deepEqual(resposta, {
        rota: 'videos.detalhar', parametros: { cursoId: curso.id, id: criado.id },
      })
    } finally {
      if (video.filePath) await rm(video.filePath, { force: true })
      await rm(pasta, { recursive: true, force: true })
    }
  })

  test('nega curso alheio ou inexistente antes de validar ou mover o arquivo', async ({ assert }) => {
    const usuario = await User.create({ email: 'upload-negado@example.com', password: 'senha-de-teste', isAdmin: true })
    const dono = await User.create({ email: 'upload-dono@example.com', password: 'senha-de-teste' })
    const curso = await Course.create({ name: 'Curso privado', userId: dono.id })
    for (const cursoId of [curso.id, -1]) {
      const contexto = {
        auth: { getUserOrFail: () => usuario }, params: { cursoId },
        request: { validateUsing: () => assert.fail('Não deve processar o upload sem autorização.') },
      } as unknown as HttpContext
      try {
        await new VideosController().store(contexto)
        assert.fail('Era esperado um erro 404.')
      } catch (erro) {
        assert.propertyVal(erro, 'status', 404)
      }
    }
  })

  test('rejeita conteúdo disfarçado de MP4, tamanho excessivo, campos inválidos e arquivo ausente', async ({ assert }) => {
    const { pasta, video } = await prepararVideo()
    try {
      await writeFile(video.tmpPath!, '<html>não é um vídeo</html>')
      await assert.rejects(() => criarVideoValidator.validate({
        nome: 'Aula válida', descricao: 'Uma descrição válida.', video,
      }))

      const grande = new MultipartFileFactory().merge({
        fieldName: 'video', extname: 'mp4', size: 101 * 1024 * 1024,
      }).create()
      const formatoInvalido = new MultipartFileFactory().merge({ fieldName: 'video', extname: 'exe' }).create()
      for (const dados of [
        { nome: 'Aula válida', descricao: 'Descrição válida.', video: grande },
        { nome: 'Aula válida', descricao: 'Descrição válida.', video: formatoInvalido },
        { nome: '', descricao: '' },
        { nome: 'ab', descricao: 'curta' },
        { nome: 'Aula válida', descricao: 'Descrição válida.' },
      ]) {
        await assert.rejects(() => criarVideoValidator.validate(dados))
      }
    } finally {
      await rm(pasta, { recursive: true, force: true })
    }
  })

  test('remove o arquivo se a gravação do vídeo falhar', async ({ assert }) => {
    const usuario = await User.create({ email: 'upload-falha@example.com', password: 'senha-de-teste' })
    const curso = await Course.create({ name: 'Curso removido durante envio', userId: usuario.id })
    const { pasta, video } = await prepararVideo()
    try {
      const contexto = {
        auth: { getUserOrFail: () => usuario }, params: { cursoId: curso.id },
        request: { validateUsing: async () => {
          const dados = await criarVideoValidator.validate({
            nome: 'Aula de teste', descricao: 'Descrição da aula de teste.', video,
          })
          await curso.delete()
          return dados
        } },
      } as unknown as HttpContext

      await assert.rejects(() => new VideosController().store(contexto))
      assert.exists(video.filePath)
      await assert.rejects(() => readFile(video.filePath!))
      assert.isNull(await Video.query().where('course_id', curso.id).first())
    } finally {
      if (video.filePath) await rm(video.filePath, { force: true })
      await rm(pasta, { recursive: true, force: true })
    }
  })
})
