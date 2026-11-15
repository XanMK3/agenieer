import React from 'react';
import styled from 'styled-components';
import styles from './Button.module.css';

const StyledButton = styled.button`
  background: blue;
  color: white;
  padding: 8px 16px;
`;

export function Button({ label }: { label: string }) {
  return <StyledButton className={styles.button}>{label}</StyledButton>;
}
