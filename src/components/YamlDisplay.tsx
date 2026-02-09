import { CopyOutlined } from '@ant-design/icons';
import { Button, Card, Collapse, message } from 'antd';
import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { prism } from 'react-syntax-highlighter/dist/esm/styles/prism'; // 适配 antd 暗黑模式的主题

const { Panel } = Collapse;

interface YamlDisplayProps {
  yamlText: string;
  title?: string;
  hidden?: boolean;
}

const YamlDisplay: React.FC<YamlDisplayProps> = ({
  yamlText,
  title = 'YAML 配置',
  hidden = false,
}) => {
  const [copied, setCopied] = useState(false);

  // const formatYaml = (text: string) => {
  //   try {
  //     const parsed = parse(text);
  //     return JSON.stringify(parsed, null, 2).replace(/"([^"]+)":/g, '$1:');
  //   } catch (e) {
  //     return text;
  //   }
  // };

  // const formattedText = formatYaml(yamlText);
  const formattedText = yamlText;

  const copyToClipboard = (text: string): Promise<void> => {
    // 优先使用现代API
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }

    // 降级方案：创建临时textarea实现复制
    return new Promise((resolve, reject) => {
      const textArea = document.createElement('textarea');
      textArea.value = text;

      // 隐藏textarea
      textArea.style.position = 'fixed';
      textArea.style.top = '-9999px';
      textArea.style.left = '-9999px';
      textArea.style.opacity = '0';

      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        const successful = document.execCommand('copy');
        if (successful) {
          resolve();
        } else {
          reject(new Error('复制失败'));
        }
      } catch (err) {
        reject(err);
      } finally {
        document.body.removeChild(textArea);
      }
    });
  };
  const copy = () => {
    copyToClipboard(formattedText)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        message.success(`已复制到剪贴板`);
      })
      .catch((err) => {
        console.error('复制失败:', err);
        // 手动选中预览框内容，方便用户手动复制
        const preElement = document.querySelector('pre');
        if (preElement) {
          const range = document.createRange();
          range.selectNodeContents(preElement);
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
        message.error('自动复制失败，请手动复制内容');
      });
  };
  return (
    <Card
      title={
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {title}
          <Button
            type="text"
            icon={<CopyOutlined />}
            disabled={copied}
            onClick={copy}
          >
            {copied ? '已复制' : '复制'}
          </Button>
        </div>
      }
      hidden={hidden}
      style={{ marginTop: 16 }}
    >
      {/* 折叠面板 */}
      <Collapse defaultActiveKey={['1']} bordered={false}>
        <Panel header="查看 YAML 内容" key="1">
          <SyntaxHighlighter
            language="yaml"
            style={prism}
            showLineNumbers={true}
            lineNumberStyle={{ color: '#ccc', fontSize: 12 }}
            wrapLines={true} // 自动换行（避免横向滚动）
          >
            {formattedText}
          </SyntaxHighlighter>
        </Panel>
      </Collapse>
    </Card>
  );
};

export default YamlDisplay;
