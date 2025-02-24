import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { ProjectPage } from './pages/ProjectPage';
import { ProjectListPage } from './pages/ProjectListPage';
import { AdminAuthPage } from './pages/AdminAuthPage';
import CsvUploadPage from './pages/CsvUploadPage';
import { PromptSettingsPage } from './pages/PromptSettingsPage';

function App() {
  const isAdmin = !!localStorage.getItem('adminKey');

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {isAdmin && (
          <nav className="bg-white shadow-sm">
            <div className="max-w-4xl mx-auto px-4 py-3 flex gap-4">
              <Link to="/" className="text-blue-500 hover:text-blue-600">
                ホーム
              </Link>
              <Link to="/projects" className="text-blue-500 hover:text-blue-600">
                プロジェクト一覧
              </Link>
              <Link to="/csv-upload" className="text-blue-500 hover:text-blue-600">
                CSVアップロード
              </Link>
              <Link to="/prompt-settings" className="text-blue-500 hover:text-blue-600">
                プロンプト設定
              </Link>
            </div>
          </nav>
        )}

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/projects" element={<ProjectListPage />} />
          <Route path="/projects/:projectId" element={<ProjectPage />}>
            <Route path="comments" element={<ProjectPage />} />
            <Route path="analytics" element={<ProjectPage />} />
            <Route path="overall" element={<ProjectPage />} />
          </Route>
          <Route path="/csv-upload" element={<CsvUploadPage />} />
          <Route path="/adminauth" element={<AdminAuthPage />} />
          <Route path="/prompt-settings" element={<PromptSettingsPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
