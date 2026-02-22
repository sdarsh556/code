import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './components/auth/Login';
import Layout from './components/Layout';

import Dashboard from './components/home/Dashboard';
import EC2 from './components/ec2/EC2';
import ECS from './components/ecs/ECS';
import ECSServices from './components/ecs/ECSServices';
import ECSServiceUpdates from './components/ecs/ECSServiceUpdates';
import ECSASG from './components/ecs/ECSASG';
import EKS from './components/eks/EKS';
// import EBS from './components/ebs/EBS';
// import RDS from './components/rds/components/RDS';
// import NeverStartPage from './components/rds/components/NeverStartPage';
// import TwentyFourSevenPage from './components/rds/components/TwentyFourSevenPage';
import Analytics from './components/analytics/Analytics';
import EC2Analytics from './components/analytics/ec2/EC2Analytics';
import ECSAnalytics from './components/analytics/ecs/ECSAnalytics';
import ClusterDetails from './components/analytics/ecs/ClusterDetails';
import ServiceDetails from './components/analytics/ecs/ServiceDetails';
import AuthGuard from './components/routes/AuthGuard';
import useSessionTimeout from './components/hooks/useSessionTimeout';


function ProtectedApp() {
  useSessionTimeout(30 * 60 * 1000);
  return <Layout />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* LOGIN */}
        <Route path="/login" element={<Login />} />

        {/* PROTECTED APP */}
        <Route element={<AuthGuard />}>
          <Route element={<ProtectedApp />}>
            <Route index element={<Dashboard />} />
            <Route path="ec2" element={<EC2 />} />
            <Route path="ecs" element={<ECS />} />
            <Route path="ecs/updates" element={<ECSServiceUpdates />} />
            <Route path="ecs/:clusterName" element={<ECSServices />} />
            <Route path="ecs/asg/:clusterName" element={<ECSASG />} />
            <Route path="eks" element={<EKS />} />
            {/* <Route path="rds" element={<RDS />} /> */}
            {/* <Route path="rds/never-start" element={<NeverStartPage />} /> */}
            {/* <Route path="rds/24x7" element={<TwentyFourSevenPage />} /> */}

            {/* ANALYTICS */}
            <Route path="analytics" element={<Analytics />} />
            <Route path="analytics/ec2" element={<EC2Analytics />} />
            <Route path="analytics/ecs" element={<ECSAnalytics />} />
            <Route path="analytics/ecs/cluster/:clusterName" element={<ClusterDetails />} />
            <Route path="analytics/ecs/cluster/:clusterName/services" element={<ServiceDetails />} />
          </Route>
        </Route>

      </Routes>
    </BrowserRouter>
  );
}


export default App;
