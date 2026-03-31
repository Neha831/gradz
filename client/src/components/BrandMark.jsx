import React from 'react';
import { GRADEZY_LOGO_URL } from '../constants/brand.js';

/**
 * Logo + Grad/Ezy wordmark. Supply page-specific class names from existing CSS.
 */
export function BrandMark({
  as: Comp = 'div',
  className,
  logoClassName,
  wordmarkClassName,
  gradClassName,
  ezyClassName,
  logoWidth = 44,
  logoHeight = 44,
  ...rest
}) {
  return (
    <Comp className={className} {...rest}>
      <img
        src={GRADEZY_LOGO_URL}
        alt=""
        className={logoClassName}
        width={logoWidth}
        height={logoHeight}
        decoding="async"
        aria-hidden="true"
      />
      <span className={wordmarkClassName}>
        <span className={gradClassName}>Grad</span>
        <span className={ezyClassName}>Ezy</span>
      </span>
    </Comp>
  );
}
