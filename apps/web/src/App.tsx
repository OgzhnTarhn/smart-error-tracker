import { BrowserRouter, Routes, Route } from 'react-router-dom';
import OverviewPage from './pages/OverviewPage';
import IssuesPage from './pages/IssuesPage';
import IssueDetailPage from './pages/IssueDetailPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/issues" element={<IssuesPage />} />
        <Route path="/issues/:id" element={<IssueDetailPage />} />
      </Routes>
    </BrowserRouter>
  );
}