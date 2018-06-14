import React, { Component } from 'react';
import CodeMirror from 'codemirror';
import PropTypes from 'prop-types';
import 'codemirror/mode/python/python';

import Client from './languageClient';
import { startListening } from './cmadapter';

import 'codemirror/lib/codemirror.css';
import 'codemirror/addon/lint/lint.css';
import './index.css';

export default class CodeMirrorComponent extends Component {
  static propTypes = {
    className: PropTypes.string,
    language: PropTypes.string.isRequired,
    autoFocus: PropTypes.bool,
    value: PropTypes.string,
  };

  static defaultProps = {
    className: '',
    autoFocus: false,
    value: '',
  };

  constructor(props) {
    super(props);
    this.nodeRef = this.nodeRef.bind(this);
  }

  nodeRef(node) {
    this.node = node;
  }

  componentDidMount() {
    const { language, autoFocus, value } = this.props;

    this.editor = CodeMirror(this.node, {
      value,
      mode: language,
      lineNumbers: true,
      matchBrackets: true,
      smartIndent: true,
      styleSelectedText: true,
      electricChars: true,
      styleActiveLine: true,
      lint: true,
    });

    if (autoFocus) {
      this.editor.focus();
    }

    this.client = new Client();
    this.client.resolveConnection().then(() => {
      this.client.initialize().then(() => {
        this.client.send('textDocument/didOpen', {
          textDocument: {
            uri: 'file:///workspace/file.py',
            languageId: this.editor.getMode().name,
            version: 1,
            text: this.editor.getValue(),
          },
        }, false).then(() => {
          this.dispose = startListening(this.editor, this.client);
        });
      });
    });
  }

  render() {
    const { className } = this.props;

    return (
      <div ref={this.nodeRef} style={{ fontSize: 16 }} className={className} />
    );
  }
}

window.CodeMirror = CodeMirror;
