import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import * as monaco from 'monaco-editor';

import Vim from './monaco-vim';

import './index.css';

const { KeyCode, KeyMod } = monaco;

export default class Monacode extends React.Component {
  static propTypes = {
    className: PropTypes.string,
    autoFocus: PropTypes.bool,
    language: PropTypes.string,
    extension: PropTypes.string,
    options: PropTypes.object,
    value: PropTypes.string,
    autoSize: PropTypes.bool,
  };

  static defaultProps = {
    language: 'plaintext',
    extension: 'txt',
    options: {
      minimap: {
        enabled: false,
      },
      fontSize: 14,
      scrollbar: {
        horizontal: 'hidden',
      }
    },
    autoSize: false,
    wordWrapColumn: 100,
    scrollBeyondLastLine: false,
    className: '',
  };

  constructor(props) {
    super(props);
    this.nodeRef = this.nodeRef.bind(this);
  }

  nodeRef(node) {
    this.node = node;
  }

  componentDidMount() {
    if (!this.node) {
      return;
    }

    const { language, extension, options, value } = this.props;
    this.model = monaco.editor.createModel(value || '', language, `file:///file.${extension}`);
    this.editor = monaco.editor.create(this.node, Object.assign({}, options, {
      model: this.model,
    }));
    this.vim = new Vim(this.editor, [
      (KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.KEY_I),
    ]);

    if (this.props.autoFocus) {
      this.editor.focus();
    }

    if (window.localStorage.code) {
      this.editor.setValue(window.localStorage.code);
    }

    this.timer = setInterval(() => {
      window.localStorage.code = this.editor.getValue();
    }, 2000);
  }

  componentWillUnmount() {
    clearInterval(this.timer);
    this.vim.dispose();
    this.model.dispose();
    this.editor.dispose();
  }

  componentDidUpdate(prevProps, prevState) {
    const { options  } = this.props;
    const { options: prevOptions } = prevProps;

    if (prevOptions !== options) {
      this.editor.updateOptions(options);
    }
  }

  shouldComponentUpdate() {
    return false;
  }

  render() {
    return (
      <div ref={this.nodeRef} className={`monaco-${this.props.className}`} />
    );
  }
}
