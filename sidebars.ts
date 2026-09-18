import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    {
      type: 'category',
      label: '快速开始',
      items: [
        'getting-started/prerequisites',
        'getting-started/install',
        'getting-started/connect',
      ],
    },
    'sdk/cpp',
    {
      type: 'category',
      label: 'C++ API Reference',
      items: [
        'api/cpp/index',
        'api/cpp/core',
        'api/cpp/motion',
        'api/cpp/telemetry',
        'api/cpp/low-level',
        'api/cpp/power',
        'api/cpp/camera',
        'api/cpp/nav',
      ],
    },
    'concepts/groups-and-policies',
    {
      type: 'category',
      label: '运行示例',
      items: [
        'examples/index',
        'examples/battery',
        'examples/switch-group',
        'examples/query-motion-state',
        'examples/switch-policy',
        'examples/send-velocity',
        'examples/camera',
      ],
    },
    {
      type: 'category',
      label: '在工程中使用',
      items: [
        'integrate/cpp',
        'integrate/python',
      ],
    },
    {
      type: 'category',
      label: '选装设备',
      items: [
        'peripherals/index',
        'peripherals/depthai-oak-d',
      ],
    },
    'faq',
  ],
};

export default sidebars;
