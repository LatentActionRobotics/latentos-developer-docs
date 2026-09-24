import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'LatentOS Developer Center',
  tagline: 'LatentOS 开发者文档',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  url: 'https://latent-action.com',
  baseUrl: '/docs/',
  // FTP/nginx serves directories with index.html; extensionless /intro → intro.html is not configured.
  trailingSlash: true,

  organizationName: 'LatentActionRobotics',
  projectName: 'latentos-developer-docs',

  onBrokenLinks: 'throw',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'zh-Hans',
    locales: ['zh-Hans'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          editUrl:
            'https://github.com/LatentActionRobotics/latentos-developer-docs/tree/main/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themes: [
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        hashed: true,
        language: ['en', 'zh'],
        indexBlog: false,
        indexPages: true,
        docsRouteBasePath: '/',
      },
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'LatentOS Developer Center',
      logo: {
        alt: 'LatentOS Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: '文档',
        },
        {
          href: 'https://github.com/LatentActionRobotics/latentos-developer-docs',
          position: 'right',
          className: 'header-github-link',
          'aria-label': 'GitHub',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: '快速阅读',
          items: [
            {
              label: '文档',
              to: '/intro',
            },
            {
              label: '安装 SDK',
              to: '/getting-started/install',
            },
            {
              label: '运行示例',
              to: '/examples',
            },
          ],
        },
        {
          title: '社区',
          items: [
            {
              label: '哔哩哔哩',
              href: 'https://b23.tv/JO4jmnr',
            },
            {
              label: '小红书',
              href: 'https://xhslink.cn/o/4kNK31ik94N',
            },
            {
              label: 'X',
              href: 'https://x.com/LatentActionRobotics',
            },
          ],
        },
        {
          title: '更多',
          items: [
            {
              label: '企业官网',
              to: 'https://latent-action.com',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/LatentActionRobotics',
            },
            {
              label: 'Gitee',
              href: 'https://gitee.com/LatentActionRobotics',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} 潜行未来（杭州）机器人有限公司`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: [
        'bash',
        'cmake',
        'cpp',
        'diff',
        'docker',
        'ini',
        'json',
        'makefile',
        'python',
        'toml',
        'yaml',
      ],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
