import { createRoot } from 'react-dom/client';
import { AddonsApp } from './AddonsApp';
import './addons.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Akashi addons: #root not found');
}
const root = createRoot(container);
root.render(<AddonsApp />);
