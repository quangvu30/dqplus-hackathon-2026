import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LangProvider } from './context/LangContext';
import AppRoutes from './routes';
import './styles/tokens.css';
import './styles/base.css';
import './styles/shell.css';
import './styles/match.css';
import './styles/detail.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <LangProvider>
          <AppRoutes />
        </LangProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
