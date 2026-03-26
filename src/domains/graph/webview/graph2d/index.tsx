import { createRoot } from 'react-dom/client';
import { Graph2DApp } from './Graph2DApp';
import '../styles.css';
import './graph2d.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Akashi graph2d: #root not found');
}
const root = createRoot(container);
root.render(<Graph2DApp />);
