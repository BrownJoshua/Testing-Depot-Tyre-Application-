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

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Desktop-first roles */}
      <Route path="/ho/*"  element={<ProtectedRoute allow="HO"><AppShell>
        <Routes>
          <Route index element={<RoleHome />} />
          <Route path="vendors" element={<VendorList />} />
          <Route path="vendors/new" element={<VendorForm />} />
          <Route path="vendors/:id/edit" element={<VendorForm />} />
          <Route path="requests" element={<MyRequests />} />
          <Route path="*" element={<RoleHome />} />
        </Routes>
      </AppShell></ProtectedRoute>} />
      <Route path="/am/*"  element={<ProtectedRoute allow="AM"><AppShell>
        <Routes>
          <Route index element={<RoleHome />} />
          <Route path="approvals" element={<ApprovalInbox mode="pending" />} />
          <Route path="history" element={<ApprovalInbox mode="history" />} />
          <Route path="vendors" element={<VendorList />} />
          <Route path="*" element={<RoleHome />} />
        </Routes>
      </AppShell></ProtectedRoute>} />
      <Route path="/sup/*" element={<ProtectedRoute allow="SUP"><AppShell><RoleHome /></AppShell></ProtectedRoute>} />

      {/* Tyre IC: one responsive layout for desktop, tablet and phone */}
      <Route path="/tic/*" element={<ProtectedRoute allow="TIC"><AppShell><RoleHome /></AppShell></ProtectedRoute>} />

      {/* Tyre Man: mobile-only */}
      <Route path="/tm/*"  element={<ProtectedRoute allow="TM"><MobileShell><RoleHome /></MobileShell></ProtectedRoute>} />

      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}
