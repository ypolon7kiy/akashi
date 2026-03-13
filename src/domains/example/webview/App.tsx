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
    <>
      <h1>Hello from the Example domain webview</h1>
      <button type="button" onClick={handleSendMessage}>
        Send message to extension
      </button>
    </>
  );
}
