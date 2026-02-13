import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import { Providers } from './providers';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Fallo - Project Management',
  description:
    'A Trello-inspired project management application with hierarchical card types and LLM integration.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="slate">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
