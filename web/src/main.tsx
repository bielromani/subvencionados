import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './estilos.css';
import { iniciarSincronizacion } from './sincronizar';

iniciarSincronizacion();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
