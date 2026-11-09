import { Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { MobileShell } from './components/MobileShell';
import { ProtectedRoute, RootRedirect } from './components/ProtectedRoute';
import { RoleHome } from './components/RoleHome';
import { Login } from './pages/Login';
import { AllocationRequests, MaintenancePending, PurchaseIndent } from './pages/HoPurchase';
import { ApprovalInbox } from './pages/ApprovalInbox';
import { MyRequests } from './pages/MyRequests';
import { VendorForm } from './pages/VendorForm';
import { VendorList } from './pages/VendorList';
import { Complaints } from './pages/Complaints';
import { DutyPosting } from './pages/DutyPosting';
import { TmGrn, TmMrn, TmSrn, TmWsr } from './pages/tm/TmStock';
import { TmMonth, TmNorms, TmRound } from './pages/tm/TmRounds';
import { Notifications } from './pages/Notifications';
import { Requests } from './pages/Requests';
import { TmFleet } from './pages/tm/TmFleet';
import { TmWork } from './pages/tm/TmWork';
import { FleetGrouping } from './pages/FleetGrouping';
import { JobCardDetail } from './pages/JobCardDetail';
import { TyreRegister } from './pages/TyreRegister';
import { Dashboard } from './pages/Dashboard';
import { Reports } from './pages/Reports';
import { SchedulePlanner } from './pages/SchedulePlanner';
import { ReturnGrnPage, SrnPage, WsrPage } from './pages/StockDocs';
import { DepotIndentPage, GatePassPage, GinPage, StockApprovalsPage, TransferRequestPage } from './pages/Logistics';
import { GrnInPage } from './pages/GrnPage';
import { AirTypePage, CorrectionsPage, DamagePage, DrnPage, PfrPage } from './pages/RegisterReports';
import { OutsourceEmployees, TyreManRegister } from './pages/StaffRegisters';
import { LiveStock } from './pages/LiveStock';
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
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="reports" element={<Reports />} />
          <Route path="air-type" element={<AirTypePage />} />
          <Route path="corrections" element={<CorrectionsPage />} />
          <Route path="damage-reports" element={<DamagePage />} />
          <Route index element={<RoleHome />} />
          <Route path="vendors" element={<VendorList />} />
          <Route path="vendors/new" element={<VendorForm />} />
          <Route path="vendors/:id/edit" element={<VendorForm />} />
          <Route path="requests" element={<MyRequests />} />
          <Route path="purchase-indent" element={<PurchaseIndent />} />
          <Route path="allocation-requests" element={<AllocationRequests />} />
          <Route path="maintenance-pending" element={<MaintenancePending />} />
          <Route path="m/:slug" element={<MasterList />} />
          <Route path="m/:slug/new" element={<MasterForm />} />
          <Route path="m/:slug/:id/edit" element={<MasterForm />} />
          <Route path="*" element={<RoleHome />} />
        </Routes>
      </AppShell></ProtectedRoute>} />
      <Route path="/am/*"  element={<ProtectedRoute allow="AM"><AppShell>
        <Routes>
          <Route path="tyres" element={<TyreRegister />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="reports" element={<Reports />} />
          <Route path="air-type" element={<AirTypePage />} />
          <Route path="damage-reports" element={<DamagePage />} />
          <Route index element={<RoleHome />} />
          <Route path="approvals" element={<ApprovalInbox mode="pending" />} />
          <Route path="purchase-indent" element={<PurchaseIndent />} />
          <Route path="allocation-requests" element={<AllocationRequests />} />
          <Route path="maintenance-pending" element={<MaintenancePending />} />
          <Route path="history" element={<ApprovalInbox mode="history" />} />
          <Route path="vendors" element={<VendorList />} />
          <Route path="m/:slug" element={<MasterList />} />
          <Route path="*" element={<RoleHome />} />
        </Routes>
      </AppShell></ProtectedRoute>} />
      <Route path="/sup/*" element={<ProtectedRoute allow="SUP"><AppShell>
        <Routes>
          <Route path="stock-approvals" element={<StockApprovalsPage />} />
          <Route path="tyres" element={<TyreRegister />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="reports" element={<Reports />} />
          <Route path="drn" element={<DrnPage />} />
          <Route path="planner" element={<SchedulePlanner />} />
          <Route index element={<RoleHome />} />
          <Route path="grouping" element={<FleetGrouping />} />
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
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="reports" element={<Reports />} />
          <Route path="premature-failure" element={<PfrPage />} />
          <Route path="damage-reports" element={<DamagePage />} />
          <Route path="drn" element={<DrnPage />} />
          <Route path="air-type" element={<AirTypePage />} />
          <Route path="corrections" element={<CorrectionsPage />} />
          <Route path="planner" element={<SchedulePlanner />} />
          <Route path="live-stock" element={<LiveStock />} />
          <Route path="outsource" element={<OutsourceEmployees />} />
          <Route path="tyre-men" element={<TyreManRegister />} />
          <Route path="requests" element={<Requests />} />
          <Route path="wsr" element={<WsrPage only="wsr" />} />
          <Route path="wsr-gin" element={<WsrPage only="gin" />} />
          <Route path="indent" element={<DepotIndentPage />} />
          <Route path="transfer-requests" element={<TransferRequestPage />} />
          <Route path="gin" element={<GinPage />} />
          <Route path="gate-pass" element={<GatePassPage />} />
          <Route path="grn" element={<GrnInPage />} />
          <Route path="material-return" element={<ReturnGrnPage />} />
          <Route path="srn" element={<SrnPage />} />
          <Route index element={<RoleHome />} />
          <Route path="grouping" element={<FleetGrouping />} />
          <Route path="duty" element={<DutyPosting />} />
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
          <Route path="wsr" element={<TmWsr />} />
          <Route path="grn" element={<TmGrn />} />
          <Route path="mrn" element={<TmMrn />} />
          <Route path="srn" element={<TmSrn />} />
          <Route path="round/:code" element={<TmRound />} />
          <Route path="month/:code" element={<TmMonth />} />
          <Route path="fleet/:cardId" element={<TmFleet />} />
          <Route path="work/:cardId" element={<TmWork />} />
          <Route path="norms" element={<TmNorms />} />
          <Route path="notifications" element={<Notifications mobile />} />
          <Route path="*" element={<TmJobs />} />
        </Routes>
      </MobileShell></ProtectedRoute>} />

      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}
