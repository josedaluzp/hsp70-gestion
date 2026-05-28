import Database from 'better-sqlite3'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../frontend/.env.local') })

const supabaseUrl = process.env.SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in frontend/.env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const dbPath = path.resolve(__dirname, '../hsp70.db')
const db = new Database(dbPath, { readonly: true })

interface SqliteUsuario {
  id: number
  email: string
  nombre: string
  apellido: string
  telefono: string | null
  dni: string | null
  rol: string
  activo: number
}

interface SqliteActividad {
  id: number
  nombre: string
  descripcion: string | null
  cupo_maximo: number
  duracion_min: number
  activa: number
}

interface SqliteTurno {
  id: number
  actividad_id: number
  profesor_id: number
  dia_semana: string
  hora_inicio: string
  hora_fin: string
  sala: string | null
  activo: number
}

interface SqlitePlan {
  id: number
  nombre: string
  creditos: number
  precio: number
  descripcion: string | null
}

async function migrateProfesores(): Promise<Map<number, string>> {
  console.log('\n→ Migrating staff users (admin, profesor, recepcionista)...')
  const usuarios = db.prepare(
    "SELECT * FROM usuarios WHERE rol IN ('admin', 'profesor', 'recepcionista')"
  ).all() as SqliteUsuario[]

  const idMap = new Map<number, string>()
  const defaultPassword = 'HSP70temp2024!'

  for (const u of usuarios) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: defaultPassword,
      email_confirm: true,
      user_metadata: { nombre: u.nombre, apellido: u.apellido }
    })

    if (error) {
      if (error.message.includes('already registered')) {
        const { data: { users } } = await supabase.auth.admin.listUsers()
        const found = users.find(x => x.email === u.email)
        if (found) {
          idMap.set(u.id, found.id)
          console.log(`  ↔ ${u.email} (already exists, mapped)`)
        }
      } else {
        console.error(`  ✗ ${u.email}:`, error.message)
      }
      continue
    }

    if (data.user) {
      await supabase.from('usuarios').update({
        rol: u.rol,
        telefono: u.telefono,
        dni: u.dni,
        activo: !!u.activo
      }).eq('id', data.user.id)
      idMap.set(u.id, data.user.id)
      console.log(`  ✓ ${u.email} (${u.rol})`)
    }
  }
  return idMap
}

async function migrateActividades(): Promise<Map<number, number>> {
  console.log('\n→ Migrating actividades...')
  const actividades = db.prepare('SELECT * FROM actividades').all() as SqliteActividad[]
  const idMap = new Map<number, number>()

  for (const act of actividades) {
    const { data, error } = await supabase.from('actividades').upsert({
      nombre: act.nombre,
      descripcion: act.descripcion,
      cupo_maximo: act.cupo_maximo,
      duracion_min: act.duracion_min,
      activa: !!act.activa
    }, { onConflict: 'nombre' }).select('id').single()

    if (error) {
      console.error(`  ✗ ${act.nombre}:`, error.message)
    } else if (data) {
      idMap.set(act.id, data.id)
      console.log(`  ✓ ${act.nombre}`)
    }
  }
  return idMap
}

async function migratePlanes() {
  console.log('\n→ Migrating planes...')
  const planes = db.prepare('SELECT * FROM planes').all() as SqlitePlan[]

  for (const plan of planes) {
    const { error } = await supabase.from('planes').upsert({
      nombre: plan.nombre,
      creditos: plan.creditos,
      precio: plan.precio,
      descripcion: plan.descripcion
    }, { onConflict: 'nombre' })

    if (error) console.error(`  ✗ ${plan.nombre}:`, error.message)
    else console.log(`  ✓ ${plan.nombre}`)
  }
}

async function migrateTurnos(
  profesorIdMap: Map<number, string>,
  actividadIdMap: Map<number, number>
) {
  console.log('\n→ Migrating turnos...')
  const turnos = db.prepare('SELECT * FROM turnos').all() as SqliteTurno[]

  for (const t of turnos) {
    const profesorId = profesorIdMap.get(t.profesor_id)
    const actividadId = actividadIdMap.get(t.actividad_id)

    if (!profesorId || !actividadId) {
      console.warn(`  ⚠ Skipping turno id=${t.id}: missing references`)
      continue
    }

    const { error } = await supabase.from('turnos').insert({
      actividad_id: actividadId,
      profesor_id: profesorId,
      dia_semana: t.dia_semana,
      hora_inicio: t.hora_inicio,
      hora_fin: t.hora_fin,
      sala: t.sala,
      activo: !!t.activo
    })

    if (error) console.error(`  ✗ Turno ${t.dia_semana} ${t.hora_inicio}:`, error.message)
    else console.log(`  ✓ Turno ${t.dia_semana} ${t.hora_inicio}`)
  }
}

async function verify() {
  console.log('\n→ Verification...')
  const [
    { count: actividades },
    { count: turnos },
    { count: planes },
    { data: { users } }
  ] = await Promise.all([
    supabase.from('actividades').select('*', { count: 'exact', head: true }),
    supabase.from('turnos').select('*', { count: 'exact', head: true }),
    supabase.from('planes').select('*', { count: 'exact', head: true }),
    supabase.auth.admin.listUsers()
  ])
  console.log(`  Actividades migradas: ${actividades}`)
  console.log(`  Turnos migrados: ${turnos}`)
  console.log(`  Planes: ${planes}`)
  console.log(`  Auth users: ${users?.length ?? 0}`)
}

async function main() {
  console.log('HSP-70 Migration: SQLite → Supabase')
  console.log('=====================================')

  const profesorIdMap = await migrateProfesores()
  const actividadIdMap = await migrateActividades()
  await migrateTurnos(profesorIdMap, actividadIdMap)
  await migratePlanes()
  await verify()

  console.log('\n✓ Migration complete!')
  console.log(`  Default password for migrated users: HSP70temp2024!`)
  console.log('  Ask all staff to change their passwords on first login.')
  db.close()
}

main().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
