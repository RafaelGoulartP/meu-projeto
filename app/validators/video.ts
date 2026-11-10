import vine, { SimpleMessagesProvider } from '@vinejs/vine'
import type { MultipartFile } from '@adonisjs/core/bodyparser'
import { fileTypeFromFile } from 'file-type'

const conteudoDeVideo = vine.createRule(async (valor: unknown, _opcoes, campo) => {
  if (!campo.isValid) return

  const arquivo = valor as MultipartFile
  let formato
  try {
    if (arquivo.tmpPath) formato = await fileTypeFromFile(arquivo.tmpPath)
  } catch {
    // Arquivos truncados ou irreconhecíveis não são aceitos como vídeos.
  }

  if (!formato || !['video/mp4', 'video/webm'].includes(formato.mime) || formato.ext !== arquivo.extname) {
    campo.report('Envie um arquivo de vídeo MP4 ou WebM válido.', 'conteudoDeVideo', campo)
  }
})

export const criarVideoValidator = vine.create({
  nome: vine.string().trim().minLength(3).maxLength(255),
  descricao: vine.string().trim().minLength(10).maxLength(5000),
  video: vine.file({ size: '100mb', extnames: ['mp4', 'webm'] }).use(conteudoDeVideo()),
})

criarVideoValidator.messagesProvider = new SimpleMessagesProvider({
  'nome.required': 'Informe o nome do vídeo.',
  'nome.minLength': 'O nome precisa ter pelo menos 3 caracteres.',
  'nome.maxLength': 'O nome pode ter no máximo 255 caracteres.',
  'descricao.required': 'Informe a descrição do vídeo.',
  'descricao.minLength': 'A descrição precisa ter pelo menos 10 caracteres.',
  'descricao.maxLength': 'A descrição pode ter no máximo 5.000 caracteres.',
  'video.required': 'Selecione o arquivo do vídeo.',
  'video.file': 'Selecione um arquivo de vídeo.',
  'video.file.size': 'O vídeo deve ter no máximo 100 MB.',
  'video.file.extname': 'O vídeo deve estar no formato MP4 ou WebM.',
})
