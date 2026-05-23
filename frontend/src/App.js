import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import { useAuthStore } from './stores/authStore';
import ConnectThingSpeak from "./pages/ConnectThingSpeak";
import './App.css';

function App() {
  const { user } = useAuthStore();

  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
          <Route
            path="/auth"
            element={!user ? <AuthPage /> : <Navigate to="/" replace />}
          />
          <Route
            path="/"
            element={user ? <Dashboard /> : <Navigate to="/auth" replace />}
          />
          <Route
            path="/analytics"
            element={user ? <Analytics /> : <Navigate to="/auth" replace />}
          />
          <Route
            path="/settings"
            element={user ? <Settings /> : <Navigate to="/auth" replace />}
          />
          <Route
            path="/connect"
            element={user ? <ConnectThingSpeak /> : <Navigate to="/auth" replace />}
          />
        </Routes>
        <Toaster position="top-right" richColors />
      </div>
    </BrowserRouter>
  );
}

export default App;