import type {ReactNode} from 'react';
import {Card, CardGrid} from '@site/src/components/Card';

import styles from './styles.module.css';

const FeatureList = [
  {
    title: '安装 SDK',
    to: '/docs/getting-started/install',
    description: '先装 Runtime，再装 C++ 或 Python SDK。开发机与目标机架构、版本需要配套。',
  },
  {
    title: '控制运动',
    to: '/docs/examples/switch-group',
    description:
      '按 group / policy 规则切换步态，再发送 SE2 速度。上电路径从 passive、stand 走到 locomotion。',
  },
  {
    title: '读取状态',
    to: '/docs/examples/battery',
    description:
      '一次性读取或持续订阅电池等状态。C++ 还可按模块访问遥测、关节、相机和导航。',
  },
];

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <CardGrid>
          {FeatureList.map((item) => (
            <Card key={item.title} {...item} />
          ))}
        </CardGrid>
      </div>
    </section>
  );
}
