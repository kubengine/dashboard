import { Select, Space } from 'antd';
import React, { useState } from 'react';
import PodFiles from './PodFiles';
import PodTerminal from './PodTerminal';

const PodAccess: React.FC<{
  namespace: string;
  name: string;
  spec: any;
  status?: any;
  mode: 'terminal' | 'files';
}> = ({ namespace, name, spec, status, mode }) => {
  const [container, setContainer] = useState(spec.containers?.[0]?.name || '');
  const states = [
    ...(status?.containerStatuses || []),
    ...(status?.initContainerStatuses || []),
    ...(status?.ephemeralContainerStatuses || []),
  ];
  const options = [
    ...(spec.containers || []),
    ...(spec.initContainers || []),
    ...(spec.ephemeralContainers || []),
  ].map((c: any) => {
    const current = states.find((s: any) => s.name === c.name);
    return {
      value: c.name,
      label: `${c.name}${
        spec.initContainers?.includes(c)
          ? ' · Init'
          : spec.ephemeralContainers?.includes(c)
          ? ' · 临时容器'
          : ''
      }`,
      disabled: current ? !current.state?.running : false,
    };
  });
  const windows =
    spec.os?.name === 'windows' ||
    spec.nodeSelector?.['kubernetes.io/os'] === 'windows';
  return (
    <div className="ke-pod-access">
      <Space className="ke-container-select" wrap>
        <label htmlFor="pod-operation-container">当前容器</label>
        <Select
          id="pod-operation-container"
          aria-label="操作容器"
          value={container}
          onChange={setContainer}
          options={options}
          style={{ minWidth: 240, maxWidth: '100%' }}
        />
      </Space>
      {container &&
        (mode === 'terminal' ? (
          <PodTerminal
            key={container}
            namespace={namespace}
            name={name}
            container={container}
            windows={windows}
          />
        ) : (
          <PodFiles
            key={container}
            namespace={namespace}
            name={name}
            container={container}
          />
        ))}
    </div>
  );
};
export default PodAccess;
