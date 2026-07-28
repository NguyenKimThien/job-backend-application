'use client';

import RoleGuard from '@/components/RoleGuard';
import { ReactNode } from 'react';

const EMPLOYER_ROLE = ['NHA_TUYEN_DUNG'] as const;

export default function EmployerLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard allowed={EMPLOYER_ROLE}>
      {children}
    </RoleGuard>
  );
}
