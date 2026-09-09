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
    'concepts/groups-and-policies',
    {
      type: 'category',
      label: '运行示例',
      items: [
        'examples/index',
        'examples/battery',
        'examples/switch-group',
        'examples/switch-policy',
        'examples/send-velocity',
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
    'faq',
  ],
};

export default sidebars;
