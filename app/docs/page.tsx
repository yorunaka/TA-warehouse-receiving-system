// app/docs/page.tsx
'use client';

import DynamicSwaggerUI from './swagger-component';

export default function ApiDocsPage() {
  return (
    <div className="bg-slate-200 min-h-screen">
      <DynamicSwaggerUI url="/api/docs/spec" />
    </div>
  );
}