import { test } from '@japa/runner'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import { MultipartFileFactory } from '@adonisjs/bodyparser/factories'
import type { HttpContext } from '@adonisjs/core/http'
import CursosController from '#controllers/cursos_controller'
import Course from '#models/course'
import User from '#models/user'
import { criarCursoValidator } from '#validators/curso'

test.group('Criação de cursos', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('salva a capa e vincula o curso ao usuário da sessão, ignorando outro responsável enviado', async ({ assert }) => {
    const usuario = await User.create({
      email: 'criador-curso@example.com',
      password: 'senha-de-teste',
      isAdmin: false,
    })
    const outroUsuario = await User.create({
      email: 'outro-criador@example.com',
      password: 'senha-de-teste',
      isAdmin: false,
    })
    const pastaTemporaria = await mkdtemp(join(tmpdir(), 'capa-curso-'))
    const imagem = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1sAAAAASUVORK5CYII=',
      'base64'
    )
    const capa = new MultipartFileFactory().merge({
      fieldName: 'capa', clientName: 'minha-capa.png',
      extname: 'png', type: 'image', subtype: 'png', size: imagem.length,
    }).create()
    capa.tmpPath = join(pastaTemporaria, 'imagem.png')
    await writeFile(capa.tmpPath, imagem)

    try {
      const contexto = {
        auth: { getUserOrFail: () => usuario },
        request: {
          validateUsing: () => criarCursoValidator.validate({
            nome: '  Curso criado pelo formulário  ',
            descricao: '  Descrição do curso de teste.  ',
            capa,
            userId: outroUsuario.id,
            user_id: outroUsuario.id,
          }),
        },
        response: { redirect: () => ({ toRoute: (rota: string) => rota }) },
      } as unknown as HttpContext

      assert.equal(await new CursosController().store(contexto), 'meusCursos')
      const curso = await Course.query().where('user_id', usuario.id).firstOrFail()
      assert.equal(curso.name, 'Curso criado pelo formulário')
      assert.equal(curso.descricao, 'Descrição do curso de teste.')
      assert.equal(curso.userId, usuario.id)
      assert.equal(curso.caminhoCapa, `/imagens/cursos/${capa.fileName}`)
      assert.notEqual(capa.fileName, capa.clientName)
      assert.deepEqual(await readFile(capa.filePath!), imagem)
    } finally {
      if (capa.filePath) await rm(capa.filePath, { force: true })
      await rm(pastaTemporaria, { recursive: true, force: true })
    }
  })

  test('rejeita campos vazios, nome curto, descrição curta e imagem ausente', async ({ assert }) => {
    const capa = new MultipartFileFactory().merge({ fieldName: 'capa', extname: 'png' }).create()
    for (const dados of [
      { nome: '', descricao: '', capa },
      { nome: 'ab', descricao: 'Descrição válida.', capa },
      { nome: 'Curso válido', descricao: 'curta', capa },
      { nome: 'Curso válido', descricao: 'Descrição válida.' },
    ]) {
      await assert.rejects(() => criarCursoValidator.validate(dados))
    }
  })

  test('rejeita capas de formato inválido ou maiores que 5 MB', async ({ assert }) => {
    for (const parametros of [
      { extname: 'svg', size: 100 },
      { extname: 'png', size: 6 * 1024 * 1024 },
    ]) {
      const capa = new MultipartFileFactory().merge({ fieldName: 'capa', ...parametros }).create()
      await assert.rejects(() => criarCursoValidator.validate({
        nome: 'Curso válido', descricao: 'Descrição válida para o curso.', capa,
      }))
    }
  })

  test('remove a capa se a gravação do curso falhar', async ({ assert }) => {
    const pastaTemporaria = await mkdtemp(join(tmpdir(), 'capa-curso-falha-'))
    const capa = new MultipartFileFactory().merge({ fieldName: 'capa', extname: 'png' }).create()
    capa.tmpPath = join(pastaTemporaria, 'imagem.png')
    await writeFile(capa.tmpPath, 'imagem de teste')

    try {
      const contexto = {
        // Um responsável inexistente provoca falha de chave estrangeira.
        auth: { getUserOrFail: () => ({ id: -1 }) },
        request: {
          validateUsing: () => criarCursoValidator.validate({
            nome: 'Curso com falha', descricao: 'Descrição válida para o curso.', capa,
          }),
        },
      } as unknown as HttpContext

      await assert.rejects(() => new CursosController().store(contexto))
      assert.exists(capa.filePath)
      await assert.rejects(() => readFile(app.publicPath(`imagens/cursos/${capa.fileName}`)))
    } finally {
      if (capa.filePath) await rm(capa.filePath, { force: true })
      await rm(pastaTemporaria, { recursive: true, force: true })
    }
  })
})
