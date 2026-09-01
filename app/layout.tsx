import type {Metadata} from 'next';
import './globals.css'; // Global styles
import { Inter, Noto_Sans_Devanagari } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const notoSansDevanagari = Noto_Sans_Devanagari({ 
  weight: ['400', '500', '600', '700'],
  subsets: ['devanagari'],
  variable: '--font-noto-devanagari' 
});

export const metadata: Metadata = {
  title: 'MatdarMitra | Family Voter List Tool',
  description: 'Search family members in Indian electoral voter roll PDFs and export a clean family voter list.',
  openGraph: {
    title: 'MatdarMitra | Family Voter List Tool',
    description: 'Search family members in Indian electoral voter roll PDFs and export a clean family voter list.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MatdarMitra | Family Voter List Tool',
    description: 'Search family members in Indian electoral voter roll PDFs and export a clean family voter list.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${inter.variable} ${notoSansDevanagari.variable}`} suppressHydrationWarning>
      <body className="font-sans bg-[#FAFAF9] text-slate-900 antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
