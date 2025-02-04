import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { ProjectPage } from './pages/ProjectPage';
import CsvUploadPage from './pages/CsvUploadPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-3 flex gap-4">
            <Link to="/" className="text-blue-500 hover:text-blue-600">
              ホーム
            </Link>
            <Link to="/csv-upload" className="text-blue-500 hover:text-blue-600">
              CSVアップロード
            </Link>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/projects/:projectId" element={<ProjectPage />}>
            <Route path="comments" element={<ProjectPage />} />
            <Route path="analytics" element={<ProjectPage />} />
            <Route path="overall" element={<ProjectPage />} />
            <Route path="chat" element={<ProjectPage />} />
          </Route>
          <Route path="/csv-upload" element={<CsvUploadPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
