// Vercel entry: runs the Express API (server/) as one Vercel Function for
// every /api/* path. The built React app is served by Vercel's CDN from dist/
// (see vercel.json), so this function only answers /api requests.
// See server/vercel-handler.js for how settings and live updates are handled.
import { buildHandler } from '../server/vercel-handler.js'

export default buildHandler(process.env)
