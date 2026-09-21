import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const migration = readFileSync(
  new URL('../supabase/migrations/20260920184847_ats_mvp.sql', import.meta.url),
  'utf8',
)

// Ignore explanatory SQL comments when checking executable policy text.
const executableSql = migration.replace(/^\s*--.*$/gm, '')

test('all application tables explicitly enable row-level security', () => {
  for (const table of [
    'organizations',
    'profiles',
    'jobs',
    'candidates',
    'candidate_analyses',
  ]) {
    assert.match(
      migration,
      new RegExp(`alter table public\\.${table} enable row level security;`, 'i'),
    )
  }
})

test('migration does not introduce permissive RLS checks', () => {
  assert.doesNotMatch(executableSql, /\busing\s*\(\s*true\s*\)/i)
  assert.doesNotMatch(executableSql, /\bwith\s+check\s*\(\s*true\s*\)/i)
})

test('tenant authorization helpers stay private and hardened', () => {
  assert.match(migration, /create schema if not exists private;/i)
  assert.match(migration, /revoke all on schema private from public;/i)

  for (const helper of [
    'current_organization_id',
    'is_admin',
    'is_member_of',
    'candidate_matches_organization',
    'can_access_candidate_file',
  ]) {
    assert.match(
      migration,
      new RegExp(
        `create or replace function private\\.${helper}[\\s\\S]*?security definer[\\s\\S]*?set search_path = ''`,
        'i',
      ),
      `${helper} must be a hardened private security-definer helper`,
    )
  }
})

test('candidate CVs use a private, restricted bucket with guarded object policies', () => {
  assert.match(
    migration,
    /values \('candidate-cvs', 'candidate-cvs', false, 5242880, array\['application\/pdf'\]\)/i,
  )

  for (const operation of ['select', 'insert', 'update', 'delete']) {
    assert.match(
      migration,
      new RegExp(
        `create policy candidate_cvs_${operation} on storage\\.objects[\\s\\S]*?for ${operation} to authenticated[\\s\\S]*?private\\.can_access_candidate_file\\(name\\)`,
        'i',
      ),
      `CV ${operation} policy must call the tenant-aware file guard`,
    )
  }
})
