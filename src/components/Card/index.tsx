import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';

import styles from './styles.module.css';

export type CardProps = {
  title: string;
  description?: ReactNode;
  to?: string;
  children?: ReactNode;
  className?: string;
};

export function Card({title, description, to, children, className}: CardProps): ReactNode {
  const body = (
    <>
      <Heading as="h3" className={styles.title}>
        {title}
      </Heading>
      {description ? <p className={styles.description}>{description}</p> : null}
      {children}
    </>
  );

  const cardClassName = clsx(styles.card, to && styles.clickable, className);

  if (to) {
    return (
      <Link className={cardClassName} to={to}>
        {body}
      </Link>
    );
  }

  return <div className={cardClassName}>{body}</div>;
}

export type CardGridProps = {
  children: ReactNode;
  className?: string;
};

export function CardGrid({children, className}: CardGridProps): ReactNode {
  return <div className={clsx(styles.grid, className)}>{children}</div>;
}
