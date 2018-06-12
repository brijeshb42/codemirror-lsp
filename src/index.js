import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import * as monaco from 'monaco-editor';

import './index.css';


export default class Monacode extends React.Component {
    static propTypes = {
        className: PropTypes.string,
        autoFocus: PropTypes.bool,
        language: PropTypes.string,
        extension: PropTypes.string,
        options: PropTypes.object,
        value: PropTypes.string,
    };

    static defaultProps = {
        language: 'plaintext',
        extension: 'txt',
        options: {
            minimap: {
                enabled: false,
            },
            fontSize: 16,
        },
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
        this.model = monaco.editor.createModel(value || '', language, `file://file.${extension}`);
        this.editor = monaco.editor.create(this.node, Object.assign({}, options, {
            model: this.model,
        }));

        if (this.props.autoFocus) {
            this.editor.focus();
        }
    }

    componentDidUpdate(prevProps, prevState) {
        const { options  } = this.props;
        const { options: prevOptions } = prevProps;

        if (prevOptions !== options) {
            this.editor.updateOptions(options);
        }
    }

    shouldCompoentUpdate() {
        return false;
    }

    render() {
        return (
            <div ref={this.nodeRef} className={this.props.className} />
        );
    }
}
