import React from 'react';
import ReactDOM from 'react-dom';

import Editor from './';

const node = document.createElement('div');
document.body.appendChild(node);

ReactDOM.render(
  <Editor
    autoFocus
    language="javascript"
    extension="py"
    className="cm-editor"
    value=""
    lspUrl="ws://localhost:2087"
    completionItemClassName="cm-completion-item"
  />,
  node
);
