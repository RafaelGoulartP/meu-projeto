
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'
import env from '#start/env'

export default class AdminSeeder extends BaseSeeder {
  async run() {
    await User.updateOrCreate(
      { email: env.get('ADMIN_EMAIL') },
      {
        fullName: 'Administrador',
        password: env.get('ADMIN_PASSWORD').release(),
        isAdmin: true,
      }
    )
  }
}