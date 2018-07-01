import React, { Component } from 'react';
import CodeMirror from 'codemirror';
import PropTypes from 'prop-types';
import 'codemirror/addon/edit/matchbrackets';
import 'codemirror/addon/lint/lint';

import Client from './languageClient';
import { createAdapter } from './cmadapter';

import 'codemirror/lib/codemirror.css';
import 'codemirror/addon/lint/lint.css';
import './index.css';

export default class CodeMirrorComponent extends Component {
  static propTypes = {
    className: PropTypes.string,
    completionItemClassName: PropTypes.string,
    language: PropTypes.string.isRequired,
    autoFocus: PropTypes.bool,
    value: PropTypes.string,
    lspUrl: PropTypes.string,
  };

  static defaultProps = {
    className: '',
    completionItemClassName: '',
    autoFocus: false,
    value: '',
    lspUrl: '',
  };

  constructor(props) {
    super(props);
    this.nodeRef = this.nodeRef.bind(this);
  }

  nodeRef(node) {
    this.node = node;
  }

  componentDidMount() {
    const { language, autoFocus, value, lspUrl, completionItemClassName } = this.props;

    this.editor = CodeMirror(this.node, {
      value,
      lineNumbers: true,
      matchbrackets: true,
      smartIndent: true,
      styleSelectedText: true,
      electricChars: true,
      styleActiveLine: true,
      lint: true,
      extraKeys: {
        'Ctrl-Space': 'autocomplete',
      },
    });

    this.loadMode(language).then(() => this.editor.setOption('mode', language));

    if (autoFocus) {
      this.editor.focus();
    }

    if (lspUrl) {
      this.client = new Client(lspUrl, 'file:///workspace');
      this.adapter = createAdapter(this.editor, this.client, {
        completionItemClassName,
        loadHintModule: this.loadHintModule,
        loadLintModule: this.loadLintModule,
        filename: 'file.py',
      });
      this.adapter.start();
    }
  }

  componentWillUnmount() {
    if (this.adapter) {
      this.adapter.dispose();
    }

    const wrapperNode = this.editor.getWrapperElement();
    wrapperNode.parentNode.removeChild(wrapperNode);
    this.editor = null;
  }

  loadMode(lang) {
    // hardcoded for now
    return import(`codemirror/mode/python/python`);
  }

  loadHintModule() {
    import('codemirror/addon/hint/show-hint.css');
    return import('codemirror/addon/hint/show-hint');
  }

  render() {
    const { className } = this.props;

    return (
      <div ref={this.nodeRef} className={className} />
    );
  }
}

window.CodeMirror = CodeMirror;
