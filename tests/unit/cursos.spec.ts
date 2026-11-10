import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import type { HttpContext } from '@adonisjs/core/http'
import CursosController from '#controllers/cursos_controller'
import Course from '#models/course'
import User from '#models/user'

test.group('Listagem de cursos por responsável', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('cada usuário recebe somente seus cursos, inclusive administradores', async ({ assert }) => {
    const usuario = await User.create({
      email: 'cursos-usuario@example.com',
      password: 'senha-de-teste',
      isAdmin: false,
    })
    const administrador = await User.create({
      email: 'cursos-admin@example.com',
      password: 'senha-de-teste',
      isAdmin: true,
    })
    const cursoUsuario = await Course.create({ name: 'Curso do usuário', userId: usuario.id })
    const cursoAdministrador = await Course.create({
      name: 'Curso do administrador',
      userId: administrador.id,
    })
    await Course.create({ name: 'Curso sem responsável' })

    for (const [responsavel, esperado] of [
      [usuario, cursoUsuario],
      [administrador, cursoAdministrador],
    ] as const) {
      const contexto = {
        auth: { getUserOrFail: () => responsavel },
        // Um ID recebido na requisição não deve determinar o responsável consultado.
        request: { input: () => responsavel.id === usuario.id ? administrador.id : usuario.id },
        view: {
          render: (template: string, dados: { cursos: Course[] }) => {
            assert.equal(template, 'pages/meusCursos')
            assert.deepEqual(dados.cursos.map((curso) => curso.id), [esperado.id])
            assert.isUndefined(dados.cursos[0].userId)
            return 'ok'
          },
        },
      } as unknown as HttpContext

      assert.equal(await new CursosController().index(contexto), 'ok')
    }
  })

  test('usuário sem cursos recebe uma lista vazia', async ({ assert }) => {
    const usuario = await User.create({
      email: 'cursos-vazio@example.com',
      password: 'senha-de-teste',
      isAdmin: false,
    })
    const contexto = {
      auth: { getUserOrFail: () => usuario },
      view: {
        render: (_template: string, dados: { cursos: Course[] }) => {
          assert.isEmpty(dados.cursos)
          return 'ok'
        },
      },
    } as unknown as HttpContext

    assert.equal(await new CursosController().index(contexto), 'ok')
  })
})
