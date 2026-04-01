import { createRoot } from 'react-dom/client';
import { DiffApp } from './DiffApp';
import './diff.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Akashi diff: #root not found');
}
const root = createRoot(container);
root.render(<DiffApp />);
