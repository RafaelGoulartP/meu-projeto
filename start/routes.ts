/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

router.on('/').render('pages/home').as('home')

router
  .group(() => {
    router.get('signup', [controllers.NewAccount, 'create'])
    router.post('signup', [controllers.NewAccount, 'store'])

    router.get('login', [controllers.Session, 'create'])
    router.post('login', [controllers.Session, 'store'])
  })
  .use(middleware.guest())

router
  .group(() => {
    router.on('/dashboard').render('pages/dashboard').as('dashboard')
    router.post('logout', [controllers.Session, 'destroy'])
    router.get('/meusCursos', [controllers.Cursos, 'index']).as('meusCursos')
    router.on('/cursos/criar').render('pages/cursos/criar').as('cursos.criar')
    router.get('/cursos/:id', [controllers.Cursos, 'detalhar']).as('cursos.detalhar')
    router
      .get('/cursos/:cursoId/videos/criar', [controllers.Videos, 'criar'])
      .as('videos.criar')
    router.post('/cursos/:cursoId/videos', [controllers.Videos, 'store']).as('videos.salvar')
    router
      .get('/cursos/:cursoId/videos/:id', [controllers.Videos, 'detalhar'])
      .as('videos.detalhar')
    router.post('/cursos', [controllers.Cursos, 'store']).as('cursos.salvar')
  })
  .use(middleware.auth())



router
  .group(() => {
    router
      .get('/', ({ response }) => {
        return response.redirect().toRoute('admin.users.index')
      })
      .as('index')

    router
      .get('/usuarios', [controllers.AdminUsers, 'index'])
      .as('users.index')
  })
  .prefix('/admin')
  .as('admin')
  .use([middleware.auth(), middleware.admin()])
