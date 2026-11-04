import { Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { MobileShell } from './components/MobileShell';
import { ProtectedRoute, RootRedirect } from './components/ProtectedRoute';
import { RoleHome } from './components/RoleHome';
import { Login } from './pages/Login';
import { ApprovalInbox } from './pages/ApprovalInbox';
import { MyRequests } from './pages/MyRequests';
import { VendorForm } from './pages/VendorForm';
import { VendorList } from './pages/VendorList';
import { Complaints } from './pages/Complaints';
import { DutyRoster } from './pages/DutyRoster';
import { FleetGrouping } from './pages/FleetGrouping';
import { JobCardDetail } from './pages/JobCardDetail';
import { TyreRegister } from './pages/TyreRegister';
import { SchedulePlanner } from './pages/SchedulePlanner';
import { TmComplaint } from './pages/tm/TmComplaint';
import { TmDuty } from './pages/tm/TmDuty';
import { TmInspect } from './pages/tm/TmInspect';
import { TmJobs } from './pages/tm/TmJobs';
import { JobCards } from './pages/JobCards';
import { MasterForm } from './pages/MasterForm';
import { MasterList } from './pages/MasterList';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Desktop-first roles */}
      <Route path="/ho/*"  element={<ProtectedRoute allow="HO"><AppShell>
        <Routes>
          <Route path="tyres" element={<TyreRegister />} />
          <Route index element={<RoleHome />} />
          <Route path="vendors" element={<VendorList />} />
          <Route path="vendors/new" element={<VendorForm />} />
          <Route path="vendors/:id/edit" element={<VendorForm />} />
          <Route path="requests" element={<MyRequests />} />
          <Route path="m/:slug" element={<MasterList />} />
          <Route path="m/:slug/new" element={<MasterForm />} />
          <Route path="m/:slug/:id/edit" element={<MasterForm />} />
          <Route path="*" element={<RoleHome />} />
        </Routes>
      </AppShell></ProtectedRoute>} />
      <Route path="/am/*"  element={<ProtectedRoute allow="AM"><AppShell>
        <Routes>
          <Route path="tyres" element={<TyreRegister />} />
          <Route index element={<RoleHome />} />
          <Route path="approvals" element={<ApprovalInbox mode="pending" />} />
          <Route path="history" element={<ApprovalInbox mode="history" />} />
          <Route path="vendors" element={<VendorList />} />
          <Route path="m/:slug" element={<MasterList />} />
          <Route path="*" element={<RoleHome />} />
        </Routes>
      </AppShell></ProtectedRoute>} />
      <Route path="/sup/*" element={<ProtectedRoute allow="SUP"><AppShell>
        <Routes>
          <Route path="tyres" element={<TyreRegister />} />
          <Route path="planner" element={<SchedulePlanner />} />
          <Route index element={<RoleHome />} />
          <Route path="grouping" element={<FleetGrouping />} />
          <Route path="roster" element={<DutyRoster />} />
          <Route path="job-cards" element={<JobCards />} />
          <Route path="job-cards/:id" element={<JobCardDetail />} />
          <Route path="complaints" element={<Complaints />} />
          <Route path="m/:slug" element={<MasterList />} />
          <Route path="*" element={<RoleHome />} />
        </Routes>
      </AppShell></ProtectedRoute>} />

      {/* Tyre IC: one responsive layout for desktop, tablet and phone */}
      <Route path="/tic/*" element={<ProtectedRoute allow="TIC"><AppShell>
        <Routes>
          <Route path="tyres" element={<TyreRegister />} />
          <Route path="planner" element={<SchedulePlanner />} />
          <Route index element={<RoleHome />} />
          <Route path="grouping" element={<FleetGrouping />} />
          <Route path="duty" element={<DutyRoster />} />
          <Route path="job-cards" element={<JobCards />} />
          <Route path="job-cards/:id" element={<JobCardDetail />} />
          <Route path="complaints" element={<Complaints />} />
          <Route path="m/:slug" element={<MasterList />} />
          <Route path="*" element={<RoleHome />} />
        </Routes>
      </AppShell></ProtectedRoute>} />

      {/* Tyre Man: mobile-only */}
      <Route path="/tm/*"  element={<ProtectedRoute allow="TM"><MobileShell>
        <Routes>
          <Route index element={<TmJobs />} />
          <Route path="job-card/:id" element={<TmInspect />} />
          <Route path="duty" element={<TmDuty />} />
          <Route path="complaint" element={<TmComplaint />} />
          <Route path="*" element={<TmJobs />} />
        </Routes>
      </MobileShell></ProtectedRoute>} />

      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}
