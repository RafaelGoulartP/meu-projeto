import { test } from '@japa/runner'
import type { HttpContext } from '@adonisjs/core/http'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import edge from 'edge.js'
import User from '#models/user'
import Course from '#models/course'
import Video from '#models/video'
import InscricoesController from '#controllers/inscricoes_controller'
import CursosController from '#controllers/cursos_controller'
import VideosController from '#controllers/videos_controller'

async function preparar() {
  const aluno = await User.create({ email: 'inscricoes-aluno@example.com', password: 'senha-de-teste' })
  const autor = await User.create({ email: 'inscricoes-autor@example.com', fullName: 'Autora', password: 'senha-de-teste' })
  const curso = await Course.create({ name: 'zz-inscricoes HTML', userId: autor.id })
  const proprio = await Course.create({ name: 'zz-inscricoes Próprio', userId: aluno.id })
  const video = await Video.create({ name: 'Aula', courseId: curso.id, userId: autor.id, caminhoVideo: '/videos/cursos/privado.mp4' })
  return { aluno, autor, curso, proprio, video }
}

function contextoInscricao(aluno: User, cursoId: number) {
  return {
    auth: { getUserOrFail: () => aluno }, params: { cursoId },
    response: {
      forbidden: (mensagem: string) => ({ status: 403, mensagem }),
      redirect: () => ({ toRoute: (rota: string, parametros: unknown) => ({ rota, parametros }) }),
    },
  } as unknown as HttpContext
}

function renderizar(template: string, dados: Record<string, unknown>, aluno: User, url: string) {
  return edge.createRenderer().share({
    auth: { user: aluno }, request: { url: () => url }, csrfField: () => '',
  }).render(template, dados)
}

test.group('Inscrições', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('inscrição usa o aluno da sessão e não duplica o vínculo', async ({ assert }) => {
    const { aluno, autor, curso } = await preparar()
    const contexto = contextoInscricao(aluno, curso.id)
    contexto.request = { input: () => autor.id } as unknown as HttpContext['request']
    const controller = new InscricoesController()
    await controller.store(contexto)
    const resposta = await controller.store(contexto)
    const inscricoes = await db.from('enrollments').where('course_id', curso.id)
    assert.lengthOf(inscricoes, 1)
    assert.equal(inscricoes[0].user_id, aluno.id)
    assert.deepEqual(resposta, { rota: 'cursos.detalhar', parametros: { id: curso.id } })
  })

  test('bloqueia inscrição no próprio curso e em curso inexistente', async ({ assert }) => {
    const { aluno, proprio } = await preparar()
    const resposta = await new InscricoesController().store(contextoInscricao(aluno, proprio.id))
    assert.propertyVal(resposta, 'status', 403)
    assert.isEmpty(await db.from('enrollments').where('course_id', proprio.id))
    try {
      await new InscricoesController().store(contextoInscricao(aluno, -1))
      assert.fail('Era esperado 404.')
    } catch (erro) {
      assert.propertyVal(erro, 'status', 404)
    }
  })

  test('busca filtra explorar sem afetar inscritos; exclui cursos próprios e já inscritos', async ({ assert }) => {
    const { aluno, autor, curso, proprio } = await preparar()
    await new InscricoesController().store(contextoInscricao(aluno, curso.id))
    const disponivel = await Course.create({ name: 'zz-inscricoes JavaScript', userId: autor.id })
    await Course.create({ name: 'zz-inscricoes sem autor' })
    const contexto = {
      auth: { getUserOrFail: () => aluno }, request: { input: () => 'zz-inscricoes JavaScript' },
      view: { render: async (template: string, dados: { emAndamento: Course[]; explorar: Course[]; busca: string }) => {
        assert.equal(template, 'pages/dashboard')
        assert.deepEqual(dados.emAndamento.map((item) => item.id), [curso.id])
        assert.deepEqual(dados.explorar.map((item) => item.id), [disponivel.id])
        assert.equal(dados.emAndamento[0].responsavel.fullName, 'Autora')
        assert.equal(Number(dados.emAndamento[0].$extras.videos_count), 1)
        assert.notInclude(dados.explorar.map((item) => item.id), proprio.id)
        const html = await renderizar(template, dados, aluno, '/dashboard')
        assert.include(html, `href="/cursos/${curso.id}"`)
        assert.include(html, `href="/explorar/cursos/${disponivel.id}"`)
        assert.include(html, 'Por Autora')
        return 'ok'
      } },
    } as unknown as HttpContext
    assert.equal(await new InscricoesController().index(contexto), 'ok')
  })

  test('prévia permite conhecer aulas sem expor arquivos e mostra inscrição', async ({ assert }) => {
    const { aluno, curso, video } = await preparar()
    const contexto = {
      auth: { getUserOrFail: () => aluno }, params: { cursoId: curso.id },
      view: { render: async (template: string, dados: Record<string, unknown>) => {
        assert.isFalse(dados.responsavel)
        assert.isFalse(dados.podeAssistir)
        const html = await renderizar(template, dados, aluno, `/explorar/cursos/${curso.id}`)
        assert.include(html, 'Inscrever-me')
        assert.notInclude(html, `href="/cursos/${curso.id}/videos/${video.id}"`)
        assert.notInclude(html, '/videos/cursos/privado.mp4')
        assert.notInclude(html, 'Adicionar vídeo')
        return 'ok'
      } },
    } as unknown as HttpContext
    assert.equal(await new InscricoesController().detalhar(contexto), 'ok')
  })

  test('inscrito acessa curso e vídeo, mas não pode abrir formulário nem enviar aula', async ({ assert }) => {
    const { aluno, curso, video } = await preparar()
    await new InscricoesController().store(contextoInscricao(aluno, curso.id))
    const contextoCurso = {
      auth: { getUserOrFail: () => aluno }, params: { id: curso.id },
      view: { render: async (template: string, dados: Record<string, unknown>) => {
        assert.isFalse(dados.responsavel)
        assert.isTrue(dados.podeAssistir)
        const html = await renderizar(template, dados, aluno, `/cursos/${curso.id}`)
        assert.include(html, `href="/cursos/${curso.id}/videos/${video.id}"`)
        assert.notInclude(html, 'Adicionar vídeo')
        assert.notInclude(html, 'Inscrever-me')
        return 'ok'
      } },
    } as unknown as HttpContext
    assert.equal(await new CursosController().detalhar(contextoCurso), 'ok')
    const contextoVideo = {
      auth: { getUserOrFail: () => aluno }, params: { cursoId: curso.id, id: video.id },
      view: { render: (_template: string, dados: { video: Video }) => {
        assert.equal(dados.video.id, video.id)
        return 'ok'
      } },
      request: { validateUsing: () => assert.fail('Inscrito não pode enviar vídeos.') },
    } as unknown as HttpContext
    const controller = new VideosController()
    assert.equal(await controller.detalhar(contextoVideo), 'ok')
    for (const acao of ['criar', 'store'] as const) {
      try {
        await controller[acao](contextoVideo)
        assert.fail('Era esperado 404 para gerenciamento por aluno.')
      } catch (erro) {
        assert.propertyVal(erro, 'status', 404)
      }
    }
  })

  test('inscrição em um curso não libera aulas de outro curso', async ({ assert }) => {
    const { aluno, autor, curso, video } = await preparar()
    const outro = await Course.create({ name: 'Outro curso', userId: autor.id })
    await new InscricoesController().store(contextoInscricao(aluno, outro.id))
    const contexto = {
      auth: { getUserOrFail: () => aluno }, params: { cursoId: curso.id, id: video.id },
      view: { render: () => assert.fail('Sem acesso ao curso.') },
    } as unknown as HttpContext
    try {
      await new VideosController().detalhar(contexto)
      assert.fail('Era esperado 404.')
    } catch (erro) {
      assert.propertyVal(erro, 'status', 404)
    }
  })

  test('dashboard renderiza estados vazios e busca sem resultados', async ({ assert }) => {
    const { aluno } = await preparar()
    const html = await renderizar('pages/dashboard', {
      emAndamento: [], explorar: [], busca: '<script>teste</script>',
    }, aluno, '/dashboard')
    assert.include(html, 'Você ainda não está inscrito')
    assert.include(html, 'Nenhum curso encontrado')
    assert.notInclude(html, '<script>teste</script>')
  })
})
