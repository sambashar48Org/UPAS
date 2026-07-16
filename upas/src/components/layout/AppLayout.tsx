import type { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ direction: 'rtl' }}>
      {/* Sidebar — right side in RTL */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main
          className="flex-1 overflow-y-auto p-6"
          style={{ backgroundColor: 'var(--upas-bg-primary)' }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}