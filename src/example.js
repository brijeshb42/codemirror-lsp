import React from 'react';
import ReactDOM from 'react-dom';

import Editor from './index.js';

const node = document.createElement('div');
document.body.appendChild(node);

ReactDOM.render(
    <Editor
      autoFocus
      language="python"
      extension="py"
      className="editor"
      value="Value"
    />,
    node
);
