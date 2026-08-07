import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-6 text-center">
      <p className="text-amber-500 text-9xl font-bold leading-none select-none" aria-hidden="true">
        404
      </p>

      <h1 className="mt-6 text-3xl font-semibold text-white tracking-tight">
        Page Not Found
      </h1>

      <p className="mt-4 text-slate-400 max-w-md text-base leading-relaxed">
        The path you&rsquo;re looking for doesn&rsquo;t exist. Let&rsquo;s get you back on track.
      </p>

      <div className="mt-10 flex flex-wrap gap-4 justify-center">
        <Link
          to="/"
          className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition-colors duration-200"
        >
          Go Home
        </Link>

        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center justify-center px-6 py-3 rounded-xl border border-slate-700 hover:border-amber-500 text-slate-300 hover:text-amber-400 font-semibold text-sm transition-colors duration-200 bg-transparent cursor-pointer"
        >
          Go Back
        </button>
      </div>

      <p className="mt-16 text-slate-600 text-xs tracking-widest uppercase">
        New Horizon &mdash; Community for Returning Citizens
      </p>
    </div>
  );
}
