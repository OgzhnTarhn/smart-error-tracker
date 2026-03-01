import { BrowserRouter, Routes, Route } from 'react-router-dom';
import IssuesPage from './pages/IssuesPage';
import IssueDetailPage from './pages/IssueDetailPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<IssuesPage />} />
        <Route path="/issues/:id" element={<IssueDetailPage />} />
      </Routes>
    </BrowserRouter>
  );
}