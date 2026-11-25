import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { ToastContainer } from '../components/ToastContainer';

export const AppShell = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="app-main">
        <Topbar onToggleMobile={() => setMobileOpen((prev) => !prev)} />
        <main className="page-container">
          <Outlet />
        </main>
      </div>

      <ToastContainer />
    </div>
  );
};
