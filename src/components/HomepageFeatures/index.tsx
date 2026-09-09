import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: ReactNode;
  to: string;
};

const FeatureList: FeatureItem[] = [
  {
    title: '安装 SDK',
    to: '/docs/getting-started/install',
    Svg: require('@site/static/img/undraw_docusaurus_mountain.svg').default,
    description: (
      <>先装 Runtime，再装 C++ 或 Python SDK。开发机与目标机架构、版本需要配套。</>
    ),
  },
  {
    title: '控制运动',
    to: '/docs/examples/switch-group',
    Svg: require('@site/static/img/undraw_docusaurus_tree.svg').default,
    description: (
      <>按 group / policy 规则切换步态，再发送 SE2 速度。上电路径从 passive、stand 走到 locomotion。</>
    ),
  },
  {
    title: '读取状态',
    to: '/docs/examples/battery',
    Svg: require('@site/static/img/undraw_docusaurus_react.svg').default,
    description: (
      <>一次性读取或持续订阅电池等状态。C++ 还可按模块访问遥测、关节、相机和导航。</>
    ),
  },
];

function Feature({title, Svg, description, to}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Link to={to} aria-label={title}>
          <Svg className={styles.featureSvg} role="img" aria-hidden="true" />
        </Link>
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">
          <Link to={to}>{title}</Link>
        </Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
