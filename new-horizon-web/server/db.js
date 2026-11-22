import pg from 'pg'

// One pooled client for request queries. Neon's pooled connection string
// (DATABASE_URL) is fine here because every query is a single statement or an
// explicit transaction on one checked-out client.
export function createPool(connectionString) {
  if (!connectionString) throw new Error('DATABASE_URL is required.')
  const pool = new pg.Pool({ connectionString, max: Number(process.env.PG_POOL_MAX) || 10 })
  pool.on('error', (err) => console.error('[db] idle client error:', err.message))
  return {
    query: (text, params) => pool.query(text, params),
    async transaction(fn) {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        const result = await fn({ query: (t, p) => client.query(t, p) })
        await client.query('COMMIT')
        return result
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {})
        throw err
      } finally {
        client.release()
      }
    },
    end: () => pool.end(),
  }
}
