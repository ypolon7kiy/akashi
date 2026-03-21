import { createRoot } from 'react-dom/client';
import { GraphApp } from './App';
import './styles.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Akashi graph: #root not found');
}
const root = createRoot(container);
root.render(<GraphApp />);
