import React, { useState } from 'react';
import { useAppStore } from '../store/store';
import AdminSidebar from '../components/common/AdminSidebar';
import AdminHeader from '../components/common/AdminHeader';
import AdminOverview from './AdminOverview';
import EventManagement from './EventManagement';
import AttendanceForm from './AttendanceForm';
import JamaahManagement from './JamaahManagement';
import CategoryManagement from './CategoryManagement';
import Analytics from './Analytics';
import AdminAccounts from './AdminAccounts';
import AuditLogs from './AuditLogs';
import BulletinManager from './BulletinManager';
import LoginPage from './LoginPage';

export default function AdminDashboard() {
  const [currentSection, setCurrentSection] = useState('overview');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [attendanceEventId, setAttendanceEventId] = useState(null);

  const currentUser = useAppStore((state) => state.currentUser);

  // If not logged in, show LoginPage
  if (!currentUser) {
    return <LoginPage />;
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

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-fade-in">
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
        </main>
      </div>
    </div>
  );
}
