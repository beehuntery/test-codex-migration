import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Task Manager Next',
  description: 'Next.js migration of the task manager application.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-surface text-body">
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
