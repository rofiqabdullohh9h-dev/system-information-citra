import React, { useState, lazy, Suspense } from 'react';
import { useAppStore } from '../store/store';
import AdminSidebar from '../components/common/AdminSidebar';
import AdminHeader from '../components/common/AdminHeader';
import { lazyWithRetry } from '../utils/lazyWithRetry';

const AdminOverview = lazyWithRetry(() => import('./AdminOverview'));
const EventManagement = lazyWithRetry(() => import('./EventManagement'));
const AttendanceForm = lazyWithRetry(() => import('./AttendanceForm'));
const JamaahManagement = lazyWithRetry(() => import('./JamaahManagement'));
const CategoryManagement = lazyWithRetry(() => import('./CategoryManagement'));
const Analytics = lazyWithRetry(() => import('./Analytics'));
const AdminAccounts = lazyWithRetry(() => import('./AdminAccounts'));
const AuditLogs = lazyWithRetry(() => import('./AuditLogs'));
const BulletinManager = lazyWithRetry(() => import('./BulletinManager'));
const LoginPage = lazyWithRetry(() => import('./LoginPage'));

export default function AdminDashboard() {
  const [currentSection, setCurrentSection] = useState('overview');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [attendanceEventId, setAttendanceEventId] = useState(null);

  const currentUser = useAppStore((state) => state.currentUser);

  // If not logged in, show LoginPage
  if (!currentUser) {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }>
        <LoginPage />
      </Suspense>
    );
  }

  const handleQuickAction = (action) => {
    if (action === 'add-event') {
      setCurrentSection('events');
    } else if (action === 'attendance') {
      setCurrentSection('attendance');
    }
  };

  const handleNavigate = (section, eventId = null) => {
    if (eventId) {
      setAttendanceEventId(eventId);
    }
    setCurrentSection(section);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Navigation */}
      <AdminSidebar
        currentSection={currentSection}
        setCurrentSection={setCurrentSection}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Header */}
        <AdminHeader
          currentSection={currentSection}
          setMobileOpen={setMobileOpen}
          onQuickAction={handleQuickAction}
        />

        {/* Content Body with On-Demand Lazy Loaded Tabs */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-fade-in">
          <Suspense fallback={
            <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-2.5">
              <div className="w-8 h-8 border-3 border-brand-700 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-medium">Memuat modul pengurus...</span>
            </div>
          }>
            {currentSection === 'overview' && (
              <AdminOverview onNavigate={handleNavigate} />
            )}
            {currentSection === 'events' && <EventManagement />}
            {currentSection === 'attendance' && (
              <AttendanceForm initialEventId={attendanceEventId} />
            )}
            {currentSection === 'bulletins' && <BulletinManager />}
            {currentSection === 'jamaah' && <JamaahManagement />}
            {currentSection === 'categories' && <CategoryManagement />}
            {currentSection === 'analytics' && <Analytics />}
            {currentSection === 'admin-manage' && <AdminAccounts />}
            {currentSection === 'audit' && <AuditLogs />}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
