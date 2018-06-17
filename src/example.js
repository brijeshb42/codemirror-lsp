import React from 'react';
import ReactDOM from 'react-dom';

import Editor from './codemirror';

const node = document.createElement('div');
document.body.appendChild(node);

ReactDOM.render(
  <Editor
    autoFocus
    language="python"
    extension="py"
    className="cm-editor"
    value=""
    lspUrl="ws://localhost:2087"
    completionItemClassName="cm-completion-item"
  />,
  node
);
