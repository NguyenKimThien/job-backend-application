'use client';

import RoleGuard from '@/components/RoleGuard';
import { ReactNode } from 'react';

const ADMIN_ROLE = ['QUAN_TRI_VIEN'] as const;

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard allowed={ADMIN_ROLE}>
      {children}
    </RoleGuard>
  );
}
