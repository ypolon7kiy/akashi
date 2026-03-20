import { getVscodeApi } from '../../../webview-shared/api';
import { ExampleMessageType } from './messages';

export function App(): JSX.Element {
  const handleSendMessage = (): void => {
    const vscode = getVscodeApi();
    if (vscode) {
      vscode.postMessage({ type: ExampleMessageType.ButtonClicked });
    }
  };

  return (
    <div className="ex-example">
      <h1 className="ex-example__title">Hello from the Example domain webview</h1>
      <p className="ex-example__lead">
        Typography and controls follow the active VS Code theme (including themes you install).
      </p>
      <button
        type="button"
        className="akashi-button akashi-button--primary ex-example__button"
        onClick={handleSendMessage}
      >
        Send message to extension
      </button>
    </div>
  );
}
