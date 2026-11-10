import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'home': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'dashboard': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
    'meusCursos': { paramsTuple?: []; params?: {} }
    'cursos.criar': { paramsTuple?: []; params?: {} }
    'cursos.detalhar': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'videos.criar': { paramsTuple: [ParamValue]; params: {'cursoId': ParamValue} }
    'videos.salvar': { paramsTuple: [ParamValue]; params: {'cursoId': ParamValue} }
    'videos.detalhar': { paramsTuple: [ParamValue,ParamValue]; params: {'cursoId': ParamValue,'id': ParamValue} }
    'cursos.salvar': { paramsTuple?: []; params?: {} }
    'admin.index': { paramsTuple?: []; params?: {} }
    'admin.users.index': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'home': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'dashboard': { paramsTuple?: []; params?: {} }
    'meusCursos': { paramsTuple?: []; params?: {} }
    'cursos.criar': { paramsTuple?: []; params?: {} }
    'cursos.detalhar': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'videos.criar': { paramsTuple: [ParamValue]; params: {'cursoId': ParamValue} }
    'videos.detalhar': { paramsTuple: [ParamValue,ParamValue]; params: {'cursoId': ParamValue,'id': ParamValue} }
    'admin.index': { paramsTuple?: []; params?: {} }
    'admin.users.index': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'home': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'dashboard': { paramsTuple?: []; params?: {} }
    'meusCursos': { paramsTuple?: []; params?: {} }
    'cursos.criar': { paramsTuple?: []; params?: {} }
    'cursos.detalhar': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'videos.criar': { paramsTuple: [ParamValue]; params: {'cursoId': ParamValue} }
    'videos.detalhar': { paramsTuple: [ParamValue,ParamValue]; params: {'cursoId': ParamValue,'id': ParamValue} }
    'admin.index': { paramsTuple?: []; params?: {} }
    'admin.users.index': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
    'videos.salvar': { paramsTuple: [ParamValue]; params: {'cursoId': ParamValue} }
    'cursos.salvar': { paramsTuple?: []; params?: {} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}