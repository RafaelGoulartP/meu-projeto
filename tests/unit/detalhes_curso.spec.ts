import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import type { HttpContext } from '@adonisjs/core/http'
import CursosController from '#controllers/cursos_controller'
import Course from '#models/course'
import User from '#models/user'
import Video from '#models/video'

test.group('Detalhes do curso', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('entrega os dados do curso com somente os vídeos associados a ele', async ({ assert }) => {
    const usuario = await User.create({
      email: 'detalhes-responsavel@example.com', password: 'senha-de-teste', isAdmin: false,
    })
    const curso = await Course.create({
      name: 'Curso para detalhar', descricao: 'Descrição completa do curso.',
      caminhoCapa: '/imagens/cursos/html-css.svg', userId: usuario.id,
    })
    const outroCurso = await Course.create({ name: 'Outro curso', userId: usuario.id })
    const video = await Video.create({ name: 'Aula do curso', courseId: curso.id, userId: usuario.id })
    await Video.create({ name: 'Aula de outro curso', courseId: outroCurso.id, userId: usuario.id })
    const contexto = {
      auth: { getUserOrFail: () => usuario },
      params: { id: String(curso.id) },
      view: {
        render: (template: string, dados: { curso: Course }) => {
          assert.equal(template, 'pages/cursos/detalhes')
          assert.equal(dados.curso.id, curso.id)
          assert.equal(dados.curso.name, curso.name)
          assert.equal(dados.curso.descricao, curso.descricao)
          assert.equal(dados.curso.caminhoCapa, curso.caminhoCapa)
          assert.equal(dados.curso.userId, usuario.id)
          assert.deepEqual(Object.keys(dados), ['curso', 'responsavel', 'podeAssistir'])
          assert.deepEqual(dados.curso.videos.map((item) => item.id), [video.id])
          assert.isUndefined(dados.curso.videos[0].caminhoVideo)
          return 'ok'
        },
      },
    } as unknown as HttpContext

    assert.equal(await new CursosController().detalhar(contexto), 'ok')
  })

  test('retorna 404 para curso de outra pessoa, inclusive ao administrador, ou ID inexistente', async ({ assert }) => {
    const responsavel = await User.create({
      email: 'detalhes-dono@example.com', password: 'senha-de-teste', isAdmin: false,
    })
    const outroUsuario = await User.create({
      email: 'detalhes-outro@example.com', password: 'senha-de-teste', isAdmin: false,
    })
    const administrador = await User.create({
      email: 'detalhes-admin@example.com', password: 'senha-de-teste', isAdmin: true,
    })
    const curso = await Course.create({ name: 'Curso privado', userId: responsavel.id })

    for (const [usuario, id] of [
      [outroUsuario, curso.id], [administrador, curso.id], [responsavel, -1],
    ] as const) {
      const contexto = {
        auth: { getUserOrFail: () => usuario }, params: { id },
        view: { render: () => assert.fail('Não deve renderizar um curso sem acesso.') },
      } as unknown as HttpContext

      try {
        await new CursosController().detalhar(contexto)
        assert.fail('Era esperado um erro 404.')
      } catch (erro) {
        assert.propertyVal(erro, 'status', 404)
      }
    }
  })
})
