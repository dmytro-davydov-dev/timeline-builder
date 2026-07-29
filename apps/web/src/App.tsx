import { Route, Routes } from 'react-router-dom';
import { UploadPage } from './pages/UploadPage';
import { CaseViewPage } from './pages/CaseViewPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<UploadPage />} />
      <Route path="/cases/:caseId" element={<CaseViewPage />} />
    </Routes>
  );
}

export default App;
