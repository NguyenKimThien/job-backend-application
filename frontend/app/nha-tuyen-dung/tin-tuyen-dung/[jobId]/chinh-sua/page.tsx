'use client';

import { JobEditorPage } from '../../tao-moi/page';
import { useParams } from 'next/navigation';

export default function EditEmployerJobPage() {
  const params = useParams<{ jobId: string }>();

  return <JobEditorPage jobId={params.jobId} mode="edit" />;
}
