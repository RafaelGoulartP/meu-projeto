
import User from '#models/user'
import type { HttpContext } from '@adonisjs/core/http'

export default class AdminUsersController {
  async index({ view }: HttpContext) {
    const users = await User.query()
      .select('id', 'full_name', 'email', 'is_admin', 'created_at')
      .orderBy('created_at', 'desc')
      .orderBy('id', 'desc')

    const totalUsers = users.length
    const totalAdmins = users.filter((user) => user.isAdmin).length
    const totalRegularUsers = totalUsers - totalAdmins

    return view.render('pages/admin/index', {
      users,
      totalUsers,
      totalAdmins,
      totalRegularUsers,
    })
  }
}
