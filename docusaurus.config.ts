import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const baseUrl = '/docs/';

const config: Config = {
  title: 'LatentOS Developer Center',
  tagline: 'LatentOS 开发者文档',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  url: 'https://latent-action.com',
  baseUrl,
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
          // versions.json 第一项是已发布的默认版本。docs/ 是下一版（未发布）。
          versions: {
            current: {
              label: '1.2.0',
              path: 'next',
              banner: 'unreleased',
              noIndex: true,
            },
            '1.1.0': {
              label: '1.1.0',
              banner: 'none',
            },
          },
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

  // Baidu Analytics (hm.js)
  headTags: [
    {
      tagName: 'script',
      attributes: {},
      innerHTML: `
var _hmt = _hmt || [];
(function() {
  var hm = document.createElement("script");
  hm.src = "https://hm.baidu.com/hm.js?aeca4020d4685706b255954ef7859077";
  var s = document.getElementsByTagName("script")[0];
  s.parentNode.insertBefore(hm, s);
})();
`.trim(),
    },
  ],

  // MaxKB floating support widget (https://service.latent-action.com)
  scripts: [
    {
      src: 'https://service.latent-action.com/support/widget.js',
      defer: true,
      'data-label': '在线客服',
    },
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
          type: 'docsVersionDropdown',
          position: 'right',
          dropdownActiveClassDisabled: true,
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
          title: ' ',
          items: [
            {
              html: `<a class="footer-brand-logo" href="https://latent-action.com" target="_blank" rel="noreferrer noopener" aria-label="潜行未来机器人"><img src="${baseUrl}img/latent-action-robotics.png" alt="潜行未来机器人 Latent-Action Robotics" width="198" height="50" /></a>`,
            },
          ],
        },
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
