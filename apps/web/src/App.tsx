import { Route, Routes } from 'react-router-dom';
import { UploadPage } from './pages/UploadPage';
import { CaseViewPage } from './pages/CaseViewPage';
import { DefaultCaseRedirect } from './pages/DefaultCaseRedirect';

function App() {
  return (
    <Routes>
      <Route path="/" element={<DefaultCaseRedirect />} />
      <Route path="/upload" element={<UploadPage />} />
      <Route path="/cases/:caseId" element={<CaseViewPage />} />
    </Routes>
  );
}

export default App;
