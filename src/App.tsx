import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import DocumentQueue from './components/DocumentQueue';
import DocumentAnalysis from './components/DocumentAnalysis';
import UploadDocument from './components/UploadDocument';
import Notifications from './components/Notifications';
import SystemHealth from './components/SystemHealth';
import Settings from './components/Settings';

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  const handleNavigate = (view: string) => {
    setCurrentView(view);
    setSelectedDocumentId(null);
  };

  const handleSelectDocument = (id: string) => {
    setSelectedDocumentId(id);
  };

  const handleBackFromAnalysis = () => {
    setSelectedDocumentId(null);
  };

  const renderContent = () => {
    // If viewing a specific document analysis
    if (selectedDocumentId) {
      return (
        <DocumentAnalysis
          documentId={selectedDocumentId}
          onBack={handleBackFromAnalysis}
        />
      );
    }

    switch (currentView) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;
      case 'queue':
        return <DocumentQueue onSelectDocument={handleSelectDocument} />;
      case 'upload':
        return <UploadDocument />;
      case 'notifications':
        return <Notifications />;
      case 'system':
        return <SystemHealth />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar currentView={currentView} onNavigate={handleNavigate} />
      <main className="flex-1 overflow-auto">
        {renderContent()}
      </main>
    </div>
  );
}
