'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
            <p className="text-neutral-500 mb-4">Please try again later.</p>
            <button
              onClick={reset}
              className="px-4 py-2 rounded-lg bg-brand-500 text-white"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
