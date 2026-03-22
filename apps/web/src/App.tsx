import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import OverviewPage from './pages/OverviewPage';
import ProjectsPage from './pages/ProjectsPage';
import IssuesPage from './pages/IssuesPage';
import IssueDetailPage from './pages/IssueDetailPage';
import NewProjectPage from './pages/NewProjectPage';
import ProjectSetupPage from './pages/ProjectSetupPage';
import ProjectIssuesPage from './pages/ProjectIssuesPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<OverviewPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/projects/new" element={<NewProjectPage />} />
                <Route path="/projects/:id" element={<ProjectIssuesPage />} />
                <Route path="/projects/:id/setup" element={<ProjectSetupPage />} />
                <Route path="/projects/:id/issues" element={<ProjectIssuesPage />} />
                <Route path="/issues" element={<IssuesPage />} />
                <Route path="/issues/:id" element={<IssueDetailPage />} />
                <Route path="/settings" element={<SettingsPage />} />
            </Routes>
        </BrowserRouter>
    );
}
