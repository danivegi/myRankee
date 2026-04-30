'use client';

import { usePathname } from 'next/navigation';
import Footer from './Footer';

const HIDDEN_ON = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];

export default function ConditionalFooter() {
  const pathname = usePathname();
  if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;
  return <Footer />;
}
