import vine, { SimpleMessagesProvider } from '@vinejs/vine'

export const criarCursoValidator = vine.create({
  nome: vine.string().trim().minLength(3).maxLength(255),
  descricao: vine.string().trim().minLength(10).maxLength(5000),
  capa: vine.file({
    size: '5mb',
    extnames: ['jpg', 'jpeg', 'png', 'webp'],
  }),
})

criarCursoValidator.messagesProvider = new SimpleMessagesProvider({
  'nome.required': 'Informe o nome do curso.',
  'nome.minLength': 'O nome precisa ter pelo menos 3 caracteres.',
  'nome.maxLength': 'O nome pode ter no máximo 255 caracteres.',
  'descricao.required': 'Informe a descrição do curso.',
  'descricao.minLength': 'A descrição precisa ter pelo menos 10 caracteres.',
  'descricao.maxLength': 'A descrição pode ter no máximo 5.000 caracteres.',
  'capa.required': 'Selecione uma imagem de capa.',
  'capa.file': 'Selecione um arquivo de imagem.',
  'capa.file.size': 'A capa deve ter no máximo 5 MB.',
  'capa.file.extname': 'A capa deve ser uma imagem JPG, PNG ou WebP.',
})
